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
import { CaishenWinsTile, preloadCaishenAssets } from './CaishenWinsSymbols';
import { ReelColumnView } from './ReelColumnView';
import { AutoSpinMenu } from './AutoSpinMenu';

const REEL_HEIGHTS = [5, 6, 6, 6, 6, 5];
// Presets up to 1,000,000 and beyond (vô hạn)
const BET_PRESETS = [10, 50, 100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000];

// Art gốc từ PDF CaishenWins_Gameinformation_EN của PG Soft.
const CAISHEN_ASSET = `${import.meta.env.BASE_URL}assets/caishen`;
const CAISHEN_COVER = `${CAISHEN_ASSET}/cover.png`;
const CAISHEN_LOGO = `${CAISHEN_ASSET}/logo.png`;
const CAISHEN_PAYTABLE_IMG = `${CAISHEN_ASSET}/paytable.png`;
const CAISHEN_WAYS_IMG = `${CAISHEN_ASSET}/ways-rules.png`;

// Nền pastel từng cột như bản gốc (cuộn 1/6 hồng, 2 kem, 3 xanh lá, 4 xanh dương, 5 tím).
const COLUMN_TINTS = [
  'bg-gradient-to-b from-[#f7dada] via-[#f3e2e2] to-[#e9cbcb]',
  'bg-gradient-to-b from-[#faf3e3] via-[#f3ebd3] to-[#e8dcb9]',
  'bg-gradient-to-b from-[#ddf0e3] via-[#d3e9da] to-[#c2dcc9]',
  'bg-gradient-to-b from-[#dce9f7] via-[#d2e2f4] to-[#bfd4ec]',
  'bg-gradient-to-b from-[#e7ddf5] via-[#ded2f0] to-[#cfc0e6]',
  'bg-gradient-to-b from-[#f7dada] via-[#f3e2e2] to-[#e9cbcb]'
];
// Ô top reel viền vàng nền kem (bản gốc).
const TOP_REEL_TINT = 'bg-gradient-to-b from-[#fdf6e3] via-[#f7ecc9] to-[#eedcae]';

const CAISHEN_DUMMY: SlotSymbolId[] = [
  'caishen_lion',
  'caishen_toad',
  'caishen_koi',
  'caishen_angpao',
  'caishen_cymbal',
  'caishen_firecracker',
  'A',
  'K',
  'Q',
  'J',
  '10',
  'scatter',
  'caishen_lion',
  'caishen_koi',
  'caishen_toad',
  'A',
  'K'
];

// Web Audio sound synthesizer for Chinese Festive New Year & God of Wealth audio
class CaishenSoundFX {
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
      osc.frequency.setValueAtTime(330, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(130, this.ctx.currentTime + 0.16);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.16);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.16);
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
      const baseFreq = 160 + colIdx * 15;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.07);
      gain.gain.setValueAtTime(0.28, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.07);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.07);
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
      filter.frequency.setValueAtTime(1400, ctx.currentTime);
      filter.Q.setValueAtTime(4, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
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
      // Auspicious Chinese gong & bell notes
      const freqs = [523.25, 659.25, 783.99, 1046.5];
      const targetFreq = freqs[Math.min(scatterIndex - 1, freqs.length - 1)];

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(targetFreq, ctx.currentTime);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
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
      osc.frequency.setValueAtTime(260, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(520, ctx.currentTime + 0.6);
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
      const notes = [659.25, 783.99, 987.77, 1318.51];
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
      const chords = mult > 5 ? [523.25, 659.25, 783.99, 1046.5] : [440, 523.25, 659.25];
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
      const fanfare = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
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
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {}
  }
}

const soundFX = new CaishenSoundFX();

export const CaishenWinsSlot: React.FC = () => {
  const { user } = useAuth();
  const { socket } = useGameSocketContext();

  const [betAmount, setBetAmount] = useState(20);
  const [isSpinning, setIsSpinning] = useState(false);
  const [turbo, setTurbo] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoSpinCount, setAutoSpinCount] = useState<number | null>(null);
  const [showBetDrawer, setShowBetDrawer] = useState(false);

  // Free spins
  const [freeSpinsState, setFreeSpinsState] = useState<FreeSpinsState | null>(null);

  // Active grid & multiplier
  const [currentGrid, setCurrentGrid] = useState<CascadeStep['grid']>(() =>
    REEL_HEIGHTS.map((h, colIdx) =>
      Array.from({ length: h }, (_, rowIdx) => {
        const pool: SlotSymbolId[] = [
          'caishen_lion',
          'caishen_toad',
          'caishen_koi',
          'caishen_angpao',
          'caishen_cymbal',
          'caishen_firecracker'
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
  const [showSplash, setShowSplash] = useState(true);
  const [bigWinOverlay, setBigWinOverlay] = useState<{ amount: number; title: string } | null>(null);
  // Offer Free Spins chờ chọn Nhận/Gamble (chuẩn PG Soft).
  const [freeSpinsOffer, setFreeSpinsOffer] = useState<{
    spins: number;
    mult: number;
    gamblesLeft: number;
  } | null>(null);
  const [gambleSpinning, setGambleSpinning] = useState<'gamble-spins' | 'gamble-mult' | null>(null);
  const [gambleResult, setGambleResult] = useState<{ text: string; win: boolean } | null>(null);
  const [offerBust, setOfferBust] = useState(false);

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

  // Fetch active free spins + pending offer on mount
  useEffect(() => {
    if (socket && user?.id) {
      socket.emit('slots:free-spins', { slotId: 'caishen-wins', userId: user.id }, (res: any) => {
        if (res?.success && res.freeSpins) {
          setFreeSpinsState(res.freeSpins);
          setActiveMultiplier(8);
        }
      });
      socket.emit('slots:offer-get', { slotId: 'caishen-wins', userId: user.id }, (res: any) => {
        if (res?.success && res.offer) {
          setFreeSpinsOffer(res.offer);
        }
      });
    }
  }, [socket, user?.id]);

  // Splash cover tự mờ dần như bản gốc (bấm để bỏ qua).
  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(t);
  }, []);

  // Preload + decode sẵn sprite để lượt quay đầu không pop/decode giật.
  useEffect(() => {
    preloadCaishenAssets();
  }, []);

  // Số ways đang hiển thị (stacked block tính 1): 2,025 - 32,400.
  const liveWaysCount = useMemo(() => {
    try {
      return currentGrid.reduce((acc, col) => {
        const heads = col.filter(t => !t.spanCont).length;
        return acc * Math.max(1, heads);
      }, 1);
    } catch {
      return 32400;
    }
  }, [currentGrid]);

  // Gửi quyết định Nhận/Gamble cho offer.
  const resolveOffer = (action: 'accept' | 'gamble-spins' | 'gamble-mult') => {
    if (!socket || !user?.id) return;
    if (action === 'accept') {
      socket.emit(
        'slots:offer-resolve',
        { slotId: 'caishen-wins', userId: user.id, action },
        (res: any) => {
          if (!res?.success) {
            alert(res?.message || 'Nhận Free Spins thất bại.');
            return;
          }
          if (res.freeSpins) {
            setFreeSpinsState({
              userId: user.id,
              slotId: 'caishen-wins',
              remaining: res.freeSpins.remaining,
              total: res.freeSpins.total,
              betAmount: res.freeSpins.betAmount,
              totalWon: 0
            });
            setActiveMultiplier(8);
          }
          setFreeSpinsOffer(null);
        }
      );
      return;
    }
    // Gamble: quay bánh xe 1.6s rồi mới áp kết quả server đã trả.
    setGambleSpinning(action);
    setGambleResult(null);
    socket.emit(
      'slots:offer-resolve',
      { slotId: 'caishen-wins', userId: user.id, action },
      (res: any) => {
        setTimeout(() => {
          setGambleSpinning(null);
          if (!res?.success) {
            setGambleResult({ text: res?.message || 'Gamble thất bại.', win: false });
            return;
          }
          if (res.bust) {
            setFreeSpinsOffer(null);
            setOfferBust(true);
            soundFX.playShatter();
            return;
          }
          if (res.offer) {
            setFreeSpinsOffer(res.offer);
            const improved =
              action === 'gamble-spins'
                ? `+ lượt quay (giờ ${res.offer.spins} lượt)!`
                : `+ hệ số (giờ x${res.offer.mult})!`;
            setGambleResult({ text: `Gamble thắng! ${improved}`, win: true });
            soundFX.playGoldMorph();
          }
        }, 1600);
      }
    );
  };

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

  // Run sequential reel-by-reel spin animation
  const runSpinSequence = async (spinResult: SpinResult) => {
    const targetGrid = spinResult.cascades[0].grid;
    setTargetColumnTiles(targetGrid);

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
      // Normal mode: sequential columns
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

  // Play through cascading steps
  const animateCascades = async (spinResult: SpinResult) => {
    const cascades = spinResult.cascades;

    for (let i = 0; i < cascades.length; i++) {
      const step = cascades[i];
      setCurrentGrid(step.grid);
      setActiveMultiplier(step.multiplier);
      setActiveWinningWaysCount(step.winningWays.length);

      if (step.winningWays.length > 0) {
        setTileAnimationPhase('connecting');
        soundFX.playWin(step.stepWin / betAmount);
        setLastWinAmount(step.totalWinSoFar);
        await new Promise(r => setTimeout(r, turbo ? 200 : 420));

        setTileAnimationPhase('shattering');
        soundFX.playShatter();

        const hasGoldWinner = step.grid.some(col =>
          col.some(t => t.isWinning && (t.isGold || t.frame === 'gold'))
        );
        if (hasGoldWinner) {
          soundFX.playGoldMorph();
        }

        await new Promise(r => setTimeout(r, turbo ? 260 : 460));

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
        slotId: 'caishen-wins',
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
      setBigWinOverlay({ amount: spinResult.totalWin, title: 'MEGA WIN 🧧' });
    } else if (winMultiplier >= 15) {
      soundFX.playBigWin();
      setBigWinOverlay({ amount: spinResult.totalWin, title: 'BIG WIN 💰' });
    }

    // Trigger Free Spins -> Offer chờ chọn Nhận/Gamble (chuẩn PG Soft).
    if (spinResult.freeSpinsOffer && !spinResult.isFreeSpin) {
      setFreeSpinsOffer(spinResult.freeSpinsOffer);
      setAutoSpinCount(null);
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

  // Main spin handler (socket.emit 'slots:spin')
  const handleSpin = (isBuyFeature = false) => {
    if (isSpinning) return;

    if (!user?.id) {
      alert('Vui lòng đăng nhập để chơi slot.');
      return;
    }

    // Đang có offer Free Spins chờ quyết định -> bắt chọn Nhận/Gamble trước.
    if (freeSpinsOffer) {
      alert('Bạn đang có offer Free Spins chờ nhận! Hãy chọn NHẬN hoặc GAMBLE trước khi quay tiếp.');
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
    setActiveMultiplier(inFreeSpins ? 8 : 1);
    soundFX.playSpin();

    if (!socket) {
      setIsSpinning(false);
      return;
    }

    socket.emit(
      'slots:spin',
      {
        slotId: 'caishen-wins',
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
      {/* Background Ambience: cover art gốc, mờ + tối dần */}
      <div className="absolute inset-0 -z-10 overflow-hidden rounded-2xl pointer-events-none">
        <img
          src={CAISHEN_COVER}
          alt=""
          draggable={false}
          className="w-full h-full object-cover opacity-40 blur-[2px] scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-stone-950/70 via-stone-950/55 to-stone-950/85" />
      </div>

      {/* Splash cover (bản gốc mở game bằng splash rồi mờ dần) */}
      {showSplash && (
        <div
          onClick={() => setShowSplash(false)}
          className="fixed inset-0 z-[60] flex items-center justify-center cursor-pointer animate-fade-in"
          style={{
            backgroundImage: `url(${CAISHEN_COVER})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="absolute inset-0 bg-black/25" />
          <div className="relative flex flex-col items-center gap-3 px-6 text-center">
            <img src={CAISHEN_LOGO} alt="Caishen Wins" draggable={false} className="w-64 sm:w-80 drop-shadow-[0_6px_16px_rgba(0,0,0,0.7)] animate-pulse" />
            <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-yellow-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              Chạm để bắt đầu
            </span>
          </div>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="w-full flex items-center justify-between px-3 py-2 border-b-2 border-yellow-500/60 bg-gradient-to-r from-teal-950 via-[#0b3b3a] to-teal-950 rounded-t-2xl shadow-[0_4px_14px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-2">
          <img src={CAISHEN_LOGO} alt="Caishen Wins" draggable={false} className="h-9 sm:h-11 w-auto drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />
          <div className="hidden xs:block sm:block">
            <div className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 w-fit">
              PG SOFT
            </div>
            <p className="text-[11px] text-teal-200/90 flex items-center gap-2 mt-0.5">
              <span>{liveWaysCount.toLocaleString()} Ways</span>
              <span>•</span>
              <span>RTP 96.92%</span>
            </p>
          </div>
        </div>

        {/* Top Controls: Sound, Help, Buy */}
        <div className="flex items-center gap-2">
          {!isFreeSpinActive && (
            <button
              onClick={() => setShowBuyModal(true)}
              disabled={isSpinning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black text-xs bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400 text-stone-950 shadow-md shadow-amber-500/30 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              <span>MUA TÍNH NĂNG (75x)</span>
            </button>
          )}

          <button
            onClick={toggleSound}
            className="p-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-700 border border-amber-800/40 text-stone-300 hover:text-white transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-stone-500" />}
          </button>

          <button
            onClick={() => setShowHelpModal(true)}
            className="p-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-700 border border-amber-800/40 text-stone-300 hover:text-white transition-colors"
            title="Bảng Trả Thưởng & Luật"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      </div>

      {/* Free Spins Notification Bar (bản gốc: panel đỏ + hệ số khổng lồ) */}
      {isFreeSpinActive && freeSpinsState && (
        <div className="w-full mt-2 px-2">
          <div className="bg-gradient-to-b from-red-800 via-red-900 to-[#3d0a0a] border-2 border-yellow-500/70 rounded-2xl py-2 px-4 flex items-center justify-between shadow-[0_0_25px_rgba(220,38,38,0.45)]">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-yellow-300 fill-yellow-400" />
              <span className="text-xs sm:text-sm font-black uppercase text-yellow-100 tracking-wider drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)]">
                Remaining Free Spin {freeSpinsState.remaining}
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-red-500 drop-shadow-[0_2px_0_rgba(255,255,255,0.85),0_0_18px_rgba(239,68,68,0.8)]">
              x{activeMultiplier}
            </div>
            <div className="text-xs sm:text-sm font-black text-yellow-300">
              Tổng thắng: {(freeSpinsState.totalWon || 0).toLocaleString()} 🪙
            </div>
          </div>
        </div>
      )}

      {/* Caishen Increasing Multiplier Bar */}
      <div className="w-full my-3 px-2">
        <div className="bg-stone-950/80 border border-amber-900/50 rounded-xl p-2.5 shadow-inner flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-stone-400">
                {isFreeSpinActive ? 'Hệ Số Free Spins (Bắt Đầu x8 - Không Reset)' : 'Hệ Số Thắng Tăng Dần'}
              </div>
              <div className="text-xs font-semibold text-amber-300">
                {isFreeSpinActive ? '+1 mỗi lần nổ liên hoàn' : '+1 mỗi lần nổ liên hoàn'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-stone-400">MULTIPLIER:</span>
            <span
              className={`text-xl sm:text-2xl font-black px-3 py-0.5 rounded-xl border ${
                activeMultiplier > 1
                  ? 'bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 text-stone-950 border-yellow-200 shadow-[0_0_15px_#fde047]'
                  : 'bg-stone-800 text-amber-400 border-stone-700'
              }`}
            >
              x{activeMultiplier}
            </span>
          </div>
        </div>
      </div>

      {/* Emerald Pagoda Roof with Centered Ways Plaque */}
      <div className="relative w-full max-w-3xl mx-auto -mb-3 sm:-mb-4 z-20 pointer-events-none">
        {/* Pagoda Eaves SVG */}
        <svg viewBox="0 0 600 85" className="w-full h-auto drop-shadow-[0_8px_14px_rgba(0,0,0,0.7)]" fill="none">
          <defs>
            <linearGradient id="caishenEmeraldRoof" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="35%" stopColor="#059669" />
              <stop offset="70%" stopColor="#047857" />
              <stop offset="100%" stopColor="#064e3b" />
            </linearGradient>
            <linearGradient id="caishenRoofGold" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="40%" stopColor="#eab308" />
              <stop offset="80%" stopColor="#ca8a04" />
              <stop offset="100%" stopColor="#854d0e" />
            </linearGradient>
          </defs>

          {/* Swept pagoda eaves - Left wing */}
          <path
            d="M15 72 Q120 48 245 46 L245 54 Q120 56 32 82 Z"
            fill="url(#caishenEmeraldRoof)"
            stroke="url(#caishenRoofGold)"
            strokeWidth="2.5"
          />
          {/* Swept pagoda eaves - Right wing */}
          <path
            d="M585 72 Q480 48 355 46 L355 54 Q480 56 568 82 Z"
            fill="url(#caishenEmeraldRoof)"
            stroke="url(#caishenRoofGold)"
            strokeWidth="2.5"
          />
          {/* Center arch beam */}
          <path
            d="M175 48 Q300 32 425 48 L415 62 Q300 48 185 62 Z"
            fill="url(#caishenEmeraldRoof)"
            stroke="url(#caishenRoofGold)"
            strokeWidth="2"
          />
          {/* Left decorative eave horn with hanging tassel */}
          <path d="M15 72 C8 66 -2 52 10 42 C12 52 18 64 22 70 Z" fill="url(#caishenRoofGold)" />
          <circle cx="12" cy="76" r="4.5" fill="#dc2626" stroke="#fef08a" strokeWidth="1" />
          <line x1="12" y1="80" x2="12" y2="92" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" />
          <circle cx="12" cy="94" r="2" fill="#facc15" />

          {/* Right decorative eave horn with hanging tassel */}
          <path d="M585 72 C592 66 602 52 590 42 C588 52 582 64 578 70 Z" fill="url(#caishenRoofGold)" />
          <circle cx="588" cy="76" r="4.5" fill="#dc2626" stroke="#fef08a" strokeWidth="1" />
          <line x1="588" y1="80" x2="588" y2="92" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" />
          <circle cx="588" cy="94" r="2" fill="#facc15" />

          {/* Golden dragon ridge horns */}
          <path d="M210 46 Q225 30 240 44" stroke="url(#caishenRoofGold)" strokeWidth="3" fill="none" />
          <path d="M390 46 Q375 30 360 44" stroke="url(#caishenRoofGold)" strokeWidth="3" fill="none" />
        </svg>

        {/* Centered Golden Oval Plaque (Ways Badge) */}
        <div className="absolute top-1 sm:top-2 inset-x-0 flex items-center justify-center pointer-events-auto">
          <div className="px-5 py-1 sm:px-7 sm:py-1.5 rounded-full bg-gradient-to-b from-[#064e3b] via-[#022c22] to-[#041f18] border-2 border-yellow-400 shadow-[0_0_16px_rgba(250,204,21,0.7),inset_0_1px_2px_rgba(255,255,255,0.4)] flex flex-col items-center">
            <span className="text-sm sm:text-base md:text-lg font-black tracking-wider text-yellow-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] leading-none">
              {activeWinningWaysCount > 0
                ? activeWinningWaysCount.toLocaleString()
                : liveWaysCount.toLocaleString()}
            </span>
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-cyan-300 drop-shadow-[0_0_6px_rgba(6,182,212,0.8)] leading-none mt-0.5">
              WAYS
            </span>
          </div>
        </div>
      </div>

      {/* Main Caishen Slot Cabinet (Reels 5-6-6-6-6-5) */}
      <div className="w-full px-2 sm:px-4">
        <div className="relative p-2 sm:p-4 pt-4 sm:pt-6 rounded-2xl bg-gradient-to-b from-[#1c1917]/95 via-[#0c0a09]/95 to-[#1c1917]/95 border-2 border-amber-600/80 shadow-[0_12px_40px_rgba(0,0,0,0.9)]">
          {/* Chinese corner accents */}
          <div className="absolute top-1.5 left-1.5 w-4 h-4 border-t-2 border-l-2 border-yellow-400 pointer-events-none" />
          <div className="absolute top-1.5 right-1.5 w-4 h-4 border-t-2 border-r-2 border-yellow-400 pointer-events-none" />
          <div className="absolute bottom-1.5 left-1.5 w-4 h-4 border-b-2 border-l-2 border-yellow-400 pointer-events-none" />
          <div className="absolute bottom-1.5 right-1.5 w-4 h-4 border-b-2 border-r-2 border-yellow-400 pointer-events-none" />

          {/* Scatter Landing Live Counter Banner */}
          {landedScattersCount > 0 && (
            <div className="mb-2 flex items-center justify-center">
              <div
                className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-lg transition-all ${
                  landedScattersCount >= 4
                    ? 'bg-gradient-to-r from-yellow-400 via-rose-500 to-amber-500 text-stone-950 animate-bounce ring-2 ring-yellow-300 shadow-[0_0_20px_rgba(244,63,94,0.8)]'
                    : 'bg-red-950/90 border border-amber-500 text-amber-200 animate-pulse'
                }`}
              >
                <span>🏮</span>
                <span>SCATTERS RƠI: {landedScattersCount} / 4</span>
                {landedScattersCount >= 4 ? (
                  <span className="font-extrabold uppercase">— KÍCH HOẠT FREE SPINS! 🔥</span>
                ) : (
                  <span className="text-[10px] text-amber-300">(Cần thêm {4 - landedScattersCount})</span>
                )}
              </div>
            </div>
          )}

          {/* Top Reel phụ (chuẩn PG Soft): hàng ô trên cùng của cuộn 2-5.
              Success Caishen full 4 ô ở đây sẽ hóa thành 4 WILD. */}
          <div className="grid grid-cols-6 gap-1 sm:gap-2 mb-1 px-0.5 items-end">
            <div className="col-span-1" />
            {[1, 2, 3, 4].map(c => (
              <div key={`top-${c}`} className="relative">
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-10 px-1.5 rounded-full bg-gradient-to-r from-teal-900 via-cyan-700 to-teal-900 border border-amber-400/70 text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-yellow-200 shadow pointer-events-none whitespace-nowrap">
                  Top {c + 1}
                </div>
                <ReelColumnView
                  colIdx={c}
                  height={1}
                  visibleTiles={
                    spinningCols[c] && targetColumnTiles ? [targetColumnTiles[c][0]] : [currentGrid[c][0]]
                  }
                  isSpinning={spinningCols[c]}
                  spinDuration={reelSpinDurations[c] || 380}
                  isAnticipating={anticipatingCols.includes(c)}
                  animationPhase={tileAnimationPhase}
                  cascadeDropCount={cascadeDropCounts[c]}
                  fallDistances={cascadeFallDistances[c] ? [cascadeFallDistances[c][0]] : undefined}
                  dummySymbols={CAISHEN_DUMMY}
                  goldCols={[1, 2, 3, 4]}
                  renderTile={(tile, phase) => (
                    <CaishenWinsTile
                      tile={tile}
                      isWinning={tile.isWinning}
                      transformedToWild={tile.transformedToWild}
                      animationPhase={phase}
                      bgOverride={TOP_REEL_TINT}
                    />
                  )}
                />
              </div>
            ))}
            <div className="col-span-1" />
          </div>

          {/* 6 cuộn chính: cuộn 1 & 6 đủ 5 ô, cuộn 2-5 hiển thị 5 ô dưới (ô top nằm ở strip trên) */}
          <div className="grid grid-cols-6 gap-1 sm:gap-2 items-end justify-center">
            {currentGrid.map((column, colIdx) => {
              const isMiddle = colIdx >= 1 && colIdx <= 4;
              const mainTiles = isMiddle ? column.slice(1) : column;
              const mainFalls = isMiddle && cascadeFallDistances[colIdx]
                ? cascadeFallDistances[colIdx].slice(1)
                : cascadeFallDistances[colIdx];
              return (
                <ReelColumnView
                  key={colIdx}
                  colIdx={colIdx}
                  height={mainTiles.length}
                  visibleTiles={spinningCols[colIdx] && targetColumnTiles ? (isMiddle ? targetColumnTiles[colIdx].slice(1) : targetColumnTiles[colIdx]) : mainTiles}
                  isSpinning={spinningCols[colIdx]}
                  spinDuration={reelSpinDurations[colIdx] || 380}
                  isAnticipating={anticipatingCols.includes(colIdx)}
                  animationPhase={tileAnimationPhase}
                  cascadeDropCount={cascadeDropCounts[colIdx]}
                  fallDistances={mainFalls}
                  dummySymbols={CAISHEN_DUMMY}
                  goldCols={[1, 2, 3, 4]}
                  renderTile={(tile, phase) => (
                    <CaishenWinsTile
                      tile={tile}
                      isWinning={tile.isWinning}
                      transformedToWild={tile.transformedToWild}
                      animationPhase={phase}
                      bgOverride={COLUMN_TINTS[colIdx]}
                    />
                  )}
                />
              );
            })}
          </div>

          {/* Win Banner bản gốc: WIN UP TO 32,400 WAYS! khi chờ, WIN vàng khi thắng */}
          <div className="w-full mt-3 mb-1 px-1 flex items-center justify-center">
            {lastWinAmount > 0 ? (
              <div className="relative w-full max-w-lg py-1.5 px-4 rounded-full bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 border-2 border-yellow-200 shadow-[0_0_18px_rgba(250,204,21,0.7),inset_0_1px_2px_rgba(255,255,255,0.7)] flex items-center justify-center gap-2 animate-pulse">
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-red-900 drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]">
                  WIN {lastWinAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            ) : (
              <div className="relative w-full max-w-lg py-1.5 px-4 rounded-full bg-gradient-to-r from-teal-900 via-cyan-700 to-teal-900 border-2 border-amber-400 shadow-[0_0_14px_rgba(6,182,212,0.6),inset_0_1px_2px_rgba(255,255,255,0.7)] flex items-center justify-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-teal-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                  Win up to 32,400 Ways!
                </span>
                <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3 Stats Rounded Pill Panels: Balance, Bet, Win */}
      <div className="w-full max-w-xl mx-auto px-2 mt-3 mb-2 grid grid-cols-3 gap-2">
        {/* Balance Pill */}
        <div className="bg-stone-950/80 border border-amber-500/40 rounded-xl px-2 py-1.5 flex flex-col items-center justify-center shadow-inner">
          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-stone-400 tracking-wider">
            Số Dư
          </span>
          <span className="text-xs sm:text-sm font-black text-amber-300 truncate max-w-full">
            {(user?.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Bet Pill (Clickable to toggle Bet Drawer / Presets) */}
        <button
          type="button"
          onClick={() => setShowBetDrawer(!showBetDrawer)}
          disabled={isSpinning || isFreeSpinActive}
          className="bg-stone-950/80 hover:bg-stone-900 border border-amber-500/60 rounded-xl px-2 py-1.5 flex flex-col items-center justify-center shadow-inner active:scale-95 transition-all group"
          title="Nhấn để đổi mức cược"
        >
          <div className="flex items-center gap-1">
            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-amber-400 tracking-wider group-hover:text-yellow-300">
              Mức Cược
            </span>
            {betAmount >= 1000000 && <span className="text-[8px] animate-pulse">👑</span>}
          </div>
          <span className="text-xs sm:text-sm font-black text-white group-hover:text-yellow-300">
            {betAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </button>

        {/* Win Pill */}
        <div className="bg-stone-950/80 border border-amber-500/40 rounded-xl px-2 py-1.5 flex flex-col items-center justify-center shadow-inner">
          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-stone-400 tracking-wider">
            Tiền Thắng
          </span>
          <span className={`text-xs sm:text-sm font-black truncate max-w-full ${lastWinAmount > 0 ? 'text-yellow-400 animate-pulse' : 'text-stone-300'}`}>
            {lastWinAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Quick Bet Presets Drawer (Up to 1,000,000 + Vô Hạn Direct Input) */}
      {showBetDrawer && (
        <div className="w-full max-w-xl mx-auto px-2 mb-3 animate-fade-in">
          <div className="bg-stone-950/95 border border-amber-500/50 rounded-2xl p-3 shadow-2xl flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 uppercase flex items-center gap-1">
                <span>💰 Chọn Mức Cược Nhanh</span>
                <span className="text-[10px] text-amber-400/80">(Vô hạn nâng cấp)</span>
              </span>
              <button
                onClick={() => setShowBetDrawer(false)}
                className="text-stone-400 hover:text-white p-1 text-xs"
              >
                ✕ Đóng
              </button>
            </div>

            {/* Preset Buttons */}
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
              {BET_PRESETS.map((amt) => (
                <button
                  key={amt}
                  disabled={isSpinning || isFreeSpinActive}
                  onClick={() => {
                    setBetAmount(amt);
                    setShowBetDrawer(false);
                  }}
                  className={`py-1.5 px-1 rounded-lg text-xs font-black transition-all ${
                    betAmount === amt
                      ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-stone-950 shadow-md ring-1 ring-yellow-300'
                      : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800'
                  }`}
                >
                  {amt >= 1000000 ? `${amt / 1000000}M` : amt >= 1000 ? `${amt / 1000}k` : amt}
                </button>
              ))}
            </div>

            {/* Custom Bet Input */}
            <div className="flex items-center gap-2 pt-1 border-t border-stone-800">
              <span className="text-xs text-stone-400 font-semibold">Nhập cược tuỳ ý:</span>
              <div className="flex-1 flex items-center bg-stone-900 border border-amber-500/40 rounded-lg px-2 py-1">
                <input
                  type="number"
                  min="10"
                  value={betAmount}
                  disabled={isSpinning || isFreeSpinActive}
                  onChange={(e) => {
                    const val = Math.max(10, Math.floor(Number(e.target.value) || 10));
                    setBetAmount(val);
                  }}
                  className="w-full bg-transparent font-black text-amber-300 text-sm outline-none"
                />
                <span className="text-xs text-amber-400">🪙</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PG Soft 5 Circular Controls Bar */}
      <div className="w-full max-w-xl mx-auto px-4 mt-2 flex items-center justify-between">
        {/* Circular TURBO button */}
        <button
          disabled={isSpinning}
          onClick={() => setTurbo(!turbo)}
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex flex-col items-center justify-center border-2 transition-all active:scale-90 ${
            turbo
              ? 'bg-gradient-to-b from-amber-500/30 to-yellow-600/30 border-yellow-400 text-yellow-300 shadow-[0_0_12px_rgba(250,204,21,0.6)]'
              : 'bg-stone-900/90 hover:bg-stone-800 border-amber-900/50 text-stone-400 hover:text-stone-200 shadow-md'
          }`}
          title="Chế độ Turbo (Quay nhanh)"
        >
          <Zap className={`w-4 h-4 sm:w-5 sm:h-5 ${turbo ? 'fill-yellow-400 text-yellow-400 animate-pulse' : ''}`} />
          <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-tight mt-0.5">
            TURBO
          </span>
        </button>

        {/* Circular MINUS (-) button */}
        <button
          disabled={isSpinning || isFreeSpinActive}
          onClick={handleDecreaseBet}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-b from-stone-800 to-stone-900 hover:from-stone-700 hover:to-stone-800 border-2 border-amber-500/60 shadow-lg text-amber-300 hover:text-yellow-300 font-black text-xl sm:text-2xl flex items-center justify-center active:scale-90 transition-all disabled:opacity-40"
          title="Giảm mức cược"
        >
          −
        </button>

        {/* Giant Circular Emerald & Gold SPIN button with 2 curved rotating arrows */}
        <button
          disabled={isSpinning && autoSpinCount === null}
          onClick={() => handleSpin(false)}
          className={`relative group w-18 h-18 sm:w-20 sm:h-20 rounded-full flex items-center justify-center font-black transition-all active:scale-95 ${
            isSpinning
              ? 'bg-stone-800 border-4 border-stone-600 text-stone-500 cursor-not-allowed shadow-inner'
              : isFreeSpinActive
              ? 'bg-gradient-to-b from-emerald-500 via-teal-600 to-emerald-800 text-white border-4 border-yellow-300 shadow-[0_0_25px_rgba(16,185,129,0.8),inset_0_2px_4px_rgba(255,255,255,0.7)] ring-4 ring-yellow-400/50'
              : 'bg-gradient-to-b from-emerald-500 via-teal-700 to-emerald-900 text-white border-4 border-yellow-400 shadow-[0_0_30px_rgba(16,185,129,0.7),inset_0_2px_5px_rgba(255,255,255,0.8)] ring-4 ring-amber-500/40 hover:scale-105'
          }`}
          title={isSpinning ? 'Đang quay...' : 'Bấm để Quay!'}
        >
          {/* Inner golden ring bevel */}
          <div className="absolute inset-1.5 rounded-full border border-yellow-300/40 pointer-events-none" />

          {/* 2 Curved Rotating Arrows SVG (↺ ↻) in bright gold - stays stationary */}
          <svg
            viewBox="0 0 100 100"
            className="w-9 h-9 sm:w-10 sm:h-10 text-yellow-300 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
            fill="currentColor"
          >
            {/* Top curved arrow */}
            <path d="M50 15 A35 35 0 0 1 85 50 L75 50 A25 25 0 0 0 50 25 L50 35 L35 20 L50 5 Z" />
            {/* Bottom curved arrow */}
            <path d="M50 85 A35 35 0 0 1 15 50 L25 50 A25 25 0 0 0 50 75 L50 65 L65 80 L50 95 Z" />
          </svg>
        </button>

        {/* Circular PLUS (+) button (Infinite Upgrade capability) */}
        <button
          disabled={isSpinning || isFreeSpinActive}
          onClick={handleIncreaseBet}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-b from-stone-800 to-stone-900 hover:from-stone-700 hover:to-stone-800 border-2 border-amber-500/60 shadow-lg text-amber-300 hover:text-yellow-300 font-black text-xl sm:text-2xl flex items-center justify-center active:scale-90 transition-all disabled:opacity-40"
          title="Tăng mức cược (Vô hạn)"
        >
          +
        </button>

        {/* Circular AUTO button */}
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
          <div className="relative w-full max-w-md bg-gradient-to-b from-stone-900 to-stone-950 border-2 border-amber-500/60 rounded-2xl p-5 shadow-2xl text-center">
            <button
              onClick={() => setShowBuyModal(false)}
              className="absolute top-3 right-3 p-1.5 text-stone-400 hover:text-white rounded-lg bg-stone-800"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-red-600 via-amber-500 to-yellow-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-500/40">
              <Sparkles className="w-7 h-7 text-stone-950 fill-current" />
            </div>
            <h3 className="text-lg font-black uppercase text-amber-300">Mua Vòng Quay Thần Tài</h3>
            <p className="text-xs text-stone-300 mt-1 mb-4">
              Kích hoạt offer <strong>8 Vòng Quay Miễn Phí x8</strong> với <strong>4 Biểu Tượng SCATTER</strong> đảm bảo,
              sau đó được <strong>Gamble</strong> lên tối đa <strong>20 lượt / x20</strong> (thua gamble mất bonus)!
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
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400 hover:from-red-500 hover:to-yellow-300 text-stone-950 font-black text-xs uppercase shadow-lg shadow-amber-500/30 active:scale-95 transition-all"
              >
                XÁC NHẬN MUA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offer Free Spins: chọn NHẬN hoặc GAMBLE (chuẩn PG Soft) */}
      {freeSpinsOffer !== null && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl overflow-hidden bg-gradient-to-b from-stone-900 via-amber-950 to-stone-950 border-2 border-yellow-400 shadow-[0_0_50px_rgba(250,204,21,0.6)] text-center">
            <div className="relative h-28 sm:h-32">
              <img src={CAISHEN_COVER} alt="Caishen Wins" draggable={false} className="w-full h-full object-cover object-top" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1c0f04] via-transparent to-transparent" />
              <div className="absolute bottom-1 inset-x-0 flex justify-center">
                <img src={CAISHEN_LOGO} alt="Caishen Wins" draggable={false} className="h-10 sm:h-12 w-auto drop-shadow-[0_3px_6px_rgba(0,0,0,0.8)]" />
              </div>
            </div>
            <div className="p-5 pt-3">
            <h2 className="text-xl font-black text-yellow-300 mb-1">THẦN TÀI GIÁNG LÂM!</h2>
            <p className="text-sm font-bold text-amber-200 mb-1">
              {freeSpinsOffer.spins} VÒNG QUAY MIỄN PHÍ x{freeSpinsOffer.mult}
            </p>
            <p className="text-[11px] text-stone-400 mb-4">
              Còn {freeSpinsOffer.gamblesLeft} lượt Gamble (tối đa 20 lượt / x20 — thua là mất bonus!)
            </p>

            {/* Gamble wheel animation */}
            {gambleSpinning && (
              <div className="mb-4 flex flex-col items-center gap-2">
                <div className="relative w-28 h-28">
                  <div
                    className="absolute inset-0 rounded-full border-4 border-yellow-300 shadow-[0_0_25px_#fde047] animate-[spin_0.5s_linear_infinite]"
                    style={{
                      background:
                        'conic-gradient(#16a34a 0deg 120deg, #dc2626 120deg 200deg, #eab308 200deg 280deg, #dc2626 280deg 360deg)'
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-stone-950 border-2 border-yellow-300 flex items-center justify-center text-lg">
                      🎡
                    </div>
                  </div>
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-[12px] border-l-transparent border-r-transparent border-t-yellow-300" />
                </div>
                <span className="text-xs font-black text-yellow-200 animate-pulse">
                  ĐANG GAMBLE {gambleSpinning === 'gamble-spins' ? 'SỐ LƯỢT' : 'HỆ SỐ'}...
                </span>
              </div>
            )}

            {gambleResult && (
              <div
                className={`mb-4 px-3 py-2 rounded-xl text-xs font-black ${
                  gambleResult.win
                    ? 'bg-emerald-900/70 border border-emerald-400 text-emerald-200'
                    : 'bg-red-900/70 border border-red-400 text-red-200'
                }`}
              >
                {gambleResult.text}
              </div>
            )}

            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => resolveOffer('accept')}
                disabled={gambleSpinning !== null}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 text-stone-950 font-black text-sm uppercase tracking-wider shadow-[0_0_20px_#fde047] disabled:opacity-50"
              >
                NHẬN {freeSpinsOffer.spins} LƯỢT x{freeSpinsOffer.mult}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => resolveOffer('gamble-spins')}
                  disabled={
                    gambleSpinning !== null ||
                    freeSpinsOffer.gamblesLeft <= 0 ||
                    freeSpinsOffer.spins >= 20
                  }
                  className="py-2 rounded-xl bg-gradient-to-b from-emerald-600 to-emerald-800 hover:brightness-110 text-white font-black text-xs uppercase disabled:opacity-40 border border-emerald-300/50"
                >
                  🎲 Gamble lượt
                </button>
                <button
                  onClick={() => resolveOffer('gamble-mult')}
                  disabled={
                    gambleSpinning !== null ||
                    freeSpinsOffer.gamblesLeft <= 0 ||
                    freeSpinsOffer.mult >= 20
                  }
                  className="py-2 rounded-xl bg-gradient-to-b from-fuchsia-600 to-purple-800 hover:brightness-110 text-white font-black text-xs uppercase disabled:opacity-40 border border-fuchsia-300/50"
                >
                  🎲 Gamble x
                </button>
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* Bust modal: thua gamble mất toàn bộ bonus */}
      {offerBust && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl p-6 bg-gradient-to-b from-stone-900 via-red-950 to-stone-950 border-2 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.5)] text-center">
            <div className="text-5xl mb-3">💸</div>
            <h2 className="text-xl font-black text-red-300 mb-1">GAMBLE THẤT BẠI!</h2>
            <p className="text-xs text-stone-400 mb-5">
              Rất tiếc, bạn đã mất toàn bộ offer Free Spins lần này. Chúc may mắn lần sau!
            </p>
            <button
              onClick={() => setOfferBust(false)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-stone-600 to-stone-700 hover:brightness-110 text-white font-black text-sm uppercase"
            >
              Đóng
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
          <div className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-3xl p-5 bg-gradient-to-b from-stone-900 to-stone-950 border-2 border-amber-600 text-stone-200 relative">
            <button
              onClick={() => setShowHelpModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-black text-amber-300 mb-3 flex items-center gap-2">
              <span>🧧</span> Hướng Dẫn Chơi Caishen Wins
            </h3>

            {/* Paytable chính hãng PG Soft */}
            <div className="mb-3 rounded-2xl overflow-hidden border border-amber-600/60">
              <img src={CAISHEN_PAYTABLE_IMG} alt="Bảng trả thưởng gốc PG Soft" draggable={false} className="w-full h-auto" />
            </div>
            <div className="mb-4 rounded-2xl overflow-hidden border border-amber-600/60">
              <img src={CAISHEN_WAYS_IMG} alt="Cách tính ways gốc PG Soft" draggable={false} className="w-full h-auto" />
            </div>

            <div className="space-y-4 text-xs">
              <section className="p-3 rounded-2xl bg-stone-950 border border-amber-900/60">
                <h4 className="font-black text-amber-400 mb-1">Cơ Chế Wilds-on-the-Way</h4>
                <p className="text-stone-400 leading-relaxed">
                  Ở các cuộn 2, 3, 4, 5, một số biểu tượng chiếm 2-4 ô (stacked, tính 1 ways) có thể xuất hiện với <strong>Khung Bạc</strong>.
                  Khi khối Khung Bạc tham gia vào một tổ hợp chiến thắng, trong đợt rơi tiếp theo cả khối biến đổi thành cùng 1 biểu tượng mới với <strong>Khung Vàng</strong>.
                  <br />
                  Nếu khối Khung Vàng tiếp tục chiến thắng, cả khối biến đổi thành <strong>2-4 WILD</strong> tùy số ô chiếm!
                </p>
              </section>

              <section className="p-3 rounded-2xl bg-stone-950 border border-amber-900/60">
                <h4 className="font-black text-teal-300 mb-1">Top Reel & Success Caishen</h4>
                <p className="text-stone-400 leading-relaxed">
                  Hàng phụ <strong>TOP REEL</strong> nằm trên cuộn 2-5, mỗi ô tính ways riêng (tổng ways dao động <strong>2,025 - 32,400</strong>).
                  <br />
                  Khi block <strong>Thần Tài (財)</strong> phủ full 4 ô top reel, cả 4 ô hóa thành <strong>4 WILD</strong>!
                </p>
              </section>

              <section className="p-3 rounded-2xl bg-stone-950 border border-amber-900/60">
                <h4 className="font-black text-yellow-300 mb-1">Free Spins: 8 Lượt x8 + Gamble</h4>
                <p className="text-stone-400 leading-relaxed">
                  • Xuất hiện <strong>4 SCATTER</strong> nhận offer <strong>8 lượt x8</strong> (+2 lượt mỗi SCATTER thừa).
                  <br />
                  • Được <strong>Gamble</strong> thêm lượt / hệ số, mỗi lần thắng <strong>+2</strong>, tối đa <strong>20 lượt / x20</strong> — thua gamble <strong>mất toàn bộ bonus</strong>!
                  <br />
                  • Trong Free Spins mỗi lần nổ +1 multiplier, cộng dồn không reset. Retrigger 4 Scatter +8 lượt.
                </p>
              </section>

              <section className="p-3 rounded-2xl bg-stone-950 border border-amber-900/60">
                <h4 className="font-black text-red-400 mb-1">Biểu Tượng & Trả Thưởng (6 Cuộn)</h4>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-stone-900">
                    <span className="text-xl">🦁</span>
                    <div>
                      <div className="font-bold text-white">Múa Lân Vàng</div>
                      <div className="text-[10px] text-amber-400">80x (6 cuộn)</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-stone-900">
                    <span className="text-xl">🐸</span>
                    <div>
                      <div className="font-bold text-white">Cóc Vàng</div>
                      <div className="text-[10px] text-yellow-400">50x (6 cuộn)</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-stone-900">
                    <span className="text-xl">🐟</span>
                    <div>
                      <div className="font-bold text-white">Cá Chép Vàng</div>
                      <div className="text-[10px] text-orange-400">40x (6 cuộn)</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-stone-900">
                    <span className="text-xl">🧧</span>
                    <div>
                      <div className="font-bold text-white">Bao Lì Xì</div>
                      <div className="text-[10px] text-red-400">30x (6 cuộn)</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-stone-900">
                    <span className="text-xl">🔔</span>
                    <div>
                      <div className="font-bold text-white">Chiêng Khánh</div>
                      <div className="text-[10px] text-amber-400">15x (6 cuộn)</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-stone-900">
                    <span className="text-xl">🧨</span>
                    <div>
                      <div className="font-bold text-white">Pháo Đỏ</div>
                      <div className="text-[10px] text-rose-400">15x (6 cuộn)</div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="p-3 rounded-2xl bg-stone-950 border border-amber-900/60">
                <h4 className="font-black text-rose-400 mb-1">Mức Cược Vô Hạn & Mua Tính Năng</h4>
                <p className="text-stone-400 leading-relaxed">
                  Trò chơi hỗ trợ các mốc cược từ 10 🪙 đến 1,000,000 🪙 và có thể tăng cược <strong>VÔ HẠN</strong> không giới hạn trần!
                  <br />
                  Xuất hiện 4 biểu tượng 🏮 SCATTER để nhận offer 8 Vòng Quay Miễn Phí x8 (+2 lượt cho mỗi SCATTER thừa), có thể Gamble lên 20 lượt / x20. Người chơi có thể mua trực tiếp với giá 75x mức cược.
                </p>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
