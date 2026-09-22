import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Coins } from 'lucide-react';
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

export const CoinflipView: React.FC<Props> = ({ user, socket, onBack, onBalanceUpdate, onOpenAuth }) => {
  const { t } = useLang();
  const [amount, setAmount] = useState(50);
  const [choice, setChoice] = useState<'heads' | 'tails'>('heads');
  const [flipping, setFlipping] = useState(false);
  const [turns, setTurns] = useState(0);
  const [last, setLast] = useState<any>(null);
  const [error, setError] = useState('');

  const flip = () => {
    if (!user) return onOpenAuth();
    if (!socket || flipping) return;
    setError('');
    socket.emit('casino:coinflip:bet', { userId: user.id, choice, amount }, (res: any) => {
      if (!res?.success) {
        setError(res?.message || t('cf.betFail'));
        return;
      }
      if (typeof res.newBalance === 'number') onBalanceUpdate(res.newBalance);
      setFlipping(true);
      // Quay nhiều vòng rồi dừng đúng mặt kết quả
      const extra = res.result === 'heads' ? 0 : 180;
      setTurns((t) => t + 360 * 6 + ((extra - (t % 360) + 360) % 360));
      setTimeout(() => {
        setFlipping(false);
        setLast(res);
      }, 2200);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-yellow-950/20 to-gray-950 text-white font-sans flex flex-col">
      <TopBar title={t('cf.title')} icon={<Coins className="text-yellow-400" />} user={user} onBack={onBack} />
      <div className="flex-1 flex flex-col gap-6 p-4 w-full">
      <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="flex flex-col items-center gap-5">
        <div style={{ perspective: 800 }}>
          <motion.div
            className="relative w-40 h-40 rounded-full"
            style={{ transformStyle: 'preserve-3d' }}
            animate={{ rotateX: turns }}
            transition={flipping ? { duration: 2, ease: [0.2, 0.7, 0.3, 1] } : { duration: 0.2 }}
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-300 to-amber-600 border-4 border-yellow-200 flex items-center justify-center text-5xl font-black text-amber-900 shadow-[0_15px_40px_rgba(0,0,0,0.6)]" style={{ backfaceVisibility: 'hidden' }}>
              S
            </div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 border-4 border-slate-200 flex items-center justify-center text-5xl font-black text-slate-800" style={{ transform: 'rotateX(180deg)', backfaceVisibility: 'hidden' }}>
              N
            </div>
          </motion.div>
        </div>

        <div className="flex gap-3">
          {(['heads', 'tails'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setChoice(c)}
              className={`px-8 py-3 rounded-2xl font-black border-2 transition-all ${
                choice === c ? 'border-yellow-400 bg-yellow-500/20 text-yellow-300 scale-105' : 'border-gray-700 bg-gray-900/60 text-gray-400'
              }`}
            >
              {c === 'heads' ? t('cf.heads') : t('cf.tails')}
            </button>
          ))}
        </div>

        {last && (
          <div className={`px-6 py-3 rounded-2xl font-black text-lg border-2 text-center ${last.win ? 'bg-green-900/60 border-green-400 text-green-200 animate-pulse' : 'bg-gray-900/60 border-gray-700 text-gray-300'}`}>
            Ra {last.result === 'heads' ? t('cf.headsName') : t('cf.tailsName')} — {last.win ? `${t('cf.win')} +${fmt(last.payout)} 🪙` : t('cf.lose')}
          </div>
        )}
        {error && <div className="text-rose-400 text-sm font-bold text-center">{error}</div>}
        </div>

        <div className="w-full bg-gray-900/60 p-5 rounded-2xl border border-gray-800 flex flex-col gap-4 lg:sticky lg:top-20">
          <AmountPicker value={amount} onChange={setAmount} />
          <button
            onClick={flip}
            disabled={flipping}
            className="py-4 rounded-xl font-black text-lg bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black disabled:opacity-50"
          >
            {flipping ? t('cf.flipping') : `${t('cf.flip')} • ${amount} 🪙 (1:1.95)`}
          </button>
          {last && <FairBox seedHash={last.seedHash} serverSeed={last.serverSeed} clientSeed={last.clientSeed} nonce={last.nonce} />}
        </div>
        </div>
      </div>
    </div>
  );
};

export default CoinflipView;
