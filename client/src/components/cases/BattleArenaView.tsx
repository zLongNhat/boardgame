import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Swords,
  ArrowLeft,
  Trophy,
  Coins,
  Package,
  Bot,
  User,
  Sparkles
} from 'lucide-react';
import {
  BattlePlayer,
  BattleRoom,
  BattleRoundData,
  InventoryItem
} from '../../types/game';
import { useAuth } from '../../context/AuthContext';
import { useGameSocketContext } from '../../hooks/GameSocketContext';
import { BattleRouletteTape } from './BattleRouletteTape';
import { RARITY_CONFIG, playCaseTickSound, playCaseWinSound } from './CaseOpeningView';

interface Props {
  battleId: string;
  onBack: () => void;
  onOpenInventory: () => void;
}

export const BattleArenaView: React.FC<Props> = ({
  battleId,
  onBack,
  onOpenInventory
}) => {
  const { user, refreshUser } = useAuth();
  const { socket } = useGameSocketContext();

  const [room, setRoom] = useState<BattleRoom | null>(null);
  const [currentRoundData, setCurrentRoundData] = useState<BattleRoundData | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load initial battle state & subscribe
  useEffect(() => {
    if (!socket) return;

    socket.emit('battle:subscribe', { battleId });
    socket.emit('battle:get', { battleId }, (res: any) => {
      if (res.success && res.battle) {
        setRoom(res.battle);
        if (res.battle.roundsHistory?.length > 0) {
          setCurrentRoundData(res.battle.roundsHistory[res.battle.roundsHistory.length - 1]);
        }
        if (res.battle.status === 'finished') {
          setShowWinnerModal(true);
        }
      }
    });

    // Listen to battle events
    socket.on('battle:updated', (updatedRoom: BattleRoom) => {
      if (updatedRoom.id === battleId) {
        setRoom(updatedRoom);
      }
    });

    socket.on('battle:round-start', (data: { battleId: string; roundData: BattleRoundData; room: BattleRoom }) => {
      if (data.battleId === battleId) {
        setRoom(data.room);
        setCurrentRoundData(data.roundData);
        setIsSpinning(true);

        // Play tick sound loop
        let tickCount = 0;
        const tickTimer = setInterval(() => {
          tickCount++;
          if (tickCount < 38) {
            playCaseTickSound();
          } else {
            clearInterval(tickTimer);
          }
        }, 110);
      }
    });

    socket.on('battle:round-end', (data: { battleId: string; roundIndex: number; players: BattlePlayer[]; room: BattleRoom }) => {
      if (data.battleId === battleId) {
        setIsSpinning(false);
        setRoom(data.room);
        playCaseWinSound('blue');
        refreshUser();
      }
    });

    socket.on('battle:finished', (data: { battleId: string; winner: BattlePlayer; allPrizes: InventoryItem[]; room: BattleRoom }) => {
      if (data.battleId === battleId) {
        setRoom(data.room);
        setIsSpinning(false);
        playCaseWinSound('gold');
        setShowWinnerModal(true);
        refreshUser();
      }
    });

    socket.on('battle:cancelled', (data: { battleId: string }) => {
      if (data.battleId === battleId) {
        alert('Phòng đấu đã bị hủy và hoàn tiền cược.');
        onBack();
      }
    });

    return () => {
      socket.emit('battle:unsubscribe', { battleId });
      socket.off('battle:updated');
      socket.off('battle:round-start');
      socket.off('battle:round-end');
      socket.off('battle:finished');
      socket.off('battle:cancelled');
    };
  }, [socket, battleId]);

  const handleAddBot = () => {
    if (!socket || !user || !room) return;
    socket.emit('battle:add-bot', { battleId: room.id, requesterId: user.id }, (res: any) => {
      if (!res?.success) {
        setErrorMsg(res?.message || 'Không thể thêm bot.');
      }
    });
  };

  const handleCancelBattle = () => {
    if (!socket || !user || !room) return;
    if (!confirm('Bạn có chắc muốn hủy phòng đấu này? Tiền cược sẽ được hoàn trả.')) return;
    socket.emit('battle:cancel', { battleId: room.id, requesterId: user.id }, (res: any) => {
      if (!res?.success) {
        setErrorMsg(res?.message || 'Không thể hủy phòng.');
      } else {
        refreshUser();
        onBack();
      }
    });
  };

  if (!room) {
    return (
      <div className="w-full py-24 flex flex-col items-center justify-center text-white gap-4 font-sans">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="font-bold text-gray-300 animate-pulse">Đang tải phòng đấu Case Battle...</p>
      </div>
    );
  }

  const isCreator = user?.id === room.creatorId;
  const isCrazy = room.mode === 'crazy';
  const totalLootValue = room.players.reduce((sum, p) => sum + p.totalValue, 0);

  // Column width classes depending on 2, 3, or 4 players
  const gridColsClass =
    room.maxPlayers === 2
      ? 'grid-cols-1 md:grid-cols-2'
      : room.maxPlayers === 3
      ? 'grid-cols-1 md:grid-cols-3'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 pb-12 font-sans select-none">
      {/* Top Header Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-900/80 border border-gray-800 p-4 rounded-3xl backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-800 rounded-xl transition-colors text-gray-400 hover:text-white flex items-center gap-1.5 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" /> Danh Sách Trận
          </button>

          <div className="h-5 w-px bg-gray-800 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="font-black text-white text-base tracking-wide flex items-center gap-2">
              <Swords className="w-5 h-5 text-amber-400" /> {room.id}
            </span>

            <span
              className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                isCrazy
                  ? 'bg-pink-500/20 text-pink-300 border-pink-500/40 shadow-[0_0_10px_rgba(236,72,153,0.3)]'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}
            >
              {isCrazy ? '🤪 Điên Rồ (Cùi Ăn Hết)' : '⚔️ Cổ Điển (Cao Ăn Hết)'}
            </span>
          </div>
        </div>

        {/* Center Round Indicator */}
        <div className="flex items-center gap-3">
          <div className="bg-gray-950/80 border border-gray-800 px-4 py-1.5 rounded-full text-xs font-bold text-gray-300 flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-400" />
            <span>
              Vòng:{' '}
              <strong className="text-white">
                {room.status === 'finished'
                  ? room.totalRounds
                  : room.currentRound || 0}
              </strong>{' '}
              / {room.totalRounds}
            </span>
          </div>

          <div className="bg-gray-950/80 border border-amber-500/30 px-4 py-1.5 rounded-full text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span>Vé: {room.totalCost.toLocaleString('vi-VN')} 🪙</span>
          </div>

          {room.status === 'waiting' && isCreator && (
            <button
              onClick={handleCancelBattle}
              className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all cursor-pointer"
            >
              Hủy Trận
            </button>
          )}
        </div>
      </div>

      {/* Error message toast */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-950/80 border border-red-500/50 text-red-300 text-xs font-bold flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-white hover:text-red-200">✕</button>
        </div>
      )}

      {/* Battle Status Banner */}
      {room.status === 'waiting' && (
        <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500 flex items-center justify-center text-xl">
              ⏳
            </div>
            <div>
              <div className="text-sm font-black text-white">Đang chờ người chơi tham gia...</div>
              <div className="text-xs text-indigo-200/70">
                Hiện tại: {room.players.length} / {room.maxPlayers} người. Khi đủ người trận đấu sẽ tự động bắt đầu!
              </div>
            </div>
          </div>

          {room.players.length < room.maxPlayers && (
            <button
              onClick={handleAddBot}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer active:scale-95"
            >
              <Bot className="w-4 h-4" /> Thêm Bot Chơi Cùng 🤖
            </button>
          )}
        </div>
      )}

      {room.status === 'starting' && (
        <div className="bg-amber-950/50 border border-amber-500/40 rounded-2xl p-4 text-center animate-pulse">
          <div className="text-sm font-black text-amber-300 flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            ĐỦ NGƯỜI! TRẬN ĐẤU SẼ BẮT ĐẦU TRONG VÀI GIÂY...
          </div>
        </div>
      )}

      {/* Main Multi-Column Player Grid */}
      <div className={`grid ${gridColsClass} gap-4`}>
        {Array.from({ length: room.maxPlayers }).map((_, slotIdx) => {
          const player = room.players[slotIdx];

          // Empty Slot Card
          if (!player) {
            return (
              <div
                key={slotIdx}
                className="bg-gray-900/40 border border-dashed border-gray-800 rounded-3xl p-6 flex flex-col items-center justify-center min-h-[360px] text-center gap-4"
              >
                <div className="w-16 h-16 rounded-full bg-gray-950 border border-gray-800 flex items-center justify-center text-2xl text-gray-600">
                  <User className="w-8 h-8 opacity-30" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-400">Vị trí trống #{slotIdx + 1}</div>
                  <div className="text-xs text-gray-600 mt-1">Đang chờ đối thủ...</div>
                </div>

                {room.status === 'waiting' && (
                  <button
                    onClick={handleAddBot}
                    className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Bot className="w-3.5 h-3.5" /> Thêm Bot 🤖
                  </button>
                )}
              </div>
            );
          }

          // Active Player Column
          const tapeInfo = currentRoundData?.playerTapes[player.id];
          const isWinner = room.status === 'finished' && room.winnerId === player.id;

          return (
            <div
              key={player.id}
              className={`rounded-3xl border flex flex-col justify-between p-4 transition-all relative overflow-hidden backdrop-blur-md ${
                isWinner
                  ? 'bg-gradient-to-b from-amber-950/60 via-gray-900/80 to-gray-950 border-amber-500 ring-2 ring-amber-400/50 shadow-[0_0_30px_rgba(245,158,11,0.2)]'
                  : 'bg-gray-900/60 border-gray-800 shadow-xl'
              }`}
            >
              {/* Winner Crown Ribbon */}
              {isWinner && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-yellow-500 text-black font-black text-[10px] px-3 py-1 rounded-bl-xl shadow-md flex items-center gap-1 z-20 uppercase tracking-wider">
                  <Trophy className="w-3 h-3" /> Người Thắng Cuộc
                </div>
              )}

              {/* Player Profile Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-800/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-sm shadow-md border border-indigo-400">
                    {player.avatar?.startsWith('av-') ? player.avatar.replace('av-', '') : player.displayName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-white truncate max-w-[120px]">
                        {player.displayName}
                      </span>
                      {player.isBot && (
                        <span className="text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1 rounded font-bold">
                          BOT
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      Đã mở: {player.drops.length} / {room.totalRounds}
                    </div>
                  </div>
                </div>

                {/* Live Running Score (Total Value) */}
                <div className="text-right">
                  <div className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Tổng Điểm</div>
                  <div className="text-sm font-black text-yellow-400 flex items-center justify-end gap-1">
                    <Coins className="w-3.5 h-3.5" /> {player.totalValue.toLocaleString('vi-VN')} 🪙
                  </div>
                </div>
              </div>

              {/* Center Roulette Tape Area */}
              <div className="py-4">
                <div className="text-[10px] uppercase font-bold text-gray-400 mb-2 flex items-center justify-between">
                  <span>Hòm Hiện Tại:</span>
                  <span className="text-indigo-300 font-bold">
                    {currentRoundData?.caseName || 'Đang chờ...'}
                  </span>
                </div>

                <BattleRouletteTape
                  tape={tapeInfo?.tape || null}
                  winningIndex={tapeInfo?.winningIndex ?? 30}
                  isSpinning={isSpinning}
                  wonItem={tapeInfo?.wonItem || null}
                />
              </div>

              {/* Player's Dropped Skins History in this battle */}
              <div className="pt-3 border-t border-gray-800/80 flex flex-col gap-2">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Vật Phẩm Đã Mở ({player.drops.length})</span>
                </div>

                {player.drops.length === 0 ? (
                  <div className="text-center py-4 text-xs text-gray-600 italic">
                    Chưa có vật phẩm nào
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {player.drops.map((drop, dIdx) => {
                      const cfg = RARITY_CONFIG[drop.rarity] || RARITY_CONFIG.white;
                      return (
                        <div
                          key={drop.id || dIdx}
                          className={`p-2 rounded-xl border flex items-center justify-between text-xs transition-all ${cfg.bg} ${cfg.border}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-base">{drop.icon}</span>
                            <span className={`font-bold truncate max-w-[130px] ${cfg.text}`}>
                              {drop.name}
                            </span>
                          </div>
                          <span className="text-yellow-400 font-black whitespace-nowrap text-[11px]">
                            +{drop.value.toLocaleString('vi-VN')} 🪙
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Winner Celebration Modal */}
      <AnimatePresence>
        {showWinnerModal && room.status === 'finished' && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-gray-900 border-2 border-amber-500/80 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative overflow-hidden text-center flex flex-col gap-6"
            >
              <div className="absolute -top-24 -left-24 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/40 text-4xl mb-3">
                  👑
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-wider mb-2">
                  <Trophy className="w-3.5 h-3.5" /> Chiếm Đoạt Toàn Bộ Chiến Lợi Phẩm!
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  {room.winnerName} ĐÃ THẮNG TRẬN ĐẤU!
                </h2>

                <p className="text-xs sm:text-sm text-gray-300 mt-2 max-w-md">
                  {isCrazy
                    ? '🤪 CHẾ ĐỘ ĐIÊN RỒ: Người chơi mở ra tổng giá trị skin THẤP NHẤT đã ôm trọn toàn bộ vật phẩm của mọi người!'
                    : '⚔️ CHẾ ĐỘ CỔ ĐIỂN: Người chơi có tổng giá trị skin CAO NHẤT đã ôm trọn toàn bộ vật phẩm của đối thủ!'}
                </p>
              </div>

              {/* Total Loot Summary */}
              <div className="bg-gray-950/80 border border-gray-800 rounded-2xl p-4 flex items-center justify-around text-center">
                <div>
                  <div className="text-[10px] text-gray-400 uppercase font-bold">Tổng Vật Phẩm Thắng</div>
                  <div className="text-xl font-black text-white">{room.allPrizes.length} món</div>
                </div>
                <div className="h-8 w-px bg-gray-800" />
                <div>
                  <div className="text-[10px] text-gray-400 uppercase font-bold">Tổng Giá Trị Skin</div>
                  <div className="text-xl font-black text-yellow-400">{totalLootValue.toLocaleString('vi-VN')} 🪙</div>
                </div>
              </div>

              {/* Prize Grid Preview */}
              <div className="max-h-48 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2 pr-1">
                {room.allPrizes.map((p, pIdx) => {
                  const cfg = RARITY_CONFIG[p.rarity] || RARITY_CONFIG.white;
                  return (
                    <div
                      key={pIdx}
                      className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs ${cfg.bg} ${cfg.border}`}
                    >
                      <span className="text-lg">{p.icon}</span>
                      <div className="text-left min-w-0">
                        <div className={`font-bold truncate text-[11px] ${cfg.text}`}>{p.name}</div>
                        <div className="text-[10px] font-bold text-yellow-400">+{p.value.toLocaleString('vi-VN')} 🪙</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  onClick={onOpenInventory}
                  className="w-full sm:flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
                >
                  <Package className="w-4 h-4" /> Xem Kho Đồ
                </button>

                <button
                  onClick={onBack}
                  className="w-full sm:flex-1 py-3 px-5 rounded-2xl bg-gray-800 hover:bg-gray-700 text-white font-black text-xs transition-all cursor-pointer"
                >
                  Quay Lại Sảnh Đấu
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
