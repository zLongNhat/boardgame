import React, { useEffect, useState, useRef } from 'react';
import { SlotSymbolId, SlotTile } from '../../types/game';
import { WildBountyTile, TileAnimationPhase } from './WildBountySymbols';

interface ReelColumnViewProps {
  colIdx: number;
  height: number; // 3, 4, 5, 5, 4, 3
  visibleTiles: SlotTile[];
  isSpinning: boolean;
  spinDuration: number;
  isAnticipating?: boolean;
  animationPhase: TileAnimationPhase;
  onReelStop?: (colIdx: number) => void;
}

const DUMMY_SYMBOLS: SlotSymbolId[] = [
  'cowgirl',
  'whiskey',
  'hat',
  'holster',
  'A',
  'K',
  'Q',
  'J',
  'whiskey',
  'scatter',
  'hat',
  'cowgirl',
  'A',
  'holster',
  'K',
  'Q',
  'scatter',
  'J'
];

export const ReelColumnView: React.FC<ReelColumnViewProps> = ({
  colIdx,
  height,
  visibleTiles,
  isSpinning,
  spinDuration,
  isAnticipating,
  animationPhase,
  onReelStop
}) => {
  const [tapeTiles, setTapeTiles] = useState<SlotTile[]>(visibleTiles);
  const [offsetY, setOffsetY] = useState(0);
  const [hasLanded, setHasLanded] = useState(false);
  const stoppedRef = useRef(false);

  useEffect(() => {
    if (isSpinning) {
      stoppedRef.current = false;
      setHasLanded(false);

      // Create a 14-item dummy strip + the target visible tiles at bottom
      const strip: SlotTile[] = [];
      const stripLength = 14;

      for (let i = 0; i < stripLength; i++) {
        const randSym = DUMMY_SYMBOLS[Math.floor(Math.random() * DUMMY_SYMBOLS.length)];
        strip.push({
          id: `dummy_${colIdx}_${i}_${Math.random()}`,
          symbol: randSym,
          isGold: randSym !== 'scatter' && randSym !== 'wild' && colIdx > 0 && colIdx < 5 && Math.random() < 0.1
        });
      }

      strip.push(...visibleTiles);
      setTapeTiles(strip);

      // Height of 1 tile is approx 80px + gap 8px = 88px
      const tileStep = 88;
      const startOffset = -(stripLength * tileStep);

      // Start from high above
      setOffsetY(startOffset);

      // Downward roll translation
      const rollTimer = setTimeout(() => {
        setOffsetY(0);
      }, 25);

      // Landing timer
      const stopTimer = setTimeout(() => {
        setHasLanded(true);
        if (!stoppedRef.current) {
          stoppedRef.current = true;
          if (onReelStop) onReelStop(colIdx);
        }
      }, spinDuration);

      return () => {
        clearTimeout(rollTimer);
        clearTimeout(stopTimer);
      };
    } else {
      setTapeTiles(visibleTiles);
      setOffsetY(0);
      setHasLanded(false);
      stoppedRef.current = true;
    }
  }, [isSpinning, spinDuration, visibleTiles, colIdx]);

  return (
    <div
      data-col={colIdx}
      className={`relative flex flex-col justify-center rounded-xl p-1 border shadow-inner overflow-hidden transition-all duration-300 ${
        isAnticipating
          ? 'animate-anticipation bg-rose-950/40 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.8)]'
          : 'bg-black/40 border-amber-900/30'
      }`}
      style={{
        // Height matches exact number of visible tiles so all cells are uniform
        maxHeight: `${height * 88 + 8}px`
      }}
    >
      {/* 3D Curved Reel Depth Vignette */}
      <div className="absolute top-0 left-0 right-0 h-5 bg-gradient-to-b from-black/80 to-transparent z-20 pointer-events-none rounded-t-xl" />
      <div className="absolute bottom-0 left-0 right-0 h-5 bg-gradient-to-t from-black/80 to-transparent z-20 pointer-events-none rounded-b-xl" />

      {/* Anticipation Badge */}
      {isAnticipating && (
        <div className="absolute top-1 left-1 right-1 z-30 flex items-center justify-center pointer-events-none">
          <span className="text-[9px] font-black uppercase text-rose-300 bg-rose-950/90 px-1.5 py-0.5 rounded-full border border-rose-400 animate-bounce">
            🔥 CHỜ SCATTER
          </span>
        </div>
      )}

      {/* Reel Strip Container */}
      <div
        style={{
          transform: isSpinning ? `translateY(${offsetY}px)` : 'translateY(0px)',
          transition: isSpinning && offsetY === 0 ? `transform ${spinDuration}ms cubic-bezier(0.12, 0.85, 0.28, 1)` : 'none'
        }}
        className={`flex flex-col gap-1.5 sm:gap-2 justify-center ${
          hasLanded ? 'animate-reel-bounce' : ''
        }`}
      >
        {(isSpinning ? tapeTiles : visibleTiles).map(tile => (
          <div key={tile.id} className="w-full flex-shrink-0">
            <WildBountyTile
              symbol={tile.symbol}
              isGold={tile.isGold}
              isWinning={tile.isWinning}
              transformedToWild={tile.transformedToWild}
              animationPhase={isSpinning ? 'idle' : animationPhase}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
