export type SlotSymbolId =
  | 'cowgirl'
  | 'whiskey'
  | 'hat'
  | 'holster'
  | 'A'
  | 'K'
  | 'Q'
  | 'J'
  | 'mj_green'
  | 'mj_red'
  | 'mj_white'
  | 'mj_char8'
  | 'mj_dots5'
  | 'mj_bamboo5'
  | 'mj_dots3'
  | 'mj_bamboo2'
  | 'aztec_mask'
  | 'aztec_chief'
  | 'aztec_statue'
  | 'aztec_snake'
  | 'aztec_carving_blue'
  | 'aztec_carving_green'
  | 'caishen_lion'
  | 'caishen_toad'
  | 'caishen_koi'
  | 'caishen_angpao'
  | 'caishen_cymbal'
  | 'caishen_firecracker'
  | 'caishen_god'
  | 'cocktail_bottle'
  | 'cocktail_whiskey'
  | 'cocktail_blue'
  | 'cocktail_green'
  | 'cocktail_lemon'
  | 'cocktail_shot'
  | '10'
  | 'wild'
  | 'scatter';

export interface SlotTile {
  id: string;
  symbol: SlotSymbolId;
  isGold: boolean;
  isSilver?: boolean;
  frame?: 'none' | 'silver' | 'gold';
  isWinning?: boolean;
  transformedToWild?: boolean;
  /** Stacked block (PG Soft: 1 symbol chiếm 2-4 ô, tính 1 ways). Chỉ ô đầu có span. */
  span?: number;
  /** Ô nối của stacked block (không tính ways riêng). */
  spanCont?: boolean;
  /** Id khối block để transform đồng bộ cả khối. */
  block?: string;
  /** Ô thuộc hàng top reel (hàng phụ trên cuộn 2-5). */
  isTopReel?: boolean;
}

export interface WinningWay {
  symbol: SlotSymbolId;
  reelCount: number; // 3 to 6
  symbolCountsPerReel: number[]; // count of symbol/wild on each winning reel
  ways: number; // product of symbol counts
  basePayout: number;
  payout: number; // calculated payout for this way
  winningTileIds: string[];
}

export interface CascadeStep {
  stepIndex: number;
  grid: SlotTile[][]; // 6 columns with sizes [3, 4, 5, 5, 4, 3]
  multiplier: number; // 1, 2, 4, 8, 16 ... up to 1024
  winningWays: WinningWay[];
  stepWin: number;
  totalWinSoFar: number;
  hasWins: boolean;
  scattersCount: number;
  transformedWildIds: string[];
}

export interface FreeSpinsState {
  userId: string;
  slotId: string;
  remaining: number;
  total: number;
  betAmount: number;
  totalWon: number;
}

export interface SpinResult {
  spinId: string;
  slotId: string;
  betAmount: number;
  isFreeSpin: boolean;
  freeSpinsState?: {
    remaining: number;
    total: number;
    totalWon: number;
  };
  /** Offer chờ nhận khi trigger Free Spins Caishen (chọn Nhận hoặc Gamble). */
  freeSpinsOffer?: {
    spins: number;
    mult: number;
    gamblesLeft: number;
  } | null;
  /** Multiplier reel Cocktail Nights: giá trị khởi đầu + từng bước cascade. */
  multReel?: {
    start: number[];
    steps: { mults: number[]; used: number[]; total: number }[];
  } | null;
  cascades: CascadeStep[];
  totalWin: number;
  scattersCount: number;
  triggeredFreeSpins: number; // 0 if none, 10 (+2 per extra) if triggered
  newBalance: number;
}

export interface SlotGameInfo {
  id: string;
  name: string;
  tagline: string;
  provider: string;
  banner: string;
  reels: number[];
  rtp: string;
  maxWin: string;
  volatility: 'Thấp' | 'Trung bình' | 'Cao' | 'Siêu cao';
  features: string[];
}
