import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CircleDot } from 'lucide-react';
import { PublicUser } from '../../types/game';
import { useLang } from '../../i18n/LanguageContext';
import { AmountPicker, FairBox, TopBar, fmt } from './shared';

interface Props {
  user: PublicUser | null;
  socket: any;
  onBack: () => void;
  onBalanceUpdate: (b: number) => void;
  onOpenAuth: () => void;
}

const ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const POCKET = 360 / 37;

type BetKind = 'red' | 'black' | 'odd' | 'even' | 'high' | 'low' | 'number';

export const RouletteView: React.FC<Props> = ({ user, socket, onBack, onBalanceUpdate, onOpenAuth }) => {
  const { t } = useLang();
  const [amount, setAmount] = useState(50);
  const [kind, setKind] = useState<BetKind>('red');
  const [num, setNum] = useState(7);
  const [spinning, setSpinning] = useState(false);
  const [angle, setAngle] = useState(0);
  const [last, setLast] = useState<any>(null);
  const [error, setError] = useState('');

  const spin = () => {
    if (!user) return onOpenAuth();
    if (!socket || spinning) return;
    setError('');
    socket.emit('casino:roulette:bet', { userId: user.id, betType: kind, number: kind === 'number' ? num : undefined, amount }, (res: any) => {
      if (!res?.success) {
        setError(res?.message || t('ro.betFail'));
        return;
      }
      if (typeof res.newBalance === 'number') onBalanceUpdate(res.newBalance);
      // Quay tới đúng ô thắng: thêm 5 vòng cho đẹp
      const target = 360 * 5 - res.wheelIndex * POCKET;
      setSpinning(true);
      setAngle((a) => a + ((target - (a % 360) + 360) % 360) + 360 * 5);
      setTimeout(() => {
        setSpinning(false);
        setLast(res);
      }, 4200);
    });
  };

  const cellColor = (n: number) => (n === 0 ? 'bg-green-600' : RED.has(n) ? 'bg-red-600' : 'bg-gray-900');

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-emerald-950/20 to-gray-950 text-white font-sans flex flex-col -m-0">
      <TopBar title={t('ro.title')} icon={<CircleDot className="text-emerald-400" />} user={user} onBack={onBack} />
      <div className="flex-1 flex flex-col gap-6 p-4 w-full">
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Vòng quay */}
        <div className="flex flex-col items-center gap-4">
        <div className="relative w-72 h-72 sm:w-80 sm:h-80">
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 text-3xl">🔻</div>
          <motion.div
            className="relative w-full h-full rounded-full border-8 border-amber-600 shadow-[0_0_50px_rgba(0,0,0,0.7)] overflow-hidden"
            animate={{ rotate: angle }}
            transition={spinning ? { duration: 4, ease: [0.15, 0.9, 0.25, 1] } : { duration: 0.2 }}
          >
            {ORDER.map((n, i) => (
              <div
                key={n}
                className={`absolute left-1/2 top-1/2 flex items-start justify-center ${cellColor(n)} border-r border-white/10`}
                style={{
                  width: 24,
                  height: '50%',
                  transformOrigin: '50% 100%',
                  transform: `translate(-50%, -100%) rotate(${i * POCKET}deg)`,
                  clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                }}
              >
                <span className="text-[10px] font-black mt-1" style={{ transform: `rotate(${-i * POCKET}deg)` }}>{n}</span>
              </div>
            ))}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 border-4 border-amber-800 flex items-center justify-center text-2xl font-black text-black z-10">
              🎡
            </div>
          </motion.div>
        </div>

        {last && (
          <div className={`px-6 py-3 rounded-2xl font-black text-xl border-2 text-center ${last.win ? 'bg-green-900/60 border-green-400 text-green-200 animate-pulse' : 'bg-gray-900/60 border-gray-700 text-gray-300'}`}>
            Số {last.winningNumber} ({last.color === 'red' ? t('ro.colorRed') : last.color === 'black' ? t('ro.colorBlack') : t('ro.colorGreen')})
            {last.win ? ` — ${t('ro.win')} +${fmt(last.payout)} 🪙` : ` — ${t('ro.loseNext')}`}
          </div>
        )}
        {error && <div className="text-rose-400 text-sm font-bold text-center">{error}</div>}
        </div>

        {/* Chọn cửa */}
        <div className="w-full bg-gray-900/60 p-5 rounded-2xl border border-gray-800 flex flex-col gap-4 lg:sticky lg:top-20">
          <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
            {(['red', 'black', 'odd', 'even', 'high', 'low', 'number'] as BetKind[]).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`py-2.5 rounded-xl text-xs font-black border transition-all ${
                  kind === k ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300' : 'border-gray-700 bg-gray-950/50 text-gray-400 hover:border-gray-500'
                }`}
              >
                {k === 'red' ? t('ro.red') : k === 'black' ? t('ro.black') : k === 'odd' ? t('ro.odd') : k === 'even' ? t('ro.even') : k === 'high' ? t('ro.high') : k === 'low' ? t('ro.low') : t('ro.number')}
              </button>
            ))}
          </div>
          {kind === 'number' && (
            <input
              type="number" min={0} max={36} value={num}
              onChange={(e) => setNum(Math.max(0, Math.min(36, Number(e.target.value) || 0)))}
              className="w-32 bg-gray-950 border border-gray-700 rounded-xl px-4 py-2 text-center font-black text-lg focus:outline-none focus:border-emerald-500"
            />
          )}
          <AmountPicker value={amount} onChange={setAmount} />
          <button
            onClick={spin}
            disabled={spinning}
            className="py-4 rounded-xl font-black text-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 shadow-lg shadow-emerald-500/20"
          >
            {spinning ? t('ro.spinning') : `${t('ro.spin')} • ${amount} 🪙`}
          </button>
          {last && <FairBox seedHash={last.seedHash} serverSeed={last.serverSeed} clientSeed={last.clientSeed} nonce={last.nonce} />}
        </div>
        </div>
      </div>
    </div>
  );
};

export default RouletteView;
