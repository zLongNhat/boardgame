import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Coins, Dice3, Shield, Hash, Users, Clock, Trophy, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { PublicUser, TaiXiuState, TaiXiuPhase, TaiXiuBetType, TaiXiuDice, TaiXiuBet } from '../../types/game';
import { useLang } from '../../i18n/LanguageContext';
import TaiXiuRoadmap from './TaiXiuRoadmap';
import DiceSqueeze from './DiceSqueeze';

interface TaiXiuViewProps {
  user: PublicUser | null;
  socket: any;
  onBack: () => void;
  onBalanceUpdate: (newBalance: number) => void;
  onOpenAuth: () => void;
}

const CHIP_VALUES = [10, 50, 100, 500, 1000, 5000];

// Helper to convert TaiXiuBet[] to { tai: number, xiu: number }
const betsToObject = (bets: TaiXiuBet[] | undefined) => {
  const obj = { tai: 0, xiu: 0 };
  (bets || []).forEach(bet => {
    if (bet.betType === 'tai') obj.tai += bet.amount;
    else if (bet.betType === 'xiu') obj.xiu += bet.amount;
  });
  return obj;
};

// Lấy cược của chính mình: ưu tiên myBets, fallback lọc từ bets theo userId
const getMyBets = (s: TaiXiuState, userId?: string): TaiXiuBet[] => {
  if (s.myBets && s.myBets.length >= 0 && (s.myBets.length > 0 || !s.bets)) return s.myBets;
  if (s.currentBets && s.currentBets.length > 0) return s.currentBets.filter(b => !userId || b.userId === userId);
  if (s.bets && userId) return s.bets.filter(b => b.userId === userId);
  return s.bets || s.myBets || s.currentBets || [];
};

// Helper to compute timeRemaining from phaseEndsAt
const getTimeRemaining = (phaseEndsAt: number): number => {
  return Math.max(0, phaseEndsAt - Date.now());
};

export default function TaiXiuView({ user, socket, onBack, onBalanceUpdate, onOpenAuth }: TaiXiuViewProps) {
  const { t } = useLang();
  const [state, setState] = useState<TaiXiuState | null>(null);
  const [selectedBetType, setSelectedBetType] = useState<TaiXiuBetType | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number>(CHIP_VALUES[0]);
  const [showRoadmap, setShowRoadmap] = useState(true);
  const [copiedHash, setCopiedHash] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!socket) return;
    socket.emit('taixiu:join');

    socket.on('taixiu:state', (newState: TaiXiuState) => {
      setState(newState);
    });

    socket.on('taixiu:phase-change', (data: { phase: TaiXiuPhase; phaseEndsAt: number }) => {
      setState(prev => prev ? { ...prev, phase: data.phase, phaseEndsAt: data.phaseEndsAt } : null);
    });

    socket.on('taixiu:result', (data: { dice: TaiXiuDice, rawString: string, result: 'tai' | 'xiu' | 'bao' }) => {
      setState(prev => prev ? { 
        ...prev, 
        dice: data.dice, 
        rawString: data.rawString,
        result: data.result
      } : null);
    });

    socket.on('taixiu:bet-confirmed', (data: { success: boolean, newBalance: number, message: string }) => {
      if (data.success) {
        onBalanceUpdate(data.newBalance);
        setMessage({ text: data.message, type: 'success' });
      } else {
        setMessage({ text: data.message, type: 'error' });
      }
      setTimeout(() => setMessage(null), 3000);
    });

    return () => {
      socket.emit('taixiu:leave');
      socket.off('taixiu:state');
      socket.off('taixiu:phase-change');
      socket.off('taixiu:result');
      socket.off('taixiu:bet-confirmed');
    };
  }, [socket, onBalanceUpdate]);

  // Client-side timer countdown using phaseEndsAt
  useEffect(() => {
    if (!state?.phaseEndsAt) return;
    const interval = setInterval(() => {
      setState(prev => prev ? { ...prev } : null); // Trigger re-render to update timeRemaining display
    }, 1000);
    return () => clearInterval(interval);
  }, [state?.phaseEndsAt]);

  const handlePlaceBet = () => {
    if (!user) {
      onOpenAuth();
      return;
    }
    if (!selectedBetType) {
      setMessage({ text: t('tx.pickDoor'), type: 'error' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    socket.emit('taixiu:place-bet', { userId: user.id, displayName: user.displayName, betType: selectedBetType, amount: selectedAmount }, (res: any) => {
      if (res?.success) {
        if (typeof res.newBalance === 'number') onBalanceUpdate(res.newBalance);
        setMessage({ text: res.message || t('tx.betOk'), type: 'success' });
      } else {
        setMessage({ text: res?.message || t('tx.betFail'), type: 'error' });
      }
      setTimeout(() => setMessage(null), 3000);
    });
  };

  const copyHash = () => {
    if (state?.md5Hash) {
      navigator.clipboard.writeText(state.md5Hash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  if (!state) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">{t('c.loading')}</div>;

  const getPhaseColor = () => {
    switch (state.phase) {
      case 'betting': return 'bg-green-500';
      case 'shaking': return 'bg-amber-500';
      case 'revealing': return 'bg-purple-500';
      case 'settling': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getPhaseName = () => {
    switch (state.phase) {
      case 'betting': return t('tx.betting');
      case 'shaking': return t('tx.shaking');
      case 'revealing': return t('tx.revealing');
      case 'settling': return t('tx.settling');
      default: return t('tx.waiting');
    }
  };

  // Computed values from phaseEndsAt
  const timeRemaining = getTimeRemaining(state.phaseEndsAt);
  const phaseDuration = state.phase === 'betting' ? 30000 : state.phase === 'shaking' ? 5000 : state.phase === 'revealing' ? 15000 : 5000;
  const myBetTotals = betsToObject(getMyBets(state, user?.id));
  const isOpen = (state.phase === 'revealing' || state.phase === 'settling') && !!state.dice;
  // Bên thắng nháy xanh: Tài/Xỉu thường, hoặc cửa nổ hũ (1-1-1 → Xỉu, 6-6-6 → Tài)
  const winSide: 'tai' | 'xiu' | null = !isOpen
    ? null
    : state.result === 'tai' ? 'tai'
    : state.result === 'xiu' ? 'xiu'
    : state.dice && state.dice.d1 === state.dice.d2 && state.dice.d2 === state.dice.d3
      ? (state.dice.d1 === 1 ? 'xiu' : state.dice.d1 === 6 ? 'tai' : null)
      : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-purple-950/20 to-gray-950 text-white flex flex-col font-sans">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 bg-gray-900/50 backdrop-blur border-b border-gray-800 z-10 relative">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-800 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Dice3 className="text-purple-400" /> {t('tx.title')}
          </h1>
          <div className="hidden sm:flex items-center gap-1 text-gray-400 bg-gray-800/50 px-3 py-1 rounded-full text-sm">
            <Users size={14} /> {state.onlineCount || 0}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-full border border-gray-700">
              <Coins className="text-yellow-400" size={20} />
              <span className="font-bold">{user.balance.toLocaleString()} 💎</span>
            </div>
          ) : (
            <button onClick={onOpenAuth} className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-full font-semibold transition-colors">
              {t('top.login')}
            </button>
          )}
        </div>
      </div>

      {/* Phase Timer Bar */}
      <div className="relative h-1 bg-gray-800">
        <motion.div 
          className={`absolute top-0 left-0 h-full ${getPhaseColor()}`}
          initial={{ width: '100%' }}
          animate={{ width: `${Math.max(0, (timeRemaining / phaseDuration) * 100)}%` }}
          transition={{ ease: "linear", duration: 1 }}
        />
      </div>
      <div className="flex justify-center -mt-4 z-10 relative">
        <div className={`px-6 py-2 rounded-full border-4 border-gray-950 ${getPhaseColor()} font-bold text-lg shadow-lg flex items-center gap-2`}>
          <Clock size={18} />
          <span>{getPhaseName()}</span>
          <span className="ml-2 bg-black/30 px-2 py-0.5 rounded text-white">{Math.ceil(timeRemaining / 1000)}s</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start p-4 w-full relative">
        
        {/* Toast Message */}
        <AnimatePresence>
          {message && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`absolute top-4 z-50 px-6 py-3 rounded-lg font-medium shadow-xl border ${message.type === 'success' ? 'bg-green-900/80 border-green-500 text-green-100' : 'bg-red-900/80 border-red-500 text-red-100'}`}
            >
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* MD5 Display */}
        <div className="mt-4 mb-8 text-center bg-gray-900/60 p-4 rounded-xl border border-gray-800 backdrop-blur w-full">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="flex items-center gap-2"><Shield size={16} /> {t('tx.md5')}</span>
            <button onClick={copyHash} className="hover:text-white flex items-center gap-1 transition-colors">
              {copiedHash ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              <span className="text-xs">{copiedHash ? t('tx.copied') : t('tx.copy')}</span>
            </button>
          </div>
          <div className="font-mono text-sm sm:text-base text-gray-300 break-all bg-black/40 p-3 rounded-lg border border-gray-800/50">
            {state.md5Hash || t('tx.creating')}
          </div>
          {(state.phase === 'revealing' || state.phase === 'settling') && state.rawString && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 text-sm"
            >
              <div className="text-gray-400 mb-1 flex items-center justify-center gap-1"><Hash size={14} /> {t('tx.rawString')}</div>
              <div className="font-mono text-green-400 break-all bg-black/40 p-2 rounded border border-green-900/30">
                {state.rawString}
              </div>
            </motion.div>
          )}
        </div>

        {/* Hũ Jackpot */}
        <div className="mb-8 text-center bg-gradient-to-r from-amber-950/60 via-yellow-900/40 to-amber-950/60 p-4 rounded-xl border border-amber-500/30 backdrop-blur w-full shadow-[0_0_25px_rgba(234,179,8,0.15)]">
          <div className="flex items-center justify-center gap-2 text-amber-300 font-black text-lg">
            <Trophy size={20} className="text-yellow-400" />
            {t('tx.jackpot')}: {(state.jackpotPool || 0).toLocaleString('vi-VN')} 🪙
          </div>
          <div className="text-[11px] text-amber-200/70 mt-1">
            {t('tx.jackpotNote')}
          </div>
          {state.lastJackpot && (
            <div className="mt-2 text-xs font-bold text-green-300 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2 animate-pulse">
              {t('tx.jpBanner', { round: state.lastJackpot.roundId, dice: `${state.lastJackpot.dice.d1}-${state.lastJackpot.dice.d2}-${state.lastJackpot.dice.d3}`, n: state.lastJackpot.winnerCount, pool: state.lastJackpot.sharedPool.toLocaleString('vi-VN'), each: state.lastJackpot.shareEach.toLocaleString('vi-VN') })}
            </div>
          )}
        </div>

        {/* Dice Area */}
        <div className="relative w-full max-w-3xl aspect-[2/1] sm:aspect-[3/1] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900/20 via-gray-900/40 to-transparent rounded-3xl mb-8 flex items-center justify-center">
          <DiceSqueeze phase={state.phase} dice={state.dice} onQuickReveal={() => {}} />
        </div>

        {/* Total & Result Badge */}
        <AnimatePresence>
          {(state.phase === 'revealing' || state.phase === 'settling') && state.dice && state.result && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="flex flex-col items-center mb-8"
            >
              <div className="text-6xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                {state.dice.total}
              </div>
              <div className={`mt-2 px-8 py-2 rounded-full text-2xl font-bold uppercase tracking-widest border-2 shadow-[0_0_20px_rgba(0,0,0,0.5)]
                ${state.result === 'tai' ? 'bg-red-600 border-red-400 text-white' : 
                  state.result === 'xiu' ? 'bg-blue-600 border-blue-400 text-white' : 
                  'bg-yellow-500 border-yellow-300 text-black'}`}>
                {state.result === 'tai' ? t('tx.tai') : state.result === 'xiu' ? t('tx.xiu') : 'BÃO'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Betting Panel — chỉ 2 cửa Tài / Xỉu, trả 1:1.95 */}
        <div className={`w-full transition-opacity duration-300 ${state.phase === 'betting' ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
          <div className="grid grid-cols-2 gap-3 sm:gap-6 mb-6">
            {/* TÀI */}
            <button
              onClick={() => setSelectedBetType('tai')}
              className={`relative flex flex-col items-center justify-center py-6 sm:py-8 rounded-2xl border-2 transition-all ${
                winSide === 'tai'
                  ? 'bg-green-900/80 border-green-400 shadow-[0_0_40px_rgba(34,197,94,0.6)] animate-pulse'
                  : selectedBetType === 'tai'
                    ? 'bg-red-900/80 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)] transform scale-[1.02]'
                    : 'bg-red-950/40 border-red-900/50 hover:bg-red-900/60'
              }`}
            >
              <span className="text-3xl sm:text-5xl font-black text-red-500 mb-2">{t('tx.tai')}</span>
              <span className="text-red-200/60 font-medium">{t('tx.taiRange')}</span>
              <span className="absolute top-3 right-3 text-xs font-bold text-red-300 bg-red-950 px-2 py-1 rounded">{t('tx.odds')}</span>
              {myBetTotals.tai > 0 && <div className="mt-2 text-yellow-400 font-bold bg-black/40 px-3 py-1 rounded-full text-sm">{t('tx.betted')}: {myBetTotals.tai}</div>}
              {state.totalTai ? <div className="absolute bottom-2 left-0 right-0 text-center text-xs text-gray-400">{t('tx.total')}: {state.totalTai}</div> : null}
            </button>

            {/* XỈU */}
            <button
              onClick={() => setSelectedBetType('xiu')}
              className={`relative flex flex-col items-center justify-center py-6 sm:py-8 rounded-2xl border-2 transition-all ${
                winSide === 'xiu'
                  ? 'bg-green-900/80 border-green-400 shadow-[0_0_40px_rgba(34,197,94,0.6)] animate-pulse'
                  : selectedBetType === 'xiu'
                    ? 'bg-blue-900/80 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.3)] transform scale-[1.02]'
                    : 'bg-blue-950/40 border-blue-900/50 hover:bg-blue-900/60'
              }`}
            >
              <span className="text-3xl sm:text-5xl font-black text-blue-500 mb-2">{t('tx.xiu')}</span>
              <span className="text-blue-200/60 font-medium">{t('tx.xiuRange')}</span>
              <span className="absolute top-3 right-3 text-xs font-bold text-blue-300 bg-blue-950 px-2 py-1 rounded">{t('tx.odds')}</span>
              {myBetTotals.xiu > 0 && <div className="mt-2 text-yellow-400 font-bold bg-black/40 px-3 py-1 rounded-full text-sm">{t('tx.betted')}: {myBetTotals.xiu}</div>}
              {state.totalXiu ? <div className="absolute bottom-2 left-0 right-0 text-center text-xs text-gray-400">{t('tx.total')}: {state.totalXiu}</div> : null}
            </button>
          </div>
          <p className="text-center text-[11px] text-gray-500 mb-4">
            {t('tx.ruleNote')}
          </p>

          <div className="bg-gray-900/80 p-4 sm:p-6 rounded-2xl border border-gray-800">
            {!user ? (
              <div className="text-center py-4">
                <p className="text-gray-400 mb-4">{t('tx.needLogin')}</p>
                <button onClick={onOpenAuth} className="bg-purple-600 hover:bg-purple-700 px-8 py-3 rounded-full font-bold transition-colors">
                  {t('tx.loginNow')}
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="flex-1 w-full">
                  <div className="text-sm text-gray-400 mb-3 font-medium uppercase tracking-wider">{t('tx.chooseBet')}</div>
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    {CHIP_VALUES.map(val => (
                      <button
                        key={val}
                        onClick={() => setSelectedAmount(val)}
                        className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full font-bold shadow-lg transition-all border-4 flex items-center justify-center ${
                          selectedAmount === val 
                            ? 'bg-white border-purple-500 text-purple-900 scale-110 z-10 shadow-[0_0_15px_rgba(168,85,247,0.5)]' 
                            : 'bg-gray-800 border-gray-600 text-white hover:bg-gray-700 hover:border-gray-500'
                        }`}
                      >
                        {val >= 1000 ? `${val/1000}k` : val}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="w-full sm:w-auto flex flex-col gap-2">
                  <button 
                    onClick={handlePlaceBet}
                    disabled={!selectedBetType}
                    className={`w-full sm:w-48 py-4 rounded-xl font-black text-lg transition-all ${
                      selectedBetType 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white shadow-lg shadow-green-500/30' 
                        : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {t('tx.placeBet')}
                  </button>
                  <div className="text-center text-sm font-medium text-gray-300">
                    {t('tx.betLabel')}: <span className="text-yellow-400">{selectedAmount.toLocaleString()} 💎</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Roadmap Section */}
      <div className="bg-gray-900 border-t border-gray-800">
        <button 
          onClick={() => setShowRoadmap(!showRoadmap)}
          className="w-full py-3 flex items-center justify-center gap-2 text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors"
        >
          <Trophy size={18} /> {t('tx.roadmap')} {showRoadmap ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
        </button>
        <AnimatePresence>
          {showRoadmap && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 border-t border-gray-800/50">
                <TaiXiuRoadmap history={state.history || []} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
