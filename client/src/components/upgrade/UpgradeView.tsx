import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Coins, RefreshCw, AlertCircle, Sliders, Sparkles } from 'lucide-react';
import { InventoryItem, UpgradeResult } from '../../types/game';
import { useAuth } from '../../context/AuthContext';
import { useGameSocketContext } from '../../hooks/GameSocketContext';
import { playCaseTickSound, playCaseWinSound } from '../cases/CaseOpeningView';

export const UpgradeView: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { socket } = useGameSocketContext();
  const [searchParams] = useSearchParams();

  // Mode: bet by coins or by inventory item
  const [betMode, setBetMode] = useState<'coins' | 'item'>('coins');
  const [coinBetAmount, setCoinBetAmount] = useState<number>(50);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  // Target values
  const [targetMultiplier, setTargetMultiplier] = useState<number>(2.0);
  const [targetValue, setTargetValue] = useState<number>(100);
  const [rollDirection, setRollDirection] = useState<'under' | 'over'>('under');

  // Game state
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [lastResult, setLastResult] = useState<UpgradeResult | null>(null);
  const [wheelRotation, setWheelRotation] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load inventory
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
          setInventory(data.inventory);
          // Auto select if query param itemId exists
          const preselectedId = searchParams.get('itemId');
          if (preselectedId) {
            const found = data.inventory.find((it: InventoryItem) => it.id === preselectedId);
            if (found) {
              setSelectedItem(found);
              setBetMode('item');
            }
          }
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadInventory();
  }, [user, searchParams]);

  // Current effective bet amount
  const effectiveBet = betMode === 'item' ? (selectedItem?.value || 0) : coinBetAmount;

  // Sync target value when effectiveBet or multiplier changes
  useEffect(() => {
    if (effectiveBet > 0) {
      setTargetValue(Math.max(effectiveBet + 1, Math.round(effectiveBet * targetMultiplier)));
    }
  }, [effectiveBet, targetMultiplier]);

  // Win chance calculation: RTP 95%, clamped between 1% and 85%
  const calculateChance = (bet: number, target: number) => {
    if (bet <= 0 || target <= bet) return 0;
    const raw = (bet / target) * 95;
    return Math.max(1, Math.min(85, Math.round(raw * 100) / 100));
  };

  const winChance = calculateChance(effectiveBet, targetValue);

  // Quick Multipliers
  const MULTIPLIERS = [1.5, 2.0, 3.0, 5.0, 10.0, 20.0, 50.0];

  const handlePlayUpgrade = () => {
    if (!user) {
      setErrorMsg('Vui lòng đăng nhập để chơi Nâng Cấp.');
      return;
    }
    if (betMode === 'item' && !selectedItem) {
      setErrorMsg('Vui lòng chọn 1 vật phẩm từ kho đồ để cược.');
      return;
    }
    if (betMode === 'coins' && user.balance < coinBetAmount) {
      setErrorMsg(`Không đủ số dư: Cần ${coinBetAmount.toLocaleString('vi-VN')} 🪙, bạn có ${user.balance.toLocaleString('vi-VN')} 🪙.`);
      return;
    }
    if (targetValue <= effectiveBet) {
      setErrorMsg('Giá trị mục tiêu phải lớn hơn số tiền cược.');
      return;
    }

    setErrorMsg(null);
    setIsUpgrading(true);
    setIsResetting(false);
    setWheelRotation(0);
    setLastResult(null);

    if (socket) {
      socket.emit('upgrade:play', {
        userId: user.id,
        betType: betMode,
        betAmount: betMode === 'coins' ? coinBetAmount : undefined,
        itemInstanceId: betMode === 'item' ? selectedItem?.id : undefined,
        targetValue,
        rollDirection
      }, (res: UpgradeResult) => {
        if (!res.success) {
          setErrorMsg(res.message || 'Lỗi khi nâng cấp.');
          setIsUpgrading(false);
          setIsResetting(false);
          setWheelRotation(0);
          return;
        }

        // Animate the wheel: rotate several full spins plus the roll degree
        const fullSpins = 5 * 360;
        const targetDeg = fullSpins + (res.rollDegree ?? 0);
        setWheelRotation(targetDeg);

        // Play rolling tick sounds
        let ticks = 0;
        const tickTimer = setInterval(() => {
          ticks++;
          if (ticks < 35) {
            playCaseTickSound();
          } else {
            clearInterval(tickTimer);
          }
        }, 110);

        setTimeout(() => {
          clearInterval(tickTimer);
          setLastResult(res);
          if (res.isWin) {
            playCaseWinSound('gold');
          }
          if (betMode === 'item') {
            setSelectedItem(null);
            loadInventory();
          }
          refreshUser();

          // Chờ hết một lượt quay và người chơi xem kết quả 1.2s, sau đó reset về vị trí ban đầu (0 độ)
          setTimeout(() => {
            setIsResetting(true);
            setWheelRotation(0);
            setTimeout(() => {
              setIsResetting(false);
              setIsUpgrading(false); // Hoàn tất lượt quay, sẵn sàng cho lượt tiếp theo
            }, 400);
          }, 1200);
        }, 4200);
      });
    }
  };

  // SVG wheel geometry
  const size = 280;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const winningDash = (winChance / 100) * circumference;
  const losingDash = circumference - winningDash;
  // Rotation offset for "over" vs "under"
  const strokeDashoffset = rollDirection === 'under' ? 0 : -((100 - winChance) / 100) * circumference;

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-8 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-slate-900/40 border border-purple-500/30 rounded-3xl p-6 sm:p-8 backdrop-blur-md relative overflow-hidden shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold mb-3 uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5" /> SkinClub Style Upgrade • Minh Bạch RTP 95%
            </div>
            <h1 className="text-3xl sm:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-indigo-300 to-pink-400">
              Nâng Cấp Vật Phẩm & Tiền Thưởng
            </h1>
            <p className="text-sm text-gray-300 mt-2 max-w-xl">
              Cược tiền xu hoặc dùng skin trong kho đồ để nâng cấp lên các mốc tiền thưởng cao hơn. Tùy chỉnh thanh trượt hệ số nhân để tính toán chính xác tỉ lệ trúng thưởng!
            </p>
          </div>

          <div className="bg-gray-900/80 border border-gray-700/60 rounded-2xl px-5 py-3 flex items-center gap-3 shadow-inner">
            <Coins className="w-6 h-6 text-yellow-400" />
            <div>
              <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Số dư của bạn</div>
              <div className="text-xl font-black text-yellow-400">{user?.balance?.toLocaleString('vi-VN') || 0} 🪙</div>
            </div>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-950/80 border border-red-500/50 text-red-300 text-sm font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-400" /> {errorMsg}
        </div>
      )}

      {/* Main 3-Column Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Your Bet (4 cols) */}
        <div className="lg:col-span-4 bg-gray-900/70 border border-gray-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-5">
          <div className="flex items-center justify-between pb-3 border-b border-gray-800">
            <h3 className="font-bold text-sm text-gray-200 uppercase tracking-wider flex items-center gap-2">
              <Coins className="w-4 h-4 text-yellow-400" /> 1. Cược Của Bạn
            </h3>
            <span className="text-xs font-black text-yellow-400">{effectiveBet.toLocaleString('vi-VN')} 🪙</span>
          </div>

          {/* Bet Mode Selector */}
          <div className="grid grid-cols-2 gap-2 bg-gray-950/80 p-1 rounded-2xl border border-gray-800">
            <button
              onClick={() => setBetMode('coins')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                betMode === 'coins' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              Tiền Coins 🪙
            </button>
            <button
              onClick={() => setBetMode('item')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                betMode === 'item' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              Item Trong Kho ({inventory.length})
            </button>
          </div>

          {betMode === 'coins' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2">Số tiền cược (🪙):</label>
                <input
                  type="number"
                  min={10}
                  max={100000}
                  value={coinBetAmount}
                  onChange={(e) => setCoinBetAmount(Math.max(10, Number(e.target.value)))}
                  className="w-full bg-gray-950/90 border border-gray-700 rounded-2xl px-4 py-3 text-lg font-black text-yellow-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Quick Chip Buttons */}
              <div className="grid grid-cols-3 gap-2">
                {[10, 50, 100, 250, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setCoinBetAmount(amt)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      coinBetAmount === amt
                        ? 'bg-yellow-500/20 border-yellow-500 text-yellow-300'
                        : 'bg-gray-800/60 border-gray-700 text-gray-300 hover:border-gray-600'
                    }`}
                  >
                    +{amt} 🪙
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="block text-xs font-bold text-gray-400">Chọn vật phẩm để cược:</label>
              {inventory.length === 0 ? (
                <div className="p-6 rounded-2xl border border-dashed border-gray-800 text-center text-xs text-gray-500">
                  Kho đồ chưa có item nào. Hãy qua Mở Hòm CS2 để lấy item!
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {inventory.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`p-3 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                        selectedItem?.id === item.id
                          ? 'bg-indigo-950/60 border-indigo-500 shadow-md'
                          : 'bg-gray-950/40 border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{item.icon}</span>
                        <div className="text-left">
                          <div className="text-xs font-bold text-white truncate max-w-[150px]">{item.name}</div>
                          <div className="text-[10px] text-gray-400 capitalize">{item.rarity}</div>
                        </div>
                      </div>
                      <div className="text-xs font-black text-yellow-400 whitespace-nowrap">
                        {item.value.toLocaleString('vi-VN')} 🪙
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Center Column: Circular Upgrade Wheel (4 cols) */}
        <div className="lg:col-span-4 bg-gray-900/70 border border-gray-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center justify-center gap-6 relative overflow-hidden">
          {/* Wheel Graphic */}
          <div className="relative flex items-center justify-center">
            {/* Top Indicator Arrow */}
            <div className="absolute top-0 z-30 flex flex-col items-center pointer-events-none">
              <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[16px] border-t-amber-400 shadow-[0_0_10px_#fbbf24]" />
            </div>

            {/* SVG Wheel */}
            <div className="relative w-[280px] h-[280px] flex items-center justify-center">
              <svg
                width={size}
                height={size}
                className="transform -rotate-90"
              >
                {/* Background Full Track (Red / Loss) */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke="#1e1b4b"
                  strokeWidth={strokeWidth}
                />
                {/* Winning Sector (Gradient Green/Purple) */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke="#a855f7"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${winningDash} ${losingDash}`}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />
              </svg>

              {/* Rotating Needle / Arrow Disk */}
              <div
                className="absolute inset-0 flex items-center justify-center will-change-transform"
                style={{
                  transform: `rotate(${wheelRotation}deg)`,
                  transition: isResetting
                    ? 'transform 0.4s ease-in-out'
                    : isUpgrading
                      ? 'transform 4.2s cubic-bezier(0.12, 0.8, 0.2, 1)'
                      : 'none'
                }}
              >
                <div className="w-1.5 h-24 bg-gradient-to-t from-transparent via-amber-300 to-amber-400 rounded-full shadow-[0_0_8px_#fbbf24] -translate-y-12" />
              </div>

              {/* Center Display Badge */}
              <div className="absolute w-36 h-36 rounded-full bg-gray-950/95 border-2 border-purple-500/40 flex flex-col items-center justify-center shadow-inner z-20 text-center p-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tỉ Lệ Trúng</span>
                <span className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-300 via-pink-300 to-amber-300">
                  {winChance}%
                </span>
                <span className="text-xs font-bold text-yellow-400 mt-1">
                  x{targetMultiplier.toFixed(2)} Lần
                </span>
              </div>
            </div>
          </div>

          {/* Roll Direction Switcher */}
          <div className="flex items-center gap-2 bg-gray-950/80 p-1 rounded-2xl border border-gray-800 text-xs font-bold">
            <span className="text-gray-500 text-[11px] px-2">Vùng Trúng:</span>
            <button
              onClick={() => setRollDirection('under')}
              className={`py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
                rollDirection === 'under' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              Roll Dưới (0 - {winChance}%)
            </button>
            <button
              onClick={() => setRollDirection('over')}
              className={`py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
                rollDirection === 'over' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              Roll Trên ({Math.round((100 - winChance) * 100) / 100}% - 100%)
            </button>
          </div>

          {/* Upgrade Action Button */}
          <button
            disabled={isUpgrading || isResetting || effectiveBet <= 0}
            onClick={handlePlayUpgrade}
            className={`w-full py-4 px-6 rounded-2xl font-black text-lg transition-all shadow-xl flex items-center justify-center gap-3 cursor-pointer ${
              isUpgrading || isResetting || effectiveBet <= 0
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-purple-600/30 scale-100 hover:scale-[1.02] active:scale-95'
            }`}
          >
            {isUpgrading || isResetting ? (
              <>
                <RefreshCw className="w-6 h-6 animate-spin" /> {isResetting ? 'Đang Đặt Lại...' : 'Đang Nâng Cấp...'}
              </>
            ) : (
              <>
                <Zap className="w-6 h-6" /> Nâng Cấp Ngay ({effectiveBet.toLocaleString('vi-VN')} 🪙)
              </>
            )}
          </button>
        </div>

        {/* Right Column: Target Reward & Slider (4 cols) */}
        <div className="lg:col-span-4 bg-gray-900/70 border border-gray-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-5">
          <div className="flex items-center justify-between pb-3 border-b border-gray-800">
            <h3 className="font-bold text-sm text-gray-200 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-pink-400" /> 2. Tiền Thưởng Mục Tiêu
            </h3>
            <span className="text-xs font-black text-pink-400">+{targetValue.toLocaleString('vi-VN')} 🪙</span>
          </div>

          {/* Number Input */}
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2">Số tiền muốn nhận (🪙):</label>
            <input
              type="number"
              min={effectiveBet + 1}
              value={targetValue}
              onChange={(e) => {
                const val = Math.max(effectiveBet + 1, Number(e.target.value));
                setTargetValue(val);
                if (effectiveBet > 0) {
                  setTargetMultiplier(Math.round((val / effectiveBet) * 100) / 100);
                }
              }}
              className="w-full bg-gray-950/90 border border-gray-700 rounded-2xl px-4 py-3 text-lg font-black text-pink-300 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Multiplier Slider */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-gray-400 mb-2">
              <span className="flex items-center gap-1"><Sliders className="w-3.5 h-3.5" /> Hệ số nhân:</span>
              <span className="text-purple-300 font-black text-sm">{targetMultiplier.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min={1.1}
              max={50}
              step={0.1}
              value={targetMultiplier}
              onChange={(e) => setTargetMultiplier(Number(e.target.value))}
              className="w-full accent-purple-500 h-2 bg-gray-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-500 font-bold mt-1">
              <span>1.1x</span>
              <span>10x</span>
              <span>25x</span>
              <span>50x</span>
            </div>
          </div>

          {/* Quick Multiplier Buttons */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-gray-400 block">Chọn nhanh hệ số:</span>
            <div className="grid grid-cols-4 gap-2">
              {MULTIPLIERS.map((m) => (
                <button
                  key={m}
                  onClick={() => setTargetMultiplier(m)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    Math.abs(targetMultiplier - m) < 0.05
                      ? 'bg-purple-600 border-purple-500 text-white'
                      : 'bg-gray-800/60 border-gray-700 text-gray-300 hover:border-gray-600'
                  }`}
                >
                  {m}x
                </button>
              ))}
            </div>
          </div>

          {/* Summary Box */}
          <div className="bg-gray-950/80 border border-gray-800/80 rounded-2xl p-4 space-y-2 text-xs">
            <div className="flex justify-between text-gray-400">
              <span>Tiền cược:</span>
              <span className="font-bold text-white">{effectiveBet.toLocaleString('vi-VN')} 🪙</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Lợi nhuận ròng nếu thắng:</span>
              <span className="font-bold text-emerald-400">+{(targetValue - effectiveBet).toLocaleString('vi-VN')} 🪙</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Tỉ lệ trúng toán học:</span>
              <span className="font-bold text-amber-300">{winChance}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Result Announcement Toast / Box */}
      <AnimatePresence>
        {lastResult && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={`p-6 rounded-3xl border-2 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl ${
              lastResult.isWin
                ? 'bg-gradient-to-r from-emerald-950/90 to-purple-950/90 border-emerald-500 shadow-emerald-500/30'
                : 'bg-gradient-to-r from-red-950/90 to-gray-950/90 border-red-500 shadow-red-500/20'
            }`}
          >
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="text-5xl">{lastResult.isWin ? '🎉' : '💔'}</div>
              <div>
                <h3 className={`text-xl font-black ${lastResult.isWin ? 'text-emerald-300' : 'text-red-300'}`}>
                  {lastResult.isWin ? 'NÂNG CẤP THÀNH CÔNG!' : 'NÂNG CẤP KHÔNG THÀNH CÔNG'}
                </h3>
                <p className="text-xs text-gray-300 mt-1">
                  Kết quả quay: <strong className="text-white">{lastResult.rollNumber}%</strong> (Cần &lt; {lastResult.winChance}% để thắng).
                  {lastResult.isWin && ` Bạn đã nhận được +${lastResult.targetValue?.toLocaleString('vi-VN')} 🪙!`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setLastResult(null)}
                className="py-2.5 px-6 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Tiếp Tục
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UpgradeView;
