import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  LogOut,
  MessageSquare,
  RotateCcw
} from 'lucide-react';
import { AnyMaskedGameState, EKCard, GameType, RoomPlayer, RoomState } from '../../types/game';
import { useLang } from '../../i18n/LanguageContext';
import { sounds } from '../../utils/sound';
import { ExplodingKittensTableView } from '../exploding-kittens/ExplodingKittensTableView';
import { EKCardView } from '../exploding-kittens/EKCardView';
import { TienLenTableView } from '../tien-len/TienLenTableView';
import { UnoCardView } from '../uno/UnoCardView';
import { UnoTableView } from '../uno/UnoTableView';
import { OpponentSeat } from './OpponentSeat';
import { VictoryModal } from './VictoryModal';

interface TableViewProps {
  room: RoomState;
  player: RoomPlayer;
  gameState: AnyMaskedGameState;
  seeFutureCards: EKCard[] | null;
  onCloseSeeFuture: () => void;
  alterFutureCards?: EKCard[] | null;
  onCloseAlterFuture?: () => void;
  onSendAction: (action: any) => void;
  onRestartGame: () => void;
  onLeaveRoom: () => void;
  onSendMessage: (text: string) => void;
}

interface FlyingAnimation {
  id: string;
  gameType: GameType;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  startRotate?: number;
  endRotate?: number;
  isDraw?: boolean;
  card?: any;
  playerName?: string;
}

export interface SeatCoord {
  left: string;
  top: string;
  transform: string;
  position: 'top' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export const SEAT_LAYOUTS: Record<number, SeatCoord[]> = {
  1: [{ left: '50%', top: '3%', transform: 'translate(-50%, 0)', position: 'top' }],
  2: [
    { left: '22%', top: '6%', transform: 'translate(-50%, 0)', position: 'top-left' },
    { left: '78%', top: '6%', transform: 'translate(-50%, 0)', position: 'top-right' }
  ],
  3: [
    { left: '7%', top: '38%', transform: 'translate(-50%, -50%)', position: 'left' },
    { left: '50%', top: '3%', transform: 'translate(-50%, 0)', position: 'top' },
    { left: '93%', top: '38%', transform: 'translate(-50%, -50%)', position: 'right' }
  ],
  4: [
    { left: '7%', top: '44%', transform: 'translate(-50%, -50%)', position: 'left' },
    { left: '28%', top: '4%', transform: 'translate(-50%, 0)', position: 'top-left' },
    { left: '72%', top: '4%', transform: 'translate(-50%, 0)', position: 'top-right' },
    { left: '93%', top: '44%', transform: 'translate(-50%, -50%)', position: 'right' }
  ],
  5: [
    { left: '7%', top: '56%', transform: 'translate(-50%, -50%)', position: 'bottom-left' },
    { left: '16%', top: '16%', transform: 'translate(-50%, -50%)', position: 'top-left' },
    { left: '50%', top: '3%', transform: 'translate(-50%, 0)', position: 'top' },
    { left: '84%', top: '16%', transform: 'translate(-50%, -50%)', position: 'top-right' },
    { left: '93%', top: '56%', transform: 'translate(-50%, -50%)', position: 'bottom-right' }
  ],
  6: [
    { left: '7%', top: '58%', transform: 'translate(-50%, -50%)', position: 'bottom-left' },
    { left: '8%', top: '30%', transform: 'translate(-50%, -50%)', position: 'left' },
    { left: '32%', top: '3%', transform: 'translate(-50%, 0)', position: 'top-left' },
    { left: '68%', top: '3%', transform: 'translate(-50%, 0)', position: 'top-right' },
    { left: '92%', top: '30%', transform: 'translate(-50%, -50%)', position: 'right' },
    { left: '93%', top: '58%', transform: 'translate(-50%, -50%)', position: 'bottom-right' }
  ],
  7: [
    { left: '7%', top: '60%', transform: 'translate(-50%, -50%)', position: 'bottom-left' },
    { left: '8%', top: '34%', transform: 'translate(-50%, -50%)', position: 'left' },
    { left: '20%', top: '7%', transform: 'translate(-50%, 0)', position: 'top-left' },
    { left: '50%', top: '2%', transform: 'translate(-50%, 0)', position: 'top' },
    { left: '80%', top: '7%', transform: 'translate(-50%, 0)', position: 'top-right' },
    { left: '92%', top: '34%', transform: 'translate(-50%, -50%)', position: 'right' },
    { left: '93%', top: '60%', transform: 'translate(-50%, -50%)', position: 'bottom-right' }
  ],
  8: [
    { left: '7%', top: '60%', transform: 'translate(-50%, -50%)', position: 'bottom-left' },
    { left: '8%', top: '34%', transform: 'translate(-50%, -50%)', position: 'left' },
    { left: '16%', top: '13%', transform: 'translate(-50%, -50%)', position: 'top-left' },
    { left: '38%', top: '2%', transform: 'translate(-50%, 0)', position: 'top' },
    { left: '62%', top: '2%', transform: 'translate(-50%, 0)', position: 'top' },
    { left: '84%', top: '13%', transform: 'translate(-50%, -50%)', position: 'top-right' },
    { left: '92%', top: '34%', transform: 'translate(-50%, -50%)', position: 'right' },
    { left: '93%', top: '60%', transform: 'translate(-50%, -50%)', position: 'bottom-right' }
  ],
  9: [
    { left: '7%', top: '60%', transform: 'translate(-50%, -50%)', position: 'bottom-left' },
    { left: '8%', top: '35%', transform: 'translate(-50%, -50%)', position: 'left' },
    { left: '15%', top: '14%', transform: 'translate(-50%, -50%)', position: 'top-left' },
    { left: '33%', top: '2%', transform: 'translate(-50%, 0)', position: 'top' },
    { left: '50%', top: '2%', transform: 'translate(-50%, 0)', position: 'top' },
    { left: '67%', top: '2%', transform: 'translate(-50%, 0)', position: 'top' },
    { left: '85%', top: '14%', transform: 'translate(-50%, -50%)', position: 'top-right' },
    { left: '92%', top: '35%', transform: 'translate(-50%, -50%)', position: 'right' },
    { left: '93%', top: '60%', transform: 'translate(-50%, -50%)', position: 'bottom-right' }
  ]
};

const AVATAR_EMOJIS: Record<string, string> = {
  'av-fox': '🦊',
  'av-cat': '🐱',
  'av-robot': '🤖',
  'av-dragon': '🐉',
  'av-wizard': '🧙',
  'av-ninja': '🥷',
  'av-tiger': '🐯',
  'av-bear': '🐻'
};

export const TableView: React.FC<TableViewProps> = ({
  room,
  player,
  gameState,
  seeFutureCards,
  onCloseSeeFuture,
  alterFutureCards,
  onCloseAlterFuture,
  onSendAction,
  onRestartGame,
  onLeaveRoom,
  onSendMessage
}) => {
  const { t } = useLang();
  const [showChat, setShowChat] = useState<boolean>(false);
  const [chatText, setChatText] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(gameState.turnTimeLimit);
  const [flyingCards, setFlyingCards] = useState<FlyingAnimation[]>([]);

  const tableRef = useRef<HTMLDivElement>(null);
  const prevTopCardIdRef = useRef<string>((gameState as any).topCard?.id);
  const prevDiscardCountRef = useRef<number>((gameState as any).discardPile?.length || 0);
  const prevTrickIdRef = useRef<string>((gameState as any).currentTrick ? (gameState as any).currentTrick.combo?.cards?.map((c: any) => c.id).join('-') : '');
  const prevHandCountRef = useRef<number>((gameState as any).myHand?.length || 0);
  const prevCardCountsRef = useRef<Record<string, number>>({});
  const prevTurnPlayerIdRef = useRef<string | null>(null);

  // Turn timer countdown calculation
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - gameState.turnStartTime) / 1000);
      const rem = Math.max(0, gameState.turnTimeLimit - elapsed);
      setTimeLeft(rem);
    }, 500);

    return () => clearInterval(interval);
  }, [gameState.turnStartTime, gameState.turnTimeLimit]);

  // Reorder players so current user is always seated at the bottom
  const myIndex = gameState.players.findIndex(p => p.id === player.id);
  const otherPlayers = [
    ...gameState.players.slice(myIndex + 1),
    ...gameState.players.slice(0, myIndex)
  ];
  const currentTurnPlayer = gameState.players[gameState.currentTurnIndex];
  const myPlayerInGame = gameState.players.find(p => p.id === player.id);
  const myCardCount = (gameState as any).myHand?.length || 0;

  // Calculate real-time opponent seat coordinates relative to table center
  const getOpponentPosition = (oppId: string) => {
    const oppEl = document.getElementById(`opponent-seat-${oppId}`);
    const tableEl = tableRef.current;
    if (oppEl && tableEl) {
      const oppRect = oppEl.getBoundingClientRect();
      const tableRect = tableEl.getBoundingClientRect();
      const startX = Math.round((oppRect.left + oppRect.width / 2) - (tableRect.left + tableRect.width / 2));
      const startY = Math.round((oppRect.top + oppRect.height / 2) - (tableRect.top + tableRect.height / 2));
      const rotate = startX > 80 ? -16 : startX < -80 ? 16 : 0;
      return { startX, startY, rotate };
    }

    const oppIndex = otherPlayers.findIndex(p => p.id === oppId);
    if (oppIndex === -1) return { startX: 0, startY: -220, rotate: 0 };
    const layoutList = SEAT_LAYOUTS[otherPlayers.length] || SEAT_LAYOUTS[3];
    const coord = layoutList[oppIndex] || layoutList[0];
    const leftPercent = parseFloat(coord.left) / 100;
    const topPercent = parseFloat(coord.top) / 100;

    const width = tableEl ? tableEl.clientWidth : 1000;
    const height = tableEl ? tableEl.clientHeight : 640;

    const startX = (leftPercent - 0.5) * width;
    const startY = (topPercent - 0.5) * height;
    const rotate = startX > 80 ? -16 : startX < -80 ? 16 : 0;

    return { startX, startY, rotate };
  };

  // Calculate target drop zone / discard pile position relative to table center
  const getDropZonePosition = (gameType: GameType) => {
    let dropZoneId = 'uno-top-card';
    if (!document.getElementById(dropZoneId)) dropZoneId = 'uno-drop-zone';
    if (gameType === 'exploding-kittens') {
      dropZoneId = document.getElementById('ek-top-card') ? 'ek-top-card' : 'ek-drop-zone';
    }
    if (gameType === 'tien-len' || gameType === 'sam') {
      dropZoneId = 'tienlen-drop-zone';
    }

    const dropEl = document.getElementById(dropZoneId);
    const tableEl = tableRef.current;
    if (dropEl && tableEl) {
      const dropRect = dropEl.getBoundingClientRect();
      const tableRect = tableEl.getBoundingClientRect();
      const tableCenterX = tableRect.left + tableRect.width / 2;
      const tableCenterY = tableRect.top + tableRect.height / 2;
      const dropCenterX = dropRect.left + dropRect.width / 2;
      const dropCenterY = dropRect.top + dropRect.height / 2;

      return {
        targetX: Math.round(dropCenterX - tableCenterX),
        targetY: Math.round(dropCenterY - tableCenterY)
      };
    }

    return {
      targetX: (gameType === 'tien-len' || gameType === 'sam') ? 0 : 75,
      targetY: 0
    };
  };

  // Detect Opponent Actions & Dealing/Drawing for flying card animations (showing playing side!)
  useEffect(() => {
    // 1. UNO Card Plays (When an opponent plays a card!)
    if (gameState.gameType === 'uno') {
      const topCard = (gameState as any).topCard;
      if (topCard && topCard.id !== prevTopCardIdRef.current) {
        if (prevTopCardIdRef.current) {
          // Identify who played: check lastPlayedBy first, then action logs, then previous turn player
          let playedById = (gameState as any).lastPlayedBy;
          if (!playedById) {
            const playLog = [...gameState.logs].reverse().find(l => l.playerId && (l.type === 'action' || l.type === 'special'));
            playedById = playLog?.playerId;
          }
          if (!playedById && prevTurnPlayerIdRef.current && prevTurnPlayerIdRef.current !== player.id) {
            playedById = prevTurnPlayerIdRef.current;
          }

          // If played by an opponent (not the local player):
          if (playedById && playedById !== player.id) {
            const opp = otherPlayers.find(p => p.id === playedById);
            if (opp) {
              const { startX, startY, rotate } = getOpponentPosition(opp.id);
              const { targetX, targetY } = getDropZonePosition('uno');
              const animId = 'fly-uno-' + Date.now() + Math.random().toString(36).substring(2, 6);
              sounds.playCardWhoosh();

              setFlyingCards(prev => [...prev, {
                id: animId,
                gameType: 'uno',
                card: topCard,
                playerName: opp.name,
                startX,
                startY,
                endX: targetX,
                endY: targetY,
                startRotate: rotate,
                endRotate: -3,
                isDraw: false
              }]);

              setTimeout(() => sounds.playCardSnap(), 300);
              setTimeout(() => {
                setFlyingCards(prev => prev.filter(a => a.id !== animId));
              }, 400);
            }
          }
        }
        prevTopCardIdRef.current = topCard.id;
      }
    }

    // 2. Exploding Kittens Card Plays
    if (gameState.gameType === 'exploding-kittens') {
      const discardPile = (gameState as any).discardPile || [];
      if (discardPile.length > prevDiscardCountRef.current) {
        if (prevDiscardCountRef.current > 0) {
          const topDiscard = discardPile[discardPile.length - 1];
          let playedById = (gameState as any).lastPlayedBy;
          if (!playedById) {
            const playLog = [...gameState.logs].reverse().find(l => l.playerId && (l.type === 'action' || l.type === 'warning'));
            playedById = playLog?.playerId;
          }
          if (playedById && playedById !== player.id) {
            const opp = otherPlayers.find(p => p.id === playedById);
            if (opp) {
              const { startX, startY, rotate } = getOpponentPosition(opp.id);
              const { targetX, targetY } = getDropZonePosition('exploding-kittens');
              const animId = 'fly-ek-' + Date.now() + Math.random().toString(36).substring(2, 6);
              sounds.playCardWhoosh();

              setFlyingCards(prev => [...prev, {
                id: animId,
                gameType: 'exploding-kittens',
                card: topDiscard,
                playerName: opp.name,
                startX,
                startY,
                endX: targetX,
                endY: targetY,
                startRotate: rotate,
                endRotate: 0,
                isDraw: false
              }]);

              setTimeout(() => sounds.playCardSnap(), 300);
              setTimeout(() => {
                setFlyingCards(prev => prev.filter(a => a.id !== animId));
              }, 400);
            }
          }
        }
        prevDiscardCountRef.current = discardPile.length;
      }
    }

    // 3. Tiến Lên & Sâm Lốc Trick Plays
    if (gameState.gameType === 'tien-len' || gameState.gameType === 'sam') {
      const trick = (gameState as any).currentTrick;
      const trickId = trick ? (trick.combo?.cards?.map((c: any) => c.id).join('-') || 'trick') : '';
      if (trick && trickId && trickId !== prevTrickIdRef.current) {
        if (prevTrickIdRef.current && trick.playerId !== player.id) {
          const opp = otherPlayers.find(p => p.id === trick.playerId);
          if (opp) {
            const { startX, startY, rotate } = getOpponentPosition(opp.id);
            const { targetX, targetY } = getDropZonePosition(gameState.gameType);
            const animId = 'fly-card-' + Date.now() + Math.random().toString(36).substring(2, 6);
            sounds.playCardWhoosh();

            setFlyingCards(prev => [...prev, {
              id: animId,
              gameType: gameState.gameType,
              card: trick.combo?.cards || [],
              playerName: opp.name,
              startX,
              startY,
              endX: targetX,
              endY: targetY,
              startRotate: rotate,
              endRotate: 0,
              isDraw: false
            }]);

            setTimeout(() => sounds.playCardSnap(), 300);
            setTimeout(() => {
              setFlyingCards(prev => prev.filter(a => a.id !== animId));
            }, 400);
          }
        }
        prevTrickIdRef.current = trickId;
      }
    }

    // 4. Opponent Drawing Cards Animation
    otherPlayers.forEach(opp => {
      const prevCount = prevCardCountsRef.current[opp.id];
      if (prevCount !== undefined && opp.cardCount > prevCount) {
        const { startX, startY, rotate } = getOpponentPosition(opp.id);
        const animId = 'draw-' + opp.id + '-' + Date.now();
        sounds.playCardWhoosh();

        setFlyingCards(prev => [...prev, {
          id: animId,
          gameType: gameState.gameType,
          playerName: opp.name,
          startX: (gameState.gameType === 'tien-len' || gameState.gameType === 'sam') ? 0 : -75,
          startY: 0,
          endX: startX,
          endY: startY,
          startRotate: 0,
          endRotate: rotate,
          isDraw: true
        }]);

        setTimeout(() => {
          setFlyingCards(prev => prev.filter(a => a.id !== animId));
        }, 400);
      }
      prevCardCountsRef.current[opp.id] = opp.cardCount;
    });

    // 5. Draw Card to Local Player Hand
    const currentHandCount = (gameState as any).myHand?.length || 0;
    if (currentHandCount > prevHandCountRef.current) {
      if (prevHandCountRef.current > 0) {
        const animId = 'draw-me-' + Date.now();
        sounds.playCardSnap();
        setFlyingCards(prev => [...prev, {
          id: animId,
          gameType: gameState.gameType,
          playerName: 'Bạn',
          startX: -60,
          startY: -30,
          endX: 0,
          endY: 220,
          isDraw: true
        }]);

        setTimeout(() => {
          setFlyingCards(prev => prev.filter(a => a.id !== animId));
        }, 460);
      }
    }
    prevHandCountRef.current = currentHandCount;
    prevTurnPlayerIdRef.current = currentTurnPlayer?.id || null;
  }, [gameState, otherPlayers, player.id, currentTurnPlayer?.id]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    onSendMessage(chatText.trim());
    setChatText('');
  };

  const isUno = gameState.gameType === 'uno';
  const myEmoji = AVATAR_EMOJIS[player.avatar] || '👤';

  return (
    <div className="relative min-h-screen bg-black text-slate-100 flex flex-col justify-between overflow-hidden font-sans">
      {/* Top Header Bar */}
      <div className="z-30 flex items-center justify-between px-4 py-2 bg-black/60 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="text-xl font-black bg-gradient-to-r from-amber-400 via-rose-400 to-yellow-400 bg-clip-text text-transparent">
            {isUno ? 'UNO' : gameState.gameType === 'exploding-kittens' ? 'MÈO NỔ' : gameState.gameType === 'sam' ? 'SÂM LỐC' : 'TIẾN LÊN'}
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-900 text-slate-300 font-bold border border-slate-700">
            {t('tb.room')} {room.id}
          </span>
        </div>

        {/* Turn countdown banner */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900/90 border border-slate-700 shadow-md">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-mono font-bold text-white">{timeLeft}s</span>
            <span className="text-[11px] text-slate-400">({currentTurnPlayer?.name})</span>
          </div>

          <button
            onClick={() => setShowChat(!showChat)}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
            title={t('tb.chatLog')}
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          {player.isHost && (
            <button
              onClick={onRestartGame}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
              title={t('tb.backToLobby')}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onLeaveRoom}
            className="p-2 rounded-xl bg-slate-900 hover:bg-rose-500/20 hover:text-rose-300 text-slate-300 transition-colors"
            title={t('tb.leaveMatch')}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main 3D Perspective Table Arena (Surrounding you like a real table!) */}
      <div className="flex-1 flex flex-col justify-between relative p-2 sm:p-3 w-full h-[calc(100vh-56px)] min-h-[580px] max-h-[960px] mx-auto overflow-hidden">
        {/* Radiant Casino Table Surface */}
        <div
          ref={tableRef}
          className={`flex-1 rounded-[50px] sm:rounded-[70px] border-4 sm:border-8 shadow-[0_0_90px_rgba(234,88,12,0.35)] relative overflow-hidden backdrop-blur-sm flex flex-col justify-between p-2 sm:p-4 transition-all duration-500 ${
            isUno
              ? 'bg-gradient-to-b from-[#8b0000] via-[#c92a00] to-[#e65c00] border-[#550000]'
              : gameState.gameType === 'exploding-kittens'
              ? 'bg-gradient-to-b from-[#450a0a] via-[#7f1d1d] to-[#991b1b] border-[#450a0a]'
              : gameState.gameType === 'sam'
              ? 'bg-gradient-to-b from-[#701a75] via-[#4a044e] to-[#2e0854] border-[#3b0764]'
              : 'bg-gradient-to-b from-[#064e3b] via-[#047857] to-[#065f46] border-[#022c22]'
          }`}
        >
          {/* Concentric Radial Glow & Geometric Rings (Exact replica of the screenshot!) */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,200,0,0.45)_0%,_rgba(255,100,0,0.3)_40%,_transparent_75%)] pointer-events-none" />
          <div className="absolute inset-8 rounded-full border-2 border-amber-300/20 pointer-events-none" />
          <div className="absolute inset-20 rounded-full border border-amber-400/15 pointer-events-none" />

          {/* Rotating Direction Circular Arrows in Center of Table */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            <motion.div
              animate={{ rotate: gameState.direction === 1 ? 360 : -360 }}
              transition={{ repeat: Infinity, duration: 24, ease: 'linear' }}
              className="w-80 sm:w-96 h-80 sm:h-96 rounded-full border-[14px] border-dashed border-amber-300/25 flex items-center justify-center opacity-60"
            >
              {/* Arrow Head Indicators */}
              <div className="absolute -top-3 text-amber-300 font-black text-2xl">
                {gameState.direction === 1 ? '➔' : '⬅'}
              </div>
              <div className="absolute -bottom-3 text-amber-300 font-black text-2xl">
                {gameState.direction === 1 ? '⬅' : '➔'}
              </div>
            </motion.div>
          </div>

          {/* Opponents Sitting Around the Table Perimeter Layer (2-8 Players) */}
          <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
            {otherPlayers.map((opp, idx) => {
              const isTurn = opp.id === currentTurnPlayer?.id;
              const layoutList = SEAT_LAYOUTS[otherPlayers.length] || SEAT_LAYOUTS[Math.min(9, Math.max(1, otherPlayers.length))];
              const coord = layoutList[idx] || layoutList[layoutList.length - 1];

              return (
                <div
                  key={opp.id}
                  id={`opponent-seat-${opp.id}`}
                  className="absolute pointer-events-auto transition-all duration-500"
                  style={{
                    left: coord.left,
                    top: coord.top,
                    transform: coord.transform
                  }}
                >
                  <OpponentSeat
                    player={opp}
                    gameType={gameState.gameType}
                    isCurrentTurn={isTurn}
                    position={coord.position}
                  />
                </div>
              );
            })}
          </div>

          {/* Flying Cards Animation Layer (Renders realistic opponent card throw and player card slide!) */}
          <div className="absolute inset-0 pointer-events-none z-40 overflow-visible">
            <AnimatePresence>
              {flyingCards.map((f) => (
                <motion.div
                  key={f.id}
                  initial={{
                    x: f.startX,
                    y: f.startY,
                    scale: f.isDraw ? 0.9 : 0.65,
                    rotate: f.startRotate ?? 0,
                    opacity: 0
                  }}
                  animate={{
                    x: f.endX,
                    y: f.endY,
                    scale: f.isDraw ? [0.9, 0.8, 0.65] : [0.65, 1.15, 1],
                    rotate: [f.startRotate ?? 0, (f.startRotate ?? 0) * 0.4, f.endRotate ?? -3],
                    opacity: f.isDraw ? [0, 1, 1, 0] : 1
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute top-1/2 left-1/2 -ml-12 -mt-18 sm:-ml-14 sm:-mt-20 pointer-events-none z-50 flex items-center justify-center"
                >
                  {/* Floating Action Badge above in-flight card */}
                  {f.playerName && (
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-0.5 rounded-full bg-slate-950/95 border-2 border-amber-400 text-[10px] font-black text-amber-300 shadow-2xl flex items-center gap-1.5 pointer-events-none animate-bounce">
                      <span>{f.isDraw ? '📥' : '⚡'}</span>
                      <span>{f.playerName} {f.isDraw ? 'rút bài' : 'đánh bài'}</span>
                    </div>
                  )}

                  {/* Card Visual */}
                  {f.isDraw ? (
                    f.gameType === 'uno' ? (
                      <UnoCardView isBack={true} className="!w-20 sm:!w-24 !h-28 sm:!h-36 shadow-2xl" />
                    ) : f.gameType === 'exploding-kittens' ? (
                      <EKCardView isBack={true} className="!w-20 sm:!w-24 !h-28 sm:!h-36 shadow-2xl" />
                    ) : (
                      <div className="w-16 sm:w-20 h-24 sm:h-28 rounded-xl bg-gradient-to-br from-red-800 to-red-950 border border-red-500 shadow-2xl flex items-center justify-center text-white text-xl">
                        ♠️
                      </div>
                    )
                  ) : (
                    f.gameType === 'uno' && f.card ? (
                      <UnoCardView
                        card={f.card}
                        chosenColor={(gameState as any).activeColor}
                        className="!w-24 sm:!w-28 !h-36 sm:!h-40 shadow-[0_30px_60px_rgba(0,0,0,0.9)] ring-4 ring-amber-400/40"
                      />
                    ) : f.gameType === 'exploding-kittens' && f.card ? (
                      <EKCardView
                        card={f.card}
                        className="!w-24 sm:!w-28 !h-36 sm:!h-40 shadow-[0_30px_60px_rgba(0,0,0,0.9)] ring-4 ring-rose-400/40"
                      />
                    ) : f.gameType === 'tien-len' && Array.isArray(f.card) ? (
                      <div className="flex -space-x-4 sm:-space-x-6">
                        {f.card.map((c: any, i: number) => (
                          <div
                            key={c.id || i}
                            className={`w-20 sm:w-24 h-28 sm:h-36 rounded-2xl bg-white border-2 border-slate-300 shadow-[0_30px_60px_rgba(0,0,0,0.9)] flex flex-col justify-between p-2 font-black ${
                              c.suit === 'hearts' || c.suit === 'diamonds' ? 'text-rose-600' : 'text-slate-900'
                            }`}
                          >
                            <div className="text-sm self-start leading-none font-bold">
                              {c.value}
                              <span className="text-base">{c.suit === 'spades' ? '♠' : c.suit === 'clubs' ? '♣' : c.suit === 'diamonds' ? '♦' : '♥'}</span>
                            </div>
                            <div className="text-3xl self-center leading-none">
                              {c.suit === 'spades' ? '♠' : c.suit === 'clubs' ? '♣' : c.suit === 'diamonds' ? '♦' : '♥'}
                            </div>
                            <div className="text-sm self-end leading-none font-bold rotate-180">
                              {c.value}
                              <span className="text-base">{c.suit === 'spades' ? '♠' : c.suit === 'clubs' ? '♣' : c.suit === 'diamonds' ? '♦' : '♥'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Game Component Routing (Dead center playing zone & bottom player cards) */}
          <div className="absolute inset-0 z-10 pointer-events-none">
            {gameState.gameType === 'uno' && (
              <UnoTableView
                gameState={gameState as any}
                myPlayerId={player.id}
                onSendAction={onSendAction}
              />
            )}

            {gameState.gameType === 'exploding-kittens' && (
              <ExplodingKittensTableView
                gameState={gameState as any}
                myPlayerId={player.id}
                seeFutureCards={seeFutureCards}
                onCloseSeeFuture={onCloseSeeFuture}
                alterFutureCards={alterFutureCards}
                onCloseAlterFuture={onCloseAlterFuture || (() => {})}
                onSendAction={onSendAction}
              />
            )}

            {(gameState.gameType === 'tien-len' || gameState.gameType === 'sam') && (
              <TienLenTableView
                gameState={gameState as any}
                myPlayerId={player.id}
                onSendAction={onSendAction}
              />
            )}
          </div>

          {/* Bottom Left: User Player Badge (Matching Screenshot!) */}
          <div className="absolute bottom-4 left-4 z-40 flex flex-col items-start pointer-events-auto">
            {myPlayerInGame?.id === currentTurnPlayer?.id && (
              <motion.div
                initial={{ scale: 0.8, y: 5 }}
                animate={{ scale: [1, 1.06, 1], y: 0 }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                className="px-3 py-1 rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 text-slate-950 font-black text-[11px] sm:text-xs uppercase tracking-wide shadow-xl flex items-center gap-1.5 mb-1.5 border border-white"
              >
                <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
                <span>ĐẾN LƯỢT BẠN! ({timeLeft}s)</span>
              </motion.div>
            )}

            <div className="flex flex-col items-start">
              {/* Nameplate Pill */}
              <div className="px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 border border-amber-300/60 shadow-md flex items-center gap-1.5 mb-1">
                <span className="text-[11px] font-black text-slate-950 uppercase tracking-wide">
                  {player.name}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-2xl ${
                    myPlayerInGame?.id === currentTurnPlayer?.id
                      ? 'bg-gradient-to-b from-amber-300 to-amber-500 ring-4 ring-amber-400 animate-pulse'
                      : 'bg-slate-900 border-2 border-slate-700'
                  }`}
                >
                  {myEmoji}
                </div>

                {/* Card count pill with mini card icon */}
                <div className="flex items-center bg-white text-slate-950 px-2 py-0.5 rounded-xl shadow-lg border-2 border-slate-300 font-black text-xs gap-1.5">
                  {isUno ? (
                    <div className="w-3.5 h-[19px] rounded-[3px] overflow-hidden shadow-xs flex-shrink-0 border border-black/50">
                      <svg viewBox="0 0 100 145" className="w-full h-full block">
                        <rect width="100" height="145" rx="10" fill="#000" />
                        <rect x="7" y="7" width="86" height="131" rx="8" fill="#e71d36" />
                        <ellipse cx="50" cy="72.5" rx="36" ry="22" transform="rotate(-28 50 72.5)" fill="#000" />
                        <text x="50" y="80" textAnchor="middle" transform="rotate(-28 50 72.5) skewX(-10)" fontFamily="'Impact', sans-serif" fontWeight="900" fontStyle="italic" fontSize="26" fill="#FEE440" stroke="#e71d36" strokeWidth="2" paintOrder="stroke fill">UNO</text>
                      </svg>
                    </div>
                  ) : (
                    <span className="text-sm">🃏</span>
                  )}
                  <span>{myCardCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Right: Big 3D UNO Shout Button (Matching Screenshot!) */}
          {isUno && (
            <div className="absolute bottom-4 right-4 z-40 pointer-events-auto">
              <motion.button
                whileHover={{ scale: 1.1, rotate: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  sounds.playUnoShout();
                  onSendAction({ type: 'CALL_UNO' });
                }}
                className="w-24 sm:w-28 h-20 sm:h-24 rounded-[50%] bg-gradient-to-br from-red-600 via-rose-600 to-red-700 border-4 border-yellow-400 shadow-2xl flex items-center justify-center cursor-pointer relative group"
                style={{
                  boxShadow: '0 10px 25px rgba(220,38,38,0.7), inset 0 2px 4px rgba(255,255,255,0.4)',
                  transform: 'rotate(-15deg)'
                }}
              >
                <span
                  className="text-3xl sm:text-4xl font-black italic tracking-tighter text-yellow-300 select-none transform -skew-x-12"
                  style={{
                    textShadow: '3px 3px 0px #b91c1c, -1px -1px 0px #fff',
                    fontFamily: "'Plus Jakarta Sans', 'Be Vietnam Pro', sans-serif"
                  }}
                >
                  UNO
                </span>
              </motion.button>
            </div>
          )}
        </div>
      </div>

      {/* Floating In-Game Chat & Event Log Drawer */}
      {showChat && (
        <div className="fixed right-4 bottom-24 z-50 w-80 sm:w-96 bg-slate-900/95 border border-slate-700 rounded-3xl shadow-2xl backdrop-blur-md p-4 flex flex-col max-h-96">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Nhật Ký &amp; Trò Chuyện</span>
            <button onClick={() => setShowChat(false)} className="text-xs text-slate-500 hover:text-white">✕</button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 text-xs pr-1 mb-3 max-h-56">
            {gameState.logs.map((log) => (
              <div
                key={log.id}
                className={`p-1.5 rounded-lg text-[11px] ${
                  log.type === 'win' ? 'bg-amber-500/20 text-amber-300 font-bold' :
                  log.type === 'warning' ? 'bg-rose-500/20 text-rose-300' :
                  log.type === 'special' ? 'bg-indigo-500/20 text-indigo-300 font-semibold' :
                  'bg-slate-950/60 text-slate-300'
                }`}
              >
                {log.message}
              </div>
            ))}
          </div>

          <form onSubmit={handleSendChat} className="flex gap-2">
            <input
              type="text"
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder={t('tb.chatPh')}
              maxLength={80}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button type="submit" className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold">
              {t('tb.send')}
            </button>
          </form>
        </div>
      )}

      {/* Victory Podium Modal */}
      {gameState.isGameOver && (
        <VictoryModal
          winners={gameState.winners}
          players={gameState.players}
          isHost={player.isHost}
          onRestartGame={onRestartGame}
        />
      )}
    </div>
  );
};
