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
  cascadeDropCount?: number; // Number of tiles dropped from top during cascade
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
  cascadeDropCount = 0,
  onReelStop
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevTilesRef = useRef<SlotTile[]>(visibleTiles);
  const [tapeTiles, setTapeTiles] = useState<SlotTile[]>(visibleTiles);
  const [offsetY, setOffsetY] = useState(0);
  const [isRolling, setIsRolling] = useState(false);
  const [hasLanded, setHasLanded] = useState(false);
  const stoppedRef = useRef(false);

  // 1. Initial spin roll logic (when isSpinning === true)
  useEffect(() => {
    if (!isSpinning) {
      if (!cascadeDropCount) {
        prevTilesRef.current = visibleTiles;
        setTapeTiles(visibleTiles);
        setOffsetY(0);
        setIsRolling(false);
        setHasLanded(false);
        stoppedRef.current = true;
      }
      return;
    }

    stoppedRef.current = false;
    setHasLanded(false);

    const prevTiles = prevTilesRef.current && prevTilesRef.current.length === height
      ? prevTilesRef.current
      : visibleTiles;
    const targetTiles = visibleTiles;

    const dummyCount = 12;
    const dummyTiles: SlotTile[] = [];
    for (let i = 0; i < dummyCount; i++) {
      const randSym = DUMMY_SYMBOLS[Math.floor(Math.random() * DUMMY_SYMBOLS.length)];
      dummyTiles.push({
        id: `dummy_${colIdx}_${i}_${Math.random()}`,
        symbol: randSym,
        isGold: randSym !== 'scatter' && randSym !== 'wild' && colIdx > 0 && colIdx < 5 && Math.random() < 0.1
      });
    }

    const strip: SlotTile[] = [
      ...targetTiles,
      ...dummyTiles,
      ...prevTiles.map((t, idx) => ({ ...t, id: `prev_${colIdx}_${idx}_${t.id}` }))
    ];

    setTapeTiles(strip);

    const clientH = containerRef.current?.clientHeight || 0;
    const step = clientH > 0 ? clientH / height : 82;
    const startOffset = -((height + dummyCount) * step);

    setOffsetY(startOffset);
    setIsRolling(false);

    const rafId1 = requestAnimationFrame(() => {
      const rafId2 = requestAnimationFrame(() => {
        setIsRolling(true);
        setOffsetY(0);
      });
      return () => cancelAnimationFrame(rafId2);
    });

    const stopTimer = setTimeout(() => {
      setIsRolling(false);
      setHasLanded(true);
      prevTilesRef.current = targetTiles;

      if (!stoppedRef.current) {
        stoppedRef.current = true;
        if (onReelStop) onReelStop(colIdx);
      }
    }, spinDuration);

    return () => {
      cancelAnimationFrame(rafId1);
      clearTimeout(stopTimer);
    };
  }, [isSpinning, spinDuration, visibleTiles, colIdx, height, onReelStop, cascadeDropCount]);

  // 2. Cascade Drop logic: continuous strip sliding down from top when tiles shatter
  useEffect(() => {
    if (cascadeDropCount > 0 && !isSpinning) {
      const clientH = containerRef.current?.clientHeight || 0;
      const step = clientH > 0 ? clientH / height : 82;
      const startOffset = -(cascadeDropCount * step);

      // Current visibleTiles already contains new top tiles + dropped survivors
      setTapeTiles(visibleTiles);
      setOffsetY(startOffset);
      setIsRolling(false);
      setHasLanded(false);

      const rafId1 = requestAnimationFrame(() => {
        const rafId2 = requestAnimationFrame(() => {
          setIsRolling(true);
          setOffsetY(0);
        });
        return () => cancelAnimationFrame(rafId2);
      });

      const landTimer = setTimeout(() => {
        setIsRolling(false);
        setHasLanded(true);
        prevTilesRef.current = visibleTiles;
      }, 340);

      const bounceClearTimer = setTimeout(() => {
        setHasLanded(false);
      }, 550);

      return () => {
        cancelAnimationFrame(rafId1);
        clearTimeout(landTimer);
        clearTimeout(bounceClearTimer);
      };
    }
  }, [cascadeDropCount, isSpinning, visibleTiles, height]);

  return (
    <div
      ref={containerRef}
      data-col={colIdx}
      className={`relative flex flex-col justify-center rounded-xl p-1 border shadow-inner overflow-hidden transition-all duration-300 ${
        isAnticipating
          ? 'animate-anticipation bg-rose-950/40 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.8)]'
          : 'bg-black/40 border-amber-900/30'
      }`}
      style={{
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
          transform: `translateY(${offsetY}px)`,
          transition: isRolling
            ? `transform ${isSpinning ? spinDuration : 340}ms cubic-bezier(${
                isSpinning ? '0.12, 0.85, 0.28, 1' : '0.22, 1, 0.36, 1.15'
              })`
            : 'none'
        }}
        className={`flex flex-col gap-1.5 sm:gap-2 justify-center ${
          hasLanded ? 'animate-reel-bounce' : ''
        }`}
      >
        {(isSpinning || isRolling || cascadeDropCount > 0 ? tapeTiles : visibleTiles).map(tile => (
          <div key={tile.id} className="w-full flex-shrink-0">
            <WildBountyTile
              symbol={tile.symbol}
              isGold={tile.isGold}
              isWinning={tile.isWinning}
              transformedToWild={tile.transformedToWild}
              animationPhase={isSpinning || isRolling ? 'idle' : animationPhase}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
