import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Flame,
  Volume2,
  VolumeX,
  Zap,
  Sparkles,
  HelpCircle,
  X,
  Award
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useGameSocketContext } from '../../hooks/GameSocketContext';
import { CascadeStep, FreeSpinsState, SpinResult, SlotTile, SlotSymbolId } from '../../types/game';
import { TileAnimationPhase } from './WildBountySymbols';
import { CocktailNightsTile, preloadCocktailAssets } from './CocktailNightsSymbols';
import { ReelColumnView } from './ReelColumnView';
import { AutoSpinMenu } from './AutoSpinMenu';

const REEL_HEIGHTS = [5, 5, 5, 5, 5, 5];
const BET_PRESETS = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000];

// Art gốc từ PDF Cocktail_Nights_Gameinformation_EN của PG Soft.
const COCKTAIL_ASSET = `${import.meta.env.BASE_URL}assets/cocktail`;
const COCKTAIL_COVER = `${COCKTAIL_ASSET}/cover.png`;
const COCKTAIL_LOGO = `${COCKTAIL_ASSET}/logo.png`;
const COCKTAIL_PAYTABLE_IMG = `${COCKTAIL_ASSET}/paytable.png`;
const COCKTAIL_RULES_IMG = `${COCKTAIL_ASSET}/rules.png`;

// Nền neon tím theo cột như bản gốc.
const COLUMN_TINTS = [
  'bg-gradient-to-b from-[#2c2145] via-[#221a38] to-[#191230]',
  'bg-gradient-to-b from-[#2a1f4d] via-[#201835] to-[#171129]',
  'bg-gradient-to-b from-[#2c2145] via-[#221a38] to-[#191230]',
  'bg-gradient-to-b from-[#2a1f4d] via-[#201835] to-[#171129]',
  'bg-gradient-to-b from-[#2c2145] via-[#221a38] to-[#191230]',
  'bg-gradient-to-b from-[#2a1f4d] via-[#201835] to-[#171129]'
];

const COCKTAIL_DUMMY: SlotSymbolId[] = [
  'cocktail_bottle',
  'cocktail_whiskey',
  'cocktail_blue',
  'cocktail_green',
  'cocktail_lemon',
  'cocktail_shot',
  'A',
  'K',
  'Q',
  'J',
  '10',
  'scatter'
];

// Web Audio: neon bar — sine/triangle cao, vang nhẹ.
class CocktailSoundFX {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  private tone(freqFrom: number, freqTo: number, dur: number, type: OscillatorType, vol: number, delay = 0) {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = ctx.currentTime + delay;
      osc.type = type;
      osc.frequency.setValueAtTime(freqFrom, t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqTo), t + dur);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur);
    } catch {}
  }

  playSpin() {
    this.tone(520, 220, 0.16, 'triangle', 0.2);
  }
  playReelClack(colIdx: number) {
    this.tone(300 + colIdx * 25, 90, 0.07, 'triangle', 0.25);
  }
  playShatter() {
    this.tone(1400, 3200, 0.12, 'sawtooth', 0.08);
  }
  playScatterLand(i: number) {
    this.tone([523.25, 659.25, 783.99, 1046.5][Math.min(Math.max(0, i - 1), 3)], 0, 0.4, 'sine', 0.3);
  }
  playAnticipation() {
    this.tone(260, 560, 0.6, 'sawtooth', 0.08);
  }
  playGoldMorph() {
    [659.25, 783.99, 987.77, 1318.51].forEach((f, i) => this.tone(f, f, 0.2, 'triangle', 0.18, i * 0.05));
  }
  playWin(big: boolean) {
    const notes = big ? [523.25, 659.25, 783.99, 1046.5] : [440, 523.25, 659.25];
    notes.forEach((f, i) => this.tone(f, f, 0.25, 'sine', 0.15, i * 0.06));
  }
  playBigWin() {
    [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98].forEach((f, i) =>
      this.tone(f, f, 0.4, 'triangle', 0.22, i * 0.08)
    );
  }
  playDrop() {
    this.tone(300, 90, 0.08, 'sine', 0.2);
  }
  playMult() {
    this.tone(880, 1760, 0.18, 'sine', 0.2);
    this.tone(1320, 2640, 0.18, 'sine', 0.12, 0.08);
  }
}

const soundFX = new CocktailSoundFX();

export const CocktailNightsSlot: React.FC = () => {
  const { user } = useAuth();
  const { socket } = useGameSocketContext();

  const [betAmount, setBetAmount] = useState(20);
  const [isSpinning, setIsSpinning] = useState(false);
  const [turbo, setTurbo] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoSpinCount, setAutoSpinCount] = useState<number | null>(null);
  const [showBetDrawer, setShowBetDrawer] = useState(false);

  const [freeSpinsState, setFreeSpinsState] = useState<FreeSpinsState | null>(null);
  // Multiplier reel: 4 giá trị dưới cuộn 2-5 + index đang dùng ở bước hiện tại.
  const [multValues, setMultValues] = useState<number[]>([2, 2, 2, 2]);
  const [multUsed, setMultUsed] = useState<number[]>([]);

  const [currentGrid, setCurrentGrid] = useState<CascadeStep['grid']>(() =>
    REEL_HEIGHTS.map((h, colIdx) =>
      Array.from({ length: h }, (_, rowIdx) => {
        const pool: SlotSymbolId[] = [
          'cocktail_bottle',
          'cocktail_whiskey',
          'cocktail_blue',
          'cocktail_green',
          'cocktail_lemon',
          'cocktail_shot'
        ];
        return {
          id: `init_${colIdx}_${rowIdx}`,
          symbol: pool[(colIdx + rowIdx) % pool.length],
          isGold: false,
          isSilver: false,
          frame: 'none' as const
        };
      })
    )
  );

  const [activeMultiplier, setActiveMultiplier] = useState(1);
  const [lastWinAmount, setLastWinAmount] = useState(0);
  const [activeWinningWaysCount, setActiveWinningWaysCount] = useState(0);
  const [tileAnimationPhase, setTileAnimationPhase] = useState<TileAnimationPhase>('idle');

  const [spinningCols, setSpinningCols] = useState<boolean[]>([false, false, false, false, false, false]);
  const [targetColumnTiles, setTargetColumnTiles] = useState<SlotTile[][] | null>(null);
  const [cascadeDropCounts, setCascadeDropCounts] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [cascadeFallDistances, setCascadeFallDistances] = useState<number[][]>([]);
  const [anticipatingCols, setAnticipatingCols] = useState<number[]>([]);
  const [landedScattersCount, setLandedScattersCount] = useState(0);
  const [reelSpinDurations, setReelSpinDurations] = useState<number[]>([380, 380, 380, 380, 380, 380]);

  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [bigWinOverlay, setBigWinOverlay] = useState<{ amount: number; title: string } | null>(null);
  const [freeSpinsTriggeredModal, setFreeSpinsTriggeredModal] = useState<number | null>(null);

  const pendingSpinResultRef = useRef<SpinResult | null>(null);
  const scattersCountRef = useRef(0);
  const anticipatingColsRef = useRef<number[]>([]);
  const autoSpinRef = useRef<number | null>(null);
  autoSpinRef.current = autoSpinCount;

  const toggleSound = () => {
    soundFX.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
  };

  useEffect(() => {
    if (socket && user?.id) {
      socket.emit('slots:free-spins', { slotId: 'cocktail-nights', userId: user.id }, (res: any) => {
        if (res?.success && res.freeSpins) {
          setFreeSpinsState(res.freeSpins);
        }
      });
      socket.emit('slots:mults', { slotId: 'cocktail-nights', userId: user.id }, (res: any) => {
        if (res?.success && res.mults) {
          setMultValues([...res.mults.mults]);
        }
      });
    }
  }, [socket, user?.id]);

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    preloadCocktailAssets();
  }, []);

  const liveWaysCount = useMemo(() => {
    try {
      return currentGrid.reduce((acc, col) => {
        const heads = col.filter(t => !t.spanCont).length;
        return acc * Math.max(1, heads);
      }, 1);
    } catch {
      return 15625;
    }
  }, [currentGrid]);

  const handleIncreaseBet = () => {
    if (isSpinning || Boolean(freeSpinsState && freeSpinsState.remaining > 0)) return;
    const current = betAmount;
    const presetIdx = BET_PRESETS.indexOf(current);
    if (presetIdx !== -1 && presetIdx < BET_PRESETS.length - 1) {
      setBetAmount(BET_PRESETS[presetIdx + 1]);
    } else if (current < 100) {
      setBetAmount(current + 10);
    } else if (current < 1000) {
      setBetAmount(current + 100);
    } else {
      setBetAmount(current + 1000);
    }
  };

  const handleDecreaseBet = () => {
    if (isSpinning || Boolean(freeSpinsState && freeSpinsState.remaining > 0)) return;
    const current = betAmount;
    const presetIdx = BET_PRESETS.indexOf(current);
    if (presetIdx > 0) {
      setBetAmount(BET_PRESETS[presetIdx - 1]);
    } else if (current > 1000) {
      setBetAmount(Math.max(1000, current - 1000));
    } else if (current > 100) {
      setBetAmount(Math.max(100, current - 100));
    } else {
      setBetAmount(Math.max(10, current - 10));
    }
  };

  // Ô vàng thắng không vỡ (hóa WILD tại chỗ) nên chỉ tính ô vỡ thường.
  const computeFallDistances = (oldGrid: SlotTile[][], newGrid: SlotTile[][]): number[][] => {
    return oldGrid.map((oldCol, c) => {
      const newCol = newGrid[c] || [];
      const needed = oldCol.filter(t => t.isWinning && !t.isGold && t.frame !== 'gold').length;
      if (needed === 0) return newCol.map(() => 0);
      const survivorOldIdx: number[] = [];
      oldCol.forEach((t, idx) => {
        if (!(t.isWinning && !t.isGold && t.frame !== 'gold')) {
          survivorOldIdx.push(idx);
        }
      });
      const falls: number[] = [];
      for (let i = 0; i < newCol.length; i++) {
        if (i < needed) {
          falls.push(needed - i);
        } else {
          const s = i - needed;
          const oldIdx = survivorOldIdx[s] ?? i;
          falls.push(Math.max(0, i - oldIdx));
        }
      }
      return falls;
    });
  };

  const handleReelLanded = (colIdx: number, targetGrid: SlotTile[][]) => {
    soundFX.playReelClack(colIdx);
    setCurrentGrid(prev => {
      const next = [...prev];
      next[colIdx] = targetGrid[colIdx];
      return next;
    });

    const scattersInThisCol = targetGrid[colIdx].filter(t => t.symbol === 'scatter').length;
    if (scattersInThisCol > 0) {
      scattersCountRef.current += scattersInThisCol;
      setLandedScattersCount(scattersCountRef.current);
      soundFX.playScatterLand(scattersCountRef.current);
      // Cần 4 scatter -> anticipation khi đã có 3.
      if (scattersCountRef.current >= 3 && colIdx < 5) {
        const remaining = Array.from({ length: 5 - colIdx }, (_, i) => colIdx + 1 + i);
        setAnticipatingCols(remaining);
        anticipatingColsRef.current = remaining;
        soundFX.playAnticipation();
      }
    }
  };

  const runSpinSequence = async (spinResult: SpinResult) => {
    const targetGrid = spinResult.cascades[0].grid;
    setTargetColumnTiles(targetGrid);
    // Đồng bộ mult reel khởi đầu của lượt quay.
    if (spinResult.multReel) {
      setMultValues([...spinResult.multReel.start]);
      setMultUsed([]);
    }

    if (turbo) {
      for (let c = 0; c < 6; c++) {
        setReelSpinDurations(prev => {
          const next = [...prev];
          next[c] = 160;
          return next;
        });
        setSpinningCols(prev => {
          const next = [...prev];
          next[c] = true;
          return next;
        });
        await new Promise(r => setTimeout(r, 120));
        setSpinningCols(prev => {
          const next = [...prev];
          next[c] = false;
          return next;
        });
        handleReelLanded(c, targetGrid);
      }
    } else {
      for (let c = 0; c < 6; c++) {
        const isAnticipating = anticipatingColsRef.current.includes(c);
        const duration = isAnticipating ? 680 : 380;
        setReelSpinDurations(prev => {
          const next = [...prev];
          next[c] = duration;
          return next;
        });
        setSpinningCols(prev => {
          const next = [...prev];
          next[c] = true;
          return next;
        });
        await new Promise(r => setTimeout(r, duration));
        setSpinningCols(prev => {
          const next = [...prev];
          next[c] = false;
          return next;
        });
        handleReelLanded(c, targetGrid);
        await new Promise(r => setTimeout(r, 70));
      }
    }

    setTargetColumnTiles(null);
    setAnticipatingCols([]);
    anticipatingColsRef.current = [];

    await new Promise(r => setTimeout(r, turbo ? 100 : 250));
    animateCascades(spinResult);
  };

  const animateCascades = async (spinResult: SpinResult) => {
    const cascades = spinResult.cascades;
    const multSteps = spinResult.multReel?.steps ?? [];

    for (let i = 0; i < cascades.length; i++) {
      const step = cascades[i];
      setCurrentGrid(step.grid);
      setActiveMultiplier(step.multiplier);
      setActiveWinningWaysCount(step.winningWays.length);
      const ms = multSteps[i];
      if (ms) {
        setMultValues([...ms.mults]);
        setMultUsed([...ms.used]);
        if (ms.used.length > 0) soundFX.playMult();
      }

      if (step.winningWays.length > 0) {
        setTileAnimationPhase('connecting');
        soundFX.playWin(step.stepWin / Math.max(1, spinResult.betAmount) > 5);
        setLastWinAmount(step.totalWinSoFar);
        await new Promise(r => setTimeout(r, turbo ? 200 : 420));

        setTileAnimationPhase('shattering');
        soundFX.playShatter();

        const hasGoldWinner = step.grid.some(col => col.some(t => t.isWinning && (t.isGold || t.frame === 'gold')));
        if (hasGoldWinner) {
          soundFX.playGoldMorph();
        }

        await new Promise(r => setTimeout(r, turbo ? 260 : 460));

        const nextStep = cascades[i + 1];
        if (nextStep) {
          const drops = step.grid.map(col =>
            col.filter(t => t.isWinning && !t.isGold && t.frame !== 'gold').length
          );
          setCurrentGrid(nextStep.grid);
          setCascadeDropCounts(drops);
          setCascadeFallDistances(computeFallDistances(step.grid, nextStep.grid));
          setTileAnimationPhase('idle');
          soundFX.playDrop();
          await new Promise(r => setTimeout(r, turbo ? 200 : 380));
          setCascadeDropCounts([0, 0, 0, 0, 0, 0]);
          setCascadeFallDistances([]);
        }
      } else {
        setTileAnimationPhase('idle');
        await new Promise(r => setTimeout(r, turbo ? 140 : 250));
      }
    }

    setTileAnimationPhase('idle');
    setCascadeDropCounts([0, 0, 0, 0, 0, 0]);
    setCascadeFallDistances([]);
    setMultUsed([]);

    setLastWinAmount(spinResult.totalWin);
    if (spinResult.totalWin > 0) {
      soundFX.playWin(spinResult.totalWin / Math.max(1, spinResult.betAmount) > 5);
    }

    if (spinResult.freeSpinsState) {
      setFreeSpinsState({
        userId: user!.id,
        slotId: 'cocktail-nights',
        remaining: spinResult.freeSpinsState.remaining,
        total: spinResult.freeSpinsState.total,
        betAmount: spinResult.betAmount,
        totalWon: spinResult.freeSpinsState.totalWon
      });
    } else {
      setFreeSpinsState(null);
    }

    const winMultiplier = spinResult.totalWin / Math.max(1, spinResult.betAmount);
    if (winMultiplier >= 50) {
      soundFX.playBigWin();
      setBigWinOverlay({ amount: spinResult.totalWin, title: 'SUPER MEGA WIN 🍸' });
    } else if (winMultiplier >= 35) {
      soundFX.playBigWin();
      setBigWinOverlay({ amount: spinResult.totalWin, title: 'MEGA WIN 🍹' });
    } else if (winMultiplier >= 20) {
      soundFX.playBigWin();
      setBigWinOverlay({ amount: spinResult.totalWin, title: 'BIG WIN 🥂' });
    }

    if (spinResult.triggeredFreeSpins > 0 && !spinResult.isFreeSpin) {
      setFreeSpinsTriggeredModal(spinResult.triggeredFreeSpins);
    }

    setIsSpinning(false);

    if (autoSpinRef.current !== null && autoSpinRef.current > 0) {
      const nextCount = autoSpinRef.current - 1;
      setAutoSpinCount(nextCount > 0 ? nextCount : null);
      if (nextCount > 0) {
        setTimeout(() => {
          handleSpin();
        }, turbo ? 400 : 1000);
      }
    }
  };

  const handleSpin = (isBuyFeature = false) => {
    if (isSpinning) return;
    if (!user?.id) {
      alert('Vui lòng đăng nhập để chơi slot.');
      return;
    }

    const inFreeSpins = freeSpinsState && freeSpinsState.remaining > 0;
    const cost = isBuyFeature ? betAmount * 75 : inFreeSpins ? 0 : betAmount;

    if (cost > 0 && (user.balance ?? 0) < cost) {
      alert(`Số dư không đủ! Cần tối thiểu ${cost.toLocaleString()} 🪙 để quay.`);
      setAutoSpinCount(null);
      return;
    }

    scattersCountRef.current = 0;
    setLandedScattersCount(0);
    setAnticipatingCols([]);
    anticipatingColsRef.current = [];
    setIsSpinning(true);
    setLastWinAmount(0);
    setActiveWinningWaysCount(0);
    setActiveMultiplier(1);
    if (!inFreeSpins) {
      setMultValues([2, 2, 2, 2]);
      setMultUsed([]);
    }
    soundFX.playSpin();

    if (!socket) {
      setIsSpinning(false);
      return;
    }

    socket.emit(
      'slots:spin',
      {
        slotId: 'cocktail-nights',
        userId: user.id,
        betAmount,
        buyFeature: isBuyFeature
      },
      (res: { success: boolean; result?: SpinResult; message?: string }) => {
        if (!res.success || !res.result) {
          alert(res.message || 'Quay thất bại, vui lòng thử lại.');
          setIsSpinning(false);
          setAutoSpinCount(null);
          return;
        }
        const spinResult = res.result;
        pendingSpinResultRef.current = spinResult;
        runSpinSequence(spinResult);
      }
    );
  };

  const isFreeSpinActive = Boolean(freeSpinsState && freeSpinsState.remaining > 0);

  return (
    <div className="relative w-full max-w-5xl mx-auto flex flex-col items-center select-none text-white pb-12">
      {/* Background: cover neon mờ */}
      <div className="absolute inset-0 -z-10 overflow-hidden rounded-2xl pointer-events-none">
        <img
          src={COCKTAIL_COVER}
          alt=""
          draggable={false}
          className="w-full h-full object-cover opacity-40 blur-[2px] scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#120a24]/70 via-[#120a24]/55 to-[#120a24]/85" />
      </div>

      {/* Splash cover */}
      {showSplash && (
        <div
          onClick={() => setShowSplash(false)}
          className="fixed inset-0 z-[60] flex items-center justify-center cursor-pointer animate-fade-in"
          style={{
            backgroundImage: `url(${COCKTAIL_COVER})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="absolute inset-0 bg-black/25" />
          <div className="relative flex flex-col items-center gap-3 px-6 text-center">
            <img src={COCKTAIL_LOGO} alt="Cocktail Nights" draggable={false} className="w-64 sm:w-80 rounded-2xl border border-pink-400/50 drop-shadow-[0_6px_16px_rgba(0,0,0,0.7)] animate-pulse" />
            <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-pink-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              Chạm để bắt đầu
            </span>
          </div>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="w-full flex items-center justify-between px-3 py-2 border-b-2 border-pink-500/60 bg-gradient-to-r from-[#1b0f33] via-[#2b1650] to-[#1b0f33] rounded-t-2xl shadow-[0_4px_14px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-2">
          <img src={COCKTAIL_LOGO} alt="Cocktail Nights" draggable={false} className="h-9 sm:h-11 w-auto rounded-lg border border-pink-400/40 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />
          <div className="hidden xs:block sm:block">
            <div className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30 w-fit">
              PG SOFT
            </div>
            <p className="text-[11px] text-fuchsia-200/90 flex items-center gap-2 mt-0.5">
              <span>{liveWaysCount.toLocaleString()} Ways</span>
              <span>•</span>
              <span>RTP 96.75%</span>
            </p>
          </div>
        </div>

        {/* Top Controls */}
        <div className="flex items-center gap-2">
          {!isFreeSpinActive && (
            <button
              onClick={() => setShowBuyModal(true)}
              disabled={isSpinning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black text-xs bg-gradient-to-r from-fuchsia-600 via-pink-500 to-amber-400 text-white shadow-md shadow-pink-500/30 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              <span>MUA TÍNH NĂNG (75x)</span>
            </button>
          )}
          <button
            onClick={toggleSound}
            className="p-1.5 rounded-lg bg-[#241a3f]/80 hover:bg-[#2e214f] border border-pink-500/30 text-gray-300 hover:text-white transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-pink-400" /> : <VolumeX className="w-4 h-4 text-gray-500" />}
          </button>
          <button
            onClick={() => setShowHelpModal(true)}
            className="p-1.5 rounded-lg bg-[#241a3f]/80 hover:bg-[#2e214f] border border-pink-500/30 text-gray-300 hover:text-white transition-colors"
            title="Bảng Trả Thưởng & Luật"
          >
            <HelpCircle className="w-4 h-4 text-pink-400" />
          </button>
        </div>
      </div>

      {/* Free Spins panel: mult giữ nguyên suốt đợt */}
      {isFreeSpinActive && freeSpinsState && (
        <div className="w-full mt-2 px-2">
          <div className="bg-gradient-to-b from-fuchsia-800 via-[#3b1157] to-[#200a38] border-2 border-cyan-300/70 rounded-2xl py-2 px-4 flex items-center justify-between shadow-[0_0_25px_rgba(34,211,238,0.35)]">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-300 fill-amber-400" />
              <span className="text-xs sm:text-sm font-black uppercase text-cyan-100 tracking-wider drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)]">
                Free Spin {freeSpinsState.remaining} • Mult giữ nguyên
              </span>
            </div>
            <div className="text-xs sm:text-sm font-black text-amber-300">
              Tổng thắng: {(freeSpinsState.totalWon || 0).toLocaleString()} 🪙
            </div>
          </div>
        </div>
      )}

      {/* Main Cabinet */}
      <div className="w-full px-2 sm:px-4 mt-2">
        <div className="relative p-2 sm:p-4 pt-4 sm:pt-5 rounded-2xl bg-gradient-to-b from-[#1c1332]/95 via-[#120a24]/95 to-[#1c1332]/95 border-2 border-fuchsia-500/70 shadow-[0_12px_40px_rgba(0,0,0,0.9),0_0_25px_rgba(255,45,149,0.25)]">
          <div className="absolute top-1.5 left-1.5 w-4 h-4 border-t-2 border-l-2 border-pink-400 pointer-events-none" />
          <div className="absolute top-1.5 right-1.5 w-4 h-4 border-t-2 border-r-2 border-pink-400 pointer-events-none" />
          <div className="absolute bottom-1.5 left-1.5 w-4 h-4 border-b-2 border-l-2 border-pink-400 pointer-events-none" />
          <div className="absolute bottom-1.5 right-1.5 w-4 h-4 border-b-2 border-r-2 border-pink-400 pointer-events-none" />

          {/* Scatter live counter */}
          {landedScattersCount > 0 && (
            <div className="mb-2 flex items-center justify-center">
              <div
                className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-lg transition-all ${
                  landedScattersCount >= 4
                    ? 'bg-gradient-to-r from-amber-400 via-pink-500 to-amber-400 text-white animate-bounce ring-2 ring-yellow-300 shadow-[0_0_20px_rgba(244,63,94,0.8)]'
                    : 'bg-[#241a3f]/90 border border-cyan-400 text-cyan-200 animate-pulse'
                }`}
              >
                <span>🍸</span>
                <span>SCATTERS RƠI: {landedScattersCount} / 4</span>
                {landedScattersCount >= 4 ? (
                  <span className="font-extrabold uppercase">— KÍCH HOẠT FREE SPINS! 🔥</span>
                ) : (
                  <span className="text-[10px] text-cyan-300">(Cần thêm {4 - landedScattersCount})</span>
                )}
              </div>
            </div>
          )}

          {/* 6 cuộn 5 hàng */}
          <div className="grid grid-cols-6 gap-1 sm:gap-2 items-end justify-center">
            {currentGrid.map((column, colIdx) => (
              <ReelColumnView
                key={colIdx}
                colIdx={colIdx}
                height={REEL_HEIGHTS[colIdx]}
                visibleTiles={spinningCols[colIdx] && targetColumnTiles ? targetColumnTiles[colIdx] : column}
                isSpinning={spinningCols[colIdx]}
                spinDuration={reelSpinDurations[colIdx] || 380}
                isAnticipating={anticipatingCols.includes(colIdx)}
                animationPhase={tileAnimationPhase}
                cascadeDropCount={cascadeDropCounts[colIdx]}
                fallDistances={cascadeFallDistances[colIdx]}
                dummySymbols={COCKTAIL_DUMMY}
                goldCols={[1, 2, 3, 4]}
                renderTile={(tile, phase) => (
                  <CocktailNightsTile
                    tile={tile}
                    isWinning={tile.isWinning}
                    transformedToWild={tile.transformedToWild}
                    animationPhase={phase}
                    bgOverride={COLUMN_TINTS[colIdx]}
                  />
                )}
              />
            ))}
          </div>

          {/* Multiplier Reel dưới cuộn 2-5 (chuẩn PG Soft) */}
          <div className="grid grid-cols-6 gap-1 sm:gap-2 mt-1.5 px-0.5 items-center">
            <div className="flex items-center justify-center">
              <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-pink-300/90 text-center leading-tight">
                Mult
              </span>
            </div>
            {[0, 1, 2, 3].map(i => {
              const v = multValues[i] ?? 2;
              const used = multUsed.includes(i);
              return (
                <div
                  key={`mult-${i}-${v}`}
                  className={`relative rounded-xl border-2 flex flex-col items-center justify-center py-1 transition-all animate-fade-in ${
                    used
                      ? 'bg-gradient-to-b from-yellow-300 via-amber-400 to-amber-600 border-yellow-100 shadow-[0_0_18px_rgba(250,204,21,0.9)] scale-105'
                      : 'bg-gradient-to-b from-[#12283f] via-[#0d1c2e] to-[#091420] border-cyan-400/60 shadow-[0_0_12px_rgba(34,211,238,0.35)]'
                  }`}
                >
                  <span className="text-base sm:text-lg leading-none">🍸</span>
                  <span className={`text-xs sm:text-sm font-black leading-none mt-0.5 ${used ? 'text-red-900' : 'text-cyan-200'}`}>
                    x{v}
                  </span>
                  <span className="text-[7px] sm:text-[8px] font-bold text-gray-400 -mt-0.5">C{i + 2}</span>
                </div>
              );
            })}
            <div className="flex items-center justify-center">
              <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-amber-300/90 text-center leading-tight">
                x{activeMultiplier}
              </span>
            </div>
          </div>

          {/* Win banner */}
          <div className="w-full mt-3 mb-1 px-1 flex items-center justify-center">
            {lastWinAmount > 0 ? (
              <div className="relative w-full max-w-lg py-1.5 px-4 rounded-full bg-gradient-to-r from-fuchsia-600 via-pink-400 to-fuchsia-600 border-2 border-yellow-200 shadow-[0_0_18px_rgba(255,45,149,0.7)] flex items-center justify-center gap-2 animate-pulse">
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                  WIN {lastWinAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  {activeWinningWaysCount > 0 ? ` • ${activeWinningWaysCount.toLocaleString()} WAYS` : ''}
                </span>
              </div>
            ) : (
              <div className="relative w-full max-w-lg py-1.5 px-4 rounded-full bg-gradient-to-r from-[#12283f] via-cyan-800 to-[#12283f] border-2 border-cyan-400/70 shadow-[0_0_14px_rgba(34,211,238,0.4)] flex items-center justify-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-cyan-100">
                  Win up to 100,000x!
                </span>
                <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats pills */}
      <div className="w-full max-w-xl mx-auto px-2 mt-3 mb-2 grid grid-cols-3 gap-2">
        <div className="bg-[#150f26]/80 border border-fuchsia-500/40 rounded-xl px-2 py-1.5 flex flex-col items-center justify-center shadow-inner">
          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-gray-400 tracking-wider">Số Dư</span>
          <span className="text-xs sm:text-sm font-black text-pink-300 truncate max-w-full">
            {(user?.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowBetDrawer(!showBetDrawer)}
          disabled={isSpinning || isFreeSpinActive}
          className="bg-[#150f26]/80 hover:bg-[#1e1436] border border-cyan-400/60 rounded-xl px-2 py-1.5 flex flex-col items-center justify-center shadow-inner active:scale-95 transition-all group"
          title="Nhấn để đổi mức cược"
        >
          <div className="flex items-center gap-1">
            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-cyan-300 tracking-wider group-hover:text-cyan-100">
              Mức Cược
            </span>
          </div>
          <span className="text-xs sm:text-sm font-black text-white group-hover:text-cyan-200">
            {betAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </button>
        <div className="bg-[#150f26]/80 border border-fuchsia-500/40 rounded-xl px-2 py-1.5 flex flex-col items-center justify-center shadow-inner">
          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-gray-400 tracking-wider">Tiền Thắng</span>
          <span className={`text-xs sm:text-sm font-black truncate max-w-full ${lastWinAmount > 0 ? 'text-yellow-300 animate-pulse' : 'text-gray-300'}`}>
            {lastWinAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Bet drawer */}
      {showBetDrawer && (
        <div className="w-full max-w-xl mx-auto px-2 mb-3 animate-fade-in">
          <div className="bg-[#150f26]/95 border border-cyan-400/50 rounded-2xl p-3 shadow-2xl flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-300 uppercase">💰 Chọn Mức Cược Nhanh</span>
              <button onClick={() => setShowBetDrawer(false)} className="text-gray-400 hover:text-white p-1 text-xs">
                ✕ Đóng
              </button>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
              {BET_PRESETS.map(amt => (
                <button
                  key={amt}
                  disabled={isSpinning || isFreeSpinActive}
                  onClick={() => {
                    setBetAmount(amt);
                    setShowBetDrawer(false);
                  }}
                  className={`py-1.5 px-1 rounded-lg text-xs font-black transition-all ${
                    betAmount === amt
                      ? 'bg-gradient-to-r from-fuchsia-500 to-pink-400 text-white shadow-md ring-1 ring-pink-300'
                      : 'bg-[#241a3f] hover:bg-[#2e214f] text-gray-300 border border-gray-700'
                  }`}
                >
                  {amt >= 1000 ? `${amt / 1000}k` : amt}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-gray-800">
              <span className="text-xs text-gray-400 font-semibold">Nhập cược tuỳ ý:</span>
              <div className="flex-1 flex items-center bg-[#241a3f] border border-cyan-400/40 rounded-lg px-2 py-1">
                <input
                  type="number"
                  min="10"
                  value={betAmount}
                  disabled={isSpinning || isFreeSpinActive}
                  onChange={e => {
                    const val = Math.max(10, Math.floor(Number(e.target.value) || 10));
                    setBetAmount(val);
                  }}
                  className="w-full bg-transparent font-black text-cyan-200 text-sm outline-none"
                />
                <span className="text-xs text-cyan-300">🪙</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="w-full max-w-xl mx-auto px-4 mt-2 flex items-center justify-between">
        <button
          disabled={isSpinning}
          onClick={() => setTurbo(!turbo)}
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex flex-col items-center justify-center border-2 transition-all active:scale-90 ${
            turbo
              ? 'bg-pink-500/30 border-pink-400 text-pink-200 shadow-[0_0_12px_rgba(255,45,149,0.6)]'
              : 'bg-[#1a1230]/90 hover:bg-[#241a3f] border-pink-900/50 text-gray-400 hover:text-gray-200 shadow-md'
          }`}
          title="Chế độ Turbo (Quay nhanh)"
        >
          <Zap className={`w-4 h-4 sm:w-5 sm:h-5 ${turbo ? 'fill-pink-400 text-pink-400 animate-pulse' : ''}`} />
          <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-tight mt-0.5">TURBO</span>
        </button>

        <button
          disabled={isSpinning || isFreeSpinActive}
          onClick={handleDecreaseBet}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-b from-[#2a1f4d] to-[#1a1230] hover:from-[#352763] hover:to-[#241a3f] border-2 border-cyan-500/60 shadow-lg text-cyan-300 hover:text-cyan-100 font-black text-xl sm:text-2xl flex items-center justify-center active:scale-90 transition-all disabled:opacity-40"
          title="Giảm mức cược"
        >
          −
        </button>

        <button
          disabled={isSpinning && autoSpinCount === null}
          onClick={() => handleSpin(false)}
          className={`relative group w-18 h-18 sm:w-20 sm:h-20 rounded-full flex items-center justify-center font-black transition-all active:scale-95 ${
            isSpinning
              ? 'bg-gray-800 border-4 border-gray-600 text-gray-500 cursor-not-allowed shadow-inner'
              : isFreeSpinActive
              ? 'bg-gradient-to-b from-fuchsia-500 via-pink-600 to-fuchsia-800 text-white border-4 border-cyan-300 shadow-[0_0_25px_rgba(34,211,238,0.8)] ring-4 ring-pink-400/50'
              : 'bg-gradient-to-b from-fuchsia-500 via-pink-600 to-purple-800 text-white border-4 border-pink-300 shadow-[0_0_30px_rgba(255,45,149,0.7)] ring-4 ring-fuchsia-500/40 hover:scale-105'
          }`}
          title={isSpinning ? 'Đang quay...' : 'Bấm để Quay!'}
        >
          <div className="absolute inset-1.5 rounded-full border border-pink-200/40 pointer-events-none" />
          <svg viewBox="0 0 100 100" className="w-9 h-9 sm:w-10 sm:h-10 text-white filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" fill="currentColor">
            <path d="M50 15 A35 35 0 0 1 85 50 L75 50 A25 25 0 0 0 50 25 L50 35 L35 20 L50 5 Z" />
            <path d="M50 85 A35 35 0 0 1 15 50 L25 50 A25 25 0 0 0 50 75 L50 65 L65 80 L50 95 Z" />
          </svg>
        </button>

        <button
          disabled={isSpinning || isFreeSpinActive}
          onClick={handleIncreaseBet}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-b from-[#2a1f4d] to-[#1a1230] hover:from-[#352763] hover:to-[#241a3f] border-2 border-cyan-500/60 shadow-lg text-cyan-300 hover:text-cyan-100 font-black text-xl sm:text-2xl flex items-center justify-center active:scale-90 transition-all disabled:opacity-40"
          title="Tăng mức cược"
        >
          +
        </button>

        <AutoSpinMenu
          variant="round"
          active={autoSpinCount !== null}
          remaining={autoSpinCount}
          disabled={isSpinning && autoSpinCount === null}
          onSelect={count => {
            setAutoSpinCount(count);
            handleSpin();
          }}
          onStop={() => setAutoSpinCount(null)}
        />
      </div>

      {/* Feature Buy Modal */}
      {showBuyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-gradient-to-b from-[#241a3f] to-[#120a24] border-2 border-pink-500/60 rounded-2xl p-5 shadow-2xl text-center">
            <button
              onClick={() => setShowBuyModal(false)}
              className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-white rounded-lg bg-gray-800"
            >
              <X className="w-4 h-4" />
            </button>
            <img src={COCKTAIL_LOGO} alt="Cocktail Nights" draggable={false} className="h-14 w-auto mx-auto mb-2 rounded-lg border border-pink-400/40" />
            <h3 className="text-lg font-black uppercase text-pink-300">Mua Vòng Quay Neon</h3>
            <p className="text-xs text-gray-300 mt-1 mb-4">
              Kích hoạt ngay <strong>10 Vòng Quay Miễn Phí</strong> với <strong>4 SCATTER</strong> đảm bảo,
              multiplier reel giữ nguyên suốt đợt!
            </p>
            <div className="bg-black/50 border border-pink-500/30 rounded-xl p-3 mb-5">
              <span className="text-xs text-gray-400">Chi phí mua (75x mức cược):</span>
              <div className="text-2xl font-black text-pink-300 mt-0.5">
                {(betAmount * 75).toLocaleString()} 🪙
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowBuyModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs transition-colors"
              >
                HỦY
              </button>
              <button
                onClick={() => {
                  setShowBuyModal(false);
                  handleSpin(true);
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 via-pink-500 to-amber-400 hover:brightness-110 text-white font-black text-xs uppercase shadow-lg shadow-pink-500/30 active:scale-95 transition-all"
              >
                XÁC NHẬN MUA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Free Spins Triggered Modal */}
      {freeSpinsTriggeredModal !== null && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl overflow-hidden bg-gradient-to-b from-[#241a3f] via-[#3b1157] to-[#120a24] border-2 border-cyan-300 shadow-[0_0_50px_rgba(34,211,238,0.5)] text-center">
            <img src={COCKTAIL_COVER} alt="Cocktail Nights" draggable={false} className="w-full h-32 object-cover object-top" />
            <div className="p-5">
              <h2 className="text-xl font-black text-pink-300 mb-1">COCKTAIL TIME! 🍸</h2>
              <p className="text-sm font-bold text-cyan-200 mb-4">
                ĐÃ KÍCH HOẠT {freeSpinsTriggeredModal} VÒNG QUAY MIỄN PHÍ!
              </p>
              <div className="p-3 rounded-2xl bg-black/40 border border-cyan-400/50 mb-5 text-xs text-gray-300 space-y-1">
                <div>⚡ Multiplier reel <strong className="text-cyan-300">KHÔNG reset</strong> suốt đợt quay!</div>
                <div>⚡ Wild thắng đâu, cộng mult dưới cuộn đó!</div>
                <div>⚡ Mult đã dùng bị hủy, mult lớn hơn tràn vào!</div>
              </div>
              <button
                onClick={() => setFreeSpinsTriggeredModal(null)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 via-pink-500 to-amber-400 text-white font-black text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(255,45,149,0.6)]"
              >
                BẮT ĐẦU NGAY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Big Win Modal */}
      {bigWinOverlay !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in"
          onClick={() => setBigWinOverlay(null)}
        >
          <div className="relative w-full max-w-sm bg-gradient-to-b from-[#241a3f] via-[#3b1157] to-[#120a24] border-2 border-pink-400 rounded-3xl p-6 text-center shadow-[0_0_60px_rgba(255,45,149,0.6)]">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-fuchsia-500 to-amber-300 flex items-center justify-center mx-auto mb-3 shadow-[0_0_30px_rgba(255,45,149,0.8)] animate-pulse">
              <Award className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-pink-300 uppercase tracking-widest mb-1">
              {bigWinOverlay.title}
            </h2>
            <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 bg-clip-text text-transparent my-4">
              +{bigWinOverlay.amount.toLocaleString()} 🪙
            </div>
            <button
              onClick={() => setBigWinOverlay(null)}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 via-pink-400 to-fuchsia-500 text-white font-black text-sm uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-lg"
            >
              THU TIỀN
            </button>
          </div>
        </div>
      )}

      {/* Paytable & Rules Modal (ảnh gốc PG Soft) */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-3xl p-5 bg-gradient-to-b from-[#1c1332] to-[#120a24] border-2 border-fuchsia-500/60 text-gray-200 relative">
            <button
              onClick={() => setShowHelpModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white z-10"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-black text-pink-300 mb-3 flex items-center gap-2">
              <span>🍸</span> Hướng Dẫn Chơi Cocktail Nights
            </h3>

            <div className="mb-3 rounded-2xl overflow-hidden border border-fuchsia-500/50">
              <img src={COCKTAIL_PAYTABLE_IMG} alt="Bảng trả thưởng gốc PG Soft" draggable={false} className="w-full h-auto" />
            </div>
            <div className="mb-4 rounded-2xl overflow-hidden border border-fuchsia-500/50">
              <img src={COCKTAIL_RULES_IMG} alt="Cách tính ways gốc PG Soft" draggable={false} className="w-full h-auto" />
            </div>

            <div className="space-y-4 text-xs">
              <section className="p-3 rounded-2xl bg-black/40 border border-fuchsia-900/60">
                <h4 className="font-black text-amber-300 mb-1">Cơ Chế Wilds Nền Vàng</h4>
                <p className="text-gray-400 leading-relaxed">
                  Ở các cuộn 2, 3, 4, 5, khối stacked (1 symbol chiếm 2-4 ô) có thể có <strong>nền VÀNG</strong>.
                  Khi khối nền vàng tham gia thắng, cả khối hóa thành <strong>WILD</strong> ở đợt rơi tiếp theo!
                </p>
              </section>

              <section className="p-3 rounded-2xl bg-black/40 border border-fuchsia-900/60">
                <h4 className="font-black text-cyan-300 mb-1">Multiplier Reel Dưới Cuộn 2-5</h4>
                <p className="text-gray-400 leading-relaxed">
                  Mỗi lượt quay bắt đầu với <strong>4 giá trị x2</strong>. Wild thắng ở cuộn nào thì
                  <strong> cộng dồn mult dưới các cuộn đó</strong> rồi nhân vào tiền thắng.
                  Mult đã dùng bị hủy, mult lớn hơn tràn vào từ bên phải.
                  Trong Free Spins mult <strong>KHÔNG reset</strong>!
                </p>
              </section>

              <section className="p-3 rounded-2xl bg-black/40 border border-fuchsia-900/60">
                <h4 className="font-black text-pink-300 mb-1">Free Spins & Mua Tính Năng</h4>
                <p className="text-gray-400 leading-relaxed">
                  Xuất hiện <strong>4 SCATTER</strong> nhận <strong>10 Vòng Quay Miễn Phí</strong> (+2 lượt mỗi SCATTER thừa,
                  retrigger cộng dồn). Mua trực tiếp giá 75x mức cược.
                  Lưới 6x5, ways dao động <strong>400 - 15,625</strong> (stacked tính 1).
                </p>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
