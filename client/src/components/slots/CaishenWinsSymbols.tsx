import React from 'react';
import { SlotTile } from '../../types/game';
import { TileAnimationPhase } from './WildBountySymbols';

interface SymbolProps {
  tile: SlotTile;
  isWinning?: boolean;
  transformedToWild?: boolean;
  animationPhase?: TileAnimationPhase;
  /** Nền pastel theo cột (giống bản gốc), class gradient Tailwind. */
  bgOverride?: string;
}

// Sprite gốc trích từ PDF CaishenWins_Gameinformation_EN của PG Soft.
const ASSET = `${import.meta.env.BASE_URL}assets/caishen`;
const SPRITES: Record<string, string> = {
  caishen_lion: `${ASSET}/sym-lion.png`,
  caishen_toad: `${ASSET}/sym-toad.png`,
  caishen_koi: `${ASSET}/sym-koi.png`,
  caishen_angpao: `${ASSET}/sym-angpao.png`,
  caishen_cymbal: `${ASSET}/sym-drum.png`,
  caishen_firecracker: `${ASSET}/sym-firecracker.png`,
  A: `${ASSET}/sym-A.png`,
  K: `${ASSET}/sym-K.png`,
  Q: `${ASSET}/sym-Q.png`,
  J: `${ASSET}/sym-J.png`,
  '10': `${ASSET}/sym-ten.png`,
  wild: `${ASSET}/sym-wild.png`,
  scatter: `${ASSET}/sym-scatter.png`
};

const VI_LABEL: Record<string, string> = {
  caishen_lion: 'Múa Lân',
  caishen_toad: 'Cóc Vàng',
  caishen_koi: 'Cá Chép',
  caishen_angpao: 'Lì Xì',
  caishen_cymbal: 'Trống Cổ',
  caishen_firecracker: 'Pháo Đỏ',
  A: 'Át',
  K: 'Già',
  Q: 'Đầm',
  J: 'Bồi',
  '10': 'Mười'
};

/** Mọi URL ảnh Caishen để preload trước khi quay (tránh pop/decode giật). */
export const CAISHEN_ASSET_URLS: string[] = [
  `${ASSET}/cover.png`,
  `${ASSET}/logo.png`,
  `${ASSET}/paytable.png`,
  `${ASSET}/ways-rules.png`,
  ...Object.values(SPRITES)
];

/** Nạp trước + giải mã sẵn toàn bộ ảnh để animation quay mượt. */
export function preloadCaishenAssets(): void {
  if (typeof window === 'undefined' || typeof Image === 'undefined') return;
  for (const src of CAISHEN_ASSET_URLS) {
    try {
      const im = new Image();
      (im as any).decoding = 'async';
      im.src = src;
      (im as any).decode?.().catch(() => {});
    } catch {}
  }
}

// Custom SVG Gold Ingot (dùng cho banner Wilds-on-the-Way).
export const GoldIngotSvg: React.FC<{ className?: string }> = ({ className = 'w-10 h-7' }) => (
  <svg viewBox="0 0 100 70" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="ingotGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fffbeb" />
        <stop offset="25%" stopColor="#fde047" />
        <stop offset="60%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
      <linearGradient id="ingotBase" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
      <filter id="ingotShadow" x="-10%" y="-10%" width="120%" height="130%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#78350f" floodOpacity="0.4" />
      </filter>
    </defs>
    {/* Base boat of Yuanbao */}
    <path
      d="M10 32 C12 55, 30 65, 50 65 C70 65, 88 55, 90 32 C95 24, 80 18, 50 18 C20 18, 5 24, 10 32 Z"
      fill="url(#ingotBase)"
      filter="url(#ingotShadow)"
      stroke="#b45309"
      strokeWidth="2"
    />
    {/* Top inner dome of Yuanbao */}
    <ellipse cx="50" cy="28" rx="28" ry="14" fill="url(#ingotGold)" stroke="#d97706" strokeWidth="1.5" />
    <ellipse cx="50" cy="27" rx="16" ry="8" fill="#fef9c3" opacity="0.75" />
  </svg>
);

export const CaishenWinsTile: React.FC<SymbolProps> = ({
  tile,
  isWinning = tile.isWinning,
  transformedToWild = tile.transformedToWild,
  animationPhase = 'idle',
  bgOverride
}) => {
  const symbol = tile.symbol;
  const isSilver = tile.isSilver || tile.frame === 'silver';
  const isGold = tile.isGold || tile.frame === 'gold';

  const isConnecting = isWinning && (animationPhase === 'connecting' || animationPhase === 'idle');
  const isShattering = isWinning && animationPhase === 'shattering';
  const isGoldMorphing = (isGold && isShattering) || animationPhase === 'gold-morph' || transformedToWild;
  const isSilverMorphing = isSilver && isShattering;

  // Render sprite gốc PG Soft (art trích từ PDF chính hãng).
  const renderSymbolGraphic = () => {
    if (symbol === 'wild') {
      return (
        <div className="flex flex-col items-center justify-center">
          <img
            src={SPRITES.wild}
            alt="Wild"
            draggable={false}
            className="h-8 sm:h-10 w-auto object-contain filter drop-shadow-[0_2px_4px_rgba(180,83,9,0.5)]"
          />
          <span className="text-[10px] sm:text-xs font-black tracking-wider text-amber-900 bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-300 px-1 rounded shadow-sm leading-tight mt-0.5 border border-yellow-400">
            WILD
          </span>
        </div>
      );
    }

    if (symbol === 'scatter') {
      // Art gốc đã gồm ribbon SCATTER.
      return (
        <div className="flex flex-col items-center justify-center">
          <img
            src={SPRITES.scatter}
            alt="Scatter"
            draggable={false}
            className="h-9 sm:h-11 w-auto object-contain filter drop-shadow-[0_2px_4px_rgba(153,27,27,0.6)] animate-pulse"
          />
        </div>
      );
    }

    if (symbol === 'caishen_god') {
      return (
        <div className="flex flex-col items-center justify-center">
          <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-b from-red-600 via-red-700 to-red-900 border-2 border-yellow-300 shadow-[0_0_14px_rgba(250,204,21,0.8)] flex items-center justify-center animate-pulse">
            <span className="text-xl sm:text-2xl font-black text-yellow-300 drop-shadow-[0_2px_2px_rgba(0,0,0,0.7)]">財</span>
          </div>
          <span className="text-[8px] sm:text-[9px] font-black text-yellow-300 bg-red-900/90 px-1 rounded leading-none mt-0.5 tracking-tight uppercase border border-yellow-400/60">
            Thần Tài
          </span>
        </div>
      );
    }

    const src = SPRITES[symbol];
    if (src) {
      return (
        <div className="flex flex-col items-center justify-center">
          <img
            src={src}
            alt={symbol}
            draggable={false}
            className="h-8 sm:h-10 w-auto object-contain filter drop-shadow-[0_3px_4px_rgba(0,0,0,0.35)]"
          />
          <span className="text-[8px] sm:text-[9px] font-black text-stone-700 leading-none mt-0.5 tracking-tight uppercase">
            {VI_LABEL[symbol] ?? symbol}
          </span>
        </div>
      );
    }

    return <span className="text-xl">🪙</span>;
  };

  return (
    <div
      className={`relative w-full h-[58px] sm:h-[66px] md:h-[74px] flex-shrink-0 rounded-xl flex flex-col items-center justify-center p-1 select-none overflow-hidden transition-all duration-200 ${
        // Nền pastel theo cột (bản gốc) hoặc nền kem mặc định.
        bgOverride ??
        'bg-gradient-to-b from-[#fbf6e9] via-[#f3ebd3] to-[#e8dcb9]'
      } ${
        isSilver
          ? 'border-2 border-slate-300 shadow-[0_0_12px_rgba(203,213,225,0.8)]'
          : isGold
          ? 'border-2 border-yellow-400 shadow-[0_0_16px_rgba(250,204,21,0.9)] ring-1 ring-yellow-300'
          : 'border border-[#d6c7a1]/70 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),inset_0_-1px_2px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.1)]'
      } ${
        isShattering && !isGold && !isSilver
          ? 'animate-slot-shatter pointer-events-none'
          : isGoldMorphing
          ? 'animate-gold-morph !border-yellow-300 ring-4 ring-yellow-400/90 shadow-[0_0_30px_#fde047] z-20'
          : isSilverMorphing
          ? 'animate-pulse !border-yellow-200 ring-2 ring-yellow-300/80 shadow-[0_0_20px_rgba(253,224,71,0.7)] z-15'
          : isConnecting
          ? 'scale-105 !border-yellow-300 ring-2 ring-yellow-400/90 shadow-[0_0_22px_rgba(250,204,21,0.9)] z-10 animate-slot-pulse'
          : ''
      }`}
    >
      {/* Chinese Scroll Rod Top & Bottom for Silver Frames */}
      {isSilver && (
        <>
          {/* Top Roller */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-slate-400 via-slate-100 to-slate-400 rounded-t-lg border-b border-slate-300 shadow-sm flex items-center justify-between px-0.5">
            <div className="w-1 h-1 rounded-full bg-slate-300 shadow" />
            <div className="w-1 h-1 rounded-full bg-slate-300 shadow" />
          </div>
          {/* Bottom Roller */}
          <div className="absolute bottom-0 inset-x-0 h-1.5 bg-gradient-to-r from-slate-400 via-slate-100 to-slate-400 rounded-b-lg border-t border-slate-300 shadow-sm flex items-center justify-between px-0.5">
            <div className="w-1 h-1 rounded-full bg-slate-300 shadow" />
            <div className="w-1 h-1 rounded-full bg-slate-300 shadow" />
          </div>
          {/* Silver badge */}
          <div className="absolute top-1.5 right-1 px-1 rounded bg-slate-200/90 text-[7px] font-black text-slate-700 shadow-sm z-10 border border-slate-300">
            BẠC
          </div>
        </>
      )}

      {/* Chinese Scroll Rod Top & Bottom for Gold Frames */}
      {isGold && (
        <>
          {/* Top Golden Roller */}
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-amber-600 via-yellow-200 to-amber-600 rounded-t-lg border-b border-amber-500 shadow flex items-center justify-between px-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-300 shadow" />
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-300 shadow" />
          </div>
          {/* Bottom Golden Roller */}
          <div className="absolute bottom-0 inset-x-0 h-2 bg-gradient-to-r from-amber-600 via-yellow-200 to-amber-600 rounded-b-lg border-t border-amber-500 shadow flex items-center justify-between px-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-300 shadow" />
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-300 shadow" />
          </div>
          {/* Gold badge with gleam */}
          <div className="absolute top-2 right-1 px-1 rounded bg-gradient-to-r from-yellow-300 to-amber-400 text-[7px] font-black text-amber-950 shadow-sm z-10 border border-yellow-200">
            VÀNG
          </div>
          <div className="absolute top-2 left-1 w-1.5 h-1.5 bg-yellow-300 rounded-full shadow-[0_0_6px_#fde047] animate-ping" />
        </>
      )}

      {/* Shattering Gold Coins Overlay */}
      {isShattering && (
        <>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className="w-10 h-10 rounded-full bg-yellow-300/90 animate-ping shadow-[0_0_25px_#fef08a]" />
          </div>
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 stroke-yellow-400/90 fill-none" viewBox="0 0 100 100">
            <path d="M50 50 L20 15 M50 50 L80 20 M50 50 L85 75 M50 50 L25 80 M50 50 L10 50 M50 50 L90 50 M50 50 L50 10 M50 50 L50 90" strokeWidth="2.5" strokeDasharray="3,1" />
            <circle cx="50" cy="50" r="14" strokeWidth="2" stroke="rgba(245,158,11,0.9)" />
            <circle cx="50" cy="50" r="24" strokeWidth="1.5" stroke="rgba(254,240,138,0.7)" strokeDasharray="4,2" />
          </svg>
          <div className="absolute w-3 h-3 bg-gradient-to-tr from-yellow-400 to-amber-200 rounded-sm animate-shard-1 z-30 pointer-events-none" />
          <div className="absolute w-3 h-3 bg-gradient-to-tr from-orange-400 to-yellow-100 rounded-sm animate-shard-2 z-30 pointer-events-none" />
          <div className="absolute w-2.5 h-2.5 bg-gradient-to-tr from-yellow-300 to-white rounded-sm animate-shard-3 z-30 pointer-events-none" />
          <div className="absolute w-3.5 h-3.5 bg-gradient-to-tr from-amber-500 to-yellow-200 rounded-sm animate-shard-4 z-30 pointer-events-none" />
        </>
      )}

      {/* Graphic / Icon Container */}
      <div className={`transition-transform duration-200 ${isConnecting ? 'scale-110' : ''}`}>
        {renderSymbolGraphic()}
      </div>

      {/* Winning Shimmer Sweep */}
      {isConnecting && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/35 to-transparent -translate-x-full animate-[shimmer_1.2s_infinite] pointer-events-none rounded-xl" />
      )}
    </div>
  );
};
