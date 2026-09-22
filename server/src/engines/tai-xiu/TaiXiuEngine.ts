import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { UserManager } from '../../auth/UserManager';
import {
  TaiXiuPhase,
  TaiXiuBetType,
  TaiXiuDice,
  TaiXiuBet,
  TaiXiuRoundResult,
  TaiXiuJackpotWin,
  TaiXiuState,
  TAIXIU_PAYOUT_RATE,
  TAIXIU_JACKPOT_FEE,
  TAIXIU_JACKPOT_TRIPLES,
} from './types';

export class TaiXiuEngine extends EventEmitter {
  private userManager: UserManager;
  
  private phase: TaiXiuPhase = 'betting';
  private roundId: string = '';
  private md5Hash: string = '';
  private rawString: string = '';
  private serverSeed: string = '';
  private phaseEndsAt: number = 0;
  private timer: NodeJS.Timeout | null = null;
  
  private bets: TaiXiuBet[] = [];
  private totalTai: number = 0;
  private totalXiu: number = 0;
  private totalBao: number = 0;
  private currentDice?: TaiXiuDice;
  private currentResult?: 'tai' | 'xiu' | 'bao';
  private history: TaiXiuRoundResult[] = [];
  private onlineCount: number = 0;
  private isRunning: boolean = false;

  // Hũ jackpot: 5% mỗi cược chảy vào hũ, nổ khi bão 1-1-1 hoặc 6-6-6
  private jackpotPool: number = 0;
  private lastJackpot: TaiXiuJackpotWin | null = null;
  private jackpotFilePath: string;

  private readonly BETTING_DURATION = 30000;
  private readonly SHAKING_DURATION = 5000;
  // Mở bát + trả thưởng gộp trong 1 phase 15s: bát nhấc lên, xúc xắc 3D tung
  // lên rơi xuống rồi chốt kết quả, tiền thắng về ví ngay lúc mở bát.
  private readonly REVEALING_DURATION = 15000;
  private readonly MAX_HISTORY = 100;

  constructor(userManager: UserManager, jackpotFilePath?: string) {
    super();
    this.userManager = userManager;
    this.jackpotFilePath = jackpotFilePath || path.resolve(__dirname, '../../../../data/taixiu-jackpot.json');
    this.loadJackpot();
  }

  private loadJackpot() {
    try {
      if (fs.existsSync(this.jackpotFilePath)) {
        const raw = fs.readFileSync(this.jackpotFilePath, 'utf-8');
        const data = JSON.parse(raw);
        if (typeof data.pool === 'number' && data.pool >= 0) this.jackpotPool = Math.floor(data.pool);
        if (data.lastJackpot) this.lastJackpot = data.lastJackpot;
      }
    } catch {
      this.jackpotPool = 0;
    }
  }

  private saveJackpot() {
    try {
      const dir = path.dirname(this.jackpotFilePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.jackpotFilePath, JSON.stringify({ pool: this.jackpotPool, lastJackpot: this.lastJackpot }, null, 2), 'utf-8');
    } catch {
      // Bỏ qua lỗi ghi file, hũ vẫn giữ trong RAM
    }
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.startNewRound();
  }

  public stop() {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  public setOnlineCount(count: number) {
    this.onlineCount = count;
  }

  private startNewRound() {
    if (!this.isRunning) return;

    this.roundId = Date.now().toString();
    this.bets = [];
    this.totalTai = 0;
    this.totalXiu = 0;
    this.totalBao = 0;
    this.currentDice = undefined;
    this.currentResult = undefined;
    this.rawString = '';

    // Generate dice and md5 for provably fair
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const d3 = Math.floor(Math.random() * 6) + 1;
    const total = d1 + d2 + d3;
    
    let result: 'tai' | 'xiu' | 'bao' = 'tai';
    if (d1 === d2 && d2 === d3) {
      result = 'bao';
    } else if (total >= 4 && total <= 10) {
      result = 'xiu';
    } else if (total >= 11 && total <= 17) {
      result = 'tai';
    }

    this.currentDice = { d1, d2, d3, total };
    this.currentResult = result;

    this.serverSeed = crypto.randomBytes(16).toString('hex');
    this.rawString = `${d1}-${d2}-${d3}-${this.serverSeed}`;
    this.md5Hash = crypto.createHash('md5').update(this.rawString).digest('hex');

    this.changePhase('betting', this.BETTING_DURATION);
  }

  private changePhase(newPhase: TaiXiuPhase, duration: number) {
    this.phase = newPhase;
    this.phaseEndsAt = Date.now() + duration;
    
    this.emit('stateChange', this.getState());

    this.timer = setTimeout(() => {
      this.handlePhaseEnd();
    }, duration);
  }

  private handlePhaseEnd() {
    if (!this.isRunning) return;

    switch (this.phase) {
      case 'betting':
        this.changePhase('shaking', this.SHAKING_DURATION);
        break;
      case 'shaking':
        // Trả thưởng ngay lúc bắt đầu mở bát để 15s vừa xem tung xúc xắc vừa nhận tiền
        this.settleBets();
        this.changePhase('revealing', this.REVEALING_DURATION);
        break;
      case 'revealing':
        this.startNewRound();
        break;
    }
  }

  private settleBets() {
    if (!this.currentResult) return;

    const dice = this.currentDice!;
    const isTriple = dice.d1 === dice.d2 && dice.d2 === dice.d3;
    const isJackpotTriple = isTriple && TAIXIU_JACKPOT_TRIPLES.includes(dice.d1);

    // 1. Trả thưởng thường 1:1.95 — bão (triple) thì Tài/Xỉu đều thua
    for (const bet of this.bets) {
      if (!isTriple && bet.betType === this.currentResult) {
        const winAmount = Math.floor(bet.amount * TAIXIU_PAYOUT_RATE);
        (this.userManager as any).addBalance(bet.userId, winAmount, `Thắng Tài Xỉu #${this.roundId} x${TAIXIU_PAYOUT_RATE}`);
      }
      // 2. 5% mỗi cược chảy vào hũ jackpot
      this.jackpotPool += Math.floor(bet.amount * TAIXIU_JACKPOT_FEE);
    }

    // 3. Nổ hũ khi bão 1-1-1 (cửa Xỉu) hoặc 6-6-6 (cửa Tài): chia đều hũ cho
    // những người đã cược đúng cửa của phiên bão đó
    let jackpotShared = 0;
    if (isJackpotTriple && this.jackpotPool > 0) {
      const side: 'tai' | 'xiu' = dice.total <= 10 ? 'xiu' : 'tai';
      const sharers = this.bets.filter((b) => b.betType === side);
      if (sharers.length > 0) {
        const shareEach = Math.floor(this.jackpotPool / sharers.length);
        if (shareEach > 0) {
          for (const w of sharers) {
            (this.userManager as any).addBalance(w.userId, shareEach, `Nổ hũ Tài Xỉu ${dice.d1}-${dice.d2}-${dice.d3} #${this.roundId}`);
          }
          jackpotShared = shareEach * sharers.length;
          this.lastJackpot = {
            roundId: this.roundId,
            dice: { ...dice },
            side,
            sharedPool: jackpotShared,
            winnerCount: sharers.length,
            shareEach,
            timestamp: Date.now(),
          };
          this.jackpotPool -= jackpotShared;
        }
      }
    }
    this.saveJackpot();

    // Save to history
    this.history.unshift({
      roundId: this.roundId,
      dice,
      result: this.currentResult,
      md5Hash: this.md5Hash,
      rawString: this.rawString,
      timestamp: Date.now(),
      ...(jackpotShared > 0 ? { jackpotShared } : {}),
    });

    if (this.history.length > this.MAX_HISTORY) {
      this.history.pop();
    }
  }

  public placeBet(userId: string, displayName: string, betType: TaiXiuBetType, amount: number): { success: boolean; message?: string } {
    if (this.phase !== 'betting') {
      return { success: false, message: 'Hết thời gian đặt cược' };
    }

    // Cửa Bão đã bị loại bỏ — chỉ còn Tài / Xỉu
    if (betType !== 'tai' && betType !== 'xiu') {
      return { success: false, message: 'Cửa Bão đã bị loại bỏ, chỉ còn Tài / Xỉu (1:1.95).' };
    }

    if (amount <= 0) {
      return { success: false, message: 'Số tiền cược không hợp lệ' };
    }

    // Attempt to deduct balance
    const result = (this.userManager as any).deductBalance(userId, amount, `Cược Tài Xỉu #${this.roundId}`);
    if (result === false || (result && result.success === false)) {
      return { success: false, message: 'Số dư không đủ hoặc lỗi trừ tiền' };
    }

    this.bets.push({ userId, displayName, betType, amount });

    if (betType === 'tai') this.totalTai += amount;
    else if (betType === 'xiu') this.totalXiu += amount;

    // Emit event on new bet to update clients
    this.emit('stateChange', this.getState());

    return { success: true, message: 'Đặt cược thành công' };
  }

  public getState(): TaiXiuState {
    const isRevealingOrLater = this.phase === 'revealing' || this.phase === 'settling';

    return {
      phase: this.phase,
      roundId: this.roundId,
      md5Hash: this.md5Hash,
      phaseEndsAt: this.phaseEndsAt,
      bets: this.bets,
      totalTai: this.totalTai,
      totalXiu: this.totalXiu,
      totalBao: this.totalBao,
      // Xúc xắc hiện số ngay từ đầu phiên (nắp bát che trên giao diện);
      // mở bát là thấy luôn mặt số
      dice: this.currentDice,
      result: this.currentResult,
      rawString: isRevealingOrLater ? this.rawString : undefined,
      history: this.history,
      onlineCount: this.onlineCount,
      jackpotPool: this.jackpotPool,
      lastJackpot: this.lastJackpot
    };
  }

  public getMaskedStateForUser(userId: string): TaiXiuState {
    const state = this.getState();
    // Hide bets from other users, but keep totals intact
    const userBets = this.bets.filter(b => b.userId === userId);
    return {
      ...state,
      bets: userBets
    };
  }
}
