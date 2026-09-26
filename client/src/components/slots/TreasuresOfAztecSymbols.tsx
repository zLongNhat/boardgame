import React from 'react';
import { SlotTile } from '../../types/game';
import { TileAnimationPhase } from './WildBountySymbols';

interface SymbolProps {
  tile: SlotTile;
  isWinning?: boolean;
  transformedToWild?: boolean;
  animationPhase?: TileAnimationPhase;
}

interface AztecSymbolConfig {
  label: string;
  icon: string;
  sub?: string;
  bg: string;
  textColor: string;
  borderColor: string;
  tier?: string;
}

const SYMBOL_CONFIGS: Record<string, AztecSymbolConfig> = {
  aztec_mask: {
    label: 'Mặt Nạ Vàng',
    icon: '👺',
    sub: 'Top 80x',
    tier: 'TOP',
    bg: 'from-amber-500 via-yellow-600 to-amber-950',
    textColor: 'text-yellow-100 font-black',
    borderColor: 'border-amber-300/80 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
  },
  aztec_chief: {
    label: 'Nữ Hoàng Maya',
    icon: '👸',
    sub: '70x',
    tier: '70x',
    bg: 'from-rose-600 via-red-800 to-rose-950',
    textColor: 'text-rose-100 font-black',
    borderColor: 'border-rose-400/80 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
  },
  aztec_statue: {
    label: 'Tượng Thần Hồng',
    icon: '🗿',
    sub: '60x',
    tier: '60x',
    bg: 'from-pink-600 via-fuchsia-800 to-purple-950',
    textColor: 'text-pink-100 font-black',
    borderColor: 'border-pink-400/70 shadow-[0_0_12px_rgba(236,72,153,0.4)]'
  },
  aztec_snake: {
    label: 'Rắn Thần',
    icon: '🐍',
    sub: '30x',
    tier: '30x',
    bg: 'from-purple-600 via-indigo-800 to-purple-950',
    textColor: 'text-purple-100 font-black',
    borderColor: 'border-purple-400/70'
  },
  aztec_carving_blue: {
    label: 'Mặt Ngọc Lam',
    icon: '🧿',
    sub: '15x',
    bg: 'from-cyan-600 via-blue-800 to-cyan-950',
    textColor: 'text-cyan-100 font-black',
    borderColor: 'border-cyan-400/70'
  },
  aztec_carving_green: {
    label: 'Mặt Ngọc Lục',
    icon: '🐢',
    sub: '15x',
    bg: 'from-emerald-600 via-teal-800 to-emerald-950',
    textColor: 'text-emerald-100 font-black',
    borderColor: 'border-emerald-400/70'
  },
  A: {
    label: 'A',
    icon: 'A',
    sub: '10x',
    bg: 'from-red-900/40 via-stone-900/90 to-stone-950',
    textColor: 'text-red-400 font-serif font-black',
    borderColor: 'border-red-500/40'
  },
  K: {
    label: 'K',
    icon: 'K',
    sub: '10x',
    bg: 'from-amber-900/40 via-stone-900/90 to-stone-950',
    textColor: 'text-amber-300 font-serif font-black',
    borderColor: 'border-amber-500/40'
  },
  Q: {
    label: 'Q',
    icon: 'Q',
    sub: '8x',
    bg: 'from-sky-900/40 via-stone-900/90 to-stone-950',
    textColor: 'text-sky-300 font-serif font-black',
    borderColor: 'border-sky-500/40'
  },
  J: {
    label: 'J',
    icon: 'J',
    sub: '8x',
    bg: 'from-emerald-900/40 via-stone-900/90 to-stone-950',
    textColor: 'text-emerald-300 font-serif font-black',
    borderColor: 'border-emerald-500/40'
  },
  '10': {
    label: '10',
    icon: '10',
    sub: '6x',
    bg: 'from-orange-900/40 via-stone-900/90 to-stone-950',
    textColor: 'text-orange-300 font-serif font-black',
    borderColor: 'border-orange-500/40'
  },
  wild: {
    label: 'WILD',
    icon: '🛕',
    sub: 'KIM TỰ THÁP',
    bg: 'from-amber-400 via-yellow-500 to-amber-700',
    textColor: 'text-amber-950 font-black',
    borderColor: 'border-yellow-200 shadow-[0_0_25px_rgba(250,204,21,0.9)]'
  },
  scatter: {
    label: 'SCATTER',
    icon: '☀️',
    sub: 'ĐỀN MẶT TRỜI',
    bg: 'from-amber-500 via-red-600 to-purple-950',
    textColor: 'text-yellow-100 font-black',
    borderColor: 'border-yellow-300 shadow-[0_0_25px_rgba(234,179,8,0.9)]'
  }
};

export const TreasuresOfAztecTile: React.FC<SymbolProps> = ({
  tile,
  isWinning = tile.isWinning,
  transformedToWild = tile.transformedToWild,
  animationPhase = 'idle'
}) => {
  const symbol = tile.symbol;
  const isSilver = tile.isSilver || tile.frame === 'silver';
  const isGold = tile.isGold || tile.frame === 'gold';

  const details = SYMBOL_CONFIGS[symbol] ?? {
    label: String(symbol),
    icon: '🗿',
    sub: '',
    bg: 'from-stone-700 via-stone-850 to-stone-950',
    textColor: 'text-stone-300',
    borderColor: 'border-stone-600'
  };

  const isConnecting = isWinning && (animationPhase === 'connecting' || animationPhase === 'idle');
  const isShattering = isWinning && animationPhase === 'shattering';
  const isGoldMorphing = (isGold && isShattering) || animationPhase === 'gold-morph' || transformedToWild;
  const isSilverMorphing = isSilver && isShattering;

  return (
    <div
      className={`relative w-full h-[58px] sm:h-[66px] md:h-[74px] flex-shrink-0 rounded-xl border-2 flex flex-col items-center justify-center p-1 select-none overflow-hidden bg-gradient-to-b ${
        details.bg
      } ${
        isShattering && !isGold && !isSilver
          ? 'animate-slot-shatter pointer-events-none'
          : isGoldMorphing
          ? 'animate-gold-morph !border-yellow-300 ring-4 ring-yellow-400/90 shadow-[0_0_30px_#fde047] z-20'
          : isSilverMorphing
          ? 'animate-pulse !border-yellow-200 ring-2 ring-yellow-300/80 shadow-[0_0_20px_rgba(253,224,71,0.7)] z-15'
          : isConnecting
          ? 'scale-105 !border-yellow-300 ring-2 ring-yellow-400/90 shadow-[0_0_22px_rgba(250,204,21,0.9)] z-10 animate-slot-pulse'
          : isGold
          ? '!border-yellow-300 ring-2 ring-yellow-400/80 shadow-[0_0_15px_rgba(234,179,8,0.7)]'
          : isSilver
          ? '!border-slate-200 ring-2 ring-slate-300/80 shadow-[0_0_12px_rgba(226,232,240,0.6)]'
          : details.borderColor
      } transition-all duration-200`}
    >
      {/* Top ribbon for high-tier symbols */}
      {details.tier && !isGold && !isSilver && (
        <div className="absolute top-0 left-0 px-1 py-px rounded-br-md bg-amber-400 text-[7px] sm:text-[8px] font-black text-amber-950 tracking-wider z-10 shadow">
          {details.tier}
        </div>
      )}

      {/* Silver Frame Wilds-on-the-Way Ornaments */}
      {isSilver && (
        <>
          <div className="absolute inset-0 border-[2.5px] border-slate-200/90 rounded-[10px] pointer-events-none shadow-[inset_0_0_8px_rgba(241,245,249,0.7)]" />
          <div className="absolute top-0.5 right-0.5 px-1 py-px rounded bg-gradient-to-r from-slate-200 to-slate-300 text-[7px] sm:text-[8px] font-black text-slate-800 shadow-sm z-10">
            BẠC
          </div>
          <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-slate-200 rounded-full shadow-[0_0_4px_#fff]" />
          <div className="absolute bottom-1 right-1 w-1.5 h-1.5 bg-slate-200 rounded-full shadow-[0_0_4px_#fff]" />
        </>
      )}

      {/* Gold Frame Wilds-on-the-Way Ornaments */}
      {isGold && (
        <>
          <div className="absolute inset-0 border-[2.5px] border-yellow-300/95 rounded-[10px] pointer-events-none shadow-[inset_0_0_10px_rgba(250,204,21,0.8)]" />
          <div className="absolute top-0.5 right-0.5 px-1 py-px rounded bg-gradient-to-r from-yellow-300 to-amber-400 text-[7px] sm:text-[8px] font-black text-amber-950 shadow-sm z-10">
            VÀNG
          </div>
          <div className="absolute top-1 left-1 w-2 h-2 bg-yellow-300 rounded-full shadow-[0_0_8px_#fde047] animate-ping" />
          <div className="absolute bottom-1 right-1 w-2 h-2 bg-yellow-300 rounded-full shadow-[0_0_8px_#fde047] animate-ping" />
        </>
      )}

      {/* Stone Shattering & Temple Gold Crack Overlay */}
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

      {/* Main Mayan / Aztec Symbol Icon */}
      {['A', 'K', 'Q', 'J', '10'].includes(symbol) ? (
        <span
          className={`text-2xl sm:text-3xl filter drop-shadow transition-transform duration-200 ${
            details.textColor
          } ${isConnecting ? 'scale-115' : ''}`}
        >
          {symbol}
        </span>
      ) : (
        <span
          className={`text-2xl sm:text-3xl filter drop-shadow-md transition-transform duration-200 ${
            isConnecting ? 'scale-115 rotate-3' : ''
          }`}
        >
          {details.icon}
        </span>
      )}

      {/* Aztec Glyphed Title */}
      <div className="flex flex-col items-center mt-0.5">
        <span
          className={`text-[9px] sm:text-[10px] font-black uppercase tracking-tight leading-none drop-shadow ${details.textColor}`}
        >
          {symbol === 'wild' ? '★ WILD ★' : symbol === 'scatter' ? '☀️ SCATTER' : details.label}
        </span>
      </div>

      {/* Winning Shimmer Sweep */}
      {isConnecting && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-300/30 to-transparent -translate-x-full animate-[shimmer_1.2s_infinite] pointer-events-none rounded-xl" />
      )}
    </div>
  );
};
