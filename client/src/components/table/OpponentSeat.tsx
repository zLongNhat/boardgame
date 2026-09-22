import React from 'react';
import { motion } from 'framer-motion';
import { GameType } from '../../types/game';
import { UnoCardView } from '../uno/UnoCardView';
import { EKCardView } from '../exploding-kittens/EKCardView';

interface OpponentSeatProps {
  player: {
    id: string;
    name: string;
    avatar: string;
    isBot: boolean;
    cardCount: number;
    connected: boolean;
    eliminated?: boolean;
    isCong?: boolean;
  };
  gameType: GameType;
  isCurrentTurn: boolean;
  position: 'left' | 'top' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

const AVATAR_EMOJIS: Record<string, string> = {
  'av-fox': '🦊',
  'av-cat': '🐱',
  'av-robot': '🤖',
  'av-dragon': '🐉',
  'av-wizard': '🧙',
  'av-ninja': '🥷',
  'av-tiger': '🐯',
  'av-bear': '🐻',
  'bot-1': '🤖',
  'bot-2': '🛸',
  'bot-3': '👾',
  'bot-4': '🦾',
  'cat-1': '😸',
  'cat-2': '😻',
  'ninja': '🥷',
  'wizard': '🧙'
};

export const OpponentSeat: React.FC<OpponentSeatProps> = ({
  player,
  gameType,
  isCurrentTurn,
  position
}) => {
  const count = Math.max(0, player.cardCount);
  // Cap rendered card fan to max 5 cards visually so it never overflows or collides with neighbors
  const visualCardCount = Math.min(count, 5);

  const emoji = AVATAR_EMOJIS[player.avatar] || (player.isBot ? '🤖' : '👤');

  // Render official card back based on game (compact size for table rim)
  const renderCardBack = (idx: number, angle: number) => {
    return (
      <motion.div
        key={idx}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          transform: `rotate(${angle}deg)`,
          zIndex: idx + 1
        }}
        className="relative transition-transform pointer-events-none"
      >
        {gameType === 'uno' ? (
          <UnoCardView isBack={true} className="!w-11 sm:!w-13 !h-16 sm:!h-19 !rounded-xl shadow-xl" />
        ) : gameType === 'exploding-kittens' ? (
          <EKCardView isBack={true} className="!w-11 sm:!w-13 !h-16 sm:!h-19 !rounded-xl shadow-xl" />
        ) : (
          /* Tiến Lên Casino Back */
          <div
            className="w-11 sm:w-13 h-16 sm:h-19 rounded-xl bg-gradient-to-br from-red-800 to-red-950 border border-red-500/40 p-0.5 shadow-xl flex items-center justify-center text-white"
          >
            <div className="w-full h-full border border-red-400/30 rounded flex items-center justify-center text-[10px] font-black">
              ♠️
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  // Card fan layout configuration based on table position (inward facing cards)
  const renderCardFan = () => {
    if (count === 0) return null;

    const cards = Array.from({ length: visualCardCount });

    // Left seats: cards fan and angle rightward toward center
    if (position === 'left' || position === 'bottom-left') {
      return (
        <div className="flex -space-x-7 sm:-space-x-8 items-center transform rotate-12 mt-1">
          {cards.map((_, i) => {
            const angle = (i - (visualCardCount - 1) / 2) * 5;
            return renderCardBack(i, angle);
          })}
        </div>
      );
    }

    // Right seats: cards fan and angle leftward toward center
    if (position === 'right' || position === 'bottom-right') {
      return (
        <div className="flex -space-x-7 sm:-space-x-8 items-center transform -rotate-12 mt-1">
          {cards.map((_, i) => {
            const angle = (i - (visualCardCount - 1) / 2) * 5;
            return renderCardBack(i, angle);
          })}
        </div>
      );
    }

    // Top-Left seat
    if (position === 'top-left') {
      return (
        <div className="flex -space-x-7 sm:-space-x-8 items-center transform rotate-6 mt-1">
          {cards.map((_, i) => {
            const angle = (i - (visualCardCount - 1) / 2) * 4;
            return renderCardBack(i, angle);
          })}
        </div>
      );
    }

    // Top-Right seat
    if (position === 'top-right') {
      return (
        <div className="flex -space-x-7 sm:-space-x-8 items-center transform -rotate-6 mt-1">
          {cards.map((_, i) => {
            const angle = (i - (visualCardCount - 1) / 2) * 4;
            return renderCardBack(i, angle);
          })}
        </div>
      );
    }

    // Top & center: horizontal fanned out facing down
    return (
      <div className="flex -space-x-7 sm:-space-x-8 items-center mt-1">
        {cards.map((_, i) => {
          const angle = (i - (visualCardCount - 1) / 2) * 4;
          return renderCardBack(i, angle);
        })}
      </div>
    );
  };

  return (
    <div
      className={`flex flex-col items-center transition-all duration-300 select-none ${
        isCurrentTurn ? 'scale-105' : 'opacity-95'
      }`}
    >
      {/* Active Turn "PLAYING" Badge */}
      {isCurrentTurn && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: [1, 1.08, 1], opacity: 1 }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
          className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black text-[9px] sm:text-[10px] uppercase tracking-wider shadow-lg shadow-amber-500/50 flex items-center gap-1 border border-white/80 mb-0.5"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
          <span>ĐANG ĐÁNH</span>
        </motion.div>
      )}

      {/* Sleek Player Header Pill (Like the screenshot: "AI Dusty", "AI Luna", "AI Pudding") */}
      <div className="flex items-center gap-1 mb-0.5">
        <div className={`px-2.5 py-0.5 rounded-full border shadow-md flex items-center gap-1 ${
          isCurrentTurn
            ? 'bg-gradient-to-r from-amber-500 to-yellow-500 border-amber-300 text-slate-950 font-black shadow-amber-500/30'
            : 'bg-gradient-to-r from-sky-600/90 to-cyan-700/90 border-sky-400/50 text-white shadow-sky-950/50'
        }`}>
          <span className="text-[10px] sm:text-[11px] font-black tracking-wide truncate max-w-[80px]">
            {player.name}
          </span>
          {player.isBot && <span className={`text-[8px] ${isCurrentTurn ? 'text-slate-900 font-extrabold' : 'text-sky-200'}`}>AI</span>}
        </div>
      </div>

      {/* Avatar Container & Card Count Badge */}
      <div className="flex items-center gap-1.5">
        <div className="relative">
          {/* Square rounded avatar tile with turn halo glow */}
          <div
            className={`w-11 sm:w-13 h-11 sm:h-13 rounded-xl sm:rounded-2xl flex items-center justify-center text-2xl sm:text-3xl shadow-2xl transition-all ${
              isCurrentTurn
                ? 'bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 ring-3 ring-amber-400/80 shadow-amber-500/50 animate-pulse'
                : 'bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700'
            }`}
          >
            {emoji}
          </div>

          {!player.connected && (
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 border border-slate-950 shadow" title="Mất kết nối" />
          )}
        </div>

        {/* Card Counter Pill next to Avatar with official mini card icon */}
        <div className="flex items-center bg-white text-slate-950 px-2 py-0.5 rounded-lg sm:rounded-xl shadow-lg border border-slate-300 font-black text-[11px] sm:text-xs gap-1">
          {gameType === 'uno' ? (
            <div className="w-3.5 h-[19px] rounded-[3px] overflow-hidden shadow-xs flex-shrink-0 border border-black/50">
              <svg viewBox="0 0 100 145" className="w-full h-full block">
                <rect width="100" height="145" rx="10" fill="#000" />
                <rect x="7" y="7" width="86" height="131" rx="8" fill="#e71d36" />
                <ellipse cx="50" cy="72.5" rx="36" ry="22" transform="rotate(-28 50 72.5)" fill="#000" />
                <text x="50" y="80" textAnchor="middle" transform="rotate(-28 50 72.5) skewX(-10)" fontFamily="'Impact', sans-serif" fontWeight="900" fontStyle="italic" fontSize="26" fill="#FEE440" stroke="#e71d36" strokeWidth="2" paintOrder="stroke fill">UNO</text>
              </svg>
            </div>
          ) : (
            <span className="text-xs">🃏</span>
          )}
          <span>{count}</span>
        </div>
      </div>

      {/* Holding Face-Down Cards Fan with Shiny Reflection */}
      <div className="relative">
        {renderCardFan()}

        {/* Subtle table reflection */}
        <div className="w-full h-3 bg-gradient-to-b from-amber-500/10 to-transparent blur-sm mt-0.5 pointer-events-none" />
      </div>

      {/* Knockout Badge */}
      {player.eliminated && (
        <span className="mt-1 px-2 py-0.5 rounded-full bg-rose-600/90 text-white font-black text-[10px] uppercase shadow">
          💀 ĐÃ BỊ LOẠI
        </span>
      )}
    </div>
  );
};
