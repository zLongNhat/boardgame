import React, { useState } from 'react';
import { Bird } from 'lucide-react';
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

const DIFFS = [
  { id: 'easy', labelKey: 'ch.easy', bust: '12%' },
  { id: 'medium', labelKey: 'ch.medium', bust: '20%' },
  { id: 'hard', labelKey: 'ch.hard', bust: '30%' },
] as const;

const MULTS: Record<string, number[]> = {
  easy: [1.15, 1.35, 1.6, 1.9, 2.25, 2.7, 3.3, 4.1, 5.2, 6.8],
  medium: [1.25, 1.6, 2.1, 2.8, 3.8, 5.2, 7.3, 10.5, 15.5, 24],
  hard: [1.4, 2.0, 3.0, 4.6, 7.2, 11.5, 19, 32, 55, 100],
};

export const ChickenView: React.FC<Props> = ({ user, socket, onBack, onBalanceUpdate, onOpenAuth }) => {
  const { t } = useLang();
  const [amount, setAmount] = useState(50);
  const [diff, setDiff] = useState<string>('easy');
  const [game, setGame] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [boom, setBoom] = useState<number | null>(null);
  const [seeds, setSeeds] = useState<any>(null);
  const [error, setError] = useState('');

  const start = () => {
    if (!user) return onOpenAuth();
    if (!socket || busy) return;
    setError('');
    setBoom(null);
    setSeeds(null);
    socket.emit('casino:chicken:start', { userId: user.id, amount, difficulty: diff }, (res: any) => {
      if (!res?.success) {
        setError(res?.message || t('ch.startFail'));
        return;
      }
      if (typeof res.newBalance === 'number') onBalanceUpdate(res.newBalance);
      setGame(res.state);
    });
  };

  const advance = () => {
    if (!user || !socket || busy || !game) return;
    setBusy(true);
    socket.emit('casino:chicken:advance', { userId: user.id }, (res: any) => {
      setBusy(false);
      if (!res?.success) {
        setError(res?.message || t('ch.advFail'));
        return;
      }
      if (res.busted) {
        setBoom(res.lane);
        setSeeds(res);
        setTimeout(() => {
          setGame(null);
          setBoom(null);
        }, 2500);
      } else if (res.state) {
        setGame(res.state);
        if (res.payout) {
          // qua hết làn tự rút max
          if (typeof res.newBalance === 'number') onBalanceUpdate(res.newBalance);
          setSeeds(res);
        }
      }
      if (res.payout && typeof res.newBalance === 'number') {
        setGame(null);
      }
    });
  };

  const cashout = () => {
    if (!user || !socket || busy || !game) return;
    setBusy(true);
    socket.emit('casino:chicken:cashout', { userId: user.id }, (res: any) => {
      setBusy(false);
      if (!res?.success) {
        setError(res?.message || t('ch.cashoutFail'));
        return;
      }
      if (typeof res.newBalance === 'number') onBalanceUpdate(res.newBalance);
      setSeeds(res);
      setGame(null);
    });
  };

  const mults = MULTS[diff];
  const chickenLane = game ? game.lane : -1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-lime-950/20 to-gray-950 text-white font-sans flex flex-col">
      <TopBar title={t('ch.title')} icon={<Bird className="text-lime-400" />} user={user} onBack={onBack} />
      <div className="flex-1 flex flex-col items-center gap-5 p-4 w-full">
        {/* Đường qua */}
        <div className="w-full bg-gray-900/60 rounded-2xl border border-gray-800 p-4 overflow-x-auto">
          <div className="flex items-stretch gap-1.5 min-w-max mx-auto w-fit">
            <div className="w-12 rounded-xl bg-green-900/40 border border-green-700 flex items-center justify-center text-2xl">🏠</div>
            {mults.map((m, i) => {
              const passed = game && i < chickenLane;
              const current = game && i === chickenLane;
              const bustedHere = boom === i;
              return (
                <div
                  key={i}
                  className={`w-14 sm:w-16 py-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                    bustedHere ? 'bg-red-600 border-red-400 animate-pulse'
                    : passed ? 'bg-green-800/60 border-green-500'
                    : current ? 'bg-yellow-500/20 border-yellow-400 animate-pulse'
                    : 'bg-gray-950/60 border-gray-700'
                  }`}
                >
                  <span className="text-xl">
                    {bustedHere ? '💥' : passed ? '🐔' : current && game ? '🐔' : '─'}
                  </span>
                  <span className="text-[10px] font-black text-yellow-300">x{m}</span>
                </div>
              );
            })}
            <div className="w-12 rounded-xl bg-amber-900/40 border border-amber-700 flex items-center justify-center text-2xl">🏁</div>
          </div>
        </div>

        {game ? (
          <div className="w-full bg-gray-900/60 p-5 rounded-2xl border border-gray-800 flex flex-col gap-3">
            <div className="text-center">
              <div className="text-sm text-gray-400">{t('ch.passed')} {game.lane}/10 {t('ch.lanes')} • x{game.multiplier}</div>
              <div className="text-3xl font-black text-yellow-400">{fmt(game.payout)} 🪙</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={advance}
                disabled={busy}
                className="flex-1 py-4 rounded-xl font-black text-lg bg-gradient-to-r from-lime-500 to-green-600 hover:from-lime-400 hover:to-green-500 text-black disabled:opacity-50"
              >
                {t('ch.next')}
              </button>
              <button
                onClick={cashout}
                disabled={busy || game.lane === 0}
                className="flex-1 py-4 rounded-xl font-black text-lg bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black disabled:opacity-50"
              >
                {t('ch.cashout')} {fmt(game.payout)} 🪙
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full bg-gray-900/60 p-5 rounded-2xl border border-gray-800 flex flex-col gap-4">
            {boom !== null && <div className="text-center text-red-400 font-black text-xl animate-pulse">💥 {t('ch.busted')} {boom + 1}! {t('ch.lostBet')}</div>}
            {seeds?.payout > 0 && <div className="text-center text-green-300 font-black text-xl">{t('ch.winMsg')} +{fmt(seeds.payout)} 🪙!</div>}
            <div className="grid grid-cols-3 gap-2">
              {DIFFS.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDiff(d.id)}
                  className={`py-2.5 rounded-xl border text-xs font-black transition-all ${
                    diff === d.id ? 'border-lime-400 bg-lime-500/20 text-lime-300' : 'border-gray-700 bg-gray-950/50 text-gray-400'
                  }`}
                >
                  {t(d.labelKey)}<br /><span className="opacity-70">{t('ch.bustPerLane', { r: d.bust })}</span>
                </button>
              ))}
            </div>
            <AmountPicker value={amount} onChange={setAmount} />
            <button onClick={start} className="py-4 rounded-xl font-black text-lg bg-gradient-to-r from-lime-500 to-green-600 hover:from-lime-400 hover:to-green-500 text-black">
              {t('ch.start')} • {amount} 🪙
            </button>
            {seeds && <FairBox seedHash={seeds.state?.seedHash} serverSeed={seeds.serverSeed} clientSeed={seeds.clientSeed} nonce={seeds.nonce} />}
          </div>
        )}
        {error && <div className="text-rose-400 text-sm font-bold">{error}</div>}
      </div>
    </div>
  );
};

export default ChickenView;
