// src/pages/auth/LoginPage.tsx

import React, { useState } from 'react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import {
  useForm,
} from 'react-hook-form';

import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  LogIn,
} from 'lucide-react';

import toast from 'react-hot-toast';

// ✅ FIXED IMPORT PATH
import {
  useAuth,
} from '../../contexts/AuthContext';

interface LoginFormData {
  email: string;
  password: string;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  const {
    login,
  } = useAuth();

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const onSubmit = async (
    data: LoginFormData
  ) => {
    try {
      setLoading(true);

      await login(
        data.email,
        data.password
      );

      toast.success(
        'Login successful'
      );

      navigate('/dashboard');
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Login failed'
      );
    } finally {
      setLoading(false);
    }
  };

  // DEMO LOGIN
  const handleDemoLogin =
    async () => {
      try {
        setLoading(true);

        await login(
          'demo@poker.com',
          'demo123'
        );

        toast.success(
          'Demo login successful'
        );

        navigate('/dashboard');
      } catch {
        toast.success(
          'Demo mode activated'
        );

        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 animated-bg">
      <div className="w-full max-w-md glass rounded-3xl p-8 border border-white/10 shadow-2xl">
        {/* HEADER */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">
            ♠
          </div>

          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome Back
          </h1>

          <p className="text-gray-400">
            Login to continue
          </p>
        </div>

        {/* FORM */}
        <form
          onSubmit={handleSubmit(
            onSubmit
          )}
          className="space-y-5"
        >
          {/* EMAIL */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Email
            </label>

            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />

              <input
                type="email"
                placeholder="Enter email"
                className="w-full h-12 pl-10 pr-4 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-amber-400"
                {...register(
                  'email',
                  {
                    required:
                      'Email required',
                  }
                )}
              />
            </div>

            {errors.email && (
              <p className="text-red-400 text-xs mt-1">
                {
                  errors.email
                    .message
                }
              </p>
            )}
          </div>

          {/* PASSWORD */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Password
            </label>

            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />

              <input
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                placeholder="Enter password"
                className="w-full h-12 pl-10 pr-12 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-amber-400"
                {...register(
                  'password',
                  {
                    required:
                      'Password required',
                  }
                )}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {errors.password && (
              <p className="text-red-400 text-xs mt-1">
                {
                  errors.password
                    .message
                }
              </p>
            )}
          </div>

          {/* LOGIN BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />

            {loading
              ? 'Please wait...'
              : 'Login'}
          </button>
        </form>

        {/* DEMO BUTTON */}
        <button
          onClick={handleDemoLogin}
          disabled={loading}
          className="w-full h-12 mt-4 rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10 transition"
        >
          🎮 Continue as Demo
        </button>

        {/* FOOTER */}
        <div className="mt-6 text-center text-sm text-gray-400">
          Don&apos;t have an account?{' '}
          <Link
            to="/signup"
            className="text-amber-400 hover:text-amber-300"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
