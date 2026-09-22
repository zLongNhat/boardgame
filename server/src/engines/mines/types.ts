export type MinesTileState = 'hidden' | 'star' | 'mine';

export interface MinesGameSession {
  gameId: string;
  userId: string;
  betAmount: number;
  mineCount: number;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  seedHash: string;
  minePositions: Set<number>;
  revealedTiles: Set<number>;
  currentMultiplier: number;
  isGameOver: boolean;
  isWin: boolean;
  cashOutMultiplier?: number;
  createdAt: number;
}

export interface MinesPublicState {
  gameId: string;
  seedHash: string;
  mineCount: number;
  betAmount: number;
  grid: MinesTileState[];
  revealedCount: number;
  currentMultiplier: number;
  currentPayout: number;
  nextMultiplier: number;
  isGameOver: boolean;
  isWin: boolean;
  serverSeed?: string;
  clientSeed?: string;
  nonce?: number;
}
