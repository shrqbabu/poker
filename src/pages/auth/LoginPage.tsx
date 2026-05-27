import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronUp,
  ChevronDown,
  LogOut,
  Settings,
  Clock,
  Users,
  DollarSign,
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';

import {
  SUIT_SYMBOLS,
  SUIT_COLORS,
  shuffleDeck,
  createDeck,
  generateDemoSeats,
  formatChips,
  BOT_NAMES,
  GAME_PHASE_LABELS,
} from '../utils/helpers';

import type {
  Card,
  PlayerSeat,
  GamePhase,
} from '../types';

import toast from 'react-hot-toast';

// ============================================================
// DEMO PROFILE FALLBACK
// ============================================================

const DEMO_PROFILE = {
  uid: 'demo-user',
  username: 'Demo Player',
  avatarIndex: 0,
  demoChips: 5000,
};

// ============================================================
// CARD COMPONENT
// ============================================================

const PlayingCard: React.FC<{
  card: Card;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
}> = ({
  card,
  size = 'md',
  animate = true,
}) => {
  const sizeMap = {
    sm: 'w-8 h-12 text-xs rounded-md',
    md: 'w-12 h-18 text-sm rounded-lg',
    lg: 'w-16 h-24 text-base rounded-xl',
  };

  const suitColor = SUIT_COLORS[card.suit];
  const isRed =
    card.suit === 'hearts' ||
    card.suit === 'diamonds';

  if (card.faceDown) {
    return (
      <motion.div
        initial={animate ? { rotateY: 0 } : {}}
        className={`${sizeMap[size]} bg-gradient-to-br from-blue-800 to-blue-900 border-2 border-blue-600 flex items-center justify-center shadow-lg`}
      >
        <div className="text-blue-400 text-xs opacity-50">
          ♠
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={animate ? { rotateY: 90, scale: 0.5 } : {}}
      animate={animate ? { rotateY: 0, scale: 1 } : {}}
      transition={{
        type: 'spring',
        damping: 15,
        stiffness: 200,
      }}
      whileHover={{ y: -5, scale: 1.05 }}
      className={`${sizeMap[size]} bg-white flex flex-col justify-between p-1 shadow-xl cursor-pointer relative overflow-hidden`}
    >
      <div
        className={`text-xs font-bold leading-none ${
          isRed ? 'text-red-500' : 'text-gray-900'
        }`}
      >
        <div>{card.value}</div>
        <div>{SUIT_SYMBOLS[card.suit]}</div>
      </div>

      <div
        className="absolute inset-0 flex items-center justify-center text-2xl font-bold opacity-20"
        style={{ color: suitColor }}
      >
        {SUIT_SYMBOLS[card.suit]}
      </div>

      <div
        className={`text-xs font-bold leading-none rotate-180 ${
          isRed ? 'text-red-500' : 'text-gray-900'
        }`}
      >
        <div>{card.value}</div>
        <div>{SUIT_SYMBOLS[card.suit]}</div>
      </div>

      <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-white/30 to-transparent pointer-events-none" />
    </motion.div>
  );
};

// ============================================================
// PLAYER SEAT COMPONENT
// ============================================================

const PlayerSeatComp: React.FC<{
  seat: PlayerSeat;
  isCurrentUser?: boolean;
}> = ({
  seat,
  isCurrentUser,
}) => {
  if (seat.status === 'empty') {
    return (
      <motion.div
        whileHover={{ scale: 1.05 }}
        className="flex flex-col items-center gap-1 cursor-pointer group"
      >
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-white/20 group-hover:border-amber-400/50 transition-colors flex items-center justify-center text-gray-500 group-hover:text-amber-400">
          <span className="text-lg">+</span>
        </div>

        <span className="text-xs text-gray-600 group-hover:text-gray-400">
          Empty
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative flex flex-col items-center gap-1 ${
        seat.isFolded ? 'opacity-40' : ''
      }`}
    >
      {seat.isCurrentTurn && (
        <div className="absolute -inset-2 rounded-2xl border-2 border-amber-400 animate-pulse" />
      )}

      <div className="relative">
        <Avatar
          username={seat.username || 'Bot'}
          avatarIndex={seat.avatarIndex || 0}
          size="md"
          showStatus
          isOnline
        />
      </div>

      <div className="text-center">
        <p
          className={`text-xs font-medium ${
            isCurrentUser
              ? 'text-amber-400'
              : 'text-white'
          } max-w-[80px] truncate`}
        >
          {isCurrentUser
            ? 'YOU'
            : seat.username}
        </p>

        <p className="text-emerald-400 text-xs font-mono">
          {formatChips(seat.chips)}
        </p>
      </div>

      {seat.cards.length > 0 && (
        <div className="flex gap-0.5">
          {seat.cards.map((card, i) => (
            <PlayingCard
              key={i}
              card={card}
              size="sm"
            />
          ))}
        </div>
      )}
    </motion.div>
  );
};

// ============================================================
// MAIN PAGE
// ============================================================

const BOT_ACTIONS = [
  'fold',
  'check',
  'call',
  'raise',
  'all-in',
] as const;

export const PokerTablePage: React.FC = () => {
  const { userProfile } = useAuth();

  // DEMO SAFE PROFILE
  const activeProfile =
    userProfile || DEMO_PROFILE;

  const [seats, setSeats] = useState<PlayerSeat[]>([]);
  const [communityCards, setCommunityCards] =
    useState<Card[]>([]);

  const [pot, setPot] = useState(0);

  const [phase, setPhase] =
    useState<GamePhase>('waiting');

  const [playerChips, setPlayerChips] =
    useState(activeProfile.demoChips);

  const [playerCards, setPlayerCards] =
    useState<Card[]>([]);

  const [raiseAmount, setRaiseAmount] =
    useState(200);

  const [gameStarted, setGameStarted] =
    useState(false);

  const [selectedTable, setSelectedTable] =
    useState<string | null>(null);

  const [timeLeft, setTimeLeft] =
    useState(30);

  const [currentBigBlind] =
    useState(50);

  const [isPlayerTurn, setIsPlayerTurn] =
    useState(false);

  const [showResults, setShowResults] =
    useState(false);

  const [winner, setWinner] =
    useState('');

  const [deck, setDeck] =
    useState<Card[]>([]);

  const TABLES = [
    {
      id: 't1',
      name: 'Beginner Table',
      blinds: '₹5/₹10',
      min: 500,
      max: 3000,
      players: 4,
      difficulty: 'Easy',
    },
    {
      id: 't2',
      name: 'Classic Texas',
      blinds: '₹25/₹50',
      min: 1000,
      max: 10000,
      players: 6,
      difficulty: 'Medium',
    },
    {
      id: 't3',
      name: 'High Rollers',
      blinds: '₹100/₹200',
      min: 5000,
      max: 50000,
      players: 5,
      difficulty: 'Hard',
    },
  ];

  const initGame = useCallback((tableId: string) => {
    const newDeck = shuffleDeck(createDeck());

    setDeck(newDeck);

    const demoSeats =
      generateDemoSeats(6);

    const playerSeat = {
      ...demoSeats[5],
      userId: activeProfile.uid,
      username: activeProfile.username,
      avatarIndex: activeProfile.avatarIndex,
      chips: playerChips,
      cards: [
        newDeck[0],
        newDeck[1],
      ],
      isBot: false,
      status: 'occupied' as const,
      isCurrentTurn: true,
    };

    const updatedSeats =
      demoSeats.map((seat, i) => {
        if (i === 5) {
          return playerSeat;
        }

        if (seat.status === 'occupied') {
          return {
            ...seat,
            cards: [
              {
                ...newDeck[i * 2 + 2],
                faceDown: true,
              },
              {
                ...newDeck[i * 2 + 3],
                faceDown: true,
              },
            ],
          };
        }

        return seat;
      });

    setSeats(updatedSeats);

    setCommunityCards([]);

    setPot(75);

    setPhase('pre-flop');

    setPlayerCards([
      newDeck[0],
      newDeck[1],
    ]);

    setGameStarted(true);

    setSelectedTable(tableId);

    setShowResults(false);

    setIsPlayerTurn(true);

    setTimeLeft(30);

    toast.success(
      '🎰 Demo game started!',
    );
  }, [
    activeProfile,
    playerChips,
  ]);

  useEffect(() => {
    if (
      !gameStarted ||
      !isPlayerTurn
    ) {
      return;
    }

    if (timeLeft <= 0) {
      handleAction('fold');
      return;
    }

    const timer =
      setTimeout(() => {
        setTimeLeft((t) => t - 1);
      }, 1000);

    return () => clearTimeout(timer);
  }, [
    timeLeft,
    gameStarted,
    isPlayerTurn,
  ]);

  const handleAction = (
    action:
      | 'fold'
      | 'check'
      | 'call'
      | 'raise'
      | 'all-in'
  ) => {
    if (!isPlayerTurn) {
      return;
    }

    setIsPlayerTurn(false);

    toast(
      `Action: ${action.toUpperCase()}`,
    );

    setTimeout(() => {
      const nextPhase: Record<
        GamePhase,
        GamePhase
      > = {
        waiting: 'pre-flop',
        'pre-flop': 'flop',
        flop: 'turn',
        turn: 'river',
        river: 'showdown',
        showdown: 'waiting',
      };

      const next =
        nextPhase[phase];

      setPhase(next);

      if (next === 'flop') {
        setCommunityCards([
          deck[10],
          deck[11],
          deck[12],
        ]);
      }

      if (next === 'turn') {
        setCommunityCards((c) => [
          ...c,
          deck[13],
        ]);
      }

      if (next === 'river') {
        setCommunityCards((c) => [
          ...c,
          deck[14],
        ]);
      }

      if (next === 'showdown') {
        const playerWon =
          Math.random() > 0.4;

        setWinner(
          playerWon
            ? 'You'
            : BOT_NAMES[
                Math.floor(
                  Math.random() *
                    BOT_NAMES.length
                )
              ]
        );

        setShowResults(true);
      }

      if (next !== 'showdown') {
        setIsPlayerTurn(true);
        setTimeLeft(30);
      }
    }, 2000);
  };

  if (!gameStarted) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="text-6xl mb-4">
            🎰
          </div>

          <h1 className="text-3xl font-bold text-white mb-2">
            Demo Poker Tables
          </h1>

          <p className="text-gray-400">
            Play instantly without login
          </p>
        </div>

        <div className="grid gap-4">
          {TABLES.map((table) => (
            <div
              key={table.id}
              className="glass rounded-2xl p-6"
            >
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="text-white font-bold text-lg">
                    {table.name}
                  </h3>

                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-gray-400 text-sm flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {table.blinds}
                    </span>

                    <span className="text-gray-400 text-sm flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {table.players}/6
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() =>
                    initGame(table.id)
                  }
                >
                  Join Demo
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="glass rounded-xl p-4 flex items-center gap-3">
          <div className="text-2xl">
            🪙
          </div>

          <div>
            <p className="text-white text-sm font-medium">
              Demo Mode Active
            </p>

            <p className="text-gray-400 text-xs">
              You have{' '}
              {formatChips(
                activeProfile.demoChips
              )}{' '}
              demo chips.
            </p>
          </div>

          <div className="ml-auto">
            <Badge variant="gold">
              DEMO
            </Badge>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-white text-xl font-bold">
              Demo Poker Table
            </h2>

            <p className="text-gray-400 text-sm">
              {GAME_PHASE_LABELS[phase]}
            </p>
          </div>

          <Button
            variant="danger"
            icon={
              <LogOut className="w-4 h-4" />
            }
            onClick={() => {
              setGameStarted(false);
              setPhase('waiting');
            }}
          >
            Leave
          </Button>
        </div>
      </div>

      <div className="poker-felt rounded-[40px] p-6 border-4 border-amber-800 min-h-[500px] flex flex-col justify-between">
        <div className="flex justify-around">
          {seats
            .slice(0, 3)
            .map((seat) => (
              <PlayerSeatComp
                key={seat.seatIndex}
                seat={seat}
              />
            ))}
        </div>

        <div className="text-center">
          <div className="flex justify-center gap-2 mb-4">
            {communityCards.map(
              (card, i) => (
                <PlayingCard
                  key={i}
                  card={card}
                />
              )
            )}
          </div>

          <div className="inline-flex px-6 py-2 rounded-full bg-black/40 border border-amber-500/40 text-amber-400 font-bold">
            POT ₹{pot}
          </div>
        </div>

        <div className="flex justify-around">
          {seats
            .slice(3, 6)
            .map((seat, i) => (
              <PlayerSeatComp
                key={seat.seatIndex}
                seat={seat}
                isCurrentUser={
                  i === 2
                }
              />
            ))}
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-gray-400 text-xs mb-2">
              Your Cards
            </p>

            <div className="flex gap-2">
              {playerCards.map(
                (card, i) => (
                  <PlayingCard
                    key={i}
                    card={card}
                    size="lg"
                  />
                )
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="danger"
              onClick={() =>
                handleAction('fold')
              }
            >
              Fold
            </Button>

            <Button
              variant="ghost"
              onClick={() =>
                handleAction('check')
              }
            >
              Check
            </Button>

            <Button
              variant="green"
              onClick={() =>
                handleAction('call')
              }
            >
              Call
            </Button>

            <Button
              variant="gold"
              onClick={() =>
                handleAction('raise')
              }
            >
              Raise
            </Button>

            <Button
              variant="purple"
              onClick={() =>
                handleAction('all-in')
              }
            >
              All In
            </Button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{
                scale: 0.7,
              }}
              animate={{
                scale: 1,
              }}
              className="glass rounded-3xl p-8 text-center max-w-sm w-full"
            >
              <div className="text-6xl mb-4">
                {winner === 'You'
                  ? '🏆'
                  : '😔'}
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">
                {winner === 'You'
                  ? 'You Win!'
                  : `${winner} Wins`}
              </h2>

              <p className="text-gray-400 mb-6">
                Pot: ₹{pot}
              </p>

              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={() => {
                    setShowResults(false);
                    setGameStarted(false);
                  }}
                >
                  Leave
                </Button>

                <Button
                  fullWidth
                  onClick={() => {
                    setShowResults(false);
                    initGame(
                      selectedTable ||
                        't1'
                    );
                  }}
                >
                  Play Again
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PokerTablePage;
