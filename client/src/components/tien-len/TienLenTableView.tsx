import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpDown, Play } from 'lucide-react';
import { MaskedTLGameState, Suit, TLCard } from '../../types/game';
import { sounds } from '../../utils/sound';
import { calcFanTransform, isDroppedInZone } from '../../utils/cardFan';

interface TienLenTableViewProps {
  gameState: MaskedTLGameState;
  myPlayerId: string;
  onSendAction: (action: any) => void;
}

export const TienLenTableView: React.FC<TienLenTableViewProps> = ({
  gameState,
  myPlayerId,
  onSendAction
}) => {
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'rank' | 'suit'>('rank');
  const [isDraggingCard, setIsDraggingCard] = useState<boolean>(false);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [slidingCards, setSlidingCards] = useState<TLCard[] | null>(null);
  const [displayedTrick, setDisplayedTrick] = useState<any>(gameState.currentTrick);

  const prevTrickKeyRef = useRef<string>(gameState.currentTrick?.combo?.cards?.map((c: any) => c.id).join('-') || '');
  const tlUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const trickKey = gameState.currentTrick?.combo?.cards?.map((c: any) => c.id).join('-') || '';
    if (trickKey !== prevTrickKeyRef.current) {
      prevTrickKeyRef.current = trickKey;
      const isPlayedByMe = gameState.currentTrick?.playerId === myPlayerId;
      if (isPlayedByMe || !gameState.currentTrick) {
        setDisplayedTrick(gameState.currentTrick);
      } else {
        if (tlUpdateTimerRef.current) clearTimeout(tlUpdateTimerRef.current);
        tlUpdateTimerRef.current = setTimeout(() => {
          setDisplayedTrick(gameState.currentTrick);
        }, 300);
      }
    } else {
      setDisplayedTrick(gameState.currentTrick);
    }

    return () => {
      if (tlUpdateTimerRef.current) clearTimeout(tlUpdateTimerRef.current);
    };
  }, [gameState.currentTrick, myPlayerId]);

  const isMyTurn = gameState.players[gameState.currentTurnIndex]?.id === myPlayerId;
  const myPlayer = gameState.players.find(p => p.id === myPlayerId);
  const hasPassed = myPlayer?.hasPassedCurrentRound ?? false;

  // Hand cards sorting
  const sortedHand = useMemo(() => {
    return [...gameState.myHand].sort((a, b) => {
      if (sortBy === 'rank') {
        return a.overallRank - b.overallRank;
      } else {
        if (a.suitValue !== b.suitValue) return a.suitValue - b.suitValue;
        return a.rankValue - b.rankValue;
      }
    });
  }, [gameState.myHand, sortBy]);

  // Selected cards combination detector for live UI badge
  const comboPreview = useMemo(() => {
    const selected = gameState.myHand.filter(c => selectedCardIds.includes(c.id));
    if (selected.length === 0) return null;

    const sorted = [...selected].sort((a, b) => a.overallRank - b.overallRank);
    const len = sorted.length;

    if (len === 1) return `Rác [${sorted[0].value}${getSuitIcon(sorted[0].suit)}]`;
    if (len === 2 && sorted[0].rankValue === sorted[1].rankValue) return `Đôi [${sorted[0].value}]`;
    if (len === 3 && sorted[0].rankValue === sorted[1].rankValue && sorted[1].rankValue === sorted[2].rankValue) {
      return `Sám cô [${sorted[0].value}]`;
    }
    if (len === 4 && sorted[0].rankValue === sorted[1].rankValue && sorted[1].rankValue === sorted[2].rankValue && sorted[2].rankValue === sorted[3].rankValue) {
      return `🔥 TỨ QUÝ [${sorted[0].value}]`;
    }

    // Straight
    if (len >= 3) {
      let isStraight = true;
      for (let i = 0; i < len - 1; i++) {
        if (sorted[i].rankValue === 15 || sorted[i + 1].rankValue === 15) {
          isStraight = false;
          break;
        }
        if (sorted[i + 1].rankValue !== sorted[i].rankValue + 1) {
          isStraight = false;
          break;
        }
      }
      if (isStraight) {
        return `Sảnh ${len} lá (${sorted[0].value} ➔ ${sorted[len - 1].value})`;
      }
    }

    // 3 Đôi thông
    if (len === 6 && isConsecutivePairs(sorted, 3)) {
      return `⚡ 3 ĐÔI THÔNG (đến ${sorted[len - 1].value})`;
    }

    // 4 Đôi thông
    if (len === 8 && isConsecutivePairs(sorted, 4)) {
      return `👑 4 ĐÔI THÔNG (CHẶT KHÔNG CẦN VÒNG!)`;
    }

    return 'Tổ hợp chưa hợp lệ';
  }, [selectedCardIds, gameState.myHand]);

  const toggleSelectCard = (id: string) => {
    sounds.playCardSnap();
    if (selectedCardIds.includes(id)) {
      setSelectedCardIds(selectedCardIds.filter(i => i !== id));
    } else {
      setSelectedCardIds([...selectedCardIds, id]);
    }
  };

  const handlePlayCards = (overrideCardIds?: string[]) => {
    const cardsToPlay = overrideCardIds || selectedCardIds;
    if (cardsToPlay.length === 0) return;

    const cardsObj = gameState.myHand.filter(c => cardsToPlay.includes(c.id));
    if (cardsObj.length > 0) {
      setSlidingCards(cardsObj);
      sounds.playCardWhoosh();
      setTimeout(() => {
        sounds.playCardSnap();
      }, 240);
      setTimeout(() => {
        setSlidingCards(null);
      }, 420);
    }

    onSendAction({
      type: 'PLAY_CARDS',
      cardIds: cardsToPlay
    });
    setSelectedCardIds([]);
  };

  const handlePassTurn = () => {
    onSendAction({ type: 'PASS_TURN' });
    setSelectedCardIds([]);
  };

  function getSuitIcon(suit: Suit) {
    switch (suit) {
      case 'spades': return '♠';
      case 'clubs': return '♣';
      case 'diamonds': return '♦';
      case 'hearts': return '♥';
    }
  }

  function getSuitColor(suit: Suit) {
    return suit === 'hearts' || suit === 'diamonds' ? 'text-rose-600' : 'text-slate-900';
  }

  const totalCards = sortedHand.length;

  return (
    <div className="absolute inset-0 select-none pointer-events-none">
      {/* Center Table Trick Display / Drop Zone: DEAD IN THE EXACT MIDDLE OF THE TABLE */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
        <div
          id="tienlen-drop-zone"
          className={`relative p-4 rounded-3xl transition-all duration-200 pointer-events-auto ${
            isDraggingCard
              ? 'ring-4 ring-emerald-400 ring-offset-4 ring-offset-slate-950 bg-emerald-500/20 scale-105'
              : ''
          }`}
        >
          {displayedTrick ? (
            <div className="flex flex-col items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
                Bộ Bài Trên Bàn
              </span>

              {/* Trick Cards Display */}
              <div id="tienlen-trick-cards" className="flex -space-x-4 sm:-space-x-6">
                {displayedTrick.combo.cards.map((c: any, i: number) => (
                  <motion.div
                    key={c.id || i}
                    initial={{ scale: 0.88, y: -10, opacity: 0.7 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 24 }}
                    className={`w-20 sm:w-24 h-28 sm:h-36 rounded-2xl bg-white border-2 border-slate-300 shadow-2xl flex flex-col justify-between p-2 font-black ${getSuitColor(
                      c.suit
                    )}`}
                  >
                    <div className="text-sm self-start leading-none font-bold">
                      {c.value}
                      <span className="text-base">{getSuitIcon(c.suit)}</span>
                    </div>
                    <div className="text-3xl self-center leading-none">
                      {getSuitIcon(c.suit)}
                    </div>
                    <div className="text-sm self-end leading-none font-bold rotate-180">
                      {c.value}
                      <span className="text-base">{getSuitIcon(c.suit)}</span>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-3 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700 text-xs font-bold text-slate-300 shadow">
                {displayedTrick.combo.type === 'single' ? 'BÀI RÁC' :
                 displayedTrick.combo.type === 'pair' ? 'ĐÔI' :
                 displayedTrick.combo.type === 'triple' ? 'SÁM CÔ' :
                 displayedTrick.combo.type === 'four_of_a_kind' ? 'TỨ QUÝ' :
                 displayedTrick.combo.type === 'straight' ? 'SẢNH' :
                 displayedTrick.combo.type === 'consecutive_pairs' ? 'ĐÔI THÔNG' :
                 displayedTrick.combo.type.toUpperCase().replace(/_/g, ' ')}
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-3xl border-2 border-dashed border-emerald-500/30 bg-emerald-950/20 text-center">
              <span className="text-2xl block mb-1">🃏</span>
              <span className="text-sm font-bold text-emerald-300">Vòng Mới</span>
              <p className="text-xs text-slate-400 mt-1">Người bắt đầu có thể đánh bất kỳ tổ hợp nào! (Kéo hoặc bấm)</p>
            </div>
          )}

          {/* In-Flight Sliding Cards to Trick Area */}
          <AnimatePresence>
            {slidingCards && (
              <motion.div
                key="sliding-tl-cards"
                initial={{
                  y: 220,
                  scale: 0.9,
                  opacity: 1
                }}
                animate={{
                  y: 0,
                  scale: [0.9, 1.15, 1],
                  opacity: 1
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.32, ease: [0.25, 1, 0.5, 1] }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
              >
                <div className="flex -space-x-4 sm:-space-x-6">
                  {slidingCards.map((c, i) => (
                    <div
                      key={c.id || i}
                      className={`w-20 sm:w-24 h-28 sm:h-36 rounded-2xl bg-white border-2 border-slate-300 shadow-[0_25px_50px_rgba(0,0,0,0.8)] flex flex-col justify-between p-2 font-black ${getSuitColor(
                        c.suit
                      )}`}
                    >
                      <div className="text-sm self-start leading-none font-bold">
                        {c.value}
                        <span className="text-base">{getSuitIcon(c.suit)}</span>
                      </div>
                      <div className="text-3xl self-center leading-none">
                        {getSuitIcon(c.suit)}
                      </div>
                      <div className="text-sm self-end leading-none font-bold rotate-180">
                        {c.value}
                        <span className="text-base">{getSuitIcon(c.suit)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Drag Hint Overlay */}
        <AnimatePresence>
          {isDraggingCard && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute -top-4 px-4 py-1.5 rounded-full bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-1.5 pointer-events-none"
            >
              <span>Thả bài vào giữa để đánh</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* PLAYER HAND & CONTROL BAR: ANCHORED AT THE BOTTOM OF THE TABLE */}
      <div className="absolute bottom-1 sm:bottom-2 left-0 right-0 flex flex-col items-center z-30 pointer-events-none">
        {/* Actions and Sorting Toolbar */}
        <div className="w-full max-w-2xl px-4 mb-1 flex items-center justify-between gap-3 pointer-events-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSortBy(sortBy === 'rank' ? 'suit' : 'rank')}
              className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-xs font-bold flex items-center gap-1.5 text-slate-300 transition-colors"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
              Xếp bài: {sortBy === 'rank' ? 'Theo điểm (3➔2)' : 'Theo chất (♠➔♥)'}
            </button>

            {comboPreview && (
              <span className="px-3 py-1.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold">
                {comboPreview}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Pass button */}
            <button
              onClick={handlePassTurn}
              disabled={!isMyTurn || !gameState.currentTrick || hasPassed}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 disabled:opacity-40 transition-colors"
            >
              Bỏ Lượt
            </button>

            {/* Play button */}
            <button
              onClick={() => handlePlayCards()}
              disabled={(!isMyTurn && comboPreview !== '👑 4 ĐÔI THÔNG (CHẶT KHÔNG CẦN VÒNG!)') || selectedCardIds.length === 0 || hasPassed}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 disabled:opacity-40 transition-all active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Đánh bài ({selectedCardIds.length})
            </button>
          </div>
        </div>

        {/* Hand Cards with Arc Fan and Drag-to-Play */}
        <div className="w-full overflow-visible pb-1 pt-2 flex items-end justify-center min-h-[160px] px-4 pointer-events-auto">
          <div className={`flex ${totalCards <= 4 ? '-space-x-5 sm:-space-x-6' : totalCards <= 8 ? '-space-x-9 sm:-space-x-10' : totalCards <= 13 ? '-space-x-12 sm:-space-x-13' : '-space-x-14 sm:-space-x-15'}`}>
            {sortedHand.map((card, i) => {
              const isSelected = selectedCardIds.includes(card.id);
              const fan = calcFanTransform(i, totalCards);
              const isHovered = hoveredCardId === card.id && !isDraggingCard;

              return (
                <motion.div
                  key={card.id}
                  onMouseEnter={() => setHoveredCardId(card.id)}
                  onMouseLeave={() => setHoveredCardId(null)}
                  initial={{ rotate: fan.rotate, y: fan.y, opacity: 0, scale: 0.9 }}
                  animate={{
                    rotate: isSelected ? 0 : (isHovered ? 0 : fan.rotate),
                    y: isSelected ? fan.y - 28 : (isHovered ? -40 : fan.y),
                    opacity: 1,
                    scale: isSelected ? 1.08 : (isHovered ? 1.15 : 1)
                  }}
                  transition={{ type: 'spring', stiffness: 380, damping: 24 }}
                  drag={isMyTurn}
                  dragSnapToOrigin={true}
                  dragElastic={0.15}
                  onDragStart={() => {
                    setIsDraggingCard(true);
                    setHoveredCardId(null);
                  }}
                  onDragEnd={(_, info) => {
                    setIsDraggingCard(false);
                    if (!isMyTurn) return;
                    if (isDroppedInZone(info.point, 'tienlen-drop-zone')) {
                      // If this card is part of selection, play selection; otherwise play single card
                      const cards = selectedCardIds.includes(card.id) ? selectedCardIds : [card.id];
                      handlePlayCards(cards);
                    }
                  }}
                  whileDrag={{
                    scale: 1.18,
                    zIndex: 150,
                    rotate: 0,
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
                  }}
                  onClick={() => toggleSelectCard(card.id)}
                  style={{ zIndex: isHovered ? 90 : (isSelected ? 50 : fan.zIndex) }}
                  className={`flex-shrink-0 w-20 sm:w-24 h-32 sm:h-36 rounded-2xl bg-white border-2 shadow-xl flex flex-col justify-between p-2.5 cursor-grab active:cursor-grabbing select-none transition-shadow ${
                    getSuitColor(card.suit)
                  } ${
                    isSelected ? 'ring-4 ring-indigo-500 border-indigo-400' : 'border-slate-300'
                  }`}
                >
                  <div className="text-sm self-start leading-none font-bold">
                    {card.value}
                    <span className="text-base">{getSuitIcon(card.suit)}</span>
                  </div>

                  <div className="text-3xl self-center leading-none">
                    {getSuitIcon(card.suit)}
                  </div>

                  <div className="text-sm self-end leading-none font-bold rotate-180">
                    {card.value}
                    <span className="text-base">{getSuitIcon(card.suit)}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

function isConsecutivePairs(sortedCards: TLCard[], sequenceLength: number): boolean {
  if (sortedCards.length !== sequenceLength * 2) return false;
  for (let i = 0; i < sequenceLength; i++) {
    const c1 = sortedCards[i * 2];
    const c2 = sortedCards[i * 2 + 1];
    if (c1.rankValue !== c2.rankValue) return false;
    if (c1.rankValue === 15) return false; // No 2s
    if (i > 0) {
      const prev = sortedCards[(i - 1) * 2];
      if (c1.rankValue !== prev.rankValue + 1) return false;
    }
  }
  return true;
}
