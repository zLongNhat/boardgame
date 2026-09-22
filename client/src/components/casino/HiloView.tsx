import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpDown } from 'lucide-react';
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

const RANK_LABEL: Record<number, string> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
const rankName = (r: number) => RANK_LABEL[r] || String(r);
const SUITS = ['♠', '♥', '♦', '♣'];

export const HiloView: React.FC<Props> = ({ user, socket, onBack, onBalanceUpdate, onOpenAuth }) => {
  const { t } = useLang();
  const [amount, setAmount] = useState(50);
  const [game, setGame] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [lastCard, setLastCard] = useState<number | null>(null);
  const [seeds, setSeeds] = useState<any>(null);
  const [busted, setBusted] = useState(false);
  const [error, setError] = useState('');

  const start = () => {
    if (!user) return onOpenAuth();
    if (!socket || busy) return;
    setError('');
    setBusted(false);
    setSeeds(null);
    socket.emit('casino:hilo:start', { userId: user.id, amount }, (res: any) => {
      if (!res?.success) {
        setError(res?.message || t('hi.startFail'));
        return;
      }
      if (typeof res.newBalance === 'number') onBalanceUpdate(res.newBalance);
      setGame(res.state);
      setLastCard(res.state.card);
    });
  };

  const pick = (choice: 'higher' | 'lower') => {
    if (!user || !socket || busy || !game) return;
    setBusy(true);
    socket.emit('casino:hilo:pick', { userId: user.id, choice }, (res: any) => {
      setBusy(false);
      if (!res?.success) {
        setError(res?.message || t('hi.pickFail'));
        return;
      }
      if (res.busted) {
        setBusted(true);
        setLastCard(res.card);
        setSeeds(res);
        setTimeout(() => {
          setGame(null);
          setBusted(false);
        }, 2500);
      } else {
        setLastCard(res.card);
        setGame(res.state);
      }
    });
  };

  const cashout = () => {
    if (!user || !socket || busy || !game) return;
    setBusy(true);
    socket.emit('casino:hilo:cashout', { userId: user.id }, (res: any) => {
      setBusy(false);
      if (!res?.success) {
        setError(res?.message || t('hi.cashoutFail'));
        return;
      }
      if (typeof res.newBalance === 'number') onBalanceUpdate(res.newBalance);
      setSeeds({ ...res, win: res.payout });
      setGame(null);
    });
  };

  const suit = SUITS[(lastCard || 1) % 4];
  const red = suit === '♥' || suit === '♦';

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-indigo-950/20 to-gray-950 text-white font-sans flex flex-col">
      <TopBar title={t('hi.title')} icon={<ArrowUpDown className="text-indigo-400" />} user={user} onBack={onBack} />
      <div className="flex-1 flex flex-col gap-5 p-4 w-full">
      <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <div className="flex flex-col items-center">
        {/* Lá bài */}
        <motion.div
          key={lastCard || 'none'}
          initial={{ rotateY: 90, scale: 0.9 }}
          animate={{ rotateY: 0, scale: 1 }}
          transition={{ duration: 0.35 }}
          className={`w-36 h-52 rounded-2xl border-4 ${red ? 'border-red-500' : 'border-gray-300'} bg-gradient-to-br from-white to-gray-200 flex flex-col items-center justify-center shadow-[0_15px_50px_rgba(0,0,0,0.6)]`}
        >
          {lastCard ? (
            <>
              <span className={`text-6xl font-black ${red ? 'text-red-600' : 'text-gray-900'}`}>{rankName(lastCard)}</span>
              <span className={`text-4xl ${red ? 'text-red-600' : 'text-gray-900'}`}>{suit}</span>
            </>
          ) : (
            <span className="text-5xl">🂠</span>
          )}
        </motion.div>
        {game && (
          <div className="text-center">
            <div className="text-sm text-gray-400">{t('hi.chain')} x{game.multiplier} • {game.steps} {t('hi.steps')}</div>
            <div className="text-3xl font-black text-yellow-400">{fmt(game.payout)} 🪙</div>
          </div>
        )}
        </div>

        <div className="w-full lg:sticky lg:top-20">
        {game ? (
          <div className="w-full bg-gray-900/60 p-5 rounded-2xl border border-gray-800 flex flex-col gap-3">
            <div className="flex gap-2">
              <button
                onClick={() => pick('higher')}
                disabled={busy || game.multHigher === null}
                className="flex-1 py-4 rounded-xl font-black bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 disabled:opacity-40"
              >
                {t('hi.higher')} {game.multHigher ? `x${game.multHigher}` : t('hi.dead')}
              </button>
              <button
                onClick={() => pick('lower')}
                disabled={busy || game.multLower === null}
                className="flex-1 py-4 rounded-xl font-black bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 disabled:opacity-40"
              >
                {t('hi.lower')} {game.multLower ? `x${game.multLower}` : t('hi.dead')}
              </button>
            </div>
            <button
              onClick={cashout}
              disabled={busy || game.steps === 0}
              className="py-3 rounded-xl font-black bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black disabled:opacity-50"
            >
              {t('hi.cashout')} {fmt(game.payout)} 🪙
            </button>
          </div>
        ) : (
          <div className="w-full bg-gray-900/60 p-5 rounded-2xl border border-gray-800 flex flex-col gap-4">
            {busted && <div className="text-center text-red-400 font-black text-xl animate-pulse">{t('hi.busted')}</div>}
            {seeds?.win > 0 && <div className="text-center text-green-300 font-black text-xl">{t('hi.winMsg')} +{fmt(seeds.win)} 🪙!</div>}
            <AmountPicker value={amount} onChange={setAmount} />
            <button onClick={start} className="py-4 rounded-xl font-black text-lg bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500">
              {t('hi.deal')} • {amount} 🪙
            </button>
            <p className="text-center text-[11px] text-gray-500">{t('hi.tieNote')}</p>
            {seeds && <FairBox seedHash={seeds.state?.seedHash} serverSeed={seeds.serverSeed} clientSeed={seeds.clientSeed} nonce={seeds.nonce} />}
          </div>
        )}
        {error && <div className="text-rose-400 text-sm font-bold">{error}</div>}
        </div>
      </div>
      </div>
    </div>
  );
};

export default HiloView;
