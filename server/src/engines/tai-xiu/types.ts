export type TaiXiuPhase = 'betting' | 'shaking' | 'revealing' | 'settling';
/** Chỉ còn 2 cửa cược Tài / Xỉu (đã xóa cửa Bão). */
export type TaiXiuBetType = 'tai' | 'xiu';

/** Tỉ lệ trả thưởng: cược 1 ăn 1.95 (lãi 0.95), 0.05 mỗi cược vào hũ jackpot. */
export const TAIXIU_PAYOUT_RATE = 1.95;
export const TAIXIU_JACKPOT_FEE = 0.05;
/** Hũ nổ khi bão 3 con 1 hoặc 3 con 6. */
export const TAIXIU_JACKPOT_TRIPLES = [1, 6];

export interface TaiXiuDice {
  d1: number; d2: number; d3: number; total: number;
}

export interface TaiXiuBet {
  oddsId?: string;
  userId: string;
  displayName: string;
  betType: TaiXiuBetType;
  amount: number;
}

export interface TaiXiuJackpotWin {
  roundId: string;
  dice: TaiXiuDice;
  side: 'tai' | 'xiu';
  sharedPool: number;
  winnerCount: number;
  shareEach: number;
  timestamp: number;
}

export interface TaiXiuRoundResult {
  roundId: string;
  dice: TaiXiuDice;
  result: 'tai' | 'xiu' | 'bao';
  md5Hash: string;
  rawString: string;
  timestamp: number;
  /** Tổng tiền jackpot đã chia ở phiên này (nếu nổ hũ 1-1-1 / 6-6-6). */
  jackpotShared?: number;
}

export interface TaiXiuState {
  phase: TaiXiuPhase;
  roundId: string;
  md5Hash: string;
  phaseEndsAt: number;
  bets: TaiXiuBet[];
  totalTai: number;
  totalXiu: number;
  totalBao: number;
  dice?: TaiXiuDice;
  result?: 'tai' | 'xiu' | 'bao';
  rawString?: string;
  history: TaiXiuRoundResult[];
  onlineCount: number;
  /** Số dư hũ jackpot hiện tại. */
  jackpotPool: number;
  /** Lần nổ hũ gần nhất (để client nháy + hiển thị). */
  lastJackpot?: TaiXiuJackpotWin | null;
}
