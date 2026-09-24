import React from 'react';
import { SlotSymbolId } from '../../types/game';
import { TileAnimationPhase } from './WildBountySymbols';

interface SymbolProps {
  symbol: SlotSymbolId;
  isGold: boolean;
  isWinning?: boolean;
  transformedToWild?: boolean;
  animationPhase?: TileAnimationPhase;
}

interface TileStyle {
  label: string;
  glyph: string;
  bg: string;
  glyphColor: string;
  border: string;
  pill: string;
  pips?: { count: number; kind: 'dot' | 'bar' };
  tier?: string;
}

// Mahjong tiles — nền đặc bão hòa + chữ trắng + hàng pip phân biệt Đồng/Sách.
// Đồng = chấm đỏ, Sách = thanh tre xanh, số lượng pip = giá trị (2/3/5).
const STYLES: Record<string, TileStyle> = {
  mj_green: { label: 'PHÁT', glyph: '發', bg: 'from-emerald-500 via-emerald-700 to-emerald-900', glyphColor: 'text-white', border: 'border-emerald-300/70', pill: 'bg-emerald-950/80 text-emerald-100', tier: 'TOP' },
  mj_red: { label: 'TRUNG', glyph: '中', bg: 'from-rose-500 via-red-700 to-red-900', glyphColor: 'text-white', border: 'border-rose-300/70', pill: 'bg-red-950/80 text-red-100' },
  mj_white: { label: 'BẠCH', glyph: '白', bg: 'from-white via-slate-200 to-slate-400', glyphColor: 'text-slate-900', border: 'border-sky-400/80', pill: 'bg-slate-900/85 text-white' },
  mj_char8: { label: 'BÁT VẠN', glyph: '捌萬', bg: 'from-amber-500 via-orange-600 to-orange-800', glyphColor: 'text-white', border: 'border-amber-200/70', pill: 'bg-orange-950/80 text-amber-100' },
  mj_dots5: { label: 'NGŨ ĐỒNG', glyph: '筒', bg: 'from-sky-500 via-blue-700 to-blue-900', glyphColor: 'text-white', border: 'border-sky-300/70', pill: 'bg-blue-950/80 text-sky-100', pips: { count: 5, kind: 'dot' } },
  mj_bamboo5: { label: 'NGŨ SÁCH', glyph: '索', bg: 'from-lime-600 via-green-700 to-green-900', glyphColor: 'text-white', border: 'border-lime-300/70', pill: 'bg-green-950/80 text-lime-100', pips: { count: 5, kind: 'bar' } },
  mj_dots3: { label: 'TAM ĐỒNG', glyph: '筒', bg: 'from-indigo-500 via-indigo-700 to-indigo-900', glyphColor: 'text-white', border: 'border-indigo-300/70', pill: 'bg-indigo-950/80 text-indigo-100', pips: { count: 3, kind: 'dot' } },
  mj_bamboo2: { label: 'NHỊ SÁCH', glyph: '索', bg: 'from-teal-500 via-teal-700 to-teal-900', glyphColor: 'text-white', border: 'border-teal-300/70', pill: 'bg-teal-950/85 text-teal-100', pips: { count: 2, kind: 'bar' } },
  wild: { label: '★ WILD ★', glyph: '百', bg: 'from-yellow-300 via-amber-400 to-amber-600', glyphColor: 'text-red-900', border: 'border-yellow-100 shadow-[0_0_20px_rgba(250,204,21,0.6)]', pill: 'bg-red-900 text-yellow-200' },
  scatter: { label: 'SCATTER', glyph: '胡', bg: 'from-fuchsia-600 via-rose-600 to-purple-900', glyphColor: 'text-yellow-100', border: 'border-yellow-200/80 shadow-[0_0_20px_rgba(244,63,94,0.6)]', pill: 'bg-black/60 text-yellow-200' }
};

export const MahjongTile: React.FC<SymbolProps> = ({
  symbol,
  isGold,
  isWinning,
  transformedToWild,
  animationPhase = 'idle'
}) => {
  const details = STYLES[symbol] ?? { label: String(symbol), glyph: '🀄', bg: 'from-stone-500 to-stone-700', glyphColor: 'text-white', border: 'border-stone-400', pill: 'bg-black/60 text-white' };
  const isConnecting = isWinning && (animationPhase === 'connecting' || animationPhase === 'idle');
  const isShattering = isWinning && animationPhase === 'shattering';
  const isGoldMorphing = (isGold && isShattering) || animationPhase === 'gold-morph' || transformedToWild;

  return (
    <div
      className={`relative w-full h-[68px] sm:h-[78px] md:h-[88px] flex-shrink-0 rounded-xl border-2 flex flex-col items-center justify-center py-1 select-none overflow-hidden bg-gradient-to-b ${
        details.bg
      } ${
        isShattering && !isGold
          ? 'animate-slot-shatter pointer-events-none'
          : isGoldMorphing
          ? 'animate-gold-morph !border-yellow-200 ring-4 ring-yellow-300/90 shadow-[0_0_30px_#fde047] z-20'
          : isConnecting
          ? 'scale-105 !border-yellow-200 ring-2 ring-yellow-300/90 shadow-[0_0_22px_rgba(250,204,21,0.9)] z-10 animate-slot-pulse'
          : isGold
          ? '!border-yellow-300 shadow-[0_0_14px_rgba(234,179,8,0.8)] ring-1 ring-yellow-200/80'
          : details.border
      } transition-all duration-200`}
    >
      {/* Tier ribbon cho quân top */}
      {details.tier && (
        <div className="absolute top-0 left-0 px-1.5 py-px rounded-br-lg bg-yellow-300 text-[8px] font-black text-red-900 tracking-wider z-10">
          {details.tier}
        </div>
      )}
      {isGold && (
        <>
          <div className="absolute inset-0 border-[3px] border-yellow-200/95 rounded-[10px] pointer-events-none shadow-[inset_0_0_10px_rgba(250,204,21,0.7)]" />
          <div className="absolute top-0.5 right-0.5 px-1 rounded bg-yellow-300 text-[8px] font-black text-amber-950 z-10">VÀNG</div>
        </>
      )}

      {isShattering && (
        <>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className="w-10 h-10 rounded-full bg-yellow-300/90 animate-ping shadow-[0_0_25px_#fef08a]" />
          </div>
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 stroke-yellow-200/90 fill-none" viewBox="0 0 100 100">
            <path d="M50 50 L20 15 M50 50 L80 20 M50 50 L85 75 M50 50 L25 80 M50 50 L10 50 M50 50 L90 50 M50 50 L50 10 M50 50 L50 90" strokeWidth="2.5" strokeDasharray="3,1" />
            <circle cx="50" cy="50" r="12" strokeWidth="2" stroke="rgba(250,204,21,0.9)" />
            <circle cx="50" cy="50" r="22" strokeWidth="1.5" stroke="rgba(254,240,138,0.7)" strokeDasharray="4,2" />
          </svg>
          <div className="absolute w-3 h-3 bg-gradient-to-tr from-yellow-400 to-amber-200 rounded-sm animate-shard-1 z-30 pointer-events-none" />
          <div className="absolute w-3 h-3 bg-gradient-to-tr from-orange-400 to-yellow-100 rounded-sm animate-shard-2 z-30 pointer-events-none" />
          <div className="absolute w-2.5 h-2.5 bg-gradient-to-tr from-yellow-300 to-white rounded-sm animate-shard-3 z-30 pointer-events-none" />
          <div className="absolute w-3.5 h-3.5 bg-gradient-to-tr from-amber-500 to-yellow-200 rounded-sm animate-shard-4 z-30 pointer-events-none" />
        </>
      )}

      {/* Chữ mạt chược lớn, đổ bóng dày để đọc rõ trên mọi nền */}
      <span
        className={`leading-none font-black filter transition-transform duration-200 ${details.glyphColor} ${
          isConnecting ? 'scale-110' : ''
        } text-3xl sm:text-4xl md:text-[42px] [text-shadow:0_2px_0_rgba(0,0,0,0.55),0_0_12px_rgba(0,0,0,0.35)]`}
      >
        {details.glyph}
      </span>

      {/* Hàng pip: Đồng = chấm đỏ, Sách = thanh tre */}
      {details.pips && (
        <div className="flex items-center justify-center gap-[3px] mt-[3px] px-1 py-[2px] rounded-full bg-black/45">
          {Array.from({ length: details.pips.count }).map((_, i) =>
            details.pips!.kind === 'dot' ? (
              <span key={i} className="w-[7px] h-[7px] rounded-full bg-red-500 ring-1 ring-white/90 shadow" />
            ) : (
              <span key={i} className="w-[5px] h-[10px] rounded-full bg-green-400 ring-1 ring-white/90 shadow" />
            )
          )}
        </div>
      )}

      {/* Nhãn tiếng Việt nền tối, chữ sáng — đọc rõ trên mọi tile */}
      <div className={`mt-[3px] px-1.5 py-px rounded-md text-[9px] sm:text-[10px] font-black uppercase tracking-wide whitespace-nowrap ${details.pill}`}>
        {details.label}
      </div>

      {isConnecting && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-200/30 to-transparent -translate-x-full animate-[shimmer_1.2s_infinite] pointer-events-none rounded-xl" />
      )}
    </div>
  );
};
