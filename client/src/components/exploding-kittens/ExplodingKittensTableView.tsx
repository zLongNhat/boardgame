import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Eye, Flame, ShieldAlert, XCircle } from 'lucide-react';
import { EKCard, MaskedEKGameState } from '../../types/game';
import { sounds } from '../../utils/sound';
import { calcFanTransform, isDroppedInZone } from '../../utils/cardFan';
import { EKCardView } from './EKCardView';

interface EKTableViewProps {
  gameState: MaskedEKGameState;
  myPlayerId: string;
  seeFutureCards: EKCard[] | null;
  onCloseSeeFuture: () => void;
  onSendAction: (action: any) => void;
}

export const ExplodingKittensTableView: React.FC<EKTableViewProps> = ({
  gameState,
  myPlayerId,
  seeFutureCards,
  onCloseSeeFuture,
  onSendAction
}) => {
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [targetModalType, setTargetModalType] = useState<'favor' | 'cat_pair' | null>(null);
  const [pendingCardForAction, setPendingCardForAction] = useState<EKCard | null>(null);
  const [defuseInsertion, setDefuseInsertion] = useState<'top' | 'bottom' | 'random'>('top');
  const [isDraggingCard, setIsDraggingCard] = useState<boolean>(false);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [slidingPlayedCard, setSlidingPlayedCard] = useState<{
    card: EKCard;
    startX: number;
    startY: number;
  } | null>(null);
  const [displayedDiscardPile, setDisplayedDiscardPile] = useState<EKCard[]>(gameState.discardPile);

  const prevDiscardLenRef = useRef<number>(gameState.discardPile.length);
  const ekUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const newDiscard = gameState.discardPile;
    if (newDiscard.length !== prevDiscardLenRef.current) {
      const isPlayedByMe = (gameState as any).lastPlayedBy === myPlayerId;
      prevDiscardLenRef.current = newDiscard.length;

      if (isPlayedByMe || prevDiscardLenRef.current === 0) {
        setDisplayedDiscardPile(newDiscard);
      } else {
        if (ekUpdateTimerRef.current) clearTimeout(ekUpdateTimerRef.current);
        ekUpdateTimerRef.current = setTimeout(() => {
          setDisplayedDiscardPile(newDiscard);
        }, 300);
      }
    } else {
      setDisplayedDiscardPile(newDiscard);
    }

    return () => {
      if (ekUpdateTimerRef.current) clearTimeout(ekUpdateTimerRef.current);
    };
  }, [gameState.discardPile, (gameState as any).lastPlayedBy, myPlayerId]);

  const isMyTurn = gameState.players[gameState.currentTurnIndex]?.id === myPlayerId;
  const isDefusing = gameState.pendingDefusal?.playerId === myPlayerId;
  const isTargetOfFavor = gameState.pendingFavor?.fromPlayerId === myPlayerId;
  const hasNope = gameState.myHand.some(c => c.type === 'nope');
  const myDefuse = gameState.myHand.find(c => c.type === 'defuse');
  const totalCards = gameState.myHand.length;

  const triggerPlayAnimation = (card: EKCard, index: number) => {
    const startX = (index - (totalCards - 1) / 2) * 28;
    const startY = 220;
    setSlidingPlayedCard({ card, startX, startY });
    sounds.playCardWhoosh();
    setTimeout(() => {
      sounds.playCardSnap();
    }, 240);
    setTimeout(() => {
      setSlidingPlayedCard(null);
    }, 420);
  };

  const handleCardClick = (card: EKCard, index?: number) => {
    const idx = index !== undefined ? index : gameState.myHand.findIndex(c => c.id === card.id);

    // If not player's turn, ONLY 'nope' card is permitted during an active Nope window
    if (!isMyTurn) {
      if (card.type === 'nope' && gameState.pendingAction) {
        triggerPlayAnimation(card, idx);
        onSendAction({ type: 'PLAY_NOPE', cardId: card.id });
      }
      return;
    }

    // If selecting for cat combos
    if (card.type.endsWith('_cat')) {
      if (selectedCards.includes(card.id)) {
        setSelectedCards(selectedCards.filter(id => id !== card.id));
      } else {
        const next = [...selectedCards, card.id];
        if (next.length === 2) {
          setSelectedCards(next);
          setTargetModalType('cat_pair');
        } else {
          setSelectedCards(next);
        }
      }
      return;
    }

    // Direct actions
    if (card.type === 'favor') {
      setPendingCardForAction(card);
      setTargetModalType('favor');
      return;
    }

    if (['attack', 'skip', 'shuffle', 'see_the_future'].includes(card.type)) {
      triggerPlayAnimation(card, idx);
      onSendAction({ type: 'PLAY_ACTION', cardId: card.id });
      return;
    }

    if (card.type === 'nope') {
      triggerPlayAnimation(card, idx);
      onSendAction({ type: 'PLAY_NOPE', cardId: card.id });
      return;
    }
  };

  const handleSelectOpponent = (targetPlayerId: string) => {
    if (targetModalType === 'favor' && pendingCardForAction) {
      sounds.playCardWhoosh();
      onSendAction({
        type: 'PLAY_ACTION',
        cardId: pendingCardForAction.id,
        targetPlayerId
      });
      setPendingCardForAction(null);
      setTargetModalType(null);
    } else if (targetModalType === 'cat_pair' && selectedCards.length === 2) {
      sounds.playCardWhoosh();
      onSendAction({
        type: 'PLAY_CAT_COMBO',
        cardIds: selectedCards,
        targetPlayerId
      });
      setSelectedCards([]);
      setTargetModalType(null);
    }
  };

  const handleConfirmDefuse = () => {
    if (!myDefuse) return;
    sounds.playCardWhoosh();
    onSendAction({
      type: 'RESOLVE_DEFUSE',
      cardId: myDefuse.id,
      insertionMode: defuseInsertion
    });
  };

  const handleGiveFavor = (card: EKCard) => {
    sounds.playCardWhoosh();
    onSendAction({
      type: 'GIVE_FAVOR_CARD',
      cardId: card.id
    });
  };

  return (
    <div className="absolute inset-0 select-none pointer-events-none">
      {/* Table Center Playing Zone: DEAD IN THE EXACT MIDDLE OF THE TABLE */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        {/* Draw & Discard Piles */}
        <div className="flex items-center gap-8 z-10 pointer-events-auto">
          {/* Draw Pile with Official EK Card Back */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => {
                sounds.playCardSnap();
                onSendAction({ type: 'DRAW_CARD' });
              }}
              disabled={!isMyTurn || !!gameState.pendingAction || !!gameState.pendingDefusal}
              className={`relative group transition-transform ${
                isMyTurn ? 'hover:scale-105 active:scale-95 cursor-pointer ring-4 ring-rose-500/40 rounded-2xl' : 'opacity-85'
              }`}
            >
              {/* Stack depth visual */}
              <div className="absolute -top-1.5 -left-1.5 w-full h-full rounded-2xl bg-black/80 border border-red-800/60 -z-10" />
              <div className="absolute -top-3 -left-3 w-full h-full rounded-2xl bg-black/60 border border-red-900/40 -z-20" />

              <EKCardView isBack={true} className="!w-24 sm:!w-28 !h-36 sm:!h-40" />

              <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-slate-900 text-[10px] font-mono font-bold text-amber-300 border border-slate-700 shadow">
                Còn {gameState.drawPileCount} lá
              </span>
            </button>
          </div>

          {/* Discard Pile / Drop Zone */}
          <div
            id="ek-drop-zone"
            className={`flex flex-col items-center p-2 rounded-3xl transition-all duration-200 ${
              isDraggingCard ? 'ring-4 ring-rose-400 bg-rose-500/20 scale-105' : ''
            }`}
          >
            {displayedDiscardPile.length > 0 ? (
              <div className="relative">
                {/* Underneath card if pile has > 1 cards */}
                {displayedDiscardPile.length > 1 && (
                  <div className="absolute inset-0 transform rotate-6 translate-x-1 opacity-60 pointer-events-none">
                    <EKCardView
                      card={displayedDiscardPile[displayedDiscardPile.length - 2]}
                      className="!w-24 sm:!w-28 !h-36 sm:!h-40 shadow-md"
                    />
                  </div>
                )}
                <motion.div
                  id="ek-top-card"
                  key={displayedDiscardPile[displayedDiscardPile.length - 1].id}
                  initial={{ scale: 0.9, rotate: 6, opacity: 0.8 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 24 }}
                  className="relative z-10"
                >
                  <EKCardView
                    card={displayedDiscardPile[displayedDiscardPile.length - 1]}
                    className="!w-24 sm:!w-28 !h-36 sm:!h-40 shadow-2xl"
                  />
                </motion.div>
              </div>
            ) : (
              <div className="w-24 sm:w-28 h-36 sm:h-40 rounded-2xl border-2 border-dashed border-red-900/40 bg-slate-950/40 flex items-center justify-center text-slate-600 text-xs font-black">
                Chồng Bài Bỏ
              </div>
            )}

            {/* In-Flight Sliding Card to Discard Pile */}
            <AnimatePresence>
              {slidingPlayedCard && (
                <motion.div
                  key="sliding-ek-card"
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
                    rotate: [0, 8, 0],
                    opacity: 1
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.32, ease: [0.25, 1, 0.5, 1] }}
                  className="absolute z-30 pointer-events-none"
                >
                  <EKCardView
                    card={slidingPlayedCard.card}
                    className="!w-24 sm:!w-28 !h-36 sm:!h-40 shadow-[0_25px_50px_rgba(0,0,0,0.8)]"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Drag Over Drop Zone Prompt */}
        <AnimatePresence>
          {isDraggingCard && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-10 px-4 py-1.5 rounded-full bg-rose-500 text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-1.5 pointer-events-none"
            >
              <span>Thả vào chồng bài để đánh</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pending Turns Indicator */}
        {gameState.pendingTurns > 1 && (
          <div className="absolute top-8 px-4 py-1.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black flex items-center gap-2 shadow pointer-events-none">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>LƯỢT PHẢI ĐÁNH: {gameState.pendingTurns}</span>
          </div>
        )}
      </div>

      {/* 3-Second NOPE Reaction Global Overlay */}
      {gameState.pendingAction && (
        <div className="fixed inset-x-0 top-20 z-50 flex justify-center px-4">
          <div className="bg-slate-900/95 border-2 border-rose-500/60 rounded-3xl p-5 max-w-lg w-full shadow-2xl shadow-rose-950/80 backdrop-blur-md animate-pulse">
            <div className="flex items-center justify-between mb-2">
              <span className="font-extrabold text-rose-400 text-sm flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" />
                LÁ BÀI VỪA ĐÁNH: {gameState.pendingAction.card.name}
              </span>
              <span className="font-mono text-xs font-bold text-slate-300">
                {gameState.pendingAction.nopeCount % 2 === 1 ? '🚫 ĐÃ BỊ CHẶN NOPE!' : '⚡ ĐANG KÍCH HOẠT'}
              </span>
            </div>

            <p className="text-xs text-slate-300 mb-4">
              Bất kỳ người chơi nào có thẻ Chặn Nope đều có thể hủy bỏ hành động này trước khi hết giờ!
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const nopeCard = gameState.myHand.find(c => c.type === 'nope');
                  if (nopeCard) {
                    sounds.playNopeSlam();
                    onSendAction({ type: 'PLAY_NOPE', cardId: nopeCard.id });
                  }
                }}
                disabled={!hasNope}
                className="flex-1 py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition-all uppercase tracking-wider"
              >
                <XCircle className="w-4 h-4" />
                CHẶN NOPE NGAY! {hasNope ? '(Có thẻ)' : '(Không có thẻ)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10-Second Defusal Emergency Modal */}
      {isDefusing && (
        <div className="fixed inset-0 z-50 bg-rose-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-rose-500 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 animate-bounce">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-black text-rose-400 mb-1">BẠN ĐÃ RÚT PHẢI MÈO NỔ!</h2>
            <p className="text-xs text-slate-300 mb-6">
              {myDefuse ? 'Bạn có thẻ Gỡ Bom! Hãy chọn vị trí để nhét lá Mèo Nổ trở lại vào bộ bài:' : 'Bạn không có thẻ Gỡ Bom! Chuẩn bị nổ tung...'}
            </p>

            {myDefuse ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'top', label: 'Đầu bộ bài' },
                    { id: 'bottom', label: 'Đáy bộ bài' },
                    { id: 'random', label: 'Ngẫu nhiên' }
                  ].map(pos => (
                    <button
                      key={pos.id}
                      onClick={() => setDefuseInsertion(pos.id as any)}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                        defuseInsertion === pos.id
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleConfirmDefuse}
                  className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-xl shadow-emerald-600/30 transition-all uppercase tracking-wider"
                >
                  🛠️ Đánh Thẻ Gỡ Bom &amp; Tự Cứu Mình
                </button>
              </div>
            ) : (
              <p className="text-sm font-bold text-rose-300">Đang đếm ngược để nổ tung...</p>
            )}
          </div>
        </div>
      )}

      {/* "See The Future" Private 3-Card Modal */}
      {seeFutureCards && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-fuchsia-500/40 rounded-3xl p-6 max-w-lg w-full text-center shadow-2xl">
            <h3 className="text-lg font-black text-fuchsia-400 mb-2 flex items-center justify-center gap-2">
              <Eye className="w-5 h-5" />
              SOI TƯƠNG LAI (3 Lá Trên Cùng)
            </h3>
            <p className="text-xs text-slate-400 mb-6">Đây là 3 lá bài tiếp theo trong chồng bài rút (từ trên xuống dưới):</p>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {seeFutureCards.map((c, i) => (
                <div key={c.id || i} className="flex flex-col items-center">
                  <span className="text-xs font-bold text-slate-400 mb-1">#{i + 1} {i === 0 ? '(Trên cùng)' : ''}</span>
                  <EKCardView card={c} className="!w-24 !h-36 shadow-2xl" />
                </div>
              ))}
            </div>

            <button
              onClick={onCloseSeeFuture}
              className="py-3 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
            >
              Đóng &amp; Giữ Bí Mật
            </button>
          </div>
        </div>
      )}

      {/* Favor Give Card Modal */}
      {isTargetOfFavor && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/40 rounded-3xl p-6 max-w-md w-full text-center shadow-2xl">
            <h3 className="text-base font-black text-purple-300 mb-2">BẠN PHẢI GIAO NỘP 1 LÁ BÀI!</h3>
            <p className="text-xs text-slate-400 mb-4">Bấm chọn 1 lá bài trên tay bạn để trao cho đối thủ:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
              {gameState.myHand.map(c => (
                <div key={c.id} onClick={() => handleGiveFavor(c)} className="cursor-pointer hover:scale-105 transition-transform">
                  <EKCardView card={c} className="!w-20 !h-30" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Target Opponent Picker (Favor / Cat Combos) */}
      {targetModalType && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Chọn Người Chơi Mục Tiêu</h3>
            <p className="text-xs text-slate-400 mb-4">
              {targetModalType === 'favor' ? 'Đòi bài từ người chơi:' : 'Cướp 1 lá bài ngẫu nhiên từ:'}
            </p>
            <div className="space-y-2">
              {gameState.players
                .filter(p => p.id !== myPlayerId && !p.eliminated)
                .map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectOpponent(p.id)}
                    className="w-full p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-between text-xs font-black transition-all"
                  >
                    <span>{p.name}</span>
                    <span className="text-amber-300">{p.cardCount} lá</span>
                  </button>
                ))}
            </div>
            <button
              onClick={() => setTargetModalType(null)}
              className="mt-4 w-full py-2.5 bg-slate-800 text-xs text-slate-400 hover:text-white rounded-xl"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* PLAYER'S HAND CARDS: ANCHORED AT THE BOTTOM OF THE TABLE */}
      <div className="absolute bottom-1 sm:bottom-2 left-0 right-0 flex flex-col items-center z-30 pointer-events-none">
        <div className="mb-1 flex items-center gap-3 text-xs font-semibold text-slate-300 pointer-events-auto">
          <span>Bài của bạn: <strong className="text-white">{totalCards} lá</strong></span>
          <span className="text-slate-500 text-[11px] hidden sm:inline">• Kéo bài ra giữa hoặc bấm vào để đánh</span>
          {isMyTurn && (
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse font-bold">
              Lượt Của Bạn!
            </span>
          )}
        </div>

        <div className="w-full overflow-visible pb-1 pt-2 flex items-end justify-center min-h-[160px] px-4 pointer-events-auto">
          <div className={`flex ${totalCards <= 3 ? '-space-x-4 sm:-space-x-5' : totalCards <= 6 ? '-space-x-7 sm:-space-x-8' : totalCards <= 10 ? '-space-x-10 sm:-space-x-11' : '-space-x-13 sm:-space-x-14'}`}>
            {gameState.myHand.map((card, i) => {
              const isSelected = selectedCards.includes(card.id);
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
                  drag={isMyTurn || (card.type === 'nope' && !!gameState.pendingAction)}
                  dragSnapToOrigin={true}
                  dragElastic={0.15}
                  onDragStart={() => {
                    setIsDraggingCard(true);
                    setHoveredCardId(null);
                  }}
                  onDragEnd={(_, info) => {
                    setIsDraggingCard(false);
                    // Guard: only allow action if it's my turn or nope during pending action
                    const canNope = card.type === 'nope' && !!gameState.pendingAction;
                    if (!isMyTurn && !canNope) return;
                    if (isDroppedInZone(info.point, 'ek-drop-zone')) {
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
                    const canNope = card.type === 'nope' && !!gameState.pendingAction;
                    if (!isMyTurn && !canNope) return;
                    handleCardClick(card, i);
                  }}
                  style={{ zIndex: isHovered ? 90 : (isSelected ? 50 : fan.zIndex) }}
                  className={`flex-shrink-0 w-24 sm:w-28 h-36 sm:h-40 cursor-grab active:cursor-grabbing select-none ${isSelected ? 'ring-4 ring-purple-500 rounded-2xl -translate-y-6 shadow-2xl' : ''}`}
                >
                  <EKCardView card={card} className="w-full h-full" />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
