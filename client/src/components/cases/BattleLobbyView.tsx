import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Swords,
  Plus,
  Users,
  Filter,
  AlertCircle,
  ArrowRight,
  Flame,
  X
} from 'lucide-react';
import {
  BattleMode,
  BattleRoomSummary,
  CaseDefinition
} from '../../types/game';
import { useAuth } from '../../context/AuthContext';
import { useGameSocketContext } from '../../hooks/GameSocketContext';

interface Props {
  onSelectBattle: (battleId: string) => void;
}

export const BattleLobbyView: React.FC<Props> = ({ onSelectBattle }) => {
  const { user, refreshUser } = useAuth();
  const { socket } = useGameSocketContext();

  const [battles, setBattles] = useState<BattleRoomSummary[]>([]);
  const [cases, setCases] = useState<CaseDefinition[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'waiting' | 'in_progress' | 'finished'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create form state
  const [selectedMaxPlayers, setSelectedMaxPlayers] = useState<2 | 3 | 4>(2);
  const [selectedMode, setSelectedMode] = useState<BattleMode>('standard');
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>(['case_bronze']);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Load cases and battle list
  const loadData = () => {
    fetch('/api/cases')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.cases) setCases(d.cases);
      })
      .catch(() => {});

    fetch('/api/battles')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.battles) setBattles(d.battles);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadData();

    if (!socket) return;
    socket.emit('battle:list', {}, (res: any) => {
      if (res.success && res.battles) setBattles(res.battles);
    });

    socket.on('battle:list', (list: BattleRoomSummary[]) => {
      setBattles(list);
    });

    return () => {
      socket.off('battle:list');
    };
  }, [socket]);

  // Calculate total cost for selected cases in create modal
  const createTotalCost = selectedCaseIds.reduce((sum, cId) => {
    const cDef = cases.find(c => c.id === cId);
    return sum + (cDef?.price || 0);
  }, 0);

  const handleAddCase = (cId: string) => {
    if (selectedCaseIds.length >= 50) {
      setErrorMsg('Tối đa 50 hòm trong một trận đấu.');
      return;
    }
    setSelectedCaseIds(prev => [...prev, cId]);
    setErrorMsg(null);
  };

  const handleRemoveCase = (index: number) => {
    if (selectedCaseIds.length <= 1) {
      setErrorMsg('Trận đấu phải có ít nhất 1 hòm.');
      return;
    }
    setSelectedCaseIds(prev => prev.filter((_, i) => i !== index));
    setErrorMsg(null);
  };

  const handleCreateBattle = () => {
    if (!user) {
      setErrorMsg('Vui lòng đăng nhập để tạo trận đấu.');
      return;
    }
    if (user.balance < createTotalCost) {
      setErrorMsg(`Không đủ số dư: Cần ${createTotalCost.toLocaleString('vi-VN')} 🪙, bạn có ${user.balance.toLocaleString('vi-VN')} 🪙.`);
      return;
    }

    setIsCreating(true);
    setErrorMsg(null);

    socket?.emit('battle:create', {
      creatorId: user.id,
      caseIds: selectedCaseIds,
      maxPlayers: selectedMaxPlayers,
      mode: selectedMode
    }, (res: any) => {
      setIsCreating(false);
      if (!res.success) {
        setErrorMsg(res.message || 'Lỗi khi tạo trận đấu.');
        return;
      }
      setShowCreateModal(false);
      refreshUser();
      if (res.battle?.id) {
        onSelectBattle(res.battle.id);
      }
    });
  };

  const handleJoinBattle = (battle: BattleRoomSummary) => {
    if (!user) {
      alert('Vui lòng đăng nhập để tham gia.');
      return;
    }
    if (user.balance < battle.totalCost) {
      alert(`Số dư không đủ: Cần ${battle.totalCost.toLocaleString('vi-VN')} 🪙, bạn có ${user.balance.toLocaleString('vi-VN')} 🪙.`);
      return;
    }

    socket?.emit('battle:join', { battleId: battle.id, userId: user.id }, (res: any) => {
      if (!res.success) {
        alert(res.message || 'Lỗi khi vào phòng.');
        return;
      }
      refreshUser();
      onSelectBattle(battle.id);
    });
  };

  // Filtered battles list
  const filteredBattles = battles.filter(b => {
    if (filterStatus === 'waiting') return b.status === 'waiting';
    if (filterStatus === 'in_progress') return b.status === 'starting' || b.status === 'spinning' || b.status === 'round_ended';
    if (filterStatus === 'finished') return b.status === 'finished';
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6 pb-12 font-sans select-none">
      {/* Top Banner Actions & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-900/60 border border-gray-800 p-4 rounded-3xl backdrop-blur-md shadow-xl">
        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400 font-bold flex items-center gap-1 mr-2">
            <Filter className="w-3.5 h-3.5" /> Lọc:
          </span>
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'waiting', label: 'Đang Chờ' },
            { id: 'in_progress', label: 'Đang Đấu' },
            { id: 'finished', label: 'Đã Xong' }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterStatus === f.id
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20 font-black'
                  : 'bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Create Battle Button */}
        <button
          onClick={() => {
            setShowCreateModal(true);
            setErrorMsg(null);
          }}
          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/25 transition-all cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[3]" /> Tạo Trận Đấu Mới
        </button>
      </div>

      {/* Battles Grid */}
      {filteredBattles.length === 0 ? (
        <div className="bg-gray-900/40 border border-dashed border-gray-800 rounded-3xl p-12 flex flex-col items-center justify-center text-center gap-4">
          <div className="text-5xl opacity-40">⚔️</div>
          <div>
            <h3 className="text-lg font-bold text-gray-300">Chưa có trận Case Battle nào</h3>
            <p className="text-xs text-gray-500 mt-1">Hãy tạo trận đấu đầu tiên và rủ bạn bè hoặc gọi bot vào chiến ngay!</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-black text-xs flex items-center gap-2 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Tạo Trận Ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBattles.map((b) => {
            const isUserIn = user && b.players.some(p => p.id === user.id);
            const isWaiting = b.status === 'waiting';
            const isFinished = b.status === 'finished';
            const isCrazy = b.mode === 'crazy';

            return (
              <div
                key={b.id}
                className="bg-gray-900/70 border border-gray-800 hover:border-gray-700 rounded-3xl p-5 shadow-xl flex flex-col justify-between gap-4 transition-all relative overflow-hidden group"
              >
                {/* Header Card */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-white flex items-center gap-1.5">
                      <Swords className="w-4 h-4 text-amber-400" /> {b.id}
                    </span>
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${
                        isCrazy
                          ? 'bg-pink-500/20 text-pink-300 border-pink-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}
                    >
                      {isCrazy ? '🤪 Điên Rồ' : '⚔️ Cổ Điển'}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isWaiting
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : isFinished
                        ? 'bg-gray-800 text-gray-400 border border-gray-700'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                    }`}
                  >
                    {isWaiting ? 'Chờ Người' : isFinished ? 'Đã Kết Thúc' : 'Đang Đấu'}
                  </span>
                </div>

                {/* Cases Sequence in Battle */}
                <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                  {b.caseIds.map((cId, idx) => {
                    const cDef = cases.find(c => c.id === cId);
                    return (
                      <div
                        key={idx}
                        className="flex-shrink-0 px-2 py-1 bg-gray-950/80 border border-gray-800 rounded-xl flex items-center gap-1 text-[11px] font-bold text-gray-300"
                        title={cDef?.name || cId}
                      >
                        <span>{cDef?.icon || '📦'}</span>
                        <span className="text-[10px] text-amber-400 font-bold">{cDef?.price || 50}🪙</span>
                      </div>
                    );
                  })}
                </div>

                {/* Player Slots */}
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: b.maxPlayers }).map((_, slotIdx) => {
                      const p = b.players[slotIdx];
                      return (
                        <div
                          key={slotIdx}
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border ${
                            p
                              ? 'bg-gradient-to-br from-indigo-500 to-purple-600 border-indigo-400 text-white'
                              : 'bg-gray-950 border-dashed border-gray-800 text-gray-600'
                          }`}
                          title={p ? p.displayName : 'Vị trí trống'}
                        >
                          {p ? (p.isBot ? '🤖' : p.displayName.charAt(0)) : '?'}
                        </div>
                      );
                    })}
                  </div>

                  {/* Cost per player */}
                  <div className="text-right">
                    <div className="text-[9px] text-gray-400 uppercase font-bold">Vé mỗi người</div>
                    <div className="text-sm font-black text-yellow-400">{b.totalCost.toLocaleString('vi-VN')} 🪙</div>
                  </div>
                </div>

                {/* Footer Action Button */}
                <div className="pt-2 border-t border-gray-800/80">
                  {isWaiting && !isUserIn ? (
                    <button
                      onClick={() => handleJoinBattle(b)}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
                    >
                      Tham Gia Trận Đấu ({b.totalCost.toLocaleString('vi-VN')} 🪙)
                    </button>
                  ) : (
                    <button
                      onClick={() => onSelectBattle(b.id)}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isUserIn
                          ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                          : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                      }`}
                    >
                      {isUserIn ? 'Vào Phòng Của Bạn' : 'Xem Trận Đấu'} <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Battle Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl relative flex flex-col gap-6"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                <div className="flex items-center gap-2 font-black text-lg text-white">
                  <Swords className="w-5 h-5 text-amber-400" /> Tạo Trận Case Battle Mới
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-950/80 border border-red-500/50 text-red-300 text-xs font-bold rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* 1. Player Count Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  1. Số Lượng Người Chơi:
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[2, 3, 4].map((count) => (
                    <button
                      key={count}
                      onClick={() => setSelectedMaxPlayers(count as any)}
                      className={`py-3 rounded-2xl font-black text-xs flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                        selectedMaxPlayers === count
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                          : 'bg-gray-950/60 border-gray-800 text-gray-400 hover:border-gray-700'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span>{count} Người ({count === 2 ? '1v1' : count === 3 ? '1v1v1' : '1v1v1v1'})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Battle Mode Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  2. Chế Độ Trận Đấu:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSelectedMode('standard')}
                    className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                      selectedMode === 'standard'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-300 shadow-md'
                        : 'bg-gray-950/60 border-gray-800 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <div className="font-black text-xs flex items-center gap-1.5 mb-1 text-white">
                      <Swords className="w-4 h-4 text-amber-400" /> Cổ Điển (Standard)
                    </div>
                    <div className="text-[11px] text-gray-400">
                      Tổng tiền skin cao nhất ăn trọn toàn bộ đồ của đối thủ.
                    </div>
                  </button>

                  <button
                    onClick={() => setSelectedMode('crazy')}
                    className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                      selectedMode === 'crazy'
                        ? 'bg-pink-500/10 border-pink-500 text-pink-300 shadow-md'
                        : 'bg-gray-950/60 border-gray-800 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <div className="font-black text-xs flex items-center gap-1.5 mb-1 text-white">
                      <Flame className="w-4 h-4 text-pink-400" /> Điên Rồ (Crazy Mode)
                    </div>
                    <div className="text-[11px] text-gray-400">
                      Tổng tiền skin THẤP NHẤT lại là người ăn hết!
                    </div>
                  </button>
                </div>
              </div>

              {/* 3. Case Sequence Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    3. Chọn Danh Sách Hòm Đấu ({selectedCaseIds.length}/50):
                  </label>
                  <span className="text-xs font-black text-yellow-400">
                    Tổng vé: {createTotalCost.toLocaleString('vi-VN')} 🪙
                  </span>
                </div>

                {/* Available Case Buttons */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {cases.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleAddCase(c.id)}
                      className="p-2.5 rounded-2xl bg-gray-950/80 border border-gray-800 hover:border-gray-700 flex flex-col items-center text-center gap-1 transition-all cursor-pointer active:scale-95"
                    >
                      <span className="text-2xl">{c.icon}</span>
                      <span className="text-[11px] font-bold text-white truncate max-w-full">{c.name}</span>
                      <span className="text-[10px] font-black text-amber-400">+{c.price} 🪙</span>
                    </button>
                  ))}
                </div>

                {/* Selected Sequence List */}
                <div className="bg-gray-950/60 border border-gray-800 rounded-2xl p-3 flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {selectedCaseIds.map((cId, idx) => {
                    const cDef = cases.find(c => c.id === cId);
                    return (
                      <div
                        key={idx}
                        className="px-2.5 py-1 rounded-xl bg-gray-900 border border-gray-700 flex items-center gap-2 text-xs font-bold text-gray-200"
                      >
                        <span>{idx + 1}. {cDef?.icon} {cDef?.name}</span>
                        <button
                          onClick={() => handleRemoveCase(idx)}
                          className="text-gray-500 hover:text-red-400 text-xs ml-1"
                          title="Xóa hòm này"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submit Button */}
              <button
                disabled={isCreating || selectedCaseIds.length === 0}
                onClick={handleCreateBattle}
                className={`w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer ${
                  isCreating || selectedCaseIds.length === 0
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-amber-500/25 active:scale-95'
                }`}
              >
                <Swords className="w-4 h-4" /> Tạo Trận Đấu ({createTotalCost.toLocaleString('vi-VN')} 🪙)
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
