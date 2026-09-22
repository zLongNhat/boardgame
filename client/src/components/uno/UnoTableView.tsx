import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Flame, Zap } from 'lucide-react';
import { MaskedUnoGameState, UnoCard, UnoColor } from '../../types/game';
import { sounds } from '../../utils/sound';
import { calcFanTransform, isDroppedInZone } from '../../utils/cardFan';
import { UnoCardView } from './UnoCardView';

interface UnoTableViewProps {
  gameState: MaskedUnoGameState;
  myPlayerId: string;
  onSendAction: (action: any) => void;
}

export const UnoTableView: React.FC<UnoTableViewProps> = ({
  gameState,
  myPlayerId,
  onSendAction
}) => {
  const [selectedCardForWild, setSelectedCardForWild] = useState<{ card: UnoCard; index: number } | null>(null);
  const [selectedCardForSwap, setSelectedCardForSwap] = useState<{ card: UnoCard; index: number } | null>(null);
  const [isFlexPlay, setIsFlexPlay] = useState<boolean>(false);
  const [isDraggingCard, setIsDraggingCard] = useState<boolean>(false);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [slidingPlayedCard, setSlidingPlayedCard] = useState<{
    card: UnoCard;
    startX: number;
    startY: number;
    chosenColor?: UnoColor;
  } | null>(null);
  const [displayedTopCard, setDisplayedTopCard] = useState<UnoCard>(gameState.topCard);
  const [displayedColor, setDisplayedColor] = useState<UnoColor>(gameState.activeColor);
  const [underneathCard, setUnderneathCard] = useState<UnoCard | null>(null);

  const prevTopIdRef = useRef<string>(gameState.topCard?.id);
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const currentTop = gameState.topCard;
    if (!currentTop) return;

    if (currentTop.id !== prevTopIdRef.current) {
      const oldCard = displayedTopCard;
      prevTopIdRef.current = currentTop.id;

      const isPlayedByMe = (gameState as any).lastPlayedBy === myPlayerId;

      if (isPlayedByMe) {
        setUnderneathCard(oldCard);
        setDisplayedTopCard(currentTop);
        setDisplayedColor(gameState.activeColor);
      } else {
        // Card was played by opponent: keep old card on table while flying card travels!
        setUnderneathCard(oldCard);
        if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
        updateTimerRef.current = setTimeout(() => {
          setDisplayedTopCard(currentTop);
          setDisplayedColor(gameState.activeColor);
        }, 300);
      }
    } else {
      setDisplayedColor(gameState.activeColor);
    }

    return () => {
      if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
    };
  }, [gameState.topCard?.id, gameState.activeColor, (gameState as any).lastPlayedBy, myPlayerId]);

  const isMyTurn = gameState.players[gameState.currentTurnIndex]?.id === myPlayerId;
  const myPlayer = gameState.players.find(p => p.id === myPlayerId);
  const totalCards = gameState.myHand.length;

  const triggerPlayAnimation = (card: UnoCard, index: number, chosenColor?: UnoColor) => {
    const startX = (index - (totalCards - 1) / 2) * 28;
    const startY = 220;
    setSlidingPlayedCard({
      card,
      startX,
      startY,
      chosenColor
    });
    sounds.playCardWhoosh();
    setTimeout(() => {
      sounds.playCardSnap();
    }, 240);
    setTimeout(() => {
      setSlidingPlayedCard(null);
    }, 420);
  };

  const handleCardClick = (card: UnoCard, index: number) => {
    // If not player's turn, ONLY Jump-In is permitted
    if (!isMyTurn) {
      const canJumpIn = gameState.rules.jumpIn && (card.color === gameState.topCard.color && card.value === gameState.topCard.value);
      if (canJumpIn) {
        handleJumpIn(card, index);
      }
      return;
    }

    const effectiveColor = isFlexPlay && card.flexColor ? card.flexColor : card.color;
    const effectiveValue = isFlexPlay && card.flexValue ? card.flexValue : card.value;

    if (effectiveColor === 'wild') {
      setSelectedCardForWild({ card, index });
      return;
    }

    if (effectiveValue === '7' && gameState.rules.sevenZero) {
      setSelectedCardForSwap({ card, index });
      return;
    }

    triggerPlayAnimation(card, index);
    onSendAction({
      type: 'PLAY_CARD',
      cardId: card.id,
      isFlex: isFlexPlay
    });
  };

  const handleSelectWildColor = (color: UnoColor) => {
    if (!selectedCardForWild) return;
    const { card, index } = selectedCardForWild;
    setSelectedCardForWild(null);

    if (card.value === '7' && gameState.rules.sevenZero) {
      setSelectedCardForSwap({ card, index });
      return;
    }

    triggerPlayAnimation(card, index, color);
    onSendAction({
      type: 'PLAY_CARD',
      cardId: card.id,
      chosenColor: color,
      isFlex: isFlexPlay
    });
  };

  const handleSelectSwapTarget = (targetPlayerId: string) => {
    if (!selectedCardForSwap) return;
    const { card, index } = selectedCardForSwap;
    setSelectedCardForSwap(null);

    triggerPlayAnimation(card, index);
    onSendAction({
      type: 'PLAY_CARD',
      cardId: card.id,
      targetPlayerId,
      isFlex: isFlexPlay
    });
  };

  const handleJumpIn = (card: UnoCard, index: number) => {
    if (card.color === 'wild') {
      setSelectedCardForWild({ card, index });
      return;
    }
    triggerPlayAnimation(card, index);
    onSendAction({
      type: 'JUMP_IN',
      cardId: card.id,
      isFlex: isFlexPlay
    });
  };

  const getHandSpacing = (count: number) => {
    if (count <= 2) return '-space-x-2 sm:-space-x-3';
    if (count <= 5) return '-space-x-6 sm:-space-x-7';
    if (count <= 8) return '-space-x-9 sm:-space-x-10';
    if (count <= 12) return '-space-x-11 sm:-space-x-12';
    if (count <= 16) return '-space-x-13 sm:-space-x-14';
    return '-space-x-15 sm:-space-x-16';
  };

  return (
    <div className="absolute inset-0 select-none pointer-events-none">
      {/* PLAYING ZONE: DEAD CENTER IN THE MIDDLE OF THE TABLE */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div className="flex items-center justify-center gap-6 sm:gap-12 pointer-events-auto">
          {/* 3D Stacked Draw Deck (Like in the screenshot!) */}
          <div
            onClick={() => {
              if (!isMyTurn) return;
              sounds.playCardSnap();
              onSendAction({ type: 'DRAW_CARD' });
            }}
            className={`relative group select-none transition-transform ${
              isMyTurn ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-not-allowed opacity-85'
            }`}
            title={isMyTurn ? 'Bấm để rút 1 lá bài' : `Chồng bài rút (Còn ${gameState.drawPileCount} lá)`}
          >
            {/* Deck Depth Stacking Illusion */}
            <div className="absolute -bottom-2.5 -right-2 w-20 sm:w-24 h-28 sm:h-36 rounded-2xl bg-neutral-900 border border-neutral-700 shadow-md" />
            <div className="absolute -bottom-1.5 -right-1 w-20 sm:w-24 h-28 sm:h-36 rounded-2xl bg-neutral-800 border border-neutral-600 shadow-md" />

            {/* Top Face-Down Official UNO Card */}
            <div className="relative">
              <UnoCardView isBack={true} className="!w-20 sm:!w-24 !h-28 sm:!h-36 shadow-2xl" />

              {/* Deck Card Count Pill */}
              <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-slate-950 border border-amber-400 text-[10px] font-black text-amber-300 shadow">
                {gameState.drawPileCount}
              </div>

              {/* "DRAW" indicator when it's player's turn */}
              {isMyTurn && (
                <div className="absolute inset-0 bg-amber-400/15 rounded-2xl ring-2 ring-amber-400 flex items-center justify-center pointer-events-none animate-pulse">
                  <span className="px-2 py-0.5 rounded bg-black/85 text-amber-300 font-black text-[10px] uppercase tracking-wider shadow">
                    RÚT BÀI
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Center Discard Pile (Playing side always showing + smooth sliding card!) */}
          <div
            id="uno-drop-zone"
            className={`relative flex items-center justify-center p-6 rounded-full transition-all duration-300 ${
              isDraggingCard ? 'scale-110 ring-4 ring-amber-400 bg-amber-400/20' : ''
            }`}
          >
            {/* Previous top card underneath for realistic tabletop depth */}
            {underneathCard && underneathCard.id !== displayedTopCard.id && (
              <div className="absolute transform -rotate-12 translate-x-1.5 translate-y-1 opacity-70 pointer-events-none">
                <UnoCardView
                  card={underneathCard}
                  className="!w-24 sm:!w-28 !h-36 sm:!h-40 shadow-lg"
                />
              </div>
            )}

            {/* Active Top Card (Playing side 100% visible) */}
            <motion.div
              id="uno-top-card"
              key={displayedTopCard.id}
              initial={{ scale: 0.9, rotate: -8, opacity: 0.8 }}
              animate={{ scale: 1, rotate: -3, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 380, damping: 24 }}
              className="z-10 cursor-pointer"
            >
              <UnoCardView
                card={displayedTopCard}
                chosenColor={displayedColor}
                className="!w-24 sm:!w-28 !h-36 sm:!h-40 shadow-2xl"
              />
            </motion.div>

            {/* Animated Sliding Card to Playing Zone */}
            <AnimatePresence>
              {slidingPlayedCard && (
                <motion.div
                  key="sliding-played-card"
                  initial={{
                    x: slidingPlayedCard.startX,
                    y: slidingPlayedCard.startY,
                    scale: 0.9,
                    rotate: 0,
                    opacity: 1
                  }}
                  animate={{
                    x: 0,
                    y: 0,
                    scale: [0.9, 1.15, 1],
                    rotate: [0, -10, -3],
                    opacity: 1
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.32, ease: [0.25, 1, 0.5, 1] }}
                  className="absolute z-30 pointer-events-none"
                >
                  <UnoCardView
                    card={slidingPlayedCard.card}
                    chosenColor={slidingPlayedCard.chosenColor}
                    isFlex={isFlexPlay}
                    className="!w-24 sm:!w-28 !h-36 sm:!h-40 shadow-[0_25px_50px_rgba(0,0,0,0.8)]"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Active Color Badge */}
            <div className="absolute -bottom-5 z-20 flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-slate-950/90 border-2 border-slate-700 text-xs shadow-xl">
              <span className="text-slate-400 font-bold text-[11px]">MÀU HIỆN TẠI:</span>
              <span
                className={`w-3.5 h-3.5 rounded-full ${
                  displayedColor === 'red' ? 'bg-rose-500' :
                  displayedColor === 'blue' ? 'bg-sky-500' :
                  displayedColor === 'green' ? 'bg-emerald-500' :
                  'bg-amber-400'
                }`}
              />
              <span className="font-black uppercase text-[11px] text-white tracking-wide">
                {displayedColor === 'red' ? 'ĐỎ' :
                 displayedColor === 'blue' ? 'XANH DƯƠNG' :
                 displayedColor === 'green' ? 'XANH LÁ' :
                 displayedColor === 'yellow' ? 'VÀNG' : displayedColor}
              </span>
            </div>
          </div>
        </div>

        {/* Drop Release Prompt */}
        <AnimatePresence>
          {isDraggingCard && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-10 px-5 py-2 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-2xl pointer-events-none"
            >
              Thả bài vào giữa để đánh!
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stacking Penalty Badge */}
        {gameState.pendingDrawCount > 0 && (
          <div className="absolute top-8 px-4 py-2 rounded-2xl bg-rose-600/95 text-white font-black text-sm flex items-center gap-2 shadow-2xl shadow-rose-600/50 animate-pulse border-2 border-amber-300 pointer-events-none">
            <Flame className="w-5 h-5 text-amber-300" />
            <span>+{gameState.pendingDrawCount} LÁ BÀI CỘNG DỒN!</span>
          </div>
        )}
      </div>

      {/* Catch UNO on opponents buttons */}
      {gameState.canCatchUno.length > 0 && (
        <div className="absolute right-6 top-8 flex flex-col gap-2 z-30 pointer-events-auto">
          {gameState.canCatchUno.map(targetId => {
            const target = gameState.players.find(p => p.id === targetId);
            return (
              <button
                key={targetId}
                onClick={() => onSendAction({ type: 'CATCH_UNO', targetPlayerId: targetId })}
                className="px-4 py-2 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center gap-1.5 shadow-xl border border-rose-400 animate-bounce"
              >
                <AlertCircle className="w-4 h-4" />
                Bắt phạt {target?.name}! (+2)
              </button>
            );
          })}
        </div>
      )}

      {/* Flex Power Indicator */}
      {gameState.mode === 'flex' && (
        <div className="absolute left-6 top-1/2 -translate-y-1/2 z-20 pointer-events-auto">
          <button
            onClick={() => setIsFlexPlay(!isFlexPlay)}
            className={`p-3 rounded-2xl border flex flex-col items-center gap-1 transition-all ${
              isFlexPlay
                ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-xl shadow-amber-500/30'
                : 'bg-slate-900/80 border-slate-700 text-slate-400'
            }`}
          >
            <Zap className="w-6 h-6" />
            <span className="text-[10px] font-black uppercase tracking-wider">
              Flex: {isFlexPlay ? 'BẬT' : 'TẮT'}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${myPlayer?.flexPowerActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}`}>
              {myPlayer?.flexPowerActive ? 'Sẵn Sàng' : 'Đã Dùng'}
            </span>
          </button>
        </div>
      )}

      {/* PLAYER'S HAND CARDS: ANCHORED AT THE BOTTOM OF THE TABLE */}
      <div className="absolute bottom-1 sm:bottom-2 left-0 right-0 flex flex-col items-center z-30 pointer-events-none">
        {/* Hand Status Bar */}
        <div className="mb-1 flex items-center gap-3 text-xs font-semibold text-slate-300 pointer-events-auto">
          <span>Bài của bạn: <strong className="text-white">{totalCards} lá</strong></span>
          <span className="text-slate-500 text-[11px] hidden sm:inline">• Kéo bài ra giữa hoặc bấm vào để đánh</span>
          {isMyTurn && (
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse font-bold">
              Lượt Của Bạn!
            </span>
          )}
        </div>

        {/* Hand Fanned Arc Container (Stable spacing without horizontal collapse) */}
        <div className="w-full overflow-visible pb-1 pt-2 flex items-end justify-center min-h-[160px] px-4 pointer-events-auto">
          <div className={`flex ${getHandSpacing(totalCards)}`}>
            {gameState.myHand.map((card, i) => {
              const fan = calcFanTransform(i, totalCards);
              const isHovered = hoveredCardId === card.id && !isDraggingCard;

              return (
                <motion.div
                  key={card.id}
                  onMouseEnter={() => setHoveredCardId(card.id)}
                  onMouseLeave={() => setHoveredCardId(null)}
                  initial={{ rotate: fan.rotate, y: fan.y + 30, opacity: 0, scale: 0.9 }}
                  animate={{
                    rotate: isHovered ? 0 : fan.rotate,
                    y: isHovered ? -42 : fan.y,
                    opacity: 1,
                    scale: isHovered ? 1.15 : 1
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 380,
                    damping: 24
                  }}
                  drag={isMyTurn || (gameState.rules.jumpIn && (card.color === gameState.topCard.color && card.value === gameState.topCard.value))}
                  dragSnapToOrigin={true}
                  dragElastic={0.15}
                  onDragStart={() => {
                    setIsDraggingCard(true);
                    setHoveredCardId(null);
                  }}
                  onDragEnd={(_, info) => {
                    setIsDraggingCard(false);
                    // Guard: only allow action if it's my turn or valid jump-in
                    const canJumpIn = gameState.rules.jumpIn && card.color === gameState.topCard.color && card.value === gameState.topCard.value;
                    if (!isMyTurn && !canJumpIn) return;
                    if (isDroppedInZone(info.point, 'uno-drop-zone')) {
                      handleCardClick(card, i);
                    }
                  }}
                  whileDrag={{
                    scale: 1.18,
                    zIndex: 150,
                    rotate: 0,
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
                  }}
                  onClick={() => {
                    // Guard: only allow click if it's my turn or valid jump-in
                    const canJumpIn = gameState.rules.jumpIn && card.color === gameState.topCard.color && card.value === gameState.topCard.value;
                    if (!isMyTurn && !canJumpIn) return;
                    handleCardClick(card, i);
                  }}
                  style={{ zIndex: isHovered ? 90 : fan.zIndex }}
                  className="flex-shrink-0 w-20 sm:w-24 h-28 sm:h-36 cursor-grab active:cursor-grabbing select-none"
                >
                  <UnoCardView
                    card={card}
                    isFlex={isFlexPlay}
                    className="w-full h-full shadow-2xl"
                  />

                  {/* Jump-in button overlay if valid and not turn */}
                  {!isMyTurn && gameState.rules.jumpIn && (card.color === gameState.topCard.color && card.value === gameState.topCard.value) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJumpIn(card, i);
                      }}
                      className="absolute inset-0 bg-amber-500/90 rounded-2xl flex flex-col items-center justify-center text-slate-950 font-black text-xs shadow-xl"
                    >
                      <Zap className="w-5 h-5 mb-1" />
                      CƯỚP LƯỢT!
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Wild Color Picker Modal */}
      {selectedCardForWild && (
        <div
          onClick={() => setSelectedCardForWild(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 max-w-xs w-full text-center shadow-2xl"
          >
            <button
              onClick={() => setSelectedCardForWild(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-base font-bold w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 hover:border-slate-500 transition-colors"
            >
              ✕
            </button>
            <h3 className="text-xl font-black text-white mb-1">CHỌN MÀU MỚI</h3>
            <p className="text-xs text-slate-400 mb-6">Chọn màu sắc kế tiếp cho vòng chơi:</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { color: 'red', label: 'ĐỎ', bg: 'bg-[#E71D36] text-white' },
                { color: 'blue', label: 'XANH DƯƠNG', bg: 'bg-[#0099FF] text-white' },
                { color: 'green', label: 'XANH LÁ', bg: 'bg-[#00C853] text-white' },
                { color: 'yellow', label: 'VÀNG', bg: 'bg-[#FFD166] text-slate-950' }
              ].map(c => (
                <button
                  key={c.color}
                  onClick={() => handleSelectWildColor(c.color as UnoColor)}
                  className={`h-24 rounded-2xl font-black text-base uppercase border-2 border-white/20 shadow-xl hover:scale-105 active:scale-95 transition-transform ${c.bg}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setSelectedCardForWild(null)}
              className="mt-4 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 border border-slate-700 transition-colors"
            >
              Hủy bỏ
            </button>
          </div>
        </div>
      )}

      {/* 7-Swap Target Modal */}
      {selectedCardForSwap && (
        <div
          onClick={() => setSelectedCardForSwap(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 max-w-sm w-full shadow-2xl"
          >
            <button
              onClick={() => setSelectedCardForSwap(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-base font-bold w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 hover:border-slate-500 transition-colors"
            >
              ✕
            </button>
            <h3 className="text-lg font-black text-white mb-1">Luật 7: Đổi Toàn Bộ Bài!</h3>
            <p className="text-xs text-slate-400 mb-4">Chọn người chơi bạn muốn hoán đổi toàn bộ bài:</p>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {gameState.players
                .filter(p => p.id !== myPlayerId && !p.eliminated)
                .map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectSwapTarget(p.id)}
                    className="w-full p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-between text-xs font-black transition-all"
                  >
                    <span>{p.name}</span>
                    <span className="text-amber-300">{p.cardCount} lá</span>
                  </button>
                ))}
            </div>
            <button
              onClick={() => setSelectedCardForSwap(null)}
              className="mt-4 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 border border-slate-700 transition-colors"
            >
              Hủy bỏ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
