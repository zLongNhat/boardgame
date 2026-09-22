import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plane } from 'lucide-react';
import { PublicUser } from '../../types/game';
import { useLang } from '../../i18n/LanguageContext';
import { AmountPicker, TopBar, fmt } from './shared';

interface Props {
  user: PublicUser | null;
  socket: any;
  onBack: () => void;
  onBalanceUpdate: (b: number) => void;
  onOpenAuth: () => void;
}

interface AvState {
  phase: 'waiting' | 'flying' | 'crashed';
  roundId: string;
  multiplier: number;
  crashPoint?: number;
  endsAt?: number;
  bets: Array<{ displayName: string; amount: number; cashedOut: boolean; cashoutMult?: number }>;
  history: number[];
}

export const AviatorView: React.FC<Props> = ({ user, socket, onBack, onBalanceUpdate, onOpenAuth }) => {
  const { t } = useLang();
  const [st, setSt] = useState<AvState | null>(null);
  const [amount, setAmount] = useState(50);
  const [error, setError] = useState('');
  const [myBet, setMyBet] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!socket) return;
    socket.emit('aviator:join');
    const onState = (s: AvState) => {
      setSt(s);
      if (s.phase !== 'flying') setMyBet((prev) => (s.phase === 'waiting' ? prev : false));
      if (s.phase === 'waiting') setMyBet(false);
    };
    socket.on('aviator:state', onState);
    const iv = setInterval(() => setNow(Date.now()), 500);
    return () => {
      socket.emit('aviator:leave');
      socket.off('aviator:state', onState);
      clearInterval(iv);
    };
  }, [socket]);

  const bet = () => {
    if (!user) return onOpenAuth();
    if (!socket) return;
    setError('');
    socket.emit('aviator:bet', { userId: user.id, displayName: user.displayName, amount }, (res: any) => {
      if (!res?.success) {
        setError(res?.message || t('av.betFail'));
        return;
      }
      if (typeof res.newBalance === 'number') onBalanceUpdate(res.newBalance);
      setMyBet(true);
    });
  };

  const cashout = () => {
    if (!user || !socket) return;
    socket.emit('aviator:cashout', { userId: user.id }, (res: any) => {
      if (!res?.success) {
        setError(res?.message || t('av.cashoutFail'));
        return;
      }
      if (typeof res.newBalance === 'number') onBalanceUpdate(res.newBalance);
      setMyBet(false);
    });
  };

  const mult = st?.multiplier || 1;
  const flying = st?.phase === 'flying';
  const waiting = st?.phase === 'waiting';
  // Vị trí máy bay theo đường cong
  const px = Math.min(88, 8 + mult * 9);
  const py = Math.max(8, 82 - mult * 11);
  const waitSecs = st?.endsAt ? Math.max(0, Math.ceil((st.endsAt - now) / 1000)) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-sky-950/30 to-gray-950 text-white font-sans flex flex-col">
      <TopBar title={t('av.title')} icon={<Plane className="text-sky-400" />} user={user} onBack={onBack} />
      <div className="flex-1 flex flex-col items-center gap-4 p-4 w-full">
        {/* Lịch sử nổ */}
        <div className="flex gap-1.5 flex-wrap justify-center w-full">
          {(st?.history || []).map((h, i) => (
            <span key={i} className={`text-[11px] font-black px-2 py-1 rounded-full ${h < 2 ? 'bg-blue-500/20 text-blue-300' : h < 10 ? 'bg-purple-500/20 text-purple-300' : 'bg-pink-500/30 text-pink-300'}`}>
              {h.toFixed(2)}x
            </span>
          ))}
        </div>

        <div className="w-full grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
        {/* Đường bay */}
        <div className="lg:col-span-3 relative w-full h-72 sm:h-96 rounded-3xl bg-gray-900/60 border border-gray-800 overflow-hidden">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M 8 85 Q 40 80 88 8" fill="none" stroke={st?.phase === 'crashed' ? '#f43f5e' : '#38bdf8'} strokeWidth="1.2" strokeDasharray="3 2" opacity="0.7" />
          </svg>
          <motion.div
            className="absolute text-4xl"
            animate={{ left: `${px}%`, top: `${py}%` }}
            transition={{ duration: 0.12, ease: 'linear' }}
            style={{ transform: 'translate(-50%, -50%)' }}
          >
            {st?.phase === 'crashed' ? '💥' : '✈️'}
          </motion.div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className={`text-5xl sm:text-6xl font-black drop-shadow-[0_0_20px_rgba(56,189,248,0.5)] ${st?.phase === 'crashed' ? 'text-rose-500' : 'text-white'}`}>
              {st?.phase === 'waiting' ? `${waitSecs}s` : `${mult.toFixed(2)}x`}
            </span>
          </div>
          {st?.phase === 'crashed' && st.crashPoint && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-rose-300 font-bold text-sm bg-rose-900/40 px-4 py-1.5 rounded-full border border-rose-500/40">
              {t('av.crashedAt')} {st.crashPoint.toFixed(2)}x
            </div>
          )}
        </div>

        {error && <div className="lg:col-span-3 text-rose-400 text-sm font-bold text-center">{error}</div>}

        <div className="lg:col-span-2 flex flex-col gap-4 w-full lg:sticky lg:top-20">
        {/* Cược / rút */}
        <div className="w-full bg-gray-900/60 p-5 rounded-2xl border border-gray-800 flex flex-col gap-4">
          {!myBet ? (
            <>
              <AmountPicker value={amount} onChange={setAmount} />
              <button
                onClick={bet}
                disabled={!waiting}
                className={`py-4 rounded-xl font-black text-lg ${waiting ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
              >
                {waiting ? `${t('av.betNext')} • ${amount} 🪙` : t('av.waitNew')}
              </button>
            </>
          ) : (
            <button
              onClick={cashout}
              disabled={!flying}
              className={`py-4 rounded-xl font-black text-xl ${flying ? 'bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black animate-pulse' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
            >
              {flying ? `${t('av.cashout')} • ${fmt(Math.floor(amount * mult))} 🪙 (x${mult.toFixed(2)})` : t('av.betted')}
            </button>
          )}
        </div>

        {/* Bảng cược */}
        <div className="w-full bg-gray-900/60 rounded-2xl border border-gray-800 p-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t('av.players')} ({st?.bets.length || 0})</div>
          <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
            {(st?.bets || []).map((b, i) => (
              <div key={i} className="flex items-center justify-between text-sm bg-gray-950/50 rounded-lg px-3 py-1.5">
                <span className="font-bold truncate">{b.displayName}</span>
                <span className="text-gray-400">{fmt(b.amount)} 🪙</span>
                <span className={`font-black ${b.cashedOut ? 'text-green-400' : 'text-gray-500'}`}>
                  {b.cashedOut ? `${t('av.outTag')}${b.cashoutMult?.toFixed(2)}` : flying ? `x${mult.toFixed(2)}` : t('av.waitingTag')}
                </span>
              </div>
            ))}
            {(st?.bets.length || 0) === 0 && <span className="text-xs text-gray-600 italic">{t('av.nobody')}</span>}
          </div>
        </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default AviatorView;
