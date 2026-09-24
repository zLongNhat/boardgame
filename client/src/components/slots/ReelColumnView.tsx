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
  fallDistances?: number[]; // Khoảng rơi từng ô (số bước ô), 0 = đứng yên
  dummySymbols?: SlotSymbolId[];
  goldCols?: number[];
  renderTile?: (tile: SlotTile, phase: TileAnimationPhase) => React.ReactNode;
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
  fallDistances,
  dummySymbols,
  goldCols,
  renderTile,
  onReelStop
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevTilesRef = useRef<SlotTile[]>(visibleTiles);
  const [tapeTiles, setTapeTiles] = useState<SlotTile[]>(visibleTiles);
  const [offsetY, setOffsetY] = useState(0);
  const [isRolling, setIsRolling] = useState(false);
  const stoppedRef = useRef(false);
  // Offset rơi từng ô cho cascade (px). Ô đứng yên luôn = 0, không áp transition.
  const [tileOffsets, setTileOffsets] = useState<number[]>(() => new Array(height).fill(0));
  const [cascadeFalling, setCascadeFalling] = useState(false);

  // 1. Initial spin roll logic (when isSpinning === true)
  useEffect(() => {
    if (!isSpinning) {
      const isCascading =
        cascadeDropCount > 0 || (fallDistances && fallDistances.some(f => f > 0));
      if (!isCascading) {
        prevTilesRef.current = visibleTiles;
        setTapeTiles(visibleTiles);
        setOffsetY(0);
        setIsRolling(false);
        stoppedRef.current = true;
      }
      return;
    }

    stoppedRef.current = false;

    const prevTiles = prevTilesRef.current && prevTilesRef.current.length === height
      ? prevTilesRef.current
      : visibleTiles;
    const targetTiles = visibleTiles;

    const dummyCount = 12;
    const dummyTiles: SlotTile[] = [];
    const pool = dummySymbols && dummySymbols.length > 0 ? dummySymbols : DUMMY_SYMBOLS;
    const goldAllowed = goldCols ? goldCols.includes(colIdx) : colIdx > 0 && colIdx < 5;
    for (let i = 0; i < dummyCount; i++) {
      const randSym = pool[Math.floor(Math.random() * pool.length)];
      dummyTiles.push({
        id: `dummy_${colIdx}_${i}_${Math.random()}`,
        symbol: randSym,
        isGold: randSym !== 'scatter' && randSym !== 'wild' && goldAllowed && Math.random() < 0.1
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

  // 2. Cascade Drop logic: chỉ ô phía trên điểm vỡ rơi thẳng xuống.
  // Ô dưới điểm vỡ (fall = 0) đứng yên 100%, không áp animation/transition.
  // Tổng thể chỉ rơi xuống (translateY âm -> 0), không nảy lên (no overshoot/bounce).
  useEffect(() => {
    const hasFall =
      !isSpinning &&
      fallDistances &&
      fallDistances.length === height &&
      fallDistances.some(f => f > 0);
    if (!hasFall) {
      if (!isSpinning) {
        setCascadeFalling(false);
        setTileOffsets(new Array(height).fill(0));
      }
      return;
    }

    const clientH = containerRef.current?.clientHeight || height * 82;
    const step = clientH > 0 ? clientH / height : 82;
    const startOffsets = (fallDistances as number[]).map(f => -f * step);

    setCascadeFalling(false);
    setTileOffsets(startOffsets);

    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setCascadeFalling(true);
        setTileOffsets(new Array(height).fill(0));
      });
    });

    const landTimer = setTimeout(() => {
      setCascadeFalling(false);
      setTileOffsets(new Array(height).fill(0));
      prevTilesRef.current = visibleTiles;
    }, 360);

    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      clearTimeout(landTimer);
    };
  }, [fallDistances, isSpinning, visibleTiles, height]);

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

      {/* Reel Strip Container (chỉ dùng cho spin đầu, cascade dùng animation từng ô) */}
      <div
        style={{
          transform: `translateY(${offsetY}px)`,
          transition: isRolling
            ? `transform ${spinDuration}ms cubic-bezier(0.12, 0.85, 0.28, 1)`
            : 'none'
        }}
        className="flex flex-col gap-1.5 sm:gap-2 justify-center"
      >
        {(isSpinning || isRolling ? tapeTiles : visibleTiles).map((tile, rowIdx) => {
          const fall = !isSpinning && !isRolling && fallDistances ? fallDistances[rowIdx] || 0 : 0;
          const isFallingTile = fall > 0 && (cascadeFalling || (tileOffsets[rowIdx] || 0) !== 0);
          const phase = isSpinning || isRolling ? 'idle' : animationPhase;
          return (
            <div
              key={tile.id}
              className="w-full flex-shrink-0"
              style={
                isFallingTile
                  ? {
                      transform: `translateY(${tileOffsets[rowIdx] || 0}px)`,
                      transition: cascadeFalling
                        ? 'transform 340ms cubic-bezier(0.33, 0.66, 0.41, 1)'
                        : 'none'
                    }
                  : { transform: 'none', transition: 'none' }
              }
            >
              {renderTile ? (
                renderTile(tile, phase)
              ) : (
                <WildBountyTile
                  symbol={tile.symbol}
                  isGold={tile.isGold}
                  isWinning={tile.isWinning}
                  transformedToWild={tile.transformedToWild}
                  animationPhase={phase}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
