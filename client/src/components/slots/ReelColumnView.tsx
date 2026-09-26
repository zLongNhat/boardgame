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
  dummySymbols?: SlotSymbolId[]; // Giữ để tương thích API cũ — không còn dùng (dải quay dựng từ block thật)
  goldCols?: number[]; // Giữ để tương thích API cũ — không còn dùng
  renderTile?: (tile: SlotTile, phase: TileAnimationPhase) => React.ReactNode;
  onReelStop?: (colIdx: number) => void;
}

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
  renderTile,
  onReelStop
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  // Khóa chiều cao container lúc nghỉ để khi quay (dải dài) khung không giãn ra.
  const [lockedH, setLockedH] = useState<number | null>(null);
  const prevTilesRef = useRef<SlotTile[]>(visibleTiles);
  const [tapeTiles, setTapeTiles] = useState<SlotTile[]>(visibleTiles);
  const [offsetY, setOffsetY] = useState(0);
  const [isRolling, setIsRolling] = useState(false);
  const stoppedRef = useRef(false);
  // Offset rơi từng ô cho cascade (px). Ô đứng yên luôn = 0, không áp transition.
  const [tileOffsets, setTileOffsets] = useState<number[]>(() => new Array(height).fill(0));
  const [cascadeFalling, setCascadeFalling] = useState(false);

  const hasFall =
    !isSpinning &&
    !!fallDistances &&
    fallDistances.length === height &&
    fallDistances.some(f => f > 0);

  // Đo pitch chính xác = chiều cao 1 ô + gap. KHÔNG dùng clientHeight/height
  // vì container có padding nên step bị lệch (padding/height mỗi ô), tích lũy
  // thành snap vài px đến vài chục px khi dừng — nguyên nhân giật cục.
  const measureStep = () => {
    const stripEl = stripRef.current;
    const first = stripEl?.firstElementChild as HTMLElement | null;
    const tileH = first?.getBoundingClientRect().height || 0;
    let gap = 0;
    if (stripEl && typeof getComputedStyle === 'function') {
      const parsed = parseFloat(getComputedStyle(stripEl).rowGap);
      if (!Number.isNaN(parsed)) gap = parsed;
    }
    const pitch = tileH > 0 ? tileH + gap : 0;
    return pitch > 0 ? pitch : 82;
  };

  // Đồng bộ offset xuất phát NGAY TRONG RENDER (derived state) để frame đầu tiên
  // của cascade đã ở đúng vị trí xuất phát — không còn flash 1 frame ở vị trí cuối
  // rồi mới bật ngược lên (nguyên nhân của hiện tượng giật/snap khi kết thúc cascade).
  const [appliedFalls, setAppliedFalls] = useState<number[] | undefined>(undefined);
  if (fallDistances !== appliedFalls) {
    setAppliedFalls(fallDistances);
    if (hasFall) {
      const step = measureStep();
      setTileOffsets((fallDistances as number[]).map(f => -f * step));
      if (cascadeFalling) setCascadeFalling(false);
    } else if (!isSpinning) {
      setTileOffsets(new Array(height).fill(0));
      if (cascadeFalling) setCascadeFalling(false);
    }
  }

  // Khi nghỉ (không quay/rơi), đo và khóa chiều cao container theo đúng
  // content hiện tại. Lúc quay dải rất dài nhưng khung giữ nguyên → không
  // còn hiện tượng toàn bộ giàn cuộn giãn dài ra gây khó chịu.
  const isIdle = !isSpinning && !isRolling && !hasFall;
  useEffect(() => {
    if (!isIdle) return;
    const measure = () => {
      const h = stripRef.current?.offsetHeight || 0;
      if (h > 0) setLockedH(prev => (prev === h ? prev : h));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [isIdle, visibleTiles, height]);

  // 1. Initial spin roll logic (when isSpinning === true)
  // Dải quay được dựng HOÀN TOÀN từ block thật (targetTiles lặp lại) — không còn
  // ô dummy ngẫu nhiên nên những gì bay qua chính là symbol thật, dừng chuẩn
  // xác ở kết quả, không giật/snap hình.
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

    // Lặp lại đúng các block kết quả để tạo chiều dài dải quay.
    // Mini cột top reel (height=1) chỉ cần dải ngắn để đỡ nhấp nháy.
    const repeatCount = Math.max(2, Math.ceil(8 / height));
    const filler: SlotTile[] = [];
    for (let r = 0; r < repeatCount; r++) {
      for (let i = 0; i < targetTiles.length; i++) {
        const t = targetTiles[i];
        filler.push({
          ...t,
          id: `spin_${colIdx}_${r}_${i}`,
          isWinning: false,
          transformedToWild: false
        });
      }
    }

    const strip: SlotTile[] = [
      ...targetTiles,
      ...filler,
      ...prevTiles.map((t, idx) => ({ ...t, id: `prev_${colIdx}_${idx}_${t.id}` }))
    ];

    setTapeTiles(strip);

    const step = measureStep();
    const startOffset = -((height + filler.length) * step);

    setOffsetY(startOffset);
    setIsRolling(false);

    let rafId2 = 0;
    const rafId1 = requestAnimationFrame(() => {
      rafId2 = requestAnimationFrame(() => {
        setIsRolling(true);
        setOffsetY(0);
      });
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
      if (rafId2) cancelAnimationFrame(rafId2);
      clearTimeout(stopTimer);
    };
  }, [isSpinning, spinDuration, visibleTiles, colIdx, height, onReelStop, cascadeDropCount]);

  // 2. Cascade Drop logic: chỉ ô phía trên điểm vỡ rơi thẳng xuống.
  // Ô dưới điểm vỡ (fall = 0) đứng yên 100%, không áp animation/transition.
  // Tổng thể chỉ rơi xuống (translateY âm -> 0), không nảy lên (no overshoot/bounce).
  // Khi cascade luôn render lưới MỚI (visibleTiles), không bao giờ render tapeTiles
  // chứa ô cũ nên không còn lệch ô/giật đổi hình.
  useEffect(() => {
    if (!hasFall) return;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fallDistances, isSpinning, height]);

  // Khi cascade: render lưới mới với offset đã đồng bộ sẵn.
  // Khi quay: render dải tape (block thật). Không bao giờ lẫn ô cũ vào cascade.
  const tiles = (isSpinning || isRolling) && !hasFall ? tapeTiles : visibleTiles;

  return (
    <div
      ref={containerRef}
      data-col={colIdx}
      className={`relative flex flex-col justify-start rounded-xl p-1 border shadow-inner overflow-hidden transition-all duration-300 ${
        isAnticipating
          ? 'animate-anticipation bg-rose-950/40 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.8)]'
          : 'bg-black/40 border-amber-900/30'
      }`}
      style={{
        height: lockedH ?? undefined,
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
        ref={stripRef}
        style={{
          transform: `translateY(${offsetY}px)`,
          transition: isRolling
            ? `transform ${spinDuration}ms cubic-bezier(0.12, 0.85, 0.28, 1)`
            : 'none',
          willChange: isRolling ? 'transform' : undefined
        }}
        className="flex flex-col gap-1.5 sm:gap-2 justify-start"
      >
        {tiles.map((tile, rowIdx) => {
          const fall = hasFall && fallDistances ? fallDistances[rowIdx] || 0 : 0;
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
