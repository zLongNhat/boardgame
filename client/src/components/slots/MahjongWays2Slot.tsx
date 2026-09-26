import React, { useState, useEffect, useRef } from 'react';
import {
  Flame,
  Volume2,
  VolumeX,
  Zap,
  RotateCcw,
  HelpCircle,
  X,
  Play,
  Pause,
  Award
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useGameSocketContext } from '../../hooks/GameSocketContext';
import { CascadeStep, FreeSpinsState, SpinResult, SlotTile, SlotSymbolId } from '../../types/game';
import { TileAnimationPhase } from './WildBountySymbols';
import { MahjongTile } from './MahjongWays2Symbols';
import { ReelColumnView } from './ReelColumnView';

const REEL_HEIGHTS = [4, 5, 5, 5, 4];
const BASE_MULTIPLIERS = [1, 2, 3, 5];
const FREE_MULTIPLIERS = [2, 4, 6, 10];
const BET_PRESETS = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
const MAHJONG_DUMMY: SlotSymbolId[] = [
  'mj_bamboo2',
  'mj_dots3',
  'mj_bamboo5',
  'mj_dots5',
  'mj_char8',
  'mj_white',
  'mj_red',
  'mj_green',
  'scatter',
  'mj_dots5',
  'mj_char8',
  'mj_bamboo2'
];

// Lightweight Web Audio synthesizer for Mahjong pentatonic effects
class MahjongSoundFX {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  playSpin() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    } catch {}
  }

  playGunshot() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 0.12;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(80, now + 0.12);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      whiteNoise.start(now);
    } catch {}
  }

  playWin() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    const ctx = this.ctx;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const time = ctx.currentTime + idx * 0.08;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.2);
      });
    } catch {}
  }

  playShatter() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    const ctx = this.ctx;
    try {
      const now = ctx.currentTime;
      const bufferSize = ctx.sampleRate * 0.14;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.frequency.exponentialRampToValueAtTime(3200, now + 0.14);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
    } catch {}
  }

  playDrop() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    const ctx = this.ctx;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {}
  }

  playGoldMorph() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    const ctx = this.ctx;
    try {
      const notes = [659.25, 880, 1046.5, 1318.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const time = ctx.currentTime + idx * 0.05;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.18, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.18);
      });
    } catch {}
  }

  playReelClack(colIdx: number) {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    const ctx = this.ctx;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const baseFreq = 140 + colIdx * 15;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch {}
  }

  playScatterLand(scatterIndex: number) {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    const ctx = this.ctx;
    try {
      const freqs = [523.25, 659.25, 783.99, 1046.5];
      const targetFreq = freqs[Math.min(scatterIndex, freqs.length - 1)];

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(targetFreq, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  }

  playAnticipation() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    const ctx = this.ctx;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(440, ctx.currentTime + 0.6);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {}
  }
}

const soundFX = new MahjongSoundFX();

export const MahjongWays2Slot: React.FC = () => {
  const { user } = useAuth();
  const { socket } = useGameSocketContext();

  const [betAmount, setBetAmount] = useState(20);
  const [isSpinning, setIsSpinning] = useState(false);
  const [turbo, setTurbo] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoSpinCount, setAutoSpinCount] = useState<number | null>(null);

  // Free spins
  const [freeSpinsState, setFreeSpinsState] = useState<FreeSpinsState | null>(null);

  // Active grid and multiplier display
  const [currentGrid, setCurrentGrid] = useState<CascadeStep['grid']>(() =>
    REEL_HEIGHTS.map((h, colIdx) =>
      Array.from({ length: h }, (_, rowIdx) => ({
        id: `init_${colIdx}_${rowIdx}`,
        symbol: (['mj_green', 'mj_red', 'mj_white', 'mj_char8', 'mj_dots5'] as SlotSymbolId[])[(colIdx + rowIdx) % 5],
        isGold: colIdx >= 1 && colIdx <= 3 && rowIdx === 1
      }))
    )
  );
  const [activeMultiplier, setActiveMultiplier] = useState(1);
  const [lastWinAmount, setLastWinAmount] = useState(0);
  const [activeWinningWaysCount, setActiveWinningWaysCount] = useState(0);

  // Shatter & Cascade animation states
  const [tileAnimationPhase, setTileAnimationPhase] = useState<TileAnimationPhase>('idle');
  const [isScreenShaking, setIsScreenShaking] = useState(false);

  // Top-to-Bottom Sequential Reel Rolling & Scatter Drop states
  const [spinningCols, setSpinningCols] = useState<boolean[]>([false, false, false, false, false]);
  const [targetColumnTiles, setTargetColumnTiles] = useState<SlotTile[][] | null>(null);
  const [cascadeDropCounts, setCascadeDropCounts] = useState<number[]>([0, 0, 0, 0, 0]);
  // Khoảng rơi từng ô (số bước ô) cho cascade: ô dưới điểm vỡ = 0 (đứng yên),
  // ô trên điểm vỡ + ô mới > 0 (rơi thẳng xuống, không nảy).
  const [cascadeFallDistances, setCascadeFallDistances] = useState<number[][]>([]);
  const [anticipatingCols, setAnticipatingCols] = useState<number[]>([]);
  const [landedScattersCount, setLandedScattersCount] = useState(0);
  const [reelSpinDurations, setReelSpinDurations] = useState<number[]>([380, 380, 380, 380, 380]);

  const pendingSpinResultRef = useRef<SpinResult | null>(null);
  const scattersCountRef = useRef(0);
  const anticipatingColsRef = useRef<number[]>([]);

  // Tính khoảng rơi từng ô: row 0 = đỉnh. Ô dưới ô vỡ thấp nhất giữ nguyên (0),
  // ô sống phía trên + ô mới rơi thẳng xuống theo trọng lực.
  const computeFallDistances = (oldGrid: SlotTile[][], newGrid: SlotTile[][]): number[][] => {
    return oldGrid.map((oldCol, c) => {
      const newCol = newGrid[c] || [];
      const needed = oldCol.filter(t => t.isWinning && !t.isGold).length;
      if (needed === 0) return newCol.map(() => 0);
      const survivorOldIdx: number[] = [];
      oldCol.forEach((t, idx) => {
        if (!(t.isWinning && !t.isGold)) survivorOldIdx.push(idx);
      });
      const falls: number[] = [];
      for (let i = 0; i < newCol.length; i++) {
        if (i < needed) {
          // Ô mới từ trên trần rơi vào: ô đỉnh rơi xa nhất
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

  // Reel landing handler for an individual column
  const handleReelLanded = (colIdx: number, targetGrid: SlotTile[][]) => {
    soundFX.playReelClack(colIdx);

    // Persist target tiles into currentGrid for this column
    setCurrentGrid(prev => {
      const next = [...prev];
      next[colIdx] = targetGrid[colIdx];
      return next;
    });

    // Check if any scatter landed on this stopped column
    const scattersInThisCol = targetGrid[colIdx].filter(t => t.symbol === 'scatter').length;
    if (scattersInThisCol > 0) {
      scattersCountRef.current += scattersInThisCol;
      setLandedScattersCount(scattersCountRef.current);
      soundFX.playScatterLand(scattersCountRef.current);

      // If 2 scatters have landed and there are remaining reels, trigger anticipation!
      if (scattersCountRef.current >= 2 && colIdx < 4) {
        const remaining = Array.from({ length: 4 - colIdx }, (_, i) => colIdx + 1 + i);
        setAnticipatingCols(remaining);
        anticipatingColsRef.current = remaining;
        soundFX.playAnticipation();
      }
    }
  };

  // Run sequential reel-by-reel spin animation
  const runSpinSequence = async (spinResult: SpinResult) => {
    const targetGrid = spinResult.cascades[0].grid;
    setTargetColumnTiles(targetGrid);

    if (turbo) {
      // In Turbo mode: rapid sequential (120ms each)
      for (let c = 0; c < 5; c++) {
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
      // In Normal mode: từng cột quay một
      // Column 0 -> Column 1 -> Column 2 -> Column 3 -> Column 4
      for (let c = 0; c < 5; c++) {
        const isAnticipating = anticipatingColsRef.current.includes(c);
        const duration = isAnticipating ? 680 : 380;

        setReelSpinDurations(prev => {
          const next = [...prev];
          next[c] = duration;
          return next;
        });

        // Start spinning column c
        setSpinningCols(prev => {
          const next = [...prev];
          next[c] = true;
          return next;
        });

        // Wait for this column's strip to roll down and land
        await new Promise(r => setTimeout(r, duration));

        // Stop column c and commit its landed tiles
        setSpinningCols(prev => {
          const next = [...prev];
          next[c] = false;
          return next;
        });
        handleReelLanded(c, targetGrid);

        // Subtle mechanical pause before next column spins
        await new Promise(r => setTimeout(r, 70));
      }
    }

    setTargetColumnTiles(null);
    setAnticipatingCols([]);
    anticipatingColsRef.current = [];

    // Pause before cascades begin
    await new Promise(r => setTimeout(r, turbo ? 100 : 250));
    animateCascades(spinResult);
  };

  // Modals
  const [showPaytableModal, setShowPaytableModal] = useState(false);
  const [bigWinOverlay, setBigWinOverlay] = useState<{ amount: number; title: string } | null>(null);
  const [freeSpinsWonModal, setFreeSpinsWonModal] = useState<number | null>(null);

  const autoSpinRef = useRef<number | null>(null);
  autoSpinRef.current = autoSpinCount;

  // Toggle sound
  const toggleSound = () => {
    soundFX.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
  };

  // Fetch free spins state on mount
  useEffect(() => {
    if (socket && user?.id) {
      socket.emit('slots:free-spins', { slotId: 'mahjong-ways-2', userId: user.id }, (res: any) => {
        if (res?.success && res.freeSpins) {
          setFreeSpinsState(res.freeSpins);
          setActiveMultiplier(2);
        }
      });
    }
  }, [socket, user?.id]);

  // Main spin handler (Mahjong Ways 2 gốc không có Mua Free Spins)
  const handleSpin = () => {
    if (isSpinning || !user?.id) return;

    const inFreeSpins = freeSpinsState && freeSpinsState.remaining > 0;
    const cost = inFreeSpins ? 0 : betAmount;

    if (cost > 0 && (user.balance ?? 0) < cost) {
      alert(`Số dư không đủ! Cần ${cost.toLocaleString()} 🪙 để quay.`);
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
    setActiveMultiplier(inFreeSpins ? 2 : 1);
    soundFX.playSpin();

    if (!socket) {
      setIsSpinning(false);
      return;
    }

    socket.emit(
      'slots:spin',
      {
        slotId: 'mahjong-ways-2',
        userId: user.id,
        betAmount,
        buyFeature: false
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

  // Play through cascading steps with authentic PG Soft shatter & continuous strip drop animations
  const animateCascades = async (spinResult: SpinResult) => {
    const cascades = spinResult.cascades;

    for (let i = 0; i < cascades.length; i++) {
      const step = cascades[i];
      setCurrentGrid(step.grid);
      setActiveMultiplier(step.multiplier);
      setActiveWinningWaysCount(step.winningWays.length);

      if (step.winningWays.length > 0) {
        // Phase 1: Items connect into winning paylines with golden pulsing aura
        setTileAnimationPhase('connecting');
        soundFX.playWin();
        setLastWinAmount(step.totalWinSoFar);
        await new Promise(r => setTimeout(r, turbo ? 200 : 420));

        // Phase 2: Gunshot impact strike & non-gold winning items shatter into glass fragments & vanish
        setTileAnimationPhase('shattering');
        setIsScreenShaking(true);
        soundFX.playGunshot();
        soundFX.playShatter();

        const hasGoldWinner = step.grid.some(col => col.some(t => t.isWinning && t.isGold));
        if (hasGoldWinner) {
          soundFX.playGoldMorph();
        }

        setTimeout(() => setIsScreenShaking(false), 240);
        // Wait for shatter explode animation (0.45s) to finish scaling down to 0
        await new Promise(r => setTimeout(r, turbo ? 260 : 460));

        // Phase 3: Ô phía trên điểm vỡ rơi thẳng xuống (chỉ rơi, không nảy)
        // Ô dưới điểm vỡ thấp nhất đứng yên 100%, không áp animation.
        const nextStep = cascades[i + 1];
        if (nextStep) {
          // Calculate how many non-gold winning tiles vanished in each column
          const drops = step.grid.map(col =>
            col.filter(t => t.isWinning && !t.isGold).length
          );

          // Update grid to next step and trigger per-tile translateY fall
          setCurrentGrid(nextStep.grid);
          setCascadeDropCounts(drops);
          setCascadeFallDistances(computeFallDistances(step.grid, nextStep.grid));
          setTileAnimationPhase('idle');
          soundFX.playDrop();

          // Wait for gravity fall only (no bounce-up)
          await new Promise(r => setTimeout(r, turbo ? 200 : 380));
          // Reset drop counts so next cascade step can trigger fresh
          setCascadeDropCounts([0, 0, 0, 0, 0]);
          setCascadeFallDistances([]);
        }
      } else {
        setTileAnimationPhase('idle');
        await new Promise(r => setTimeout(r, turbo ? 140 : 250));
      }
    }

    setTileAnimationPhase('idle');
    setCascadeDropCounts([0, 0, 0, 0, 0]);
    setCascadeFallDistances([]);

    // Finalize spin
    setLastWinAmount(spinResult.totalWin);
    if (spinResult.totalWin > 0) {
      soundFX.playWin();
    }

    // Free spins updates
    if (spinResult.freeSpinsState) {
      setFreeSpinsState({
        userId: user!.id,
        slotId: 'mahjong-ways-2',
        remaining: spinResult.freeSpinsState.remaining,
        total: spinResult.freeSpinsState.total,
        betAmount: spinResult.betAmount,
        totalWon: spinResult.freeSpinsState.totalWon
      });
    } else {
      setFreeSpinsState(null);
    }

    // Big win check
    const winMultiplier = spinResult.totalWin / spinResult.betAmount;
    if (winMultiplier >= 100) {
      setBigWinOverlay({ amount: spinResult.totalWin, title: 'SUPER MEGA WIN 💥' });
    } else if (winMultiplier >= 40) {
      setBigWinOverlay({ amount: spinResult.totalWin, title: 'MEGA WIN 🤠' });
    } else if (winMultiplier >= 15) {
      setBigWinOverlay({ amount: spinResult.totalWin, title: 'BIG WIN 💰' });
    }

    // Trigger Free Spins modal
    if (spinResult.triggeredFreeSpins > 0) {
      setFreeSpinsWonModal(spinResult.triggeredFreeSpins);
    }

    setIsSpinning(false);

    // Auto spin continuation
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

  const isFreeSpinActive = Boolean(freeSpinsState && freeSpinsState.remaining > 0);

  return (
    <div className="relative w-full max-w-5xl mx-auto flex flex-col items-center select-none text-white pb-12">
      {/* Background Ambience */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950/50 via-gray-950/90 to-gray-950 rounded-2xl pointer-events-none" />

      {/* Top Header & Badges */}
      <div className="w-full flex items-center justify-between px-3 py-2 border-b border-emerald-900/40 bg-gray-950/60 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-700 to-yellow-400 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <span className="text-base">🀄</span>
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
              Mahjong Ways 2
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                PG SOFT
              </span>
            </h1>
            <p className="text-[11px] text-gray-400 flex items-center gap-2">
              <span>2,000 Cách Thắng</span>
              <span>•</span>
              <span>RTP 96.95%</span>
            </p>
          </div>
        </div>

        {/* Top Controls: Sound, Help (bản gốc không có Mua Free Spins) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPaytableModal(true)}
            className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white transition-colors"
            title="Bảng Trả Thưởng & Luật"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            onClick={toggleSound}
            className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white transition-colors"
            title="Âm thanh"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Free Spins Notification Bar (If active) */}
      {isFreeSpinActive && freeSpinsState && (
        <div className="w-full bg-gradient-to-r from-rose-900/80 via-amber-800/80 to-rose-900/80 border-y border-amber-500/50 py-2 px-4 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-yellow-300 fill-yellow-400" />
            <span className="text-xs sm:text-sm font-black uppercase text-yellow-200 tracking-wider">
              VÒNG QUAY MIỄN PHÍ: {freeSpinsState.total - freeSpinsState.remaining + 1} / {freeSpinsState.total}
            </span>
          </div>
          <div className="text-xs sm:text-sm font-black text-yellow-300">
            Tổng thắng: {(freeSpinsState.totalWon || 0).toLocaleString()} 🪙
          </div>
        </div>
      )}

      {/* Mahjong Multiplier Ladder (chuẩn PG: base x1-x2-x3-x5, free x2-x4-x6-x10) */}
      <div className="w-full my-3 px-2">
        <div className="bg-gray-950/80 border border-emerald-900/50 rounded-xl p-2 shadow-inner">
          <div className="text-[10px] uppercase font-bold text-emerald-400/80 text-center mb-1 flex items-center justify-center gap-1">
            <Flame className="w-3 h-3 text-emerald-500" />
            <span>{isFreeSpinActive ? 'Hệ Số Free Spins (x2 ➔ x10)' : 'Hệ Số Thắng Cuộc (x1 ➔ x5)'}</span>
          </div>
          <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar py-1">
            {(isFreeSpinActive ? FREE_MULTIPLIERS : BASE_MULTIPLIERS).map(m => {
              const isActive = activeMultiplier === m;
              return (
                <div
                  key={m}
                  className={`flex-1 min-w-[32px] sm:min-w-[42px] py-1 rounded text-center font-black text-[10px] sm:text-xs transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-b from-yellow-400 via-amber-500 to-amber-700 text-gray-950 scale-110 shadow-[0_0_15px_rgba(250,204,21,0.9)] ring-2 ring-yellow-200 font-extrabold'
                      : activeMultiplier > m
                      ? 'bg-amber-950/40 text-amber-600/70 border border-amber-900/30'
                      : 'bg-gray-900/50 text-gray-500 border border-gray-800/40'
                  }`}
                >
                  x{m}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mahjong Jade 5-Reel Grid Frame (4-5-5-5-4) */}
      <div className="w-full px-2 sm:px-4">
        <div
          className={`relative p-2 sm:p-4 rounded-2xl bg-gradient-to-b from-emerald-950/60 via-stone-900/90 to-black border-2 border-emerald-700/60 shadow-[0_10px_35px_rgba(0,0,0,0.8)] transition-transform duration-100 ${
            isScreenShaking ? 'animate-screen-shake' : ''
          }`}
        >
          {/* Jade corner accents */}
          <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-emerald-400 pointer-events-none" />
          <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-emerald-400 pointer-events-none" />
          <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-emerald-400 pointer-events-none" />
          <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-emerald-400 pointer-events-none" />

          {/* Scatter Landing Live Counter Banner (Trôi từ trên xuống cũng tính) */}
          {landedScattersCount > 0 && (
            <div className="mb-2 flex items-center justify-center">
              <div
                className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-lg transition-all ${
                  landedScattersCount >= 3
                    ? 'bg-gradient-to-r from-yellow-400 via-rose-500 to-amber-500 text-gray-950 animate-bounce ring-2 ring-yellow-300 shadow-[0_0_20px_rgba(244,63,94,0.8)]'
                    : 'bg-rose-950/90 border border-rose-500 text-rose-200 animate-pulse'
                }`}
              >
                <span>🀄</span>
                <span>SCATTERS RƠI: {landedScattersCount} / 3</span>
                {landedScattersCount >= 3 ? (
                  <span className="font-extrabold uppercase">— KÍCH HOẠT FREE SPINS! 🔥</span>
                ) : (
                  <span className="text-[10px] text-rose-300">(Cần thêm {3 - landedScattersCount})</span>
                )}
              </div>
            </div>
          )}

          {/* 5 Sequential Reels (4-5-5-5-4) */}
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2 items-center justify-center">
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
                dummySymbols={MAHJONG_DUMMY}
                goldCols={[1, 2, 3]}
                renderTile={(tile, phase) => (
                  <MahjongTile
                    symbol={tile.symbol}
                    isGold={tile.isGold}
                    isWinning={tile.isWinning}
                    transformedToWild={tile.transformedToWild}
                    animationPhase={phase}
                  />
                )}
              />
            ))}
          </div>

          {/* Win Ticker Overlay Bar */}
          <div className="mt-3 flex items-center justify-between px-3 py-1.5 bg-black/60 rounded-xl border border-amber-900/40">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400">Cách thắng:</span>
              <span className="font-black text-amber-400">{activeWinningWaysCount} ways</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Tiền thắng:</span>
              <span className="font-black text-base sm:text-lg text-yellow-400">
                {lastWinAmount > 0 ? `+${lastWinAmount.toLocaleString()}` : '0'} 🪙
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Betting & Spin Controls */}
      <div className="w-full mt-4 px-2 sm:px-4">
        <div className="bg-gray-950/90 border border-gray-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xl">
          {/* Bet Amount Selector */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase text-gray-400">Mức Cược</span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={isSpinning || isFreeSpinActive}
                onClick={() => {
                  const idx = BET_PRESETS.indexOf(betAmount);
                  if (idx > 0) {
                    setBetAmount(BET_PRESETS[idx - 1]);
                  } else if (betAmount > 1000000) {
                    setBetAmount(Math.max(1000000, betAmount - 500000));
                  } else if (betAmount > 100000) {
                    setBetAmount(Math.max(100000, betAmount - 100000));
                  } else if (betAmount > 10000) {
                    setBetAmount(Math.max(10000, betAmount - 10000));
                  } else if (betAmount > 1000) {
                    setBetAmount(Math.max(1000, betAmount - 1000));
                  } else if (betAmount > 100) {
                    setBetAmount(Math.max(100, betAmount - 100));
                  } else {
                    setBetAmount(Math.max(10, betAmount - 10));
                  }
                }}
                className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 font-black text-sm flex items-center justify-center border border-gray-700"
              >
                -
              </button>
              <div className="px-3 py-1 bg-gray-900 border border-amber-500/40 rounded-lg min-w-[90px] text-center flex items-center justify-center">
                <input
                  type="number"
                  min={10}
                  value={betAmount}
                  disabled={isSpinning || isFreeSpinActive}
                  onChange={(e) => setBetAmount(Math.max(10, Math.floor(Number(e.target.value) || 10)))}
                  className="w-20 bg-transparent font-black text-amber-300 text-sm sm:text-base text-center outline-none"
                />
                <span className="text-[10px] text-gray-400 ml-1">🪙</span>
              </div>
              <button
                disabled={isSpinning || isFreeSpinActive}
                onClick={() => {
                  const idx = BET_PRESETS.indexOf(betAmount);
                  if (idx !== -1 && idx < BET_PRESETS.length - 1) {
                    setBetAmount(BET_PRESETS[idx + 1]);
                  } else if (betAmount < 100) {
                    setBetAmount(betAmount + 10);
                  } else if (betAmount < 1000) {
                    setBetAmount(betAmount + 100);
                  } else if (betAmount < 10000) {
                    setBetAmount(betAmount + 1000);
                  } else if (betAmount < 100000) {
                    setBetAmount(betAmount + 10000);
                  } else if (betAmount < 1000000) {
                    setBetAmount(betAmount + 100000);
                  } else {
                    setBetAmount(betAmount + 500000);
                  }
                }}
                className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 font-black text-sm flex items-center justify-center border border-gray-700"
              >
                +
              </button>
            </div>
          </div>

          {/* Quick Bet Presets (Desktop) */}
          <div className="hidden lg:flex items-center gap-1">
            {[10, 50, 100, 500, 1000].map(amt => (
              <button
                key={amt}
                disabled={isSpinning || isFreeSpinActive}
                onClick={() => setBetAmount(amt)}
                className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
                  betAmount === amt
                    ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                    : 'bg-gray-900 text-gray-400 hover:bg-gray-800 border border-gray-800'
                }`}
              >
                {amt}
              </button>
            ))}
          </div>

          {/* Middle Options: Turbo, Auto */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTurbo(!turbo)}
              className={`flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
                turbo
                  ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                  : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${turbo ? 'fill-amber-400 text-amber-400' : ''}`} />
              <span>Turbo</span>
            </button>

            <button
              disabled={isSpinning && autoSpinCount === null}
              onClick={() => {
                if (autoSpinCount !== null) {
                  setAutoSpinCount(null);
                } else {
                  setAutoSpinCount(25);
                  handleSpin();
                }
              }}
              className={`flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
                autoSpinCount !== null
                  ? 'bg-rose-500/20 border-rose-500/60 text-rose-300 animate-pulse'
                  : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              {autoSpinCount !== null ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Dừng ({autoSpinCount})</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Tự Động</span>
                </>
              )}
            </button>
          </div>

          {/* Mahjong Spin Button */}
          <button
            disabled={isSpinning && autoSpinCount === null}
            onClick={() => handleSpin()}
            className={`relative group w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center font-black transition-all active:scale-90 ${
              isSpinning
                ? 'bg-gray-800 border-2 border-gray-700 text-gray-500 cursor-not-allowed'
                : isFreeSpinActive
                ? 'bg-gradient-to-tr from-rose-600 to-amber-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.6)] ring-4 ring-rose-400/40'
                : 'bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-400 text-gray-950 shadow-[0_0_25px_rgba(250,204,21,0.5)] ring-4 ring-yellow-400/30 hover:scale-105'
            }`}
          >
            <div className="absolute inset-1 rounded-full border border-dashed border-gray-950/40 pointer-events-none animate-spin-slow" />
            <RotateCcw className={`w-7 h-7 sm:w-8 sm:h-8 ${isSpinning ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Paytable & Rules Modal (chuẩn PG Soft Mahjong Ways 2) */}
      {showPaytableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-gray-900 border border-emerald-600/50 rounded-2xl p-5 shadow-2xl">
            <button
              onClick={() => setShowPaytableModal(false)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-white rounded-lg bg-gray-800"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-6 h-6 text-emerald-400" />
              <h3 className="text-lg font-black uppercase text-emerald-300">Bảng Trả Thưởng & Quy Tắc</h3>
            </div>

            {/* Feature Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 text-xs">
              <div className="bg-black/40 border border-emerald-900/40 p-3 rounded-xl">
                <span className="font-bold text-emerald-400">🔥 Hệ số thang PG:</span>
                <p className="text-gray-300 mt-1">
                  Base game: x1 ➔ x2 ➔ x3 ➔ x5 theo từng cascade. Free Spins nhân đôi: x2 ➔ x4 ➔ x6 ➔ x10!
                </p>
              </div>
              <div className="bg-black/40 border border-emerald-900/40 p-3 rounded-xl">
                <span className="font-bold text-yellow-400">⭐ Mạ vàng hóa WILD:</span>
                <p className="text-gray-300 mt-1">
                  Symbol mạ vàng ở cuộn 2-3-4 khi tham gia thắng sẽ hóa WILD. Free Spins: toàn bộ cuộn giữa tự mạ vàng!
                </p>
              </div>
              <div className="bg-black/40 border border-emerald-900/40 p-3 rounded-xl sm:col-span-2">
                <span className="font-bold text-rose-400">🀄 3 Scatters ➔ 10 Free Spins:</span>
                <p className="text-gray-300 mt-1">
                  Mỗi scatter thêm +2 lượt. Trong free spins nổ thêm scatter được retrigger. Không có Mua Tính Năng (chuẩn gốc).
                </p>
              </div>
            </div>

            {/* Symbols Table */}
            <h4 className="font-bold text-xs uppercase text-gray-400 mb-2">Giá Trị (3 - 4 - 5 Cuộn, 2,000 Ways)</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {[
                { name: 'Phát (Green)', icon: '發', pay: '10 / 25 / 50' },
                { name: 'Trung (Red)', icon: '中', pay: '8 / 20 / 40' },
                { name: 'Bạch (White)', icon: '白', pay: '6 / 15 / 30' },
                { name: 'Bát Vạn', icon: '捌萬', pay: '5 / 10 / 15' },
                { name: 'Ngũ Đồng', icon: '筒', pay: '3 / 5 / 12' },
                { name: 'Ngũ Sách', icon: '索', pay: '3 / 5 / 12' },
                { name: 'Tam Đồng', icon: '筒', pay: '2 / 4 / 10' },
                { name: 'Nhị Sách', icon: '索', pay: '2 / 4 / 10' }
              ].map(s => (
                <div key={s.name} className="bg-black/30 border border-gray-800 p-2 rounded-lg flex flex-col items-center">
                  <span className="text-2xl">{s.icon}</span>
                  <span className="font-bold text-gray-300 mt-1">{s.name}</span>
                  <span className="text-[10px] text-emerald-400 mt-0.5">{s.pay}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Free Spins Awarded Notification */}
      {freeSpinsWonModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-gradient-to-b from-rose-950 via-gray-900 to-black border-2 border-rose-500 rounded-3xl p-6 text-center shadow-[0_0_50px_rgba(244,63,94,0.6)]">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center mx-auto mb-3 animate-bounce">
              <Flame className="w-8 h-8 text-rose-400 fill-current" />
            </div>
            <h3 className="text-xl font-black uppercase text-rose-300">CHÚC MỪNG BẠN!</h3>
            <p className="text-sm text-gray-300 mt-1">Đã kích hoạt thành công:</p>
            <div className="text-3xl font-black text-yellow-300 my-3">
              {freeSpinsWonModal} VÒNG QUAY MIỄN PHÍ
            </div>
            <p className="text-xs text-yellow-400/90 mb-5">Hệ số Free Spins x2 ➔ x4 ➔ x6 ➔ x10, cuộn giữa mạ vàng!</p>
            <button
              onClick={() => {
                setFreeSpinsWonModal(null);
                handleSpin();
              }}
              className="w-full py-3 rounded-xl font-black bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600 text-gray-950 hover:brightness-110 shadow-lg shadow-rose-500/30 transition-all"
            >
              BẮT ĐẦU QUAY NGAY
            </button>
          </div>
        </div>
      )}

      {/* Big Win Celebration Overlay */}
      {bigWinOverlay && (
        <div
          onClick={() => setBigWinOverlay(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 cursor-pointer"
        >
          <div className="text-center animate-bounce">
            <div className="text-3xl sm:text-5xl font-black uppercase tracking-wider text-amber-300 drop-shadow-[0_0_25px_rgba(250,204,21,0.9)]">
              {bigWinOverlay.title}
            </div>
            <div className="text-4xl sm:text-6xl font-black text-yellow-400 my-4 drop-shadow-[0_0_30px_#fde047]">
              +{bigWinOverlay.amount.toLocaleString()} 🪙
            </div>
            <span className="text-xs text-gray-400">Bấm bất kỳ đâu để đóng</span>
          </div>
        </div>
      )}
    </div>
  );
};
