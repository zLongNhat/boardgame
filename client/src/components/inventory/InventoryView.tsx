import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Coins, ArrowUpRight, Trash2, Filter, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';
import { InventoryItem } from '../../types/game';
import { useAuth } from '../../context/AuthContext';
import { useGameSocketContext } from '../../hooks/GameSocketContext';
import { RARITY_CONFIG } from '../cases/CaseOpeningView';

export const InventoryView: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { socket } = useGameSocketContext();
  const navigate = useNavigate();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filterRarity, setFilterRarity] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'value_desc' | 'value_asc'>('newest');
  const [sellingId, setSellingId] = useState<string | null>(null);
  const [isSellingAll, setIsSellingAll] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadInventory = () => {
    if (!user) return;
    fetch('/api/inventory', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('omnideck_token') || sessionStorage.getItem('omnideck_token') || ''}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.inventory)) {
          setItems(data.inventory);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadInventory();
  }, [user]);

  const handleSellItem = (item: InventoryItem) => {
    if (!user || !socket) return;
    setSellingId(item.id);
    socket.emit('inventory:sell', { userId: user.id, itemId: item.id }, (res: any) => {
      setSellingId(null);
      if (res.success) {
        setActionMsg({ text: `Đã bán ${item.name} và nhận +${res.earned?.toLocaleString('vi-VN')} 🪙!`, type: 'success' });
        loadInventory();
        refreshUser();
      } else {
        setActionMsg({ text: res.message || 'Lỗi khi bán vật phẩm', type: 'error' });
      }
      setTimeout(() => setActionMsg(null), 3500);
    });
  };

  const handleSellAll = () => {
    if (!user || !socket || items.length === 0) return;
    if (!window.confirm(`Bạn có chắc chắn muốn bán toàn bộ ${items.length} vật phẩm để nhận ${totalValue.toLocaleString('vi-VN')} 🪙?`)) {
      return;
    }

    setIsSellingAll(true);
    socket.emit('inventory:sell-all', { userId: user.id }, (res: any) => {
      setIsSellingAll(false);
      if (res.success) {
        setActionMsg({ text: `Đã bán tất cả ${res.count} vật phẩm và nhận +${res.earned?.toLocaleString('vi-VN')} 🪙!`, type: 'success' });
        loadInventory();
        refreshUser();
      } else {
        setActionMsg({ text: res.message || 'Lỗi khi bán tất cả', type: 'error' });
      }
      setTimeout(() => setActionMsg(null), 3500);
    });
  };

  const totalValue = items.reduce((sum, it) => sum + (it.value || 0), 0);

  const filteredItems = items
    .filter(it => filterRarity === 'all' || it.rarity === filterRarity)
    .sort((a, b) => {
      if (sortBy === 'value_desc') return b.value - a.value;
      if (sortBy === 'value_asc') return a.value - b.value;
      return b.obtainedAt - a.obtainedAt;
    });

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-8 pb-12">
      {/* Header Info Banner */}
      <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/40 to-slate-900/40 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 backdrop-blur-md relative overflow-hidden shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold mb-3 uppercase tracking-wider">
              <Package className="w-3.5 h-3.5" /> Kho Đồ Cá Nhân (Inventory)
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white">
              Bộ Sưu Tập Skin Vũ Khí
            </h1>
            <p className="text-sm text-gray-300 mt-2 max-w-xl">
              Nơi lưu trữ các item nhận được từ Mở Hòm CS2. Bạn có thể bán ngay lấy tiền coins hoặc mang sang trò Nâng Cấp để thử vận may nhân hệ số!
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-gray-900/80 border border-gray-700/60 rounded-2xl px-5 py-3 shadow-inner">
              <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Tổng số vật phẩm</div>
              <div className="text-xl font-black text-white">{items.length} món</div>
            </div>

            <div className="bg-gray-900/80 border border-gray-700/60 rounded-2xl px-5 py-3 shadow-inner">
              <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Tổng giá trị quy đổi</div>
              <div className="text-xl font-black text-yellow-400">{totalValue.toLocaleString('vi-VN')} 🪙</div>
            </div>

            {items.length > 0 && (
              <button
                disabled={isSellingAll}
                onClick={handleSellAll}
                className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-red-600/20 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Bán Tất Cả (+{totalValue.toLocaleString('vi-VN')} 🪙)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {actionMsg && (
        <div
          className={`p-4 rounded-2xl border text-sm font-bold flex items-center gap-2 ${
            actionMsg.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
              : 'bg-red-950/80 border-red-500/50 text-red-300'
          }`}
        >
          {actionMsg.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-red-400" />}
          {actionMsg.text}
        </div>
      )}

      {/* Filters and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-900/50 border border-gray-800 p-4 rounded-2xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400 font-bold flex items-center gap-1 mr-2">
            <Filter className="w-3.5 h-3.5" /> Hạng:
          </span>
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'white', label: 'Trắng' },
            { id: 'blue', label: 'Xanh' },
            { id: 'purple', label: 'Tím' },
            { id: 'red', label: 'Đỏ' },
            { id: 'gold', label: 'Vàng' }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterRarity(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterRarity === f.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-bold">Sắp xếp:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-gray-800 border border-gray-700 text-xs text-gray-200 rounded-xl px-3 py-1.5 font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="newest">Mới nhất</option>
            <option value="value_desc">Giá trị: Cao &rarr; Thấp</option>
            <option value="value_asc">Giá trị: Thấp &rarr; Cao</option>
          </select>
        </div>
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="bg-gray-900/40 border border-dashed border-gray-800 rounded-3xl p-12 flex flex-col items-center justify-center text-center gap-4">
          <div className="text-5xl opacity-40">🎒</div>
          <div>
            <h3 className="text-lg font-bold text-gray-300">Kho đồ hiện tại đang trống</h3>
            <p className="text-xs text-gray-500 mt-1">Hãy ghé thăm Mở Hòm CS2 để quay được những skin giá trị!</p>
          </div>
          <button
            onClick={() => navigate('/cases')}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" /> Mở Hòm Ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map((item) => {
            const cfg = RARITY_CONFIG[item.rarity];
            const isSelling = sellingId === item.id;
            return (
              <div
                key={item.id}
                className={`p-4 rounded-3xl border ${cfg.border}/60 ${cfg.bg} flex flex-col justify-between shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-all`}
              >
                <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 mb-2">
                  <span className={`uppercase font-black ${cfg.text}`}>{cfg.label}</span>
                  <span>{new Date(item.obtainedAt).toLocaleDateString('vi-VN')}</span>
                </div>

                <div className="text-5xl my-4 text-center group-hover:scale-110 transition-transform drop-shadow-md">
                  {item.icon}
                </div>

                <div className="mb-4 text-center">
                  <h4 className={`font-black text-sm truncate ${cfg.text}`}>{item.name}</h4>
                  <div className="text-sm font-black text-yellow-400 mt-1 flex items-center justify-center gap-1">
                    <Coins className="w-4 h-4" /> {item.value.toLocaleString('vi-VN')} 🪙
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    disabled={isSelling}
                    onClick={() => handleSellItem(item)}
                    className="flex-1 py-2 px-3 rounded-xl bg-gray-950/70 hover:bg-red-500/20 hover:text-red-300 border border-gray-700/60 hover:border-red-500/50 text-gray-300 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Coins className="w-3.5 h-3.5 text-yellow-400" /> Bán ({item.value}🪙)
                  </button>

                  <button
                    onClick={() => navigate(`/upgrade?itemId=${item.id}`)}
                    className="py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                    title="Dùng item này để Nâng Cấp"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" /> Nâng Cấp
                  </button>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: cfg.hex }} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InventoryView;
