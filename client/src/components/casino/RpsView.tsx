import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Hand } from 'lucide-react';
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

const EMOJI: Record<string, string> = { rock: '✊', paper: '✋', scissors: '✌️' };

export const RpsView: React.FC<Props> = ({ user, socket, onBack, onBalanceUpdate, onOpenAuth }) => {
  const { t } = useLang();
  const [amount, setAmount] = useState(50);
  const [choice, setChoice] = useState<string>('rock');
  const [playing, setPlaying] = useState(false);
  const [last, setLast] = useState<any>(null);
  const [error, setError] = useState('');

  const play = () => {
    if (!user) return onOpenAuth();
    if (!socket || playing) return;
    setError('');
    setPlaying(true);
    setLast(null);
    socket.emit('casino:rps:bet', { userId: user.id, choice, amount }, (res: any) => {
      setTimeout(() => {
        setPlaying(false);
        if (!res?.success) {
          setError(res?.message || t('rps.betFail'));
          return;
        }
        if (typeof res.newBalance === 'number') onBalanceUpdate(res.newBalance);
        setLast({ ...res, myChoice: choice });
      }, 900);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-rose-950/20 to-gray-950 text-white font-sans flex flex-col">
      <TopBar title={t('rps.title')} icon={<Hand className="text-rose-400" />} user={user} onBack={onBack} />
      <div className="flex-1 flex flex-col gap-6 p-4 w-full">
      <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="flex flex-col items-center gap-5">
        <div className="flex items-center gap-6 sm:gap-10">
          <div className="flex flex-col items-center gap-2">
            <motion.div
              animate={playing ? { rotate: [0, -20, 20, -20, 20, 0] } : {}}
              transition={{ duration: 0.9 }}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-indigo-600/30 border-2 border-indigo-500/50 flex items-center justify-center text-5xl sm:text-6xl"
            >
              {playing ? '✊' : EMOJI[choice]}
            </motion.div>
            <span className="text-xs font-bold text-indigo-300">{t('rps.you')}</span>
          </div>
          <span className="text-2xl font-black text-gray-500">VS</span>
          <div className="flex flex-col items-center gap-2">
            <motion.div
              animate={playing ? { rotate: [0, 20, -20, 20, -20, 0] } : last ? { scale: [0.5, 1.1, 1] } : {}}
              transition={{ duration: 0.9 }}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-rose-600/20 border-2 border-rose-500/50 flex items-center justify-center text-5xl sm:text-6xl"
            >
              {playing ? '✊' : last ? EMOJI[last.houseChoice] : '?'}
            </motion.div>
            <span className="text-xs font-bold text-rose-300">{t('rps.house')}</span>
          </div>
        </div>

        {last && (
          <div className={`px-6 py-3 rounded-2xl font-black text-lg border-2 text-center ${
            last.outcome === 'win' ? 'bg-green-900/60 border-green-400 text-green-200 animate-pulse'
            : last.outcome === 'tie' ? 'bg-yellow-900/40 border-yellow-500 text-yellow-200'
            : 'bg-gray-900/60 border-gray-700 text-gray-300'
          }`}>
            {last.outcome === 'win' ? `${t('rps.win')} +${fmt(last.payout)} 🪙` : last.outcome === 'tie' ? t('rps.tie') : t('rps.lose')}
          </div>
        )}
        {error && <div className="text-rose-400 text-sm font-bold text-center">{error}</div>}
        </div>

        <div className="w-full bg-gray-900/60 p-5 rounded-2xl border border-gray-800 flex flex-col gap-4 lg:sticky lg:top-20">
          <div className="grid grid-cols-3 gap-2">
            {(['rock', 'paper', 'scissors'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setChoice(c)}
                className={`py-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${
                  choice === c ? 'border-rose-400 bg-rose-500/20 scale-105' : 'border-gray-700 bg-gray-950/50 hover:border-gray-500'
                }`}
              >
                <span className="text-3xl">{EMOJI[c]}</span>
                <span className="text-xs font-black">{c === 'rock' ? t('rps.rock') : c === 'paper' ? t('rps.paper') : t('rps.scissors')}</span>
              </button>
            ))}
          </div>
          <AmountPicker value={amount} onChange={setAmount} />
          <button
            onClick={play}
            disabled={playing}
            className="py-4 rounded-xl font-black text-lg bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 disabled:opacity-50"
          >
            {playing ? t('rps.playing') : `${t('rps.play')} • ${amount} 🪙 (${t('rps.oddsNote')})`}
          </button>
          {last && <FairBox seedHash={last.seedHash} serverSeed={last.serverSeed} clientSeed={last.clientSeed} nonce={last.nonce} />}
        </div>
        </div>
      </div>
    </div>
  );
};

export default RpsView;
