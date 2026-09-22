import React from 'react';
import { Shield } from 'lucide-react';
import { useLang } from '../../i18n/LanguageContext';

export const fmt = (n: number | undefined | null): string => (n || 0).toLocaleString('vi-VN');

export const AMOUNTS = [10, 50, 100, 500, 1000, 5000];

export const AmountPicker: React.FC<{ value: number; onChange: (v: number) => void }> = ({ value, onChange }) => {
  const { t } = useLang();
  return (
  <div>
    <div className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider">{t('c.bet')}</div>
    <div className="flex flex-wrap gap-2">
      {AMOUNTS.map((a) => (
        <button
          key={a}
          onClick={() => onChange(a)}
          className={`px-4 py-2 rounded-full font-bold text-sm border transition-all ${
            value === a
              ? 'bg-white border-purple-500 text-purple-900 scale-105 shadow-[0_0_15px_rgba(168,85,247,0.5)]'
              : 'bg-gray-800 border-gray-600 text-white hover:bg-gray-700'
          }`}
        >
          {a >= 1000 ? `${a / 1000}k` : a}
        </button>
      ))}
    </div>
  </div>
  );
};

export const FairBox: React.FC<{ seedHash?: string; serverSeed?: string; clientSeed?: string; nonce?: number }> = ({
  seedHash,
  serverSeed,
  clientSeed,
  nonce,
}) => {
  const { t } = useLang();
  return (
  <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800 text-[11px] font-mono break-all">
    <div className="flex items-center gap-1 text-gray-400 mb-1 font-sans font-bold text-xs">
      <Shield size={12} /> {t('c.fair')}
    </div>
    {seedHash && <div><span className="text-gray-500">{t('c.hash')}: </span><span className="text-gray-300">{seedHash.slice(0, 32)}…</span></div>}
    {serverSeed && <div><span className="text-gray-500">{t('c.server')}: </span><span className="text-green-400">{serverSeed.slice(0, 32)}…</span></div>}
    {clientSeed && <div><span className="text-gray-500">{t('c.client')}: </span><span className="text-gray-300">{clientSeed.slice(0, 24)}…</span></div>}
    {nonce !== undefined && <div><span className="text-gray-500">{t('c.nonce')}: </span><span className="text-gray-300">{nonce}</span></div>}
  </div>
  );
};

export const TopBar: React.FC<{ title: string; icon: React.ReactNode; user: any; onBack: () => void }> = ({
  title,
  icon,
  user,
  onBack,
}) => (
  <div className="flex items-center justify-between p-4 bg-gray-900/50 backdrop-blur border-b border-gray-800 sticky top-0 z-10">
    <div className="flex items-center gap-3">
      <button onClick={onBack} className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-300 hover:text-white">
        ←
      </button>
      <h1 className="text-lg sm:text-xl font-black flex items-center gap-2">{icon}{title}</h1>
    </div>
    <div className="flex items-center gap-2 bg-gray-800/80 px-4 py-1.5 rounded-full border border-gray-700">
      <span className="font-bold text-yellow-400">{user ? fmt(user.balance) + ' 🪙' : '---'}</span>
    </div>
  </div>
);
