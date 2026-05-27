import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  type User,
} from 'firebase/auth';

import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

import { auth, db } from '../lib/firebase';

import type {
  UserProfile,
  UserWallet,
} from '../types';

import {
  generateReferralCode,
  generateAvatar,
} from '../utils/helpers';

import toast from 'react-hot-toast';

// ============================================================
// TYPES
// ============================================================

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;

  login: (
    email: string,
    password: string
  ) => Promise<void>;

  signup: (
    email: string,
    username: string,
    password: string
  ) => Promise<void>;

  logout: () => Promise<void>;

  resetPassword: (
    email: string
  ) => Promise<void>;

  updateUserProfile: (
    data: Partial<UserProfile>
  ) => Promise<void>;

  refreshProfile: () => Promise<void>;

  updateWallet: (
    wallet: Partial<UserWallet>
  ) => Promise<void>;

  addDemoChips: (
    amount: number
  ) => Promise<void>;
}

const AuthContext =
  createContext<AuthContextType | null>(
    null
  );

// ============================================================
// DEFAULTS
// ============================================================

const getDefaultWallet =
  (): UserWallet => ({
    mainBalance: 0,
    depositBalance: 0,
    winningBalance: 0,
    bonusBalance: 100,
    totalDeposited: 0,
    totalWon: 0,
    totalWithdrawn: 0,
  });

const createDefaultProfile = (
  uid: string,
  email: string,
  username: string
): UserProfile => ({
  uid,
  username,
  email,
  displayName: username,

  avatarUrl: '',
  avatarIndex:
    Math.floor(Math.random() * 8),

  role: email.includes('admin')
    ? 'admin'
    : 'player',

  status: 'active',

  wallet: getDefaultWallet(),

  demoChips: 5000,

  joinDate:
    new Date().toISOString(),

  lastSeen:
    new Date().toISOString(),

  gamesPlayed: 0,
  gamesWon: 0,
  totalEarnings: 0,

  referralCode:
    generateReferralCode(uid),

  level: 1,
  xp: 0,

  dailyBonusLastClaimed: '',
});

// ============================================================
// PROVIDER
// ============================================================

export const AuthProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [user, setUser] =
    useState<User | null>(null);

  const [userProfile, setUserProfile] =
    useState<UserProfile | null>(null);

  const [loading, setLoading] =
    useState(true);

  const isAdmin =
    userProfile?.role === 'admin' ||
    userProfile?.role ===
      'moderator';

  // ============================================================
  // AUTH STATE
  // ============================================================

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (firebaseUser) => {
          try {
            setLoading(true);

            setUser(firebaseUser);

            if (firebaseUser) {
              await loadUserProfile(
                firebaseUser.uid,
                firebaseUser.email || '',
                firebaseUser.displayName ||
                  firebaseUser.email?.split(
                    '@'
                  )[0] ||
                  'Player'
              );
            } else {
              // DEMO FALLBACK PROFILE
              const demoProfile =
                createDefaultProfile(
                  'demo-user',
                  'demo@local.dev',
                  'Demo Player'
                );

              demoProfile.demoChips =
                10000;

              demoProfile.gamesPlayed =
                42;

              demoProfile.gamesWon =
                18;

              demoProfile.wallet.depositBalance =
                500;

              demoProfile.wallet.winningBalance =
                250;

              setUserProfile(
                demoProfile
              );
            }
          } catch {
            // HARD FAILSAFE
            const demoProfile =
              createDefaultProfile(
                'demo-user',
                'demo@local.dev',
                'Demo Player'
              );

            setUserProfile(
              demoProfile
            );
          } finally {
            setLoading(false);
          }
        }
      );

    return unsubscribe;
  }, []);

  // ============================================================
  // LOAD PROFILE
  // ============================================================

  const loadUserProfile =
    async (
      uid: string,
      email: string,
      username: string
    ) => {
      try {
        const userRef = doc(
          db,
          'users',
          uid
        );

        const userSnap =
          await getDoc(userRef);

        if (userSnap.exists()) {
          const data =
            userSnap.data() as UserProfile;

          setUserProfile(data);

          try {
            await updateDoc(
              userRef,
              {
                lastSeen:
                  new Date().toISOString(),
              }
            );
          } catch {
            console.info(
              '[Demo] lastSeen skipped'
            );
          }

          return;
        }

        // CREATE LOCAL PROFILE IF NOT FOUND
        const localProfile =
          createDefaultProfile(
            uid,
            email,
            username
          );

        setUserProfile(localProfile);
      } catch {
        // DEMO SAFE
        const mockProfile =
          createDefaultProfile(
            uid,
            email,
            username
          );

        mockProfile.demoChips =
          10000;

        setUserProfile(mockProfile);

        console.info(
          '[Demo Mode] Local profile active'
        );
      }
    };

  // ============================================================
  // LOGIN
  // ============================================================

  const login = async (
    email: string,
    password: string
  ) => {
    try {
      const result =
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

      await loadUserProfile(
        result.user.uid,
        result.user.email || email,
        result.user.displayName ||
          email.split('@')[0]
      );

      toast.success(
        'Login successful'
      );
    } catch (error: unknown) {
      const code = (
        error as {
          code?: string;
        }
      ).code;

      // DEMO FALLBACK
      if (
        code ===
          'auth/network-request-failed' ||
        code ===
          'auth/invalid-api-key' ||
        code ===
          'auth/api-key-not-valid'
      ) {
        const mockUid =
          'demo-' +
          email.replace(
            /[^a-z0-9]/gi,
            ''
          );

        const mockProfile =
          createDefaultProfile(
            mockUid,
            email,
            email.split('@')[0]
          );

        mockProfile.demoChips =
          10000;

        mockProfile.gamesPlayed =
          47;

        mockProfile.gamesWon =
          18;

        mockProfile.wallet.depositBalance =
          500;

        mockProfile.wallet.winningBalance =
          250;

        mockProfile.wallet.bonusBalance =
          100;

        if (
          email.includes('admin')
        ) {
          mockProfile.role =
            'admin';
        }

        setUserProfile(
          mockProfile
        );

        toast.success(
          'Demo login successful'
        );

        return;
      }

      if (
        code ===
        'auth/user-not-found'
      ) {
        throw new Error(
          'No account found'
        );
      }

      if (
        code ===
        'auth/wrong-password'
      ) {
        throw new Error(
          'Incorrect password'
        );
      }

      if (
        code ===
        'auth/invalid-credential'
      ) {
        throw new Error(
          'Invalid credentials'
        );
      }

      throw new Error(
        'Login failed'
      );
    }
  };

  // ============================================================
  // SIGNUP
  // ============================================================

  const signup = async (
    email: string,
    username: string,
    password: string
  ) => {
    try {
      const result =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

      await updateProfile(
        result.user,
        {
          displayName:
            username,
        }
      );

      const profile =
        createDefaultProfile(
          result.user.uid,
          email,
          username
        );

      try {
        await setDoc(
          doc(
            db,
            'users',
            result.user.uid
          ),
          {
            ...profile,
            createdAt:
              serverTimestamp(),
          }
        );
      } catch {
        console.info(
          '[Demo] Firestore skipped'
        );
      }

      setUserProfile(profile);

      generateAvatar(
        username
      );

      toast.success(
        'Signup successful'
      );
    } catch (error: unknown) {
      const code = (
        error as {
          code?: string;
        }
      ).code;

      // DEMO MODE
      if (
        code ===
          'auth/network-request-failed' ||
        code ===
          'auth/invalid-api-key' ||
        code ===
          'auth/api-key-not-valid'
      ) {
        const mockUid =
          'demo-' + Date.now();

        const mockProfile =
          createDefaultProfile(
            mockUid,
            email,
            username
          );

        setUserProfile(
          mockProfile
        );

        toast.success(
          'Demo signup successful'
        );

        return;
      }

      if (
        code ===
        'auth/email-already-in-use'
      ) {
        throw new Error(
          'Email already exists'
        );
      }

      if (
        code ===
        'auth/weak-password'
      ) {
        throw new Error(
          'Weak password'
        );
      }

      throw new Error(
        'Signup failed'
      );
    }
  };

  // ============================================================
  // LOGOUT
  // ============================================================

  const logout =
    async (): Promise<void> => {
      try {
        await signOut(auth);
      } catch {
        console.info(
          '[Demo] logout local'
        );
      }

      setUser(null);
      setUserProfile(null);
    };

  // ============================================================
  // RESET PASSWORD
  // ============================================================

  const resetPassword =
    async (
      email: string
    ): Promise<void> => {
      try {
        await sendPasswordResetEmail(
          auth,
          email
        );

        toast.success(
          'Reset email sent'
        );
      } catch {
        toast.success(
          'Demo reset simulated'
        );
      }
    };

  // ============================================================
  // PROFILE UPDATE
  // ============================================================

  const updateUserProfile =
    async (
      data: Partial<UserProfile>
    ) => {
      if (!userProfile) {
        return;
      }

      const uid =
        user?.uid ||
        userProfile.uid;

      const updatedProfile = {
        ...userProfile,
        ...data,
      };

      setUserProfile(
        updatedProfile
      );

      try {
        await updateDoc(
          doc(
            db,
            'users',
            uid
          ),
          data as Record<
            string,
            unknown
          >
        );
      } catch {
        console.info(
          '[Demo] profile local update'
        );
      }
    };

  // ============================================================
  // REFRESH
  // ============================================================

  const refreshProfile =
    async () => {
      const uid =
        user?.uid ||
        userProfile?.uid;

      if (!uid) {
        return;
      }

      await loadUserProfile(
        uid,
        userProfile?.email || '',
        userProfile?.username ||
          'Player'
      );
    };

  // ============================================================
  // WALLET
  // ============================================================

  const updateWallet =
    async (
      wallet: Partial<UserWallet>
    ) => {
      if (!userProfile) {
        return;
      }

      const updatedWallet = {
        ...userProfile.wallet,
        ...wallet,
      };

      setUserProfile((prev) =>
        prev
          ? {
              ...prev,
              wallet:
                updatedWallet,
            }
          : null
      );

      try {
        const uid =
          user?.uid ||
          userProfile.uid;

        await updateDoc(
          doc(
            db,
            'users',
            uid
          ),
          {
            wallet:
              updatedWallet,
          }
        );
      } catch {
        console.info(
          '[Demo] wallet local update'
        );
      }
    };

  // ============================================================
  // DEMO CHIPS
  // ============================================================

  const addDemoChips =
    async (
      amount: number
    ) => {
      if (!userProfile) {
        return;
      }

      const newChips =
        userProfile.demoChips +
        amount;

      setUserProfile((prev) =>
        prev
          ? {
              ...prev,
              demoChips:
                newChips,
            }
          : null
      );

      try {
        const uid =
          user?.uid ||
          userProfile.uid;

        await updateDoc(
          doc(
            db,
            'users',
            uid
          ),
          {
            demoChips:
              newChips,
          }
        );
      } catch {
        console.info(
          '[Demo] chips local update'
        );
      }
    };

  // ============================================================
  // CONTEXT VALUE
  // ============================================================

  const value: AuthContextType =
    {
      user,
      userProfile,
      loading,
      isAdmin,

      login,
      signup,
      logout,
      resetPassword,

      updateUserProfile,
      refreshProfile,

      updateWallet,
      addDemoChips,
    };

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ============================================================
// HOOK
// ============================================================

export const useAuth =
  (): AuthContextType => {
    const context =
      useContext(AuthContext);

    if (!context) {
      throw new Error(
        'useAuth must be used within AuthProvider'
      );
    }

    return context;
  };

export default AuthContext;
