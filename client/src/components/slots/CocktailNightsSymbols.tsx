import React from 'react';
import { SlotTile } from '../../types/game';
import { TileAnimationPhase } from './WildBountySymbols';

interface SymbolProps {
  tile: SlotTile;
  isWinning?: boolean;
  transformedToWild?: boolean;
  animationPhase?: TileAnimationPhase;
  /** Nền tile theo cột, class gradient Tailwind. */
  bgOverride?: string;
}

// Sprite gốc trích từ PDF Cocktail_Nights_Gameinformation_EN của PG Soft.
const ASSET = `${import.meta.env.BASE_URL}assets/cocktail`;
const SPRITES: Record<string, string> = {
  cocktail_bottle: `${ASSET}/sym-bottle.png`,
  cocktail_whiskey: `${ASSET}/sym-whiskey.png`,
  cocktail_blue: `${ASSET}/sym-blue.png`,
  cocktail_green: `${ASSET}/sym-green.png`,
  cocktail_lemon: `${ASSET}/sym-lemon.png`,
  cocktail_shot: `${ASSET}/sym-shot.png`,
  A: `${ASSET}/sym-A.png`,
  K: `${ASSET}/sym-K.png`,
  Q: `${ASSET}/sym-Q.png`,
  J: `${ASSET}/sym-J.png`,
  '10': `${ASSET}/sym-ten.png`,
  wild: `${ASSET}/sym-wild.png`,
  scatter: `${ASSET}/sym-scatter.png`
};

const VI_LABEL: Record<string, string> = {
  cocktail_bottle: 'Chai Rượu',
  cocktail_whiskey: 'Ly Whisky',
  cocktail_blue: 'Blue Cocktail',
  cocktail_green: 'Green Cocktail',
  cocktail_lemon: 'Chanh Vàng',
  cocktail_shot: 'Ly Shot',
  A: 'Át',
  K: 'Già',
  Q: 'Đầm',
  J: 'Bồi',
  '10': 'Mười'
};

/** Mọi URL ảnh Cocktail để preload trước khi quay (tránh pop/decode giật). */
export const COCKTAIL_ASSET_URLS: string[] = [
  `${ASSET}/cover.png`,
  `${ASSET}/logo.png`,
  `${ASSET}/paytable.png`,
  `${ASSET}/rules.png`,
  ...Object.values(SPRITES)
];

/** Nạp trước + giải mã sẵn toàn bộ ảnh để animation quay mượt. */
export function preloadCocktailAssets(): void {
  if (typeof window === 'undefined' || typeof Image === 'undefined') return;
  for (const src of COCKTAIL_ASSET_URLS) {
    try {
      const im = new Image();
      (im as any).decoding = 'async';
      im.src = src;
      (im as any).decode?.().catch(() => {});
    } catch {}
  }
}

export const CocktailNightsTile: React.FC<SymbolProps> = ({
  tile,
  isWinning = tile.isWinning,
  transformedToWild = tile.transformedToWild,
  animationPhase = 'idle',
  bgOverride
}) => {
  const symbol = tile.symbol;
  // Cocktail: isGold = nền VÀNG (chuẩn bị hóa WILD), không phải morph vàng kiểu Caishen.
  const isGoldBg = tile.isGold || tile.frame === 'gold';

  const isConnecting = isWinning && (animationPhase === 'connecting' || animationPhase === 'idle');
  const isShattering = isWinning && animationPhase === 'shattering';
  const isBecomingWild = transformedToWild;

  const renderSymbolGraphic = () => {
    if (symbol === 'wild') {
      return (
        <div className="flex flex-col items-center justify-center">
          <img
            src={SPRITES.wild}
            alt="Wild"
            draggable={false}
            className="h-9 sm:h-11 w-auto object-contain filter drop-shadow-[0_0_8px_rgba(255,45,149,0.8)]"
          />
        </div>
      );
    }

    if (symbol === 'scatter') {
      // Art gốc đã gồm ribbon Scatter.
      return (
        <div className="flex flex-col items-center justify-center">
          <img
            src={SPRITES.scatter}
            alt="Scatter"
            draggable={false}
            className="h-9 sm:h-11 w-auto object-contain filter drop-shadow-[0_0_8px_rgba(251,191,36,0.8)] animate-pulse"
          />
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
            className="h-8 sm:h-10 w-auto object-contain filter drop-shadow-[0_0_6px_rgba(255,255,255,0.25)]"
          />
          <span className="text-[8px] sm:text-[9px] font-black text-fuchsia-100/90 leading-none mt-0.5 tracking-tight uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
            {VI_LABEL[symbol] ?? symbol}
          </span>
        </div>
      );
    }

    return <span className="text-xl">🍸</span>;
  };

  return (
    <div
      className={`relative w-full h-[58px] sm:h-[66px] md:h-[74px] flex-shrink-0 rounded-xl flex flex-col items-center justify-center p-1 select-none overflow-hidden transition-all duration-200 ${
        // Nền tối neon như bản gốc; ô nền vàng phát sáng khi sắp hóa WILD.
        bgOverride ?? 'bg-gradient-to-b from-[#241b3d] via-[#1c1430] to-[#150f26]'
      } ${
        isGoldBg
          ? 'border-2 border-yellow-300 shadow-[0_0_18px_rgba(250,204,21,0.9),inset_0_0_18px_rgba(250,204,21,0.35)] ring-1 ring-yellow-200'
          : 'border border-fuchsia-500/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),0_1px_3px_rgba(0,0,0,0.4)]'
      } ${
        isShattering && !isGoldBg
          ? 'animate-slot-shatter pointer-events-none'
          : isBecomingWild
          ? 'animate-gold-morph !border-yellow-200 ring-4 ring-yellow-300/90 shadow-[0_0_30px_#fde047] z-20'
          : isConnecting
          ? 'scale-105 !border-pink-400 ring-2 ring-pink-400/90 shadow-[0_0_22px_rgba(255,45,149,0.9)] z-10 animate-slot-pulse'
          : ''
      }`}
    >
      {/* Nền vàng phủ khi sắp hóa WILD */}
      {isGoldBg && (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-yellow-400/25 via-amber-300/15 to-yellow-500/25 pointer-events-none" />
          <div className="absolute top-1 right-1 px-1 rounded bg-yellow-300 text-[7px] font-black text-amber-950 shadow-sm z-10">
            GOLD
          </div>
        </>
      )}

      {/* Vỡ kính khi nổ */}
      {isShattering && (
        <>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className="w-10 h-10 rounded-full bg-pink-400/90 animate-ping shadow-[0_0_25px_#f472b6]" />
          </div>
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 stroke-pink-300/90 fill-none" viewBox="0 0 100 100">
            <path d="M50 50 L20 15 M50 50 L80 20 M50 50 L85 75 M50 50 L25 80 M50 50 L10 50 M50 50 L90 50 M50 50 L50 10 M50 50 L50 90" strokeWidth="2.5" strokeDasharray="3,1" />
            <circle cx="50" cy="50" r="14" strokeWidth="2" stroke="rgba(249,115,22,0.9)" />
            <circle cx="50" cy="50" r="24" strokeWidth="1.5" stroke="rgba(253,224,71,0.7)" strokeDasharray="4,2" />
          </svg>
          <div className="absolute w-3 h-3 bg-gradient-to-tr from-pink-400 to-fuchsia-200 rounded-sm animate-shard-1 z-30 pointer-events-none" />
          <div className="absolute w-3 h-3 bg-gradient-to-tr from-amber-400 to-yellow-100 rounded-sm animate-shard-2 z-30 pointer-events-none" />
          <div className="absolute w-2.5 h-2.5 bg-gradient-to-tr from-cyan-300 to-white rounded-sm animate-shard-3 z-30 pointer-events-none" />
          <div className="absolute w-3.5 h-3.5 bg-gradient-to-tr from-fuchsia-500 to-pink-200 rounded-sm animate-shard-4 z-30 pointer-events-none" />
        </>
      )}

      {/* Graphic / Icon Container */}
      <div className={`transition-transform duration-200 ${isConnecting ? 'scale-110' : ''}`}>
        {renderSymbolGraphic()}
      </div>

      {/* Winning Shimmer Sweep */}
      {isConnecting && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-pink-400/35 to-transparent -translate-x-full animate-[shimmer_1.2s_infinite] pointer-events-none rounded-xl" />
      )}
    </div>
  );
};
