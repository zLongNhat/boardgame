import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Coins, Bomb, Banknote, Shield, Trophy } from 'lucide-react';
import { PublicUser, GoalsGameState, GoalsFieldSize } from '../../types/game';
import { useLang } from '../../i18n/LanguageContext';
import type { DictKey } from '../../i18n/dict';

interface GoalsViewProps {
  user: PublicUser | null;
  socket: any;
  onBack: () => void;
  onBalanceUpdate: (newBalance: number) => void;
  onOpenAuth: () => void;
}

const FIELD_CONFIGS: Record<GoalsFieldSize, { rows: number; cols: number; labelKey: DictKey; maxMulti: string; name: GoalsFieldSize }> = {
  small: { rows: 3, cols: 4, labelKey: 'goals.simple', maxMulti: '4.91', name: 'small' },
  medium: { rows: 4, cols: 7, labelKey: 'goals.medium', maxMulti: '7.26', name: 'medium' },
  big: { rows: 5, cols: 10, labelKey: 'goals.hard', maxMulti: '9.03', name: 'big' }
};

export const GoalsView: React.FC<GoalsViewProps> = ({
  user,
  socket,
  onBack,
  onBalanceUpdate,
  onOpenAuth
}) => {
  const [gameState, setGameState] = useState<GoalsGameState | null>(null);
  const [fieldSize, setFieldSize] = useState<GoalsFieldSize>('medium');
  const [betAmount, setBetAmount] = useState<number>(100);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLang();

  useEffect(() => {
    if (!socket) return;

    setLoading(true);
    socket.emit('goals:get-active', { userId: user?.id }, (res: any) => {
      setLoading(false);
      if (res?.state) {
        setGameState(res.state);
        setFieldSize(res.state.fieldSize);
        setBetAmount(res.state.betAmount);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  const handleStart = () => {
    if (!user) {
      onOpenAuth();
      return;
    }

    if (betAmount <= 0) {
      setError(t('goals.badBet'));
      return;
    }

    setLoading(true);
    setError(null);
    socket.emit('goals:start', { userId: user.id, betAmount, fieldSize }, (res: any) => {
      setLoading(false);
      if (res.success) {
        setGameState(res.state);
        onBalanceUpdate(user.balance - betAmount);
      } else {
        setError(res.message || t('goals.startFail'));
      }
    });
  };

  const handleSelectRow = (rowIndex: number) => {
    if (!gameState || gameState.isGameOver || loading) return;

    setLoading(true);
    socket.emit('goals:select-row', { gameId: gameState.gameId, rowIndex }, (res: any) => {
      setLoading(false);
      if (res.success) {
        setGameState(res.state);
        if (res.state.isGameOver) {
          if (res.state.isWin && user) {
            onBalanceUpdate(user.balance + (res.state.currentPayout || 0));
          }
        }
      } else {
        setError(res.message || t('goals.pickFail'));
      }
    });
  };

  const handleCashout = () => {
    if (!gameState || gameState.isGameOver || loading) return;

    setLoading(true);
    socket.emit('goals:cashout', { gameId: gameState.gameId }, (res: any) => {
      setLoading(false);
      if (res.success) {
        setGameState(res.state);
        if (user) {
          onBalanceUpdate(user.balance + (res.payout || res.state?.currentPayout || 0));
        }
      } else {
        setError(res.message || t('goals.cashoutFail'));
      }
    });
  };

  const isActive = !!gameState && !gameState.isGameOver;
  const isGameOver = gameState?.isGameOver === true;
  const activeFieldSize: GoalsFieldSize = (isActive || isGameOver) && gameState ? gameState.fieldSize : fieldSize;
  const config = FIELD_CONFIGS[activeFieldSize];
  const rows = gameState?.rows ?? config.rows;
  const cols = gameState?.columns ?? config.cols;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-green-950/10 to-gray-950 text-white font-sans flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 bg-gray-900/50 border-b border-gray-800">
        <button onClick={onBack} className="p-2 hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2">
          <ArrowLeft size={20} />
          <span className="hidden sm:inline">{t('c.back')}</span>
        </button>

        <div className="flex items-center gap-2 text-xl font-bold text-green-400">
          <span>⚽ Goals</span>
        </div>

        <div className="flex items-center gap-2 bg-gray-800/80 px-4 py-2 rounded-full border border-gray-700">
          <Coins className="text-yellow-400" size={18} />
          <span className="font-semibold text-yellow-400">
            {user ? user.balance.toLocaleString() : '---'} 🪙
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col xl:flex-row p-4 gap-6 max-w-7xl mx-auto w-full">
        {/* Left Panel */}
        <div className="w-full xl:w-80 flex flex-col gap-4">
          <div className="bg-gray-900/60 p-5 rounded-2xl border border-gray-800 shadow-xl flex-1 flex flex-col">
            {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm mb-4">{error}</div>}

            {!isActive && !isGameOver ? (
              <div className="flex flex-col gap-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t('goals.fieldSize')}</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.values(FIELD_CONFIGS) as Array<{ rows: number; cols: number; labelKey: DictKey; maxMulti: string; name: GoalsFieldSize }>).map(cfg => (
                      <button
                        key={cfg.name}
                        onClick={() => setFieldSize(cfg.name)}
                        className={`p-2 rounded-xl border text-center transition-all ${
                          fieldSize === cfg.name
                            ? 'bg-green-500/20 border-green-500 text-green-400'
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        <div className="text-xs font-bold mb-1">{t(cfg.labelKey)}</div>
                        <div className="text-[10px] opacity-70">{cfg.rows}x{cfg.cols}</div>
                        <div className="text-[10px] text-yellow-400">x{cfg.maxMulti}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
                    <Banknote size={16} /> {t('goals.betAmount')}
                  </label>
                  <div className="flex gap-2 bg-gray-950 p-1 rounded-xl border border-gray-800">
                    <button onClick={() => setBetAmount(Math.max(10, betAmount / 2))} className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 font-bold">/2</button>
                    <input type="number" value={betAmount} onChange={(e) => setBetAmount(parseInt(e.target.value) || 0)} className="w-full bg-transparent text-center font-bold text-lg focus:outline-none" />
                    <button onClick={() => setBetAmount(betAmount * 2)} className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 font-bold">x2</button>
                  </div>
                </div>

                <button
                  onClick={handleStart}
                  disabled={loading}
                  className={`mt-auto w-full py-4 rounded-xl font-bold text-lg transition-all ${
                    user ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-[0_0_20px_rgba(34,197,94,0.3)] active:scale-95' : 'bg-gray-800 text-gray-400 cursor-not-allowed'
                  } disabled:opacity-50`}
                >
                  {!user ? t('goals.loginToPlay') : t('goals.start')}
                </button>
              </div>
            ) : isActive && gameState ? (
              <div className="flex flex-col h-full">
                <div className="text-center py-6 bg-gray-950/50 rounded-xl border border-gray-800 mb-6">
                  <div className="text-sm text-gray-400 mb-2">{t('goals.multiplier')}</div>
                  <motion.div key={gameState.currentMultiplier} initial={{ scale: 1.5, color: '#22c55e' }} animate={{ scale: 1, color: '#4ade80' }} className="text-4xl font-black mb-1 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]">
                    x{gameState.currentMultiplier?.toFixed(2)}
                  </motion.div>
                  <div className="text-gray-300 font-semibold">
                    {gameState.betAmount} × {gameState.currentMultiplier?.toFixed(2)} = <span className="text-yellow-400">{(gameState.currentPayout || 0).toFixed(0)} 🪙</span>
                  </div>
                </div>

                <div className="flex justify-between text-sm text-gray-400 mb-8 px-2">
                  <div>{t('goals.progress')}: <span className="text-white font-bold">{gameState.currentColumn} / {gameState.columns}</span></div>
                  <div>{t('goals.next')}: <span className="text-white font-bold">x{gameState.nextMultiplier?.toFixed(2)}</span></div>
                </div>

                <button
                  onClick={handleCashout}
                  disabled={loading || gameState.currentColumn === 0}
                  className="mt-auto w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-gray-900 shadow-[0_0_20px_rgba(234,179,8,0.4)] transition-all active:scale-95 disabled:opacity-50"
                >
                  {t('goals.cashout')} ({(gameState.currentPayout || 0).toFixed(0)}🪙)
                </button>
              </div>
            ) : isGameOver && gameState ? (
              <div className="flex flex-col h-full">
                {gameState.isWin ? (
                  <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-6 text-center mb-6 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                    <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
                    <div className="text-green-400 font-bold text-lg mb-1">{t('goals.win')}</div>
                    <div className="text-3xl font-black text-white mb-2">+{(gameState.currentPayout || 0).toFixed(0)} 🪙</div>
                  </div>
                ) : (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 text-center mb-6 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                    <Bomb className="w-12 h-12 text-red-400 mx-auto mb-2" />
                    <div className="text-red-400 font-bold text-lg mb-1">{t('goals.busted')}</div>
                    <div className="text-xl font-black text-white mb-2">{t('goals.lost')} {gameState.betAmount} 🪙</div>
                  </div>
                )}
                <div className="bg-gray-950/50 rounded-lg p-4 mb-6">
                  <div className="text-xs text-gray-500 mb-2 flex items-center gap-1"><Shield size={12}/> {t('goals.seed')}</div>
                  <div className="space-y-2 text-[10px] font-mono break-all">
                    <div><span className="text-gray-400">{t('c.server')}:</span> <span className="text-gray-300">{gameState.serverSeed || '---'}</span></div>
                    <div><span className="text-gray-400">{t('c.client')}:</span> <span className="text-gray-300">{gameState.clientSeed || '---'}</span></div>
                  </div>
                </div>
                <button onClick={() => setGameState(null)} className="mt-auto w-full py-4 rounded-xl font-bold text-lg bg-gray-800 hover:bg-gray-700 text-white transition-all active:scale-95">{t('goals.playAgain')}</button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Center Grid - Football Pitch */}
        <div className="flex-1 flex flex-col items-center justify-center overflow-x-auto min-h-[500px]">
          <div className="relative p-6 sm:p-10 rounded-3xl bg-gradient-to-b from-green-800 to-green-900 border-4 border-green-700 shadow-2xl flex items-center gap-2 sm:gap-4 overflow-hidden">
            {/* Field markings */}
            <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-white/20"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border-4 border-white/20"></div>

            {Array.from({ length: cols }).map((_, colIndex) => {
              const isPast = gameState ? colIndex < gameState.currentColumn : false;
              const isCurrent = gameState ? colIndex === gameState.currentColumn && isActive : colIndex === 0 && !gameState;
              void isPast;

              return (
                <div key={colIndex} className="flex flex-col gap-2 relative z-10">
                  {Array.from({ length: rows }).map((_, rowIndex) => {
                    const cell = gameState?.grid?.[colIndex]?.[rowIndex] ?? 'hidden';
                    const canClick = !!isCurrent && isActive;

                    return (
                      <button
                        key={rowIndex}
                        disabled={!canClick || loading}
                        onClick={() => handleSelectRow(rowIndex)}
                        className={`relative w-12 h-10 sm:w-16 sm:h-12 rounded-lg flex items-center justify-center text-xl transition-all duration-300
                          ${canClick ? 'bg-white/10 hover:bg-white/30 cursor-pointer border border-white/30 shadow-[0_0_10px_rgba(255,255,255,0.2)]' : ''}
                          ${!canClick ? 'bg-black/20 border border-transparent' : ''}
                          ${cell === 'safe' ? 'bg-green-500/50 border-green-400' : ''}
                          ${cell === 'bomb' ? 'bg-red-500/50 border-red-400' : ''}
                        `}
                      >
                        <AnimatePresence mode="popLayout">
                          {cell === 'safe' && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="drop-shadow-lg">⚽</motion.div>
                          )}
                          {cell === 'bomb' && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="drop-shadow-lg">💥</motion.div>
                          )}
                        </AnimatePresence>
                      </button>
                    );
                  })}
                </div>
              );
            })}

            {/* Goal Net Right */}
            <div className="absolute right-0 top-1/4 bottom-1/4 w-8 border-l-4 border-white/40 bg-white/10 rounded-l-xl flex items-center justify-center">
              <div className="w-full h-full bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_25%,rgba(255,255,255,0.2)_50%,transparent_50%,transparent_75%,rgba(255,255,255,0.2)_75%,rgba(255,255,255,0.2)_100%)] bg-[length:10px_10px]"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoalsView;
