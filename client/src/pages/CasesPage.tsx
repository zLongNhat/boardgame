import React, { useState } from 'react';
import { Package, Swords } from 'lucide-react';
import { CaseOpeningView } from '../components/cases/CaseOpeningView';
import { BattlePage } from './BattlePage';

export const CasesPage: React.FC = () => {
  const [tab, setTab] = useState<'solo' | 'battle'>('solo');

  return (
    <div className="flex flex-col gap-6">
      {/* Mode Switcher Tabs */}
      <div className="max-w-6xl mx-auto w-full flex items-center gap-2 bg-gray-900/60 border border-gray-800 p-1.5 rounded-2xl backdrop-blur-md">
        <button
          onClick={() => setTab('solo')}
          className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
            tab === 'solo'
              ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-md shadow-amber-500/20'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Package className="w-4 h-4" /> Mở Hòm Solo
        </button>

        <button
          onClick={() => setTab('battle')}
          className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
            tab === 'battle'
              ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md shadow-rose-600/30'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Swords className="w-4 h-4" /> ⚔️ Đấu Trận Case Battle (2 - 4 Người)
        </button>
      </div>

      {tab === 'solo' ? <CaseOpeningView /> : <BattlePage />}
    </div>
  );
};

export default CasesPage;
