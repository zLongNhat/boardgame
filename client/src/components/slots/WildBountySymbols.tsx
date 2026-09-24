import React from 'react';
import { SlotSymbolId } from '../../types/game';

export type TileAnimationPhase = 'idle' | 'connecting' | 'shattering' | 'gold-morph' | 'dropped';

interface SymbolProps {
  symbol: SlotSymbolId;
  isGold: boolean;
  isWinning?: boolean;
  transformedToWild?: boolean;
  animationPhase?: TileAnimationPhase;
}

export const WildBountyTile: React.FC<SymbolProps> = ({
  symbol,
  isGold,
  isWinning,
  transformedToWild,
  animationPhase = 'idle'
}) => {
  const getSymbolDetails = () => {
    switch (symbol) {
      case 'cowgirl':
        return {
          label: 'Nữ Thợ Săn',
          icon: '🤠',
          sub: 'Top Pay',
          bg: 'from-amber-600/35 via-red-900/40 to-amber-950/60',
          textColor: 'text-amber-300',
          borderColor: 'border-amber-500/50'
        };
      case 'whiskey':
        return {
          label: 'Whisky',
          icon: '🥃',
          sub: 'Bourbon',
          bg: 'from-orange-600/30 via-amber-900/35 to-amber-950/50',
          textColor: 'text-orange-300',
          borderColor: 'border-orange-500/50'
        };
      case 'hat':
        return {
          label: 'Mũ Stetson',
          icon: '👒',
          sub: 'Cowboy',
          bg: 'from-yellow-700/25 via-amber-900/35 to-amber-950/40',
          textColor: 'text-amber-200',
          borderColor: 'border-amber-600/40'
        };
      case 'holster':
        return {
          label: 'Bao Súng',
          icon: '🔫',
          sub: 'Revolver',
          bg: 'from-stone-700/35 via-zinc-800/45 to-stone-900/60',
          textColor: 'text-stone-300',
          borderColor: 'border-stone-500/50'
        };
      case 'A':
        return {
          label: 'A',
          icon: '♠️',
          sub: 'Át',
          bg: 'from-rose-900/30 via-red-950/35 to-stone-900/50',
          textColor: 'text-red-400 font-serif font-black',
          borderColor: 'border-red-500/40'
        };
      case 'K':
        return {
          label: 'K',
          icon: '👑',
          sub: 'Vua',
          bg: 'from-purple-900/30 via-indigo-950/35 to-stone-900/50',
          textColor: 'text-purple-300 font-serif font-black',
          borderColor: 'border-purple-500/40'
        };
      case 'Q':
        return {
          label: 'Q',
          icon: '💎',
          sub: 'Hậu',
          bg: 'from-sky-900/30 via-blue-950/35 to-stone-900/50',
          textColor: 'text-sky-300 font-serif font-black',
          borderColor: 'border-sky-500/40'
        };
      case 'J':
        return {
          label: 'J',
          icon: '🗡️',
          sub: 'Bồi',
          bg: 'from-emerald-900/30 via-teal-950/35 to-stone-900/50',
          textColor: 'text-emerald-300 font-serif font-black',
          borderColor: 'border-emerald-500/40'
        };
      case 'wild':
        return {
          label: 'WILD',
          icon: '⭐',
          sub: 'Đại Diện',
          bg: 'from-amber-500/60 via-yellow-500/40 to-amber-950/90',
          textColor: 'text-yellow-200 font-black',
          borderColor: 'border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.6)]'
        };
      case 'scatter':
        return {
          label: 'SCATTER',
          icon: '🗝️',
          sub: 'Két Vàng',
          bg: 'from-rose-600/45 via-amber-600/35 to-purple-950/80',
          textColor: 'text-rose-200 font-black tracking-wider',
          borderColor: 'border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.6)]'
        };
      default:
        return {
          label: String(symbol),
          icon: '🀄',
          sub: '',
          bg: 'from-stone-700/35 via-zinc-800/45 to-stone-900/60',
          textColor: 'text-stone-300',
          borderColor: 'border-stone-500/50'
        };
    }
  };

  const details = getSymbolDetails();

  const isConnecting = isWinning && (animationPhase === 'connecting' || animationPhase === 'idle');
  const isShattering = isWinning && animationPhase === 'shattering';
  const isGoldMorphing = (isGold && isShattering) || animationPhase === 'gold-morph' || transformedToWild;

  return (
    <div
      className={`relative w-full h-[62px] sm:h-[72px] md:h-[82px] flex-shrink-0 rounded-xl border flex flex-col items-center justify-center p-1 select-none overflow-hidden bg-gradient-to-b ${
        details.bg
      } ${
        isShattering && !isGold
          ? 'animate-slot-shatter pointer-events-none'
          : isGoldMorphing
          ? 'animate-gold-morph border-yellow-300 ring-4 ring-yellow-400/90 shadow-[0_0_30px_#fde047] z-20'
          : isConnecting
          ? 'scale-105 border-yellow-300 ring-2 ring-yellow-400/90 shadow-[0_0_22px_rgba(250,204,21,0.9)] z-10 animate-slot-pulse'
          : isGold
          ? 'border-yellow-400 shadow-[0_0_14px_rgba(234,179,8,0.7)] ring-1 ring-yellow-300/80'
          : details.borderColor
      } transition-all duration-200`}
    >
      {/* Gold Frame Ornate Rim */}
      {isGold && (
        <>
          <div className="absolute inset-0 border-[2.5px] border-yellow-400/90 rounded-xl pointer-events-none shadow-[inset_0_0_8px_rgba(250,204,21,0.6)]" />
          <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-300 rounded-full shadow-[0_0_8px_#fde047] animate-ping" />
          <div className="absolute bottom-1 left-1 w-2 h-2 bg-yellow-300 rounded-full shadow-[0_0_8px_#fde047] animate-ping" />
        </>
      )}

      {/* Gunshot Impact & Glass Shatter Overlay when Shattering */}
      {isShattering && (
        <>
          {/* Central Bullet Hole Flash */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className="w-10 h-10 rounded-full bg-yellow-300/90 animate-ping shadow-[0_0_25px_#fef08a]" />
          </div>

          {/* Glass Crack Lines (SVG) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 stroke-yellow-200/90 fill-none" viewBox="0 0 100 100">
            <path d="M50 50 L20 15 M50 50 L80 20 M50 50 L85 75 M50 50 L25 80 M50 50 L10 50 M50 50 L90 50 M50 50 L50 10 M50 50 L50 90" strokeWidth="2.5" strokeDasharray="3,1" />
            <circle cx="50" cy="50" r="12" strokeWidth="2" stroke="rgba(250,204,21,0.9)" />
            <circle cx="50" cy="50" r="22" strokeWidth="1.5" stroke="rgba(254,240,138,0.7)" strokeDasharray="4,2" />
          </svg>

          {/* Flying Debris Shards (radial burst) */}
          <div className="absolute w-3 h-3 bg-gradient-to-tr from-yellow-400 to-amber-200 rounded-sm animate-shard-1 z-30 pointer-events-none" />
          <div className="absolute w-3 h-3 bg-gradient-to-tr from-orange-400 to-yellow-100 rounded-sm animate-shard-2 z-30 pointer-events-none" />
          <div className="absolute w-2.5 h-2.5 bg-gradient-to-tr from-yellow-300 to-white rounded-sm animate-shard-3 z-30 pointer-events-none" />
          <div className="absolute w-3.5 h-3.5 bg-gradient-to-tr from-amber-500 to-yellow-200 rounded-sm animate-shard-4 z-30 pointer-events-none" />
        </>
      )}

      {/* Main Symbol Icon */}
      <span
        className={`text-2xl sm:text-3xl md:text-4xl filter drop-shadow-md transition-transform duration-200 ${
          isConnecting ? 'scale-115 rotate-2' : ''
        }`}
      >
        {details.icon}
      </span>

      {/* Symbol Name / Badge */}
      <div className="flex flex-col items-center mt-0.5">
        <span
          className={`text-[10px] sm:text-xs font-black uppercase tracking-tight leading-none drop-shadow ${details.textColor}`}
        >
          {symbol === 'wild' ? '★ WILD ★' : symbol === 'scatter' ? 'SCATTER' : details.label}
        </span>
      </div>

      {/* Connecting Energetic Sweep Light when in Winning Way */}
      {isConnecting && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-300/25 to-transparent -translate-x-full animate-[shimmer_1.2s_infinite] pointer-events-none rounded-xl" />
      )}
    </div>
  );
};
