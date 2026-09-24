import React from 'react';
import { SlotSymbolId } from '../../types/game';

interface SymbolProps {
  symbol: SlotSymbolId;
  isGold: boolean;
  isWinning?: boolean;
  transformedToWild?: boolean;
}

export const WildBountyTile: React.FC<SymbolProps> = ({
  symbol,
  isGold,
  isWinning,
  transformedToWild
}) => {
  const getSymbolDetails = () => {
    switch (symbol) {
      case 'cowgirl':
        return {
          label: 'Nữ Thợ Săn',
          icon: '🤠',
          sub: 'Top Pay',
          bg: 'from-amber-600/30 via-red-900/40 to-amber-950/50',
          textColor: 'text-amber-300',
          borderColor: 'border-amber-500/40'
        };
      case 'whiskey':
        return {
          label: 'Whisky',
          icon: '🥃',
          sub: 'Bourbon',
          bg: 'from-orange-600/25 via-amber-900/30 to-amber-950/40',
          textColor: 'text-orange-300',
          borderColor: 'border-orange-500/40'
        };
      case 'hat':
        return {
          label: 'Mũ Stetson',
          icon: '👒',
          sub: 'Cowboy',
          bg: 'from-yellow-700/20 via-amber-900/30 to-amber-950/30',
          textColor: 'text-amber-200',
          borderColor: 'border-amber-600/30'
        };
      case 'holster':
        return {
          label: 'Bao Súng',
          icon: '🔫',
          sub: 'Revolver',
          bg: 'from-stone-700/30 via-zinc-800/40 to-stone-900/50',
          textColor: 'text-stone-300',
          borderColor: 'border-stone-500/40'
        };
      case 'A':
        return {
          label: 'A',
          icon: '♠️',
          sub: 'Át',
          bg: 'from-rose-900/25 via-red-950/30 to-stone-900/40',
          textColor: 'text-red-400 font-serif font-black',
          borderColor: 'border-red-500/30'
        };
      case 'K':
        return {
          label: 'K',
          icon: '👑',
          sub: 'Vua',
          bg: 'from-purple-900/25 via-indigo-950/30 to-stone-900/40',
          textColor: 'text-purple-300 font-serif font-black',
          borderColor: 'border-purple-500/30'
        };
      case 'Q':
        return {
          label: 'Q',
          icon: '💎',
          sub: 'Hậu',
          bg: 'from-sky-900/25 via-blue-950/30 to-stone-900/40',
          textColor: 'text-sky-300 font-serif font-black',
          borderColor: 'border-sky-500/30'
        };
      case 'J':
        return {
          label: 'J',
          icon: '🗡️',
          sub: 'Bồi',
          bg: 'from-emerald-900/25 via-teal-950/30 to-stone-900/40',
          textColor: 'text-emerald-300 font-serif font-black',
          borderColor: 'border-emerald-500/30'
        };
      case 'wild':
        return {
          label: 'WILD',
          icon: '⭐',
          sub: 'Đại Diện',
          bg: 'from-amber-500/50 via-yellow-500/30 to-amber-950/80',
          textColor: 'text-yellow-200 font-black',
          borderColor: 'border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]'
        };
      case 'scatter':
        return {
          label: 'SCATTER',
          icon: '🗝️',
          sub: 'Két Vàng',
          bg: 'from-rose-600/40 via-amber-600/30 to-purple-950/70',
          textColor: 'text-rose-200 font-black tracking-wider',
          borderColor: 'border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.5)]'
        };
    }
  };

  const details = getSymbolDetails();

  return (
    <div
      className={`relative w-full h-full min-h-[58px] sm:min-h-[68px] md:min-h-[76px] rounded-lg border flex flex-col items-center justify-center p-1 select-none transition-all duration-300 overflow-hidden bg-gradient-to-b ${
        details.bg
      } ${
        isWinning
          ? 'scale-105 border-yellow-300 ring-2 ring-yellow-400/90 shadow-[0_0_20px_rgba(250,204,21,0.8)] z-10 animate-pulse'
          : isGold
          ? 'border-yellow-400 shadow-[0_0_12px_rgba(234,179,8,0.7)] ring-1 ring-yellow-300/80'
          : details.borderColor
      } ${transformedToWild ? 'animate-bounce' : ''}`}
    >
      {/* Gold Frame Decorative Highlights */}
      {isGold && (
        <>
          <div className="absolute inset-0 border-2 border-yellow-400/90 rounded-lg pointer-events-none animate-pulse" />
          <div className="absolute top-0.5 right-0.5 w-2 h-2 bg-yellow-300 rounded-full shadow-[0_0_6px_#fde047]" />
          <div className="absolute bottom-0.5 left-0.5 w-2 h-2 bg-yellow-300 rounded-full shadow-[0_0_6px_#fde047]" />
        </>
      )}

      {/* Main Symbol Icon */}
      <span
        className={`text-2xl sm:text-3xl md:text-4xl filter drop-shadow-md transition-transform ${
          isWinning ? 'scale-110' : ''
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

      {/* Bullet flash mark if winning */}
      {isWinning && (
        <div className="absolute inset-0 bg-yellow-400/20 backdrop-brightness-125 animate-ping pointer-events-none rounded-lg" />
      )}
    </div>
  );
};
