import React, { useEffect, useRef } from 'react';
import { CaseItemTemplate } from '../../types/game';
import { RARITY_CONFIG } from './CaseOpeningView';

interface Props {
  tape: CaseItemTemplate[] | null;
  winningIndex: number;
  isSpinning: boolean;
  wonItem: CaseItemTemplate | null;
}

const ITEM_WIDTH = 120; // Compact width for multi-player columns
const ITEM_GAP = 8;

export const BattleRouletteTape: React.FC<Props> = ({
  tape,
  winningIndex,
  isSpinning,
  wonItem
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tape || tape.length === 0 || !containerRef.current || !viewportRef.current) return;

    if (isSpinning) {
      // 1. Reset to start
      containerRef.current.style.transition = 'none';
      containerRef.current.style.transform = 'translateX(0px)';

      // 2. Animate to target winning item
      const timer = setTimeout(() => {
        if (!containerRef.current || !viewportRef.current) return;
        const viewportWidth = viewportRef.current.clientWidth;
        const targetOffset = -(winningIndex * (ITEM_WIDTH + ITEM_GAP) - viewportWidth / 2 + ITEM_WIDTH / 2);

        containerRef.current.style.transition = 'transform 4.2s cubic-bezier(0.12, 0.8, 0.2, 1)';
        containerRef.current.style.transform = `translateX(${targetOffset}px)`;
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [tape, winningIndex, isSpinning]);

  if (!tape || tape.length === 0) {
    return (
      <div className="w-full h-32 rounded-2xl bg-gray-950/70 border border-gray-800/80 flex flex-col items-center justify-center p-3 text-center">
        <div className="text-3xl opacity-30 animate-pulse">📦</div>
        <span className="text-[11px] text-gray-500 font-bold mt-1">Đang chờ lượt mở...</span>
      </div>
    );
  }

  return (
    <div
      ref={viewportRef}
      className="relative w-full h-36 bg-gray-950/90 rounded-2xl border border-gray-800 overflow-hidden shadow-inner flex items-center"
    >
      {/* Center Target Indicator Needle */}
      <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 z-20 pointer-events-none flex flex-col justify-between items-center">
        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-amber-400 drop-shadow-[0_0_6px_#fbbf24]" />
        <div className="w-0.5 h-full bg-amber-400/80 shadow-[0_0_8px_#fbbf24]" />
        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-amber-400 drop-shadow-[0_0_6px_#fbbf24]" />
      </div>

      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(245,158,11,0.08)_0%,_transparent_70%)] pointer-events-none" />

      {/* Horizontal Strip */}
      <div
        ref={containerRef}
        className="flex items-center gap-2 px-2 will-change-transform"
        style={{ width: 'max-content' }}
      >
        {tape.map((item, idx) => {
          const isWinningTarget = !isSpinning && idx === winningIndex && wonItem;
          const config = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.white;

          return (
            <div
              key={idx}
              className={`flex-shrink-0 w-[120px] h-[116px] rounded-xl border flex flex-col items-center justify-between p-2 transition-all relative overflow-hidden ${
                isWinningTarget
                  ? `${config.bg} ${config.border} ring-2 ring-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.4)] scale-105 z-10`
                  : 'bg-gray-900/80 border-gray-800'
              }`}
            >
              {/* Top weapon type badge */}
              <div className="text-[9px] text-gray-400 truncate w-full text-center">
                {item.weaponType || 'Weapon'}
              </div>

              {/* Icon */}
              <div className="text-3xl my-0.5 drop-shadow-md">{item.icon}</div>

              {/* Bottom name and value */}
              <div className="w-full text-center">
                <div className={`text-[10px] font-black truncate ${config.text}`}>
                  {item.name}
                </div>
                <div className="text-[10px] font-bold text-yellow-400 mt-0.5">
                  {item.value.toLocaleString('vi-VN')} 🪙
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
