import React from 'react';
import { UnoCard, UnoColor } from '../../types/game';

interface UnoCardViewProps {
  card?: UnoCard;
  isBack?: boolean;
  chosenColor?: UnoColor;
  className?: string;
  isFlex?: boolean;
}

export const UnoCardView: React.FC<UnoCardViewProps> = ({
  card,
  isBack = false,
  chosenColor,
  className = '',
  isFlex = false
}) => {
  // If rendering official card back (scalable SVG viewBox so it scales to ANY size without clipping)
  if (isBack || !card) {
    return (
      <div
        className={`relative w-20 sm:w-24 h-28 sm:h-36 rounded-2xl select-none shadow-2xl overflow-hidden ${className}`}
        style={{ aspectRatio: '5 / 7.2' }}
      >
        <svg viewBox="0 0 100 145" className="w-full h-full block">
          <defs>
            <linearGradient id="unoRedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d90429" />
              <stop offset="50%" stopColor="#ef233c" />
              <stop offset="100%" stopColor="#b70928" />
            </linearGradient>
            <filter id="unoShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="1" dy="1.5" stdDeviation="1" floodColor="#000" floodOpacity="0.7" />
            </filter>
          </defs>

          {/* Outer Black Border */}
          <rect x="0" y="0" width="100" height="145" rx="14" fill="#0a0a0a" />
          <rect x="2.5" y="2.5" width="95" height="140" rx="12" fill="none" stroke="#262626" strokeWidth="1" />

          {/* Red Inner Card Face */}
          <rect x="5.5" y="5.5" width="89" height="134" rx="10" fill="url(#unoRedGrad)" stroke="#ff4d4d" strokeWidth="0.8" />

          {/* Tilted Center Black Oval */}
          <ellipse
            cx="50"
            cy="72.5"
            rx="36"
            ry="22"
            transform="rotate(-28 50 72.5)"
            fill="#0a0a0a"
            stroke="#000"
            strokeWidth="1.5"
            filter="url(#unoShadow)"
          />

          {/* Iconic Yellow & Red UNO Text */}
          <g transform="rotate(-28 50 72.5)">
            <text
              x="50"
              y="79.5"
              textAnchor="middle"
              transform="skewX(-10)"
              fontFamily="'Impact', 'Arial Black', sans-serif"
              fontWeight="900"
              fontStyle="italic"
              fontSize="24"
              letterSpacing="-0.5"
              fill="#FEE440"
              stroke="#D90429"
              strokeWidth="2.4"
              paintOrder="stroke fill"
            >
              UNO
            </text>
          </g>
        </svg>
      </div>
    );
  }

  // Face-Up Card Rendering
  const effectiveColor = isFlex && card.flexColor ? card.flexColor : (chosenColor || card.color);
  const effectiveValue = isFlex && card.flexValue ? card.flexValue : card.value;

  const colorStyles: Record<UnoColor, { bg: string; text: string; border: string }> = {
    red: { bg: 'bg-[#E71D36]', text: 'text-[#E71D36]', border: 'border-red-500' },
    blue: { bg: 'bg-[#0099FF]', text: 'text-[#0099FF]', border: 'border-blue-400' },
    green: { bg: 'bg-[#00C853]', text: 'text-[#00C853]', border: 'border-emerald-400' },
    yellow: { bg: 'bg-[#FFD166]', text: 'text-[#FFD166]', border: 'border-yellow-300' },
    wild: { bg: 'bg-[#111827]', text: 'text-white', border: 'border-slate-600' }
  };

  const style = colorStyles[effectiveColor] || colorStyles.red;
  const isWild = card.color === 'wild';

  const renderCardSymbol = (val: string, isCenter = false) => {
    switch (val) {
      case 'skip':
        return <span className={isCenter ? 'text-3xl font-black' : 'text-xs font-black'}>⊘</span>;
      case 'reverse':
        return <span className={isCenter ? 'text-3xl font-black' : 'text-xs font-black'}>⇄</span>;
      case 'draw_two':
        return <span className={isCenter ? 'text-2xl font-black' : 'text-[11px] font-black'}>+2</span>;
      case 'wild':
        return isCenter ? (
          <div className="w-12 h-16 rounded-[50%] overflow-hidden grid grid-cols-2 grid-rows-2 shadow-md border-2 border-white -rotate-[28deg]">
            <div className="bg-[#E71D36]" />
            <div className="bg-[#0099FF]" />
            <div className="bg-[#FFD166]" />
            <div className="bg-[#00C853]" />
          </div>
        ) : (
          <span className="text-[9px] font-black tracking-tighter">WILD</span>
        );
      case 'wild_draw_four':
        return isCenter ? (
          <div className="relative flex items-center justify-center">
            <div className="w-12 h-16 rounded-[50%] overflow-hidden grid grid-cols-2 grid-rows-2 shadow-md border-2 border-white -rotate-[28deg]">
              <div className="bg-[#E71D36]" />
              <div className="bg-[#0099FF]" />
              <div className="bg-[#FFD166]" />
              <div className="bg-[#00C853]" />
            </div>
            <span className="absolute text-white font-black text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">+4</span>
          </div>
        ) : (
          <span className="text-[10px] font-black">+4</span>
        );
      case 'draw_four':
        return <span className={isCenter ? 'text-2xl font-black' : 'text-[10px] font-black'}>+4</span>;
      case 'wild_reverse_draw_four':
        return isCenter ? (
          <div className="relative flex items-center justify-center">
            <div className="w-12 h-16 rounded-[50%] overflow-hidden grid grid-cols-2 grid-rows-2 shadow-md border-2 border-white -rotate-[28deg]">
              <div className="bg-[#E71D36]" />
              <div className="bg-[#0099FF]" />
              <div className="bg-[#FFD166]" />
              <div className="bg-[#00C853]" />
            </div>
            <div className="absolute text-white font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] flex flex-col items-center leading-none">
              <span className="text-xs">⇄</span>
              <span className="text-lg">+4</span>
            </div>
          </div>
        ) : (
          <span className="text-[8px] font-black">⇄+4</span>
        );
      case 'wild_draw_six':
        return isCenter ? (
          <div className="relative flex items-center justify-center">
            <div className="w-12 h-16 rounded-[50%] overflow-hidden grid grid-cols-2 grid-rows-2 shadow-md border-2 border-white -rotate-[28deg]">
              <div className="bg-[#E71D36]" />
              <div className="bg-[#0099FF]" />
              <div className="bg-[#FFD166]" />
              <div className="bg-[#00C853]" />
            </div>
            <span className="absolute text-white font-black text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">+6</span>
          </div>
        ) : (
          <span className="text-[10px] font-black">+6</span>
        );
      case 'wild_draw_ten':
        return isCenter ? (
          <div className="relative flex items-center justify-center">
            <div className="w-12 h-16 rounded-[50%] overflow-hidden grid grid-cols-2 grid-rows-2 shadow-md border-2 border-white -rotate-[28deg]">
              <div className="bg-[#E71D36]" />
              <div className="bg-[#0099FF]" />
              <div className="bg-[#FFD166]" />
              <div className="bg-[#00C853]" />
            </div>
            <span className="absolute text-white font-black text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">+10</span>
          </div>
        ) : (
          <span className="text-[9px] font-black">+10</span>
        );
      case 'skip_everyone':
        return <span className={isCenter ? 'text-lg font-black text-center leading-none' : 'text-[8px] font-black'}>CẤM HẾT</span>;
      case 'discard_all':
        return <span className={isCenter ? 'text-lg font-black text-center leading-none' : 'text-[8px] font-black'}>BỎ HẾT</span>;
      case 'wild_color_roulette':
        return isCenter ? (
          <div className="text-center font-black text-xs text-amber-300">VÒNG QUAY</div>
        ) : (
          <span className="text-[7px] font-black">QUAY</span>
        );
      case 'flex_all_flip':
        return <span className={isCenter ? 'text-2xl font-black' : 'text-xs font-black'}>🔄</span>;
      default:
        return <span className={isCenter ? 'text-4xl font-black' : 'text-sm font-black'}>{val}</span>;
    }
  };

  return (
    <div
      className={`relative w-20 sm:w-24 h-28 sm:h-36 rounded-2xl bg-black p-1 shadow-2xl border border-neutral-700 select-none transition-transform ${className}`}
      style={{ aspectRatio: '5 / 7.5' }}
    >
      {/* Inner Color Card Face */}
      <div className={`w-full h-full rounded-xl ${style.bg} relative flex flex-col justify-between p-1.5 overflow-hidden border border-white/30`}>
        {/* White center tilted ellipse */}
        {!isWild ? (
          <div
            className="w-14 sm:w-16 h-20 sm:h-24 rounded-[50%] bg-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[28deg] shadow-inner flex items-center justify-center border border-black/10"
          >
            <div className={`rotate-[28deg] font-black ${style.text} drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]`}>
              {renderCardSymbol(effectiveValue, true)}
            </div>
          </div>
        ) : (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
            {renderCardSymbol(effectiveValue, true)}
          </div>
        )}

        {/* Top-Left Pip */}
        <div className="self-start text-white font-black leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] z-10">
          {renderCardSymbol(effectiveValue, false)}
        </div>

        {/* Bottom-Right Pip (Upside down) */}
        <div className="self-end text-white font-black leading-none rotate-180 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] z-10">
          {renderCardSymbol(effectiveValue, false)}
        </div>

        {/* Flex Indicator ribbon if flex card */}
        {card.flexColor && (
          <div className="absolute top-0 right-0 w-6 h-6 overflow-hidden pointer-events-none">
            <div className="bg-amber-400 text-slate-950 font-black text-[7px] rotate-45 py-0.5 w-12 text-center absolute -top-1 -right-3 shadow">
              FLEX
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
