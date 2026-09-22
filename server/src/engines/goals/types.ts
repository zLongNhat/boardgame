export type GoalsFieldSize = 'small' | 'medium' | 'big';
export type GoalsTileState = 'hidden' | 'safe' | 'bomb';

export const FIELD_CONFIGS = {
  small: { rows: 3, columns: 4 },
  medium: { rows: 4, columns: 7 },
  big: { rows: 5, columns: 10 }
} as const;

export interface GoalsGameSession {
  gameId: string;
  userId: string;
  betAmount: number;
  fieldSize: GoalsFieldSize;
  rows: number;
  columns: number;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  seedHash: string;
  bombPositions: number[];  // bombPositions[column] = row index of bomb
  currentColumn: number;
  revealedColumns: Map<number, number>;  // column -> chosen row
  currentMultiplier: number;
  isGameOver: boolean;
  isWin: boolean;
  cashOutMultiplier?: number;
  createdAt: number;
}

export interface GoalsPublicState {
  gameId: string;
  seedHash: string;
  fieldSize: GoalsFieldSize;
  rows: number;
  columns: number;
  betAmount: number;
  grid: GoalsTileState[][];  // [column][row]
  currentColumn: number;
  currentMultiplier: number;
  currentPayout: number;
  nextMultiplier: number;
  isGameOver: boolean;
  isWin: boolean;
  serverSeed?: string;
  clientSeed?: string;
  nonce?: number;
}
