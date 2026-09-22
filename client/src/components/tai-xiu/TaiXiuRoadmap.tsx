import { useMemo } from 'react';
import { TaiXiuRoundResult } from '../../types/game';
import { useLang } from '../../i18n/LanguageContext';

interface TaiXiuRoadmapProps {
  history: TaiXiuRoundResult[];
}

export default function TaiXiuRoadmap({ history }: TaiXiuRoadmapProps) {
  const { t } = useLang();
  // Config
  const ROWS = 6;
  const VISIBLE_COLS = 17;

  // Process history into grid
  const grid = useMemo(() => {
    const result: (TaiXiuRoundResult | null)[][] = Array(ROWS).fill(null).map(() => []);
    let col = 0;
    let row = 0;

    history.forEach((item) => {
      if (row >= ROWS) {
        row = 0;
        col++;
      }
      
      // Ensure column arrays exist
      for(let r=0; r<ROWS; r++) {
        if(result[r].length <= col) {
           result[r].push(null);
        }
      }

      result[row][col] = item;
      row++;
    });

    // Ensure minimum visible columns
    const totalCols = Math.max(VISIBLE_COLS, col + (row > 0 ? 1 : 0));
    for (let r = 0; r < ROWS; r++) {
      while (result[r].length < totalCols) {
        result[r].push(null);
      }
    }

    // Keep only last VISIBLE_COLS if it exceeds
    if (result[0].length > VISIBLE_COLS) {
      for (let r = 0; r < ROWS; r++) {
        result[r] = result[r].slice(-VISIBLE_COLS);
      }
    }

    return result;
  }, [history]);

  // Calculate Stats
  const stats = useMemo(() => {
    let tai = 0, xiu = 0, bao = 0;
    let currentStreak = 0;
    let streakType: 'tai' | 'xiu' | 'bao' | null = null;

    if (history.length > 0) {
      streakType = history[history.length - 1].result;
    }

    for (let i = history.length - 1; i >= 0; i--) {
      const r = history[i].result;
      if (r === 'tai') tai++;
      if (r === 'xiu') xiu++;
      if (r === 'bao') bao++;

      if (streakType && r === streakType && i >= history.length - currentStreak - 1) {
        currentStreak++;
      }
    }

    const total = history.length || 1;
    return {
      tai, taiPct: Math.round((tai / total) * 100),
      xiu, xiuPct: Math.round((xiu / total) * 100),
      bao, baoPct: Math.round((bao / total) * 100),
      streakType,
      currentStreak
    };
  }, [history]);

  const recentHistory = history.slice(-10);

  const getResultColor = (result: 'tai' | 'xiu' | 'bao') => {
    switch (result) {
      case 'tai': return 'bg-red-500 border-red-700 text-white';
      case 'xiu': return 'bg-blue-500 border-blue-700 text-white';
      case 'bao': return 'bg-yellow-400 border-yellow-600 text-black';
      default: return 'bg-gray-800 border-gray-700';
    }
  };

  const getResultLabel = (result: 'tai' | 'xiu' | 'bao') => {
    switch (result) {
      case 'tai': return 'T';
      case 'xiu': return 'X';
      case 'bao': return 'B';
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Stats Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-sm bg-gray-800/40 p-3 rounded-lg border border-gray-700/50">
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span className="text-gray-300">{t('tx.tai')}: <span className="font-bold text-white">{stats.taiPct}%</span> ({stats.tai})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            <span className="text-gray-300">{t('tx.xiu')}: <span className="font-bold text-white">{stats.xiuPct}%</span> ({stats.xiu})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
            <span className="text-gray-300">BÃO: <span className="font-bold text-white">{stats.baoPct}%</span> ({stats.bao})</span>
          </div>
        </div>
        
        {stats.streakType && stats.currentStreak >= 3 && (
          <div className="flex items-center gap-2 bg-gray-900 px-3 py-1 rounded-full border border-gray-700">
            <span className="text-gray-400">{t('tx.streak')}:</span>
            <span className={`font-bold ${stats.streakType === 'tai' ? 'text-red-400' : stats.streakType === 'xiu' ? 'text-blue-400' : 'text-yellow-400'}`}>
              {stats.streakType === 'tai' ? t('tx.tai') : stats.streakType === 'xiu' ? t('tx.xiu') : 'BÃO'} x{stats.currentStreak}
            </span>
          </div>
        )}
      </div>

      {/* Bead Plate */}
      <div className="bg-black/50 p-3 rounded-xl border border-gray-800 overflow-x-auto custom-scrollbar">
        <div className="flex flex-col gap-1 min-w-max">
          {grid.map((row, rowIndex) => (
            <div key={`row-${rowIndex}`} className="flex gap-1">
              {row.map((cell, colIndex) => (
                <div 
                  key={`cell-${rowIndex}-${colIndex}`}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold border ${
                    cell ? getResultColor(cell.result) : 'bg-gray-900 border-gray-800'
                  }`}
                  title={cell ? `#${cell.roundId} - ${cell.dice.total}` : undefined}
                >
                  {cell && cell.dice.total}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Last 10 Results */}
      <div className="flex items-center gap-2 bg-gray-800/40 p-2 rounded-lg border border-gray-700/50">
        <span className="text-xs text-gray-400 font-medium px-2 uppercase tracking-wider">{t('tx.recent')}</span>
        <div className="flex items-center gap-1.5 flex-1">
          {recentHistory.map((item, i) => (
            <div 
              key={`recent-${item.roundId}-${i}`}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm ${getResultColor(item.result)}`}
            >
              {getResultLabel(item.result)}
            </div>
          ))}
          {recentHistory.length === 0 && <span className="text-xs text-gray-500 italic">{t('panel.noData')}</span>}
        </div>
      </div>
    </div>
  );
}
