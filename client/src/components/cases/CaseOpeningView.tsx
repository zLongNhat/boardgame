import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Sparkles, ShieldCheck, RefreshCw, ChevronRight, Layers } from 'lucide-react';
import { CaseDefinition, CaseItemTemplate, CaseSingleSpin, InventoryItem, ItemRarity } from '../../types/game';
import { useAuth } from '../../context/AuthContext';
import { useGameSocketContext } from '../../hooks/GameSocketContext';

export const RARITY_CONFIG: Record<ItemRarity, { label: string; text: string; bg: string; border: string; glow: string; hex: string }> = {
  white: {
    label: 'Hạng Trắng (Phổ Thông)',
    text: 'text-slate-300',
    bg: 'bg-slate-800/80',
    border: 'border-slate-600',
    glow: 'shadow-slate-500/20',
    hex: '#94a3b8'
  },
  blue: {
    label: 'Hạng Xanh (Hiếm)',
    text: 'text-blue-400',
    bg: 'bg-blue-950/80',
    border: 'border-blue-500',
    glow: 'shadow-blue-500/40',
    hex: '#3b82f6'
  },
  purple: {
    label: 'Hạng Tím (Cao Cấp)',
    text: 'text-purple-400',
    bg: 'bg-purple-950/80',
    border: 'border-purple-500',
    glow: 'shadow-purple-500/40',
    hex: '#a855f7'
  },
  red: {
    label: 'Hạng Đỏ (Thần Thoại)',
    text: 'text-rose-400',
    bg: 'bg-rose-950/80',
    border: 'border-rose-500',
    glow: 'shadow-rose-500/40',
    hex: '#f43f5e'
  },
  gold: {
    label: 'Hạng Vàng (Báu Vật Dao)',
    text: 'text-amber-300',
    bg: 'bg-amber-950/80',
    border: 'border-amber-400',
    glow: 'shadow-amber-400/50',
    hex: '#fbbf24'
  }
};

export const playCaseTickSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(450, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  } catch (e) {}
};

export const playCaseWinSound = (rarity: ItemRarity) => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const freqs = rarity === 'gold' ? [523, 659, 784, 1046] : rarity === 'red' ? [440, 554, 659, 880] : [330, 392, 523];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      const t = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  } catch (e) {}
};

const SPIN_OPTIONS = [1, 3, 5, 10] as const;

export const CaseOpeningView: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { socket } = useGameSocketContext();

  const [cases, setCases] = useState<CaseDefinition[]>([]);
  const [selectedCase, setSelectedCase] = useState<CaseDefinition | null>(null);
  const [spinCount, setSpinCount] = useState<number>(1);
  const [isOpening, setIsOpening] = useState(false);
  const [tape, setTape] = useState<CaseItemTemplate[]>([]);
  const [wonItem, setWonItem] = useState<InventoryItem | null>(null);
  const [multiSpins, setMultiSpins] = useState<CaseSingleSpin[]>([]);
  const [multiSummary, setMultiSummary] = useState<{ totalSpent: number; totalWonValue: number } | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showMultiModal, setShowMultiModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Auto mở hòm: số vòng còn lại (null = tắt)
  const [autoRemaining, setAutoRemaining] = useState<number | null>(null);

  const tapeContainerRef = useRef<HTMLDivElement>(null);
  const multiTapeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const autoRemainingRef = useRef<number | null>(null);
  autoRemainingRef.current = autoRemaining;
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ITEM_WIDTH = 140; // width of item card in tape

  // Load cases from server
  useEffect(() => {
    fetch('/api/cases')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.cases?.length > 0) {
          setCases(data.cases);
          setSelectedCase(data.cases[0]);
        }
      })
      .catch(() => {});
  }, []);

  // Dọn timer auto khi rời trang (tránh mở hòm ngoài ý muốn)
  useEffect(() => {
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }, []);

  const animateTapeEl = (el: HTMLDivElement | null, winningIdx: number, doneDelayMs: number, onDone: () => void) => {
    if (!el) {
      onDone();
      return;
    }
    el.style.transition = 'none';
    el.style.transform = 'translateX(0px)';
    // force reflow
    void el.offsetWidth;
    setTimeout(() => {
      if (!el) {
        onDone();
        return;
      }
      const jitter = (Math.random() - 0.5) * 60;
      const viewportW = el.parentElement?.clientWidth || 700;
      const targetOffset = -(winningIdx * (ITEM_WIDTH + 12) - viewportW / 2 + ITEM_WIDTH / 2) + jitter;
      el.style.transition = 'transform 5.5s cubic-bezier(0.12, 0.8, 0.2, 1)';
      el.style.transform = `translateX(${targetOffset}px)`;
      let tickCount = 0;
      const tickInterval = setInterval(() => {
        tickCount++;
        if (tickCount < 45) {
          playCaseTickSound();
        } else {
          clearInterval(tickInterval);
        }
      }, 110);
      setTimeout(() => {
        clearInterval(tickInterval);
        onDone();
      }, doneDelayMs);
    }, 80);
  };

  const AUTO_SPINS = 10;

  const stopAuto = () => {
    autoRemainingRef.current = null;
    setAutoRemaining(null);
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  };

  // Gọi khi một vòng quay kết thúc: auto còn lượt → mở vòng tiếp theo, hết lượt → hiện modal kết quả cuối
  const advanceAuto = (showFinalModal: () => void) => {
    const remaining = autoRemainingRef.current;
    if (remaining === null) {
      showFinalModal();
      return;
    }
    const next = remaining - 1;
    if (next <= 0) {
      stopAuto();
      showFinalModal();
      return;
    }
    autoRemainingRef.current = next;
    setAutoRemaining(next);
    autoTimerRef.current = setTimeout(() => {
      autoTimerRef.current = null;
      handleOpenCase();
    }, 600);
  };

  const handleToggleAuto = () => {
    if (autoRemainingRef.current !== null) {
      stopAuto();
      return;
    }
    autoRemainingRef.current = AUTO_SPINS;
    setAutoRemaining(AUTO_SPINS);
    handleOpenCase();
  };

  const handleOpenCase = () => {
    if (!user) {
      stopAuto();
      setErrorMsg('Vui lòng đăng nhập để mở hòm.');
      return;
    }
    if (!selectedCase) {
      stopAuto();
      return;
    }
    const totalCost = selectedCase.price * spinCount;
    if (user.balance < totalCost) {
      stopAuto();
      setErrorMsg(`Không đủ tiền! Bạn có ${user.balance.toLocaleString('vi-VN')} 🪙, cần ${totalCost.toLocaleString('vi-VN')} 🪙 cho ${spinCount} lượt.`);
      return;
    }
    if (!socket) {
      stopAuto();
      setErrorMsg('Mất kết nối máy chủ, thử lại sau giây lát.');
      return;
    }

    setErrorMsg(null);
    setIsOpening(true);
    setWonItem(null);
    setMultiSpins([]);
    setMultiSummary(null);
    setShowResultModal(false);
    setShowMultiModal(false);

    if (spinCount === 1) {
      socket.emit('cases:open', { userId: user.id, caseId: selectedCase.id }, (res: any) => {
        if (!res.success) {
          stopAuto();
          setErrorMsg(res.message || 'Mở hòm thất bại');
          setIsOpening(false);
          return;
        }

        const generatedTape: CaseItemTemplate[] = res.tape || [];
        const winningIdx = res.winningIndex ?? 30;
        setTape(generatedTape);
        setWonItem(res.wonItem);

        setTimeout(() => {
          animateTapeEl(tapeContainerRef.current, winningIdx, 5800, () => {
            setIsOpening(false);
            playCaseWinSound(res.wonItem?.rarity || 'white');
            refreshUser();
            advanceAuto(() => setShowResultModal(true));
          });
        }, 60);
      });
    } else {
      socket.emit('cases:open-multi', { userId: user.id, caseId: selectedCase.id, count: spinCount }, (res: any) => {
        if (!res.success) {
          stopAuto();
          setErrorMsg(res.message || 'Mở hòm thất bại');
          setIsOpening(false);
          return;
        }
        const spins: CaseSingleSpin[] = res.spins || [];
        setMultiSpins(spins);
        setMultiSummary({ totalSpent: res.totalSpent || 0, totalWonValue: res.totalWonValue || 0 });
        setTape([]);

        setTimeout(() => {
          let finished = 0;
          const total = spins.length;
          if (total === 0) {
            setIsOpening(false);
            return;
          }
          spins.forEach((spin, idx) => {
            animateTapeEl(multiTapeRefs.current[idx] || null, spin.winningIndex ?? 30, 5800, () => {
              finished++;
              if (finished === total) {
                setIsOpening(false);
                const best: ItemRarity = spins.some(s => s.wonItem.rarity === 'gold')
                  ? 'gold'
                  : spins.some(s => s.wonItem.rarity === 'red')
                    ? 'red'
                    : 'purple';
                playCaseWinSound(best);
                refreshUser();
                advanceAuto(() => setShowMultiModal(true));
              }
            });
          });
        }, 60);
      });
    }
  };

  const handleQuickSell = (itemInstanceId: string) => {
    if (!socket || !user) return;
    socket.emit('inventory:sell', { userId: user.id, itemId: itemInstanceId }, (res: any) => {
      if (res.success) {
        setShowResultModal(false);
        refreshUser();
      }
    });
  };

  const handleSellAllMulti = () => {
    if (!socket || !user || multiSpins.length === 0) return;
    const ids = multiSpins.map(s => s.wonItem.id);
    let idx = 0;
    const sellNext = () => {
      if (idx >= ids.length) {
        setShowMultiModal(false);
        refreshUser();
        return;
      }
      socket.emit('inventory:sell', { userId: user.id, itemId: ids[idx] }, () => {
        idx++;
        sellNext();
      });
    };
    sellNext();
  };

  const renderTapeCards = (cards: CaseItemTemplate[]) => cards.map((item, idx) => {
    const cfg = RARITY_CONFIG[item.rarity];
    return (
      <div
        key={idx}
        style={{ width: `${ITEM_WIDTH}px` }}
        className={`h-36 rounded-2xl border ${cfg.border} ${cfg.bg} flex flex-col items-center justify-between p-3 flex-shrink-0 shadow-lg relative overflow-hidden`}
      >
        <div className="text-[10px] uppercase font-black tracking-wider text-gray-400 self-start">
          {item.weaponType}
        </div>
        <div className="text-4xl my-auto transition-transform hover:scale-110 drop-shadow-md">
          {item.icon}
        </div>
        <div className="w-full text-center">
          <div className={`text-xs font-black truncate ${cfg.text}`}>{item.name}</div>
          <div className="text-[11px] font-bold text-yellow-400 mt-0.5">{item.value.toLocaleString('vi-VN')} 🪙</div>
        </div>
        <div
          className="absolute bottom-0 left-0 right-0 h-1"
          style={{ backgroundColor: cfg.hex }}
        />
      </div>
    );
  });

  const renderSingleTape = () => (
    <div className="overflow-hidden w-full py-4 border-y border-gray-800/80 bg-gray-950/60 rounded-2xl relative">
      <div
        ref={tapeContainerRef}
        className="flex items-center gap-3 px-4 will-change-transform"
        style={{ width: 'max-content' }}
      >
        {renderTapeCards(tape.length > 0 ? tape : selectedCase!.items.concat(selectedCase!.items))}
      </div>
    </div>
  );

  const renderMultiTapes = () => (
    <div className="flex flex-col gap-4 w-full">
      {multiSpins.length > 0 ? multiSpins.map((spin, spinIdx) => (
        <div key={spinIdx} className="overflow-hidden w-full py-3 border-y border-gray-800/80 bg-gray-950/60 rounded-2xl relative">
          <div className="absolute top-1 left-3 z-10 text-[11px] font-black text-amber-300 bg-black/60 px-2 py-0.5 rounded-full border border-amber-500/40">
            Vòng {spinIdx + 1}
          </div>
          <div
            ref={(el) => { multiTapeRefs.current[spinIdx] = el; }}
            className="flex items-center gap-3 px-4 will-change-transform"
            style={{ width: 'max-content' }}
          >
            {renderTapeCards(spin.tape)}
          </div>
        </div>
      )) : (
        <div className="text-center text-xs text-gray-500 py-6 border border-dashed border-gray-800 rounded-2xl">
          Bấm Mở {spinCount} Hòm để quay {spinCount} băng thưởng cùng lúc
        </div>
      )}
    </div>
  );

  const totalCost = selectedCase ? selectedCase.price * spinCount : 0;

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6 pb-12">
      {/* 6 Case Selector Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cases.map((c) => {
          const isSelected = selectedCase?.id === c.id;
          return (
            <button
              key={c.id}
              disabled={isOpening || autoRemaining !== null}
              onClick={() => {
                setSelectedCase(c);
                setErrorMsg(null);
                setTape([]);
                setMultiSpins([]);
                setShowResultModal(false);
                setShowMultiModal(false);
              }}
              className={`p-5 rounded-3xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-b from-gray-800 to-gray-900 border-amber-500 shadow-xl shadow-amber-500/20 scale-[1.02]'
                  : 'bg-gray-900/50 border-gray-800 hover:border-gray-700 hover:bg-gray-900/80'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl">{c.icon}</span>
                <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black">
                  {c.badge}
                </span>
              </div>
              <h3 className="font-bold text-lg text-white mb-1">{c.name}</h3>
              <p className="text-xs text-gray-400 leading-relaxed mb-4">{c.description}</p>
              <div className="flex items-center justify-between text-xs pt-3 border-t border-gray-800/80">
                <span className="text-gray-500 font-medium">{c.items.length} Skins Bên Trong</span>
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  Chọn hòm <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Case Opening Arena */}
      {selectedCase && (
        <div className="bg-gray-900/70 border border-gray-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center relative overflow-hidden">
          {/* Roulette Tape Strip */}
          <div className="w-full relative py-6">
            {/* Center Pointer Line */}
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1 bg-amber-400 z-30 shadow-[0_0_12px_#fbbf24] pointer-events-none flex flex-col justify-between items-center">
              <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[12px] border-t-amber-400 -mt-1" />
              <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[12px] border-b-amber-400 -mb-1" />
            </div>

            {spinCount === 1 ? renderSingleTape() : renderMultiTapes()}
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs text-center font-bold">
              {errorMsg}
            </div>
          )}

          {/* Spin count + Action Button */}
          <div className="mt-4 flex flex-col items-center gap-3 w-full">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Số lượt quay:</span>
              {SPIN_OPTIONS.map((n) => (
                <button
                  key={n}
                  disabled={isOpening || autoRemaining !== null}
                  onClick={() => {
                    setSpinCount(n);
                    setTape([]);
                    setMultiSpins([]);
                    setShowMultiModal(false);
                  }}
                  className={`px-4 py-2 rounded-xl font-black text-sm transition-all cursor-pointer border ${
                    spinCount === n
                      ? 'bg-amber-500 text-gray-950 border-amber-400 shadow-lg shadow-amber-500/30'
                      : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-amber-500/50'
                  }`}
                >
                  x{n}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <button
                disabled={isOpening || autoRemaining !== null}
                onClick={handleOpenCase}
                className={`px-10 py-4 rounded-2xl font-black text-lg transition-all shadow-xl flex items-center gap-3 cursor-pointer ${
                  isOpening
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-amber-500/30 scale-100 hover:scale-105 active:scale-95'
                }`}
              >
                {isOpening ? (
                  <>
                    <RefreshCw className="w-6 h-6 animate-spin" /> Đang Quay {spinCount > 1 ? `${spinCount} Vòng` : 'Thưởng'}...
                  </>
                ) : (
                  <>
                    <Package className="w-6 h-6" /> Mở {spinCount > 1 ? `${spinCount} Hòm` : 'Hòm'} ({totalCost.toLocaleString('vi-VN')} 🪙)
                  </>
                )}
              </button>

              {/* Auto ×10: mở liên tiếp 10 lần, bấm nữa để dừng */}
              <button
                type="button"
                disabled={isOpening && autoRemaining === null}
                onClick={handleToggleAuto}
                className={`px-6 py-4 rounded-2xl font-black text-sm transition-all shadow-lg flex items-center gap-2 cursor-pointer border ${
                  autoRemaining !== null
                    ? 'bg-rose-600/20 border-rose-500/60 text-rose-300 animate-pulse hover:bg-rose-600/30'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-amber-500/60 hover:text-amber-300'
                }`}
                title={autoRemaining !== null ? 'Dừng quay tự động (dừng sau vòng hiện tại)' : 'Tự động mở hòm liên tiếp 10 lần'}
              >
                {autoRemaining !== null ? `Dừng Auto (${autoRemaining})` : 'Auto ×10'}
              </button>
            </div>
            <div className="text-xs text-gray-400 flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Vật phẩm sẽ tự động lưu vào Kho Đồ và có thể bán lại bất kỳ lúc nào.
            </div>
          </div>

          {/* List of items in this case */}
          <div className="w-full mt-10">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-4">
              <h4 className="font-bold text-sm text-gray-200 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" /> Vật Phẩm Có Trong Hòm Này ({selectedCase.items.length})
              </h4>
              <div className="flex items-center gap-2 text-[11px] font-bold">
                <span className="text-slate-400">Trắng: 54%</span> •
                <span className="text-blue-400">Xanh: 28%</span> •
                <span className="text-purple-400">Tím: 12%</span> •
                <span className="text-rose-400">Đỏ: 5%</span> •
                <span className="text-amber-400">Vàng: 1%</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {selectedCase.items.map((item) => {
                const cfg = RARITY_CONFIG[item.rarity];
                return (
                  <div
                    key={item.itemId}
                    className={`p-3 rounded-2xl border ${cfg.border}/60 ${cfg.bg} flex flex-col items-center justify-between text-center gap-2 relative overflow-hidden`}
                  >
                    <div className="text-3xl my-1">{item.icon}</div>
                    <div>
                      <div className={`text-xs font-bold truncate max-w-full ${cfg.text}`}>{item.name}</div>
                      <div className="text-[10px] text-gray-400 font-medium">{item.weaponType}</div>
                      <div className="text-[11px] font-bold text-yellow-400 mt-1">{item.value.toLocaleString('vi-VN')} 🪙</div>
                    </div>
                    <div className="absolute top-1 right-2 text-[9px] uppercase font-bold text-gray-400">{item.rarity}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Won Item Celebration Modal (single) */}
      <AnimatePresence>
        {showResultModal && wonItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className={`max-w-md w-full rounded-3xl border-2 p-6 flex flex-col items-center text-center shadow-2xl relative overflow-hidden ${RARITY_CONFIG[wonItem.rarity].bg} ${RARITY_CONFIG[wonItem.rarity].border} ${RARITY_CONFIG[wonItem.rarity].glow}`}
            >
              <div className="text-xs font-black uppercase tracking-widest text-amber-300 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> CHÚC MỪNG BẠN ĐÃ MỞ ĐƯỢC!
              </div>

              <div className="text-6xl my-4 drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                {wonItem.icon}
              </div>

              <h2 className={`text-2xl font-black mb-1 ${RARITY_CONFIG[wonItem.rarity].text}`}>
                {wonItem.name}
              </h2>
              <div className="text-xs text-gray-300 font-bold mb-4">
                {RARITY_CONFIG[wonItem.rarity].label}
              </div>

              <div className="bg-gray-950/80 border border-gray-800 rounded-2xl px-5 py-3 mb-6 w-full flex items-center justify-between">
                <span className="text-xs text-gray-400 font-medium">Giá trị quy đổi:</span>
                <span className="text-lg font-black text-yellow-400 flex items-center gap-1">
                  +{wonItem.value.toLocaleString('vi-VN')} 🪙
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button
                  onClick={() => setShowResultModal(false)}
                  className="flex-1 py-3 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold text-sm transition-colors cursor-pointer"
                >
                  Giữ Trong Kho
                </button>
                <button
                  onClick={() => handleQuickSell(wonItem.id)}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-gray-950 font-black text-sm transition-all shadow-lg shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-1"
                >
                  Bán Ngay (+{wonItem.value.toLocaleString('vi-VN')} 🪙)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Multi-spin result modal */}
      <AnimatePresence>
        {showMultiModal && multiSpins.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-2xl w-full max-h-[85vh] overflow-y-auto rounded-3xl border-2 border-amber-500/60 bg-gray-900 p-6 shadow-2xl"
            >
              <div className="text-xs font-black uppercase tracking-widest text-amber-300 mb-2 flex items-center gap-1.5 justify-center">
                <Sparkles className="w-4 h-4" /> KẾT QUẢ {multiSpins.length} VÒNG QUAY!
              </div>
              {multiSummary && (
                <div className="flex items-center justify-center gap-4 text-xs font-bold mb-4">
                  <span className="text-gray-400">Đã chi: <span className="text-red-400">-{multiSummary.totalSpent.toLocaleString('vi-VN')} 🪙</span></span>
                  <span className="text-gray-400">Tổng trúng: <span className="text-emerald-400">+{multiSummary.totalWonValue.toLocaleString('vi-VN')} 🪙</span></span>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
                {multiSpins.map((spin, idx) => {
                  const cfg = RARITY_CONFIG[spin.wonItem.rarity];
                  return (
                    <div key={idx} className={`p-3 rounded-2xl border ${cfg.border} ${cfg.bg} flex flex-col items-center text-center gap-1`}>
                      <div className="text-[10px] font-black text-amber-300">Vòng {idx + 1}</div>
                      <div className="text-3xl">{spin.wonItem.icon}</div>
                      <div className={`text-[11px] font-bold truncate max-w-full ${cfg.text}`}>{spin.wonItem.name}</div>
                      <div className="text-[11px] font-bold text-yellow-400">{spin.wonItem.value.toLocaleString('vi-VN')} 🪙</div>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button
                  onClick={() => setShowMultiModal(false)}
                  className="flex-1 py-3 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold text-sm transition-colors cursor-pointer"
                >
                  Giữ Tất Cả Trong Kho
                </button>
                <button
                  onClick={handleSellAllMulti}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-gray-950 font-black text-sm transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  Bán Tất Cả (+{(multiSummary?.totalWonValue || 0).toLocaleString('vi-VN')} 🪙)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CaseOpeningView;
