import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Coins, Star, Bomb, Banknote, Shield, Hash, Sparkles } from 'lucide-react';
import { PublicUser, MinesGameState, MinesTileState } from '../../types/game';
import { useLang } from '../../i18n/LanguageContext';

interface MinesViewProps {
  user: PublicUser | null;
  socket: any;
  onBack: () => void;
  onBalanceUpdate: (newBalance: number) => void;
  onOpenAuth: () => void;
}

export const MinesView: React.FC<MinesViewProps> = ({
  user,
  socket,
  onBack,
  onBalanceUpdate,
  onOpenAuth
}) => {
  const { t } = useLang();
  const [gameState, setGameState] = useState<MinesGameState | null>(null);
  const [mineCount, setMineCount] = useState<number>(3);
  const [betAmount, setBetAmount] = useState<number>(100);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showMultipliers, setShowMultipliers] = useState<boolean>(false);

  useEffect(() => {
    if (!socket) return;
    
    setLoading(true);
    socket.emit('mines:get-active', { userId: user?.id }, (res: any) => {
      setLoading(false);
      if (res?.state) {
        setGameState(res.state);
        setMineCount(res.state.mineCount);
        setBetAmount(res.state.betAmount);
      }
    });
  }, [socket]);

  // Derived state for backward compatibility with UI
  const currentMultiplier = gameState?.currentMultiplier ?? 1;
  const currentPayout = gameState?.currentPayout ?? 0;
  const nextMultiplier = gameState?.nextMultiplier ?? 1;

  const handleStart = () => {
    if (!user) {
      onOpenAuth();
      return;
    }
    
    if (betAmount <= 0) {
      setError(t('mines.badBet'));
      return;
    }

    setLoading(true);
    setError(null);
    socket.emit('mines:start', { userId: user?.id, betAmount, mineCount }, (res: any) => {
      setLoading(false);
      if (res.success) {
        setGameState(res.state);
        onBalanceUpdate(user.balance - betAmount);
      } else {
        setError(res.message || t('mines.startFail'));
      }
    });
  };

  const handleReveal = (tileIndex: number) => {
    if (!gameState || gameState.isGameOver || loading) return;
    
    const tile: MinesTileState = gameState.grid[tileIndex];
    if (tile !== 'hidden') return;

    setLoading(true);
    socket.emit('mines:reveal', { gameId: gameState.gameId, tileIndex }, (res: any) => {
      setLoading(false);
      if (res.success) {
        setGameState(res.state);
        if (res.state.isGameOver) {
          // Game ended, update balance if won
          if (res.state.isWin && user) {
            onBalanceUpdate(user.balance + (res.state.currentPayout || 0));
          }
        }
      } else {
        setError(res.message || t('mines.revealFail'));
      }
    });
  };

  const handleCashout = () => {
    if (!gameState || gameState.isGameOver || loading) return;

    setLoading(true);
    socket.emit('mines:cashout', { gameId: gameState.gameId }, (res: any) => {
      setLoading(false);
      if (res.success) {
        setGameState(res.state);
        if (user) {
          onBalanceUpdate(user.balance + (res.currentPayout || 0));
        }
      } else {
        setError(res.message || t('mines.cashoutFail'));
      }
    });
  };

  const handlePlayAgain = () => {
    setGameState(null);
    setError(null);
  };

  const isActive = gameState && !gameState.isGameOver;
  const isGameOver = gameState?.isGameOver === true;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-cyan-950/10 to-gray-950 text-white font-sans flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 bg-gray-900/50 border-b border-gray-800">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2"
        >
          <ArrowLeft size={20} />
          <span className="hidden sm:inline">{t('mines.back')}</span>
        </button>
        
        <div className="flex items-center gap-2 text-xl font-bold text-cyan-400">
          <Bomb className="text-cyan-500" />
          Mines
        </div>

        <div className="flex items-center gap-2 bg-gray-800/80 px-4 py-2 rounded-full border border-gray-700">
          <Coins className="text-yellow-400" size={18} />
          <span className="font-semibold text-yellow-400">
            {user ? user.balance.toLocaleString() : '---'} 🪙
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row p-4 gap-6 max-w-7xl mx-auto w-full">
        {/* Left Panel */}
        <div className="w-full lg:w-80 flex flex-col gap-4">
          <div className="bg-gray-900/60 p-5 rounded-2xl border border-gray-800 shadow-xl flex-1 flex flex-col">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            {!isActive && !isGameOver ? (
              <div className="flex flex-col gap-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
                    <Bomb size={16} /> {t('mines.mineCount')}
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {[1, 3, 5, 7, 10, 15, 20].map((n) => (
                      <button
                        key={n}
                        onClick={() => setMineCount(n)}
                        className={`flex-1 min-w-[3rem] py-2 rounded-lg text-sm font-semibold transition-colors ${
                          mineCount === n
                            ? 'bg-cyan-500 text-white shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="24"
                    value={mineCount}
                    onChange={(e) => setMineCount(parseInt(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                  <div className="text-right text-xs text-gray-500 mt-1">{mineCount} {t('mines.mines')}</div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
                    <Banknote size={16} /> {t('mines.betAmount')}
                  </label>
                  <div className="flex gap-2 bg-gray-950 p-1 rounded-xl border border-gray-800">
                    <button 
                      onClick={() => setBetAmount(Math.max(10, betAmount / 2))}
                      className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 font-bold"
                    >
                      /2
                    </button>
                    <input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(parseInt(e.target.value) || 0)}
                      className="w-full bg-transparent text-center font-bold text-lg focus:outline-none"
                    />
                    <button 
                      onClick={() => setBetAmount(betAmount * 2)}
                      className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 font-bold"
                    >
                      x2
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {[10, 50, 100, 500, 1000].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setBetAmount(amt)}
                        className="flex-1 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs font-medium text-gray-300"
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleStart}
                  disabled={loading}
                  className={`mt-auto w-full py-4 rounded-xl font-bold text-lg transition-all
                    ${user 
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-[0_0_20px_rgba(6,182,212,0.3)] active:scale-95' 
                      : 'bg-gray-800 text-gray-400 cursor-not-allowed'
                    } disabled:opacity-50`}
                >
                  {!user ? t('mines.loginToPlay') : loading ? t('mines.loading') : t('mines.start')}
                </button>
              </div>
            ) : isActive && gameState ? (
              <div className="flex flex-col h-full">
                <div className="text-center py-6 bg-gray-950/50 rounded-xl border border-gray-800 mb-6">
                  <div className="text-sm text-gray-400 mb-2">{t('mines.multiplier')}</div>
                  <motion.div 
                    key={currentMultiplier}
                    initial={{ scale: 1.5, color: '#22c55e' }}
                    animate={{ scale: 1, color: '#4ade80' }}
                    className="text-4xl font-black mb-1 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]"
                  >
                    x{currentMultiplier.toFixed(2)}
                  </motion.div>
                  <div className="text-gray-300 font-semibold">
                    {gameState.betAmount} × {currentMultiplier.toFixed(2)} = <span className="text-yellow-400">{((gameState.betAmount || 0) * currentMultiplier).toFixed(0)} 🪙</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-400 mb-8 px-2">
                  <div className="flex items-center gap-1">
                    <Star size={16} className="text-green-400" />
                    <span>{gameState.revealedCount} / {25 - gameState.mineCount} {t('mines.safe')}</span>
                  </div>
                  <div>{t('mines.next')}: <span className="text-white font-bold">x{nextMultiplier.toFixed(2)}</span></div>
                </div>

                <button
                  onClick={handleCashout}
                  disabled={loading || gameState.revealedCount === 0}
                  className="mt-auto w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all active:scale-95 disabled:opacity-50"
                >
                  <span className="block drop-shadow-md">{t('mines.cashout')} ({((gameState.betAmount || 0) * currentMultiplier).toFixed(0)}🪙)</span>
                </button>
              </div>
            ) : isGameOver && gameState ? (
              <div className="flex flex-col h-full">
                {gameState.isWin ? (
                  <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-6 text-center mb-6 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                    <Sparkles className="w-12 h-12 text-green-400 mx-auto mb-2" />
                    <div className="text-green-400 font-bold text-lg mb-1">{t('mines.youWin')}</div>
                    <div className="text-3xl font-black text-white mb-2">+{currentPayout.toFixed(0)} 🪙</div>
                    <div className="text-sm text-green-300/80">{t('mines.odd')}: x{currentMultiplier.toFixed(2)}</div>
                  </div>
                ) : (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 text-center mb-6 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                    <Bomb className="w-12 h-12 text-red-400 mx-auto mb-2" />
                    <div className="text-red-400 font-bold text-lg mb-1">{t('mines.boom')}</div>
                    <div className="text-xl font-black text-white mb-2">{t('mines.lost')} {gameState.betAmount} 🪙</div>
                  </div>
                )}

                <div className="bg-gray-950/50 rounded-lg p-4 mb-6">
                  <div className="text-xs text-gray-500 mb-2 flex items-center gap-1"><Shield size={12}/> {t('mines.fair')}</div>
                  <div className="space-y-2 text-[10px] font-mono break-all">
                    <div><span className="text-gray-400">Server Seed:</span> <span className="text-gray-300">{gameState.serverSeed || '---'}</span></div>
                    <div><span className="text-gray-400">Client Seed:</span> <span className="text-gray-300">{gameState.clientSeed || '---'}</span></div>
                    <div><span className="text-gray-400">Nonce:</span> <span className="text-gray-300">{gameState.nonce || '---'}</span></div>
                  </div>
                </div>

                <button
                  onClick={handlePlayAgain}
                  className="mt-auto w-full py-4 rounded-xl font-bold text-lg bg-gray-800 hover:bg-gray-700 text-white transition-all active:scale-95"
                >
                  {t('mines.playAgain')}
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Center Grid */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="bg-gray-900/80 p-4 sm:p-8 rounded-3xl border border-gray-800 shadow-2xl backdrop-blur-sm">
            <div className="grid grid-cols-5 gap-2 sm:gap-3">
              {Array.from({ length: 25 }).map((_, i) => {
                const tileState: MinesTileState = gameState?.grid?.[i] || 'hidden';
                const isClickable = !!isActive && tileState === 'hidden';
                
                return (
                  <button
                    key={i}
                    disabled={!isClickable || loading}
                    onClick={() => handleReveal(i)}
                    className={`relative w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl flex items-center justify-center text-2xl transition-all duration-300
                      ${!gameState ? 'bg-gray-800 border-b-4 border-gray-900 opacity-50' : ''}
                      ${tileState === 'hidden' ? 'bg-slate-700 border-b-4 border-slate-900 hover:brightness-110 shadow-inner' : ''}
                      ${tileState === 'star' ? 'bg-gradient-to-br from-green-500 to-emerald-700 shadow-inner' : ''}
                      ${tileState === 'mine' ? 'bg-gradient-to-br from-red-500 to-rose-700 shadow-inner' : ''}
                      ${isClickable ? 'cursor-pointer hover:scale-[1.02]' : 'cursor-default'}
                    `}
                  >
                    <AnimatePresence>
                      {tileState === 'star' && (
                        <motion.div
                          initial={{ scale: 0, rotate: -45 }}
                          animate={{ scale: 1, rotate: 0 }}
                          className="drop-shadow-lg text-white"
                        >
                          <Star className="fill-current" size={32} />
                        </motion.div>
                      )}
                      {tileState === 'mine' && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.4 }}
                          className="drop-shadow-lg text-gray-950"
                        >
                          <Bomb size={36} className="fill-current" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Multiplier Reference */}
          <div className="mt-8 w-full max-w-2xl text-center">
            <button 
              onClick={() => setShowMultipliers(!showMultipliers)}
              className="text-gray-500 hover:text-gray-300 text-sm flex items-center justify-center gap-1 mx-auto transition-colors"
            >
              <Hash size={14} /> {showMultipliers ? t('mines.hideTable') : t('mines.showTable')}
            </button>
            
            <AnimatePresence>
              {showMultipliers && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 overflow-x-auto bg-gray-900/50 rounded-xl border border-gray-800 p-4"
                >
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="text-gray-500 border-b border-gray-800">
                        <th className="pb-2 font-medium">{t('mines.stars')}</th>
                        <th className="pb-2 font-medium">x ({mineCount} 💣)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Simplified mock table for UI purpose */}
                      {[1, 2, 3, 4, 5, 10, 15].map(n => {
                        if (n > 25 - mineCount) return null;
                        return (
                          <tr key={n} className="border-b border-gray-800/50">
                            <td className="py-2 text-gray-400">{n}</td>
                            <td className="py-2 text-green-400 font-mono">x{(1 + n * 0.2 * mineCount).toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MinesView;
