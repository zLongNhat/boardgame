import React, { useState, useEffect, useRef } from 'react';
import {
  Flame,
  Volume2,
  VolumeX,
  Zap,
  RotateCcw,
  Sparkles,
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
import { TreasuresOfAztecTile } from './TreasuresOfAztecSymbols';
import { ReelColumnView } from './ReelColumnView';

const REEL_HEIGHTS = [5, 6, 6, 6, 6, 5];
const BET_PRESETS = [10, 50, 100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000];

const AZTEC_DUMMY: SlotSymbolId[] = [
  'aztec_mask',
  'aztec_chief',
  'aztec_statue',
  'aztec_snake',
  'aztec_carving_blue',
  'aztec_carving_green',
  'A',
  'K',
  'Q',
  'J',
  '10',
  'scatter',
  'aztec_mask',
  'aztec_snake',
  'aztec_chief',
  'A',
  'K'
];

// Web Audio sound synthesizer for Aztec & Mayan temple acoustic experience
class AztecSoundFX {
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
      osc.frequency.setValueAtTime(260, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, this.ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.18);
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
      const baseFreq = 110 + colIdx * 12;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {}
  }

  playShatter() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    const ctx = this.ctx;
    try {
      const bufferSize = ctx.sampleRate * 0.12;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, ctx.currentTime);
      filter.Q.setValueAtTime(3, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.28, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
    } catch {}
  }

  playScatterLand(scatterIndex: number) {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    const ctx = this.ctx;
    try {
      const freqs = [440, 554.37, 659.25, 880];
      const targetFreq = freqs[Math.min(scatterIndex - 1, freqs.length - 1)];

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(targetFreq, ctx.currentTime);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
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
      osc.frequency.setValueAtTime(240, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(480, ctx.currentTime + 0.6);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {}
  }

  playGoldMorph() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    const ctx = this.ctx;
    try {
      const notes = [587.33, 739.99, 880, 1174.66];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const time = ctx.currentTime + idx * 0.05;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.2);
      });
    } catch {}
  }

  playWin(mult: number) {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    const ctx = this.ctx;
    try {
      const chords = mult > 5 ? [523.25, 659.25, 783.99, 1046.5] : [440, 554.37, 659.25];
      chords.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const time = ctx.currentTime + idx * 0.06;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.25);
      });
    } catch {}
  }

  playBigWin() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    const ctx = this.ctx;
    try {
      const fanfare = [523.25, 659.25, 783.99, 1046.5, 1318.51];
      fanfare.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const time = ctx.currentTime + idx * 0.08;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.25, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.4);
      });
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
}

const soundFX = new AztecSoundFX();

export const TreasuresOfAztecSlot: React.FC = () => {
  const { user } = useAuth();
  const { socket } = useGameSocketContext();

  const [betAmount, setBetAmount] = useState(20);
  const [isSpinning, setIsSpinning] = useState(false);
  const [turbo, setTurbo] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoSpinCount, setAutoSpinCount] = useState<number | null>(null);

  // Free spins
  const [freeSpinsState, setFreeSpinsState] = useState<FreeSpinsState | null>(null);

  // Active grid & multiplier
  const [currentGrid, setCurrentGrid] = useState<CascadeStep['grid']>(() =>
    REEL_HEIGHTS.map((h, colIdx) =>
      Array.from({ length: h }, (_, rowIdx) => {
        const pool: SlotSymbolId[] = [
          'aztec_mask',
          'aztec_chief',
          'aztec_statue',
          'aztec_snake',
          'aztec_carving_blue',
          'aztec_carving_green'
        ];
        const isSilver = colIdx >= 1 && colIdx <= 4 && rowIdx === 1;
        return {
          id: `init_${colIdx}_${rowIdx}`,
          symbol: pool[(colIdx + rowIdx) % pool.length],
          isGold: false,
          isSilver,
          frame: isSilver ? 'silver' : 'none'
        };
      })
    )
  );

  const [activeMultiplier, setActiveMultiplier] = useState(1);
  const [lastWinAmount, setLastWinAmount] = useState(0);
  const [activeWinningWaysCount, setActiveWinningWaysCount] = useState(0);

  // Shatter & Cascade animation states
  const [tileAnimationPhase, setTileAnimationPhase] = useState<TileAnimationPhase>('idle');

  // Reel-by-reel sequential rolling
  const [spinningCols, setSpinningCols] = useState<boolean[]>([false, false, false, false, false, false]);
  const [targetColumnTiles, setTargetColumnTiles] = useState<SlotTile[][] | null>(null);
  const [cascadeDropCounts, setCascadeDropCounts] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [cascadeFallDistances, setCascadeFallDistances] = useState<number[][]>([]);
  const [anticipatingCols, setAnticipatingCols] = useState<number[]>([]);
  const [landedScattersCount, setLandedScattersCount] = useState(0);
  const [reelSpinDurations, setReelSpinDurations] = useState<number[]>([380, 380, 380, 380, 380, 380]);

  // Modals
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [bigWinOverlay, setBigWinOverlay] = useState<{ amount: number; title: string } | null>(null);
  const [freeSpinsTriggeredModal, setFreeSpinsTriggeredModal] = useState<number | null>(null);

  const pendingSpinResultRef = useRef<SpinResult | null>(null);
  const scattersCountRef = useRef(0);
  const anticipatingColsRef = useRef<number[]>([]);
  const autoSpinRef = useRef<number | null>(null);
  autoSpinRef.current = autoSpinCount;

  // Toggle sound
  const toggleSound = () => {
    soundFX.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
  };

  // Fetch active free spins on mount
  useEffect(() => {
    if (socket && user?.id) {
      socket.emit('slots:free-spins', { slotId: 'treasures-of-aztec', userId: user.id }, (res: any) => {
        if (res?.success && res.freeSpins) {
          setFreeSpinsState(res.freeSpins);
          setActiveMultiplier(2);
        }
      });
    }
  }, [socket, user?.id]);

  // Increase Bet Logic: Infinite upgrade capability (vô hạn)
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
    } else if (current < 10000) {
      setBetAmount(current + 1000);
    } else if (current < 100000) {
      setBetAmount(current + 10000);
    } else if (current < 1000000) {
      setBetAmount(current + 100000);
    } else {
      // Vô hạn: Khi đạt 1,000,000 trở lên, tăng tiếp 500,000 mỗi lần bấm mà không bị giới hạn trần
      setBetAmount(current + 500000);
    }
  };

  // Decrease Bet Logic
  const handleDecreaseBet = () => {
    if (isSpinning || Boolean(freeSpinsState && freeSpinsState.remaining > 0)) return;

    const current = betAmount;
    const presetIdx = BET_PRESETS.indexOf(current);

    if (presetIdx > 0) {
      setBetAmount(BET_PRESETS[presetIdx - 1]);
    } else if (current > 1000000) {
      setBetAmount(Math.max(1000000, current - 500000));
    } else if (current > 100000) {
      setBetAmount(Math.max(100000, current - 100000));
    } else if (current > 10000) {
      setBetAmount(Math.max(10000, current - 10000));
    } else if (current > 1000) {
      setBetAmount(Math.max(1000, current - 1000));
    } else if (current > 100) {
      setBetAmount(Math.max(100, current - 100));
    } else {
      setBetAmount(Math.max(10, current - 10));
    }
  };

  // Calculate fall distances for cascade
  const computeFallDistances = (oldGrid: SlotTile[][], newGrid: SlotTile[][]): number[][] => {
    return oldGrid.map((oldCol, c) => {
      const newCol = newGrid[c] || [];
      const needed = oldCol.filter(
        t => t.isWinning && !t.isGold && !t.isSilver && t.frame !== 'gold' && t.frame !== 'silver'
      ).length;
      if (needed === 0) return newCol.map(() => 0);
      const survivorOldIdx: number[] = [];
      oldCol.forEach((t, idx) => {
        if (!(t.isWinning && !t.isGold && !t.isSilver && t.frame !== 'gold' && t.frame !== 'silver')) {
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

  // Reel landing handler
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

      if (scattersCountRef.current >= 3 && colIdx < 5) {
        const remaining = Array.from({ length: 5 - colIdx }, (_, i) => colIdx + 1 + i);
        setAnticipatingCols(remaining);
        anticipatingColsRef.current = remaining;
        soundFX.playAnticipation();
      }
    }
  };

  // Run sequential reel-by-reel spin animation (learned from Wild Bounty Showdown)
  const runSpinSequence = async (spinResult: SpinResult) => {
    const targetGrid = spinResult.cascades[0].grid;
    setTargetColumnTiles(targetGrid);

    if (turbo) {
      // In Turbo mode: rapid sequential (120ms each)
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
      // Normal mode: Column 0 -> Column 1 -> Column 2 -> Column 3 -> Column 4 -> Column 5
      for (let c = 0; c < 6; c++) {
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

  // Play through cascading steps with authentic Wilds-on-the-Way transformations and gravity drops
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
        soundFX.playWin(step.stepWin / betAmount);
        setLastWinAmount(step.totalWinSoFar);
        await new Promise(r => setTimeout(r, turbo ? 200 : 420));

        // Phase 2: Stone shatter & non-frame winning items shatter into fragments & vanish
        setTileAnimationPhase('shattering');
        soundFX.playShatter();

        const hasGoldWinner = step.grid.some(col =>
          col.some(t => t.isWinning && (t.isGold || t.frame === 'gold'))
        );
        if (hasGoldWinner) {
          soundFX.playGoldMorph();
        }

        // Wait for shatter explode animation to finish
        await new Promise(r => setTimeout(r, turbo ? 260 : 460));

        // Phase 3: Gravity fall (tiles above drop down, non-winning tiles below stay static)
        const nextStep = cascades[i + 1];
        if (nextStep) {
          const drops = step.grid.map(col =>
            col.filter(
              t => t.isWinning && !t.isGold && !t.isSilver && t.frame !== 'gold' && t.frame !== 'silver'
            ).length
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

    // Finalize spin
    setLastWinAmount(spinResult.totalWin);
    if (spinResult.totalWin > 0) {
      soundFX.playWin(spinResult.totalWin / betAmount);
    }

    // Free spins updates
    if (spinResult.freeSpinsState) {
      setFreeSpinsState({
        userId: user!.id,
        slotId: 'treasures-of-aztec',
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
      soundFX.playBigWin();
      setBigWinOverlay({ amount: spinResult.totalWin, title: 'SUPER MEGA WIN 💥' });
    } else if (winMultiplier >= 40) {
      soundFX.playBigWin();
      setBigWinOverlay({ amount: spinResult.totalWin, title: 'MEGA WIN 🗿' });
    } else if (winMultiplier >= 15) {
      soundFX.playBigWin();
      setBigWinOverlay({ amount: spinResult.totalWin, title: 'BIG WIN 💰' });
    }

    // Trigger Free Spins modal
    if (spinResult.triggeredFreeSpins > 0) {
      setFreeSpinsTriggeredModal(spinResult.triggeredFreeSpins);
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

  // Main spin handler (learned from Wild Bounty Showdown: socket.emit 'slots:spin')
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
    setActiveMultiplier(inFreeSpins ? 2 : 1);
    soundFX.playSpin();

    if (!socket) {
      setIsSpinning(false);
      return;
    }

    socket.emit(
      'slots:spin',
      {
        slotId: 'treasures-of-aztec',
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
      {/* Background Ambience */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/40 via-emerald-950/80 to-stone-950 rounded-2xl pointer-events-none" />

      {/* Top Header Bar */}
      <div className="w-full flex items-center justify-between px-3 py-2 border-b border-emerald-900/50 bg-stone-950/70 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center shadow-lg shadow-amber-500/30 text-lg">
            🗿
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              Treasures of Aztec
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                PG SOFT
              </span>
            </h1>
            <p className="text-[11px] text-emerald-400/80 flex items-center gap-2">
              <span>32,400 Cách Thắng</span>
              <span>•</span>
              <span>RTP 96.71%</span>
            </p>
          </div>
        </div>

        {/* Top Controls: Sound, Help, Buy */}
        <div className="flex items-center gap-2">
          {!isFreeSpinActive && (
            <button
              onClick={() => setShowBuyModal(true)}
              disabled={isSpinning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black text-xs bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-stone-950 shadow-md shadow-amber-500/30 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              <span>MUA TÍNH NĂNG (75x)</span>
            </button>
          )}

          <button
            onClick={toggleSound}
            className="p-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-700 border border-emerald-800/40 text-stone-300 hover:text-white transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-stone-500" />}
          </button>

          <button
            onClick={() => setShowHelpModal(true)}
            className="p-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-700 border border-emerald-800/40 text-stone-300 hover:text-white transition-colors"
            title="Bảng Trả Thưởng & Luật"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      </div>

      {/* Free Spins Notification Bar (If active) */}
      {isFreeSpinActive && freeSpinsState && (
        <div className="w-full bg-gradient-to-r from-emerald-900/80 via-amber-900/80 to-emerald-900/80 border-y border-amber-500/50 py-2 px-4 flex items-center justify-between animate-pulse">
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

      {/* Aztec Increasing Multiplier Bar */}
      <div className="w-full my-3 px-2">
        <div className="bg-stone-950/80 border border-emerald-900/50 rounded-xl p-2.5 shadow-inner flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-stone-400">
                {isFreeSpinActive ? 'Hệ Số Free Spins (Không Reset)' : 'Hệ Số Thắng Tăng Dần'}
              </div>
              <div className="text-xs font-semibold text-emerald-300">
                {isFreeSpinActive ? '+2 mỗi lần nổ liên hoàn' : '+1 mỗi lần nổ liên hoàn'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-stone-400">MULTIPLIER:</span>
            <span
              className={`text-xl sm:text-2xl font-black px-3 py-0.5 rounded-xl border ${
                activeMultiplier > 1
                  ? 'bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 text-stone-950 border-yellow-200 shadow-[0_0_15px_#fde047]'
                  : 'bg-stone-800 text-emerald-400 border-stone-700'
              }`}
            >
              x{activeMultiplier}
            </span>
          </div>
        </div>
      </div>

      {/* Main Mayan Aztec Slot Cabinet (Reels 5-6-6-6-6-5) */}
      <div className="w-full px-2 sm:px-4">
        <div className="relative p-2 sm:p-4 rounded-2xl bg-gradient-to-b from-amber-950/40 via-stone-900/90 to-stone-950 border-2 border-emerald-700/60 shadow-[0_10px_35px_rgba(0,0,0,0.8)]">
          {/* Aztec corner glyph accents */}
          <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-amber-400 pointer-events-none" />
          <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-amber-400 pointer-events-none" />
          <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-amber-400 pointer-events-none" />
          <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-amber-400 pointer-events-none" />

          {/* Scatter Landing Live Counter Banner */}
          {landedScattersCount > 0 && (
            <div className="mb-2 flex items-center justify-center">
              <div
                className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-lg transition-all ${
                  landedScattersCount >= 4
                    ? 'bg-gradient-to-r from-yellow-400 via-rose-500 to-amber-500 text-stone-950 animate-bounce ring-2 ring-yellow-300 shadow-[0_0_20px_rgba(244,63,94,0.8)]'
                    : 'bg-rose-950/90 border border-rose-500 text-rose-200 animate-pulse'
                }`}
              >
                <span>☀️</span>
                <span>SCATTERS RƠI: {landedScattersCount} / 4</span>
                {landedScattersCount >= 4 ? (
                  <span className="font-extrabold uppercase">— KÍCH HOẠT FREE SPINS! 🔥</span>
                ) : (
                  <span className="text-[10px] text-rose-300">(Cần thêm {4 - landedScattersCount})</span>
                )}
              </div>
            </div>
          )}

          {/* Top Reel Cartridge Bar across Reels 2-5 */}
          <div className="grid grid-cols-6 gap-1.5 sm:gap-2 mb-1.5 px-0.5">
            <div className="h-4 rounded bg-stone-950/60 border border-stone-800 flex items-center justify-center">
              <span className="text-[8px] font-bold text-stone-600">R1 (5)</span>
            </div>
            <div className="col-span-4 h-4 rounded bg-gradient-to-r from-amber-950/70 via-yellow-950/70 to-amber-950/70 border border-yellow-600/50 flex items-center justify-center gap-1 shadow-sm">
              <Sparkles className="w-2.5 h-2.5 text-yellow-400 animate-pulse" />
              <span className="text-[8px] font-black uppercase tracking-wider text-yellow-300">
                ⚡ TOP REEL CARTRIDGE (CUỘN 2 - 5) ⚡
              </span>
              <Sparkles className="w-2.5 h-2.5 text-yellow-400 animate-pulse" />
            </div>
            <div className="h-4 rounded bg-stone-950/60 border border-stone-800 flex items-center justify-center">
              <span className="text-[8px] font-bold text-stone-600">R6 (5)</span>
            </div>
          </div>

          {/* 6 Sequential Reels Grid */}
          <div className="grid grid-cols-6 gap-1 sm:gap-2 items-center justify-center">
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
                dummySymbols={AZTEC_DUMMY}
                goldCols={[1, 2, 3, 4]}
                renderTile={(tile, phase) => (
                  <TreasuresOfAztecTile
                    tile={tile}
                    isWinning={tile.isWinning}
                    transformedToWild={tile.transformedToWild}
                    animationPhase={phase}
                  />
                )}
              />
            ))}
          </div>

          {/* Win Ticker Overlay Bar */}
          <div className="mt-3 flex items-center justify-between px-3 py-1.5 bg-black/60 rounded-xl border border-emerald-900/40">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-stone-400">Cách thắng:</span>
              <span className="font-black text-amber-400">{activeWinningWaysCount} ways</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-400">Tiền thắng:</span>
              <span className="font-black text-base sm:text-lg text-yellow-400">
                {lastWinAmount > 0 ? `+${lastWinAmount.toLocaleString()}` : '0'} 🪙
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Betting & Spin Controls (learned from Wild Bounty Showdown) */}
      <div className="w-full mt-4 px-2 sm:px-4">
        <div className="bg-stone-950/90 border border-stone-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xl">
          {/* Bet Amount Selector with Direct Edit & Infinite Upgrade */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-stone-400">Mức Cược (Vô Hạn)</span>
              {betAmount >= 1000000 && (
                <span className="text-[10px] font-black text-amber-400 animate-pulse">👑 CƯỢC CAO</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                disabled={isSpinning || isFreeSpinActive}
                onClick={handleDecreaseBet}
                className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-40 font-black text-sm flex items-center justify-center border border-stone-700 transition-colors"
                title="Giảm cược"
              >
                -
              </button>
              <div className="px-2 py-1 bg-stone-900 border border-amber-500/40 rounded-lg min-w-[110px] flex items-center justify-center">
                <input
                  type="number"
                  min="10"
                  value={betAmount}
                  disabled={isSpinning || isFreeSpinActive}
                  onChange={(e) => {
                    const val = Math.max(10, Math.floor(Number(e.target.value) || 10));
                    setBetAmount(val);
                  }}
                  className="w-24 bg-transparent font-black text-amber-300 text-sm sm:text-base text-center outline-none"
                />
                <span className="text-[10px] text-stone-400 ml-0.5">🪙</span>
              </div>
              <button
                disabled={isSpinning || isFreeSpinActive}
                onClick={handleIncreaseBet}
                className="w-8 h-8 rounded-lg bg-gradient-to-r from-amber-600 to-yellow-500 text-stone-950 hover:brightness-110 disabled:opacity-40 font-black text-sm flex items-center justify-center border border-yellow-300 transition-all shadow-md shadow-amber-500/30"
                title="Tăng cược (Vô hạn)"
              >
                +
              </button>
            </div>
          </div>

          {/* Quick Bet Presets (Up to 1,000,000) */}
          <div className="hidden lg:flex items-center gap-1 overflow-x-auto max-w-sm py-1">
            {[10, 100, 1000, 10000, 100000, 500000, 1000000].map(amt => (
              <button
                key={amt}
                disabled={isSpinning || isFreeSpinActive}
                onClick={() => setBetAmount(amt)}
                className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
                  betAmount === amt
                    ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                    : 'bg-stone-900 text-stone-400 hover:bg-stone-800 border border-stone-800'
                }`}
              >
                {amt >= 1000000 ? `${amt / 1000000}M` : amt >= 1000 ? `${amt / 1000}k` : amt}
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
                  : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
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
                  : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
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

          {/* Revolver / Aztec Rotating Spin Button */}
          <button
            disabled={isSpinning && autoSpinCount === null}
            onClick={() => handleSpin(false)}
            className={`relative group w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center font-black transition-all active:scale-95 ${
              isSpinning
                ? 'bg-stone-800 border-2 border-stone-700 text-stone-500 cursor-not-allowed opacity-75'
                : isFreeSpinActive
                ? 'bg-gradient-to-tr from-amber-600 to-yellow-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.6)] ring-4 ring-amber-400/40'
                : 'bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-400 text-stone-950 shadow-[0_0_25px_rgba(250,204,21,0.5)] ring-4 ring-yellow-400/30 hover:scale-105'
            }`}
          >
            <div className="absolute inset-1 rounded-full border border-dashed border-stone-950/40 pointer-events-none" />
            <RotateCcw className="w-7 h-7 sm:w-8 sm:h-8" />
          </button>
        </div>
      </div>

      {/* Feature Buy Modal */}
      {showBuyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-gradient-to-b from-stone-900 to-stone-950 border-2 border-amber-500/60 rounded-2xl p-5 shadow-2xl text-center">
            <button
              onClick={() => setShowBuyModal(false)}
              className="absolute top-3 right-3 p-1.5 text-stone-400 hover:text-white rounded-lg bg-stone-800"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-600 to-yellow-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-500/40">
              <Sparkles className="w-7 h-7 text-stone-950 fill-current" />
            </div>
            <h3 className="text-lg font-black uppercase text-amber-300">Mua Vòng Quay Miễn Phí</h3>
            <p className="text-xs text-stone-300 mt-1 mb-4">
              Kích hoạt ngay <strong>10 Vòng Quay Miễn Phí</strong> với <strong>4 Biểu Tượng SCATTER</strong> đảm bảo!
            </p>
            <div className="bg-stone-950/80 border border-amber-500/30 rounded-xl p-3 mb-5">
              <span className="text-xs text-stone-400">Chi phí mua (75x mức cược):</span>
              <div className="text-2xl font-black text-amber-400 mt-0.5">
                {(betAmount * 75).toLocaleString()} 🪙
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowBuyModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs transition-colors"
              >
                HỦY
              </button>
              <button
                onClick={() => {
                  setShowBuyModal(false);
                  handleSpin(true);
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-stone-950 font-black text-xs uppercase shadow-lg shadow-amber-500/30 active:scale-95 transition-all"
              >
                XÁC NHẬN MUA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Free Spins Triggered Celebration Modal */}
      {freeSpinsTriggeredModal !== null && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl p-6 bg-gradient-to-b from-stone-900 via-amber-950 to-stone-950 border-2 border-yellow-400 shadow-[0_0_50px_rgba(250,204,21,0.6)] text-center animate-bounce-short">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-yellow-300 via-amber-500 to-red-600 flex items-center justify-center shadow-[0_0_30px_#fde047] text-3xl">
              ☀️
            </div>

            <h2 className="text-xl font-black text-yellow-300 mb-1">CHÚC MỪNG BẠN!</h2>
            <p className="text-sm font-bold text-amber-200 mb-4">
              ĐÃ KÍCH HOẠT {freeSpinsTriggeredModal} VÒNG QUAY MIỄN PHÍ!
            </p>

            <div className="p-3 rounded-2xl bg-black/40 border border-yellow-500/50 mb-5 text-xs text-stone-300 space-y-1">
              <div>⚡ Hệ số nhân khởi điểm bắt đầu từ <strong className="text-yellow-300">x2</strong></div>
              <div>⚡ Mỗi lần nổ tăng thêm <strong className="text-yellow-300">+2 Multiplier</strong></div>
              <div>⚡ Hệ số cộng dồn duy trì suốt toàn bộ đợt Free Spins!</div>
            </div>

            <button
              onClick={() => setFreeSpinsTriggeredModal(null)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 text-stone-950 font-black text-sm uppercase tracking-wider shadow-[0_0_20px_#fde047]"
            >
              BẮT ĐẦU NGAY
            </button>
          </div>
        </div>
      )}

      {/* Big Win Modal */}
      {bigWinOverlay !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
          <div className="relative w-full max-w-sm bg-gradient-to-b from-stone-900 via-amber-950 to-stone-950 border-2 border-amber-400 rounded-3xl p-6 text-center shadow-[0_0_60px_rgba(251,191,36,0.6)]">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center mx-auto mb-3 shadow-[0_0_30px_rgba(250,204,21,0.8)] animate-pulse">
              <Award className="w-10 h-10 text-stone-950" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-amber-300 uppercase tracking-widest mb-1">
              {bigWinOverlay.title}
            </h2>
            <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-400 bg-clip-text text-transparent my-4">
              +{bigWinOverlay.amount.toLocaleString()} 🪙
            </div>
            <button
              onClick={() => setBigWinOverlay(null)}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-stone-950 font-black text-sm uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-lg"
            >
              THU TIỀN
            </button>
          </div>
        </div>
      )}

      {/* Paytable & Rules Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-3xl p-5 bg-gradient-to-b from-stone-900 to-stone-950 border-2 border-emerald-700 text-stone-200 relative">
            <button
              onClick={() => setShowHelpModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-black text-amber-300 mb-3 flex items-center gap-2">
              <span>🗿</span> Hướng Dẫn Chơi Treasures of Aztec
            </h3>

            <div className="space-y-4 text-xs">
              <section className="p-3 rounded-2xl bg-stone-950 border border-emerald-900/60">
                <h4 className="font-black text-emerald-400 mb-1">Cơ Chế Wilds-on-the-Way</h4>
                <p className="text-stone-400 leading-relaxed">
                  Ở các cuộn 2, 3, 4, 5, một số biểu tượng có thể xuất hiện với <strong>Khung Bạc</strong>. Khi biểu tượng Khung Bạc tham gia vào một tổ hợp chiến thắng, trong đợt rơi tiếp theo nó sẽ biến đổi thành một biểu tượng mới với <strong>Khung Vàng</strong>.
                  <br />
                  Nếu biểu tượng Khung Vàng tiếp tục chiến thắng, nó sẽ biến đổi thành biểu tượng <strong>WILD (Kim Tự Tháp)</strong>!
                </p>
              </section>

              <section className="p-3 rounded-2xl bg-stone-950 border border-emerald-900/60">
                <h4 className="font-black text-amber-400 mb-1">Hệ Số Tăng Dần (Multiplier)</h4>
                <p className="text-stone-400 leading-relaxed">
                  • <strong>Chế độ thường:</strong> Khởi điểm x1. Mỗi lần nổ thắng trong lượt quay tăng +1 (x1 ➔ x2 ➔ x3...).
                  <br />
                  • <strong>Vòng quay miễn phí:</strong> Khởi điểm x2. Mỗi lần nổ thắng tăng thêm +2 (x2 ➔ x4 ➔ x6...) và hệ số KHÔNG bị reset giữa các lượt quay miễn phí!
                </p>
              </section>

              <section className="p-3 rounded-2xl bg-stone-950 border border-emerald-900/60">
                <h4 className="font-black text-yellow-300 mb-1">Biểu Tượng & Trả Thưởng (6 Cuộn)</h4>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-stone-900">
                    <span className="text-xl">👺</span>
                    <div>
                      <div className="font-bold text-white">Mặt Nạ Vàng</div>
                      <div className="text-[10px] text-amber-400">80x (6 cuộn)</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-stone-900">
                    <span className="text-xl">👸</span>
                    <div>
                      <div className="font-bold text-white">Nữ Hoàng Maya</div>
                      <div className="text-[10px] text-rose-400">70x (6 cuộn)</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-stone-900">
                    <span className="text-xl">🗿</span>
                    <div>
                      <div className="font-bold text-white">Tượng Thần Hồng</div>
                      <div className="text-[10px] text-pink-400">60x (6 cuộn)</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-stone-900">
                    <span className="text-xl">🐍</span>
                    <div>
                      <div className="font-bold text-white">Rắn Thần</div>
                      <div className="text-[10px] text-purple-400">30x (6 cuộn)</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-stone-900">
                    <span className="text-xl">🧿</span>
                    <div>
                      <div className="font-bold text-white">Ngọc Lam</div>
                      <div className="text-[10px] text-cyan-400">15x (6 cuộn)</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-stone-900">
                    <span className="text-xl">🐢</span>
                    <div>
                      <div className="font-bold text-white">Ngọc Lục</div>
                      <div className="text-[10px] text-emerald-400">15x (6 cuộn)</div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="p-3 rounded-2xl bg-stone-950 border border-emerald-900/60">
                <h4 className="font-black text-rose-400 mb-1">Vòng Quay Miễn Phí & Mua Tính Năng</h4>
                <p className="text-stone-400 leading-relaxed">
                  Xuất hiện 4 biểu tượng ☀️ SCATTER ở bất kỳ vị trí nào để nhận 10 Vòng Quay Miễn Phí (+2 lượt cho mỗi SCATTER phụ).
                  Người chơi có thể mua trực tiếp tính năng với giá 75x mức cược.
                </p>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
