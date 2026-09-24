export type SlotSymbolId =
  | 'cowgirl'
  | 'whiskey'
  | 'hat'
  | 'holster'
  | 'A'
  | 'K'
  | 'Q'
  | 'J'
  | 'wild'
  | 'scatter';

export interface SlotTile {
  id: string;
  symbol: SlotSymbolId;
  isGold: boolean;
  isWinning?: boolean;
  transformedToWild?: boolean;
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
