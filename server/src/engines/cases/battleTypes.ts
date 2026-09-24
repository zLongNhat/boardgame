import { InventoryItem } from '../../auth/UserManager';
import { CaseItemTemplate } from './types';

export type BattleMode = 'standard' | 'crazy';
export type BattleStatus = 'waiting' | 'starting' | 'spinning' | 'round_ended' | 'finished';

export interface BattlePlayer {
  id: string;
  displayName: string;
  avatar: string;
  isBot: boolean;
  totalValue: number;
  drops: InventoryItem[];
}

export interface PlayerRoundTape {
  tape: CaseItemTemplate[];
  winningIndex: number;
  wonItem: CaseItemTemplate;
}

export interface BattleRoundData {
  roundIndex: number;
  caseId: string;
  caseName: string;
  casePrice: number;
  caseIcon: string;
  playerTapes: Record<string, PlayerRoundTape>; // playerId -> tape
}

export interface BattleRoom {
  id: string;
  creatorId: string;
  maxPlayers: 2 | 3 | 4;
  mode: BattleMode;
  caseIds: string[];
  totalCost: number; // cost per player
  players: BattlePlayer[];
  status: BattleStatus;
  currentRound: number;
  totalRounds: number;
  roundsHistory: BattleRoundData[];
  winnerId: string | null;
  winnerName?: string;
  allPrizes: InventoryItem[];
  createdAt: number;
}

export interface BattleRoomSummary {
  id: string;
  creatorId: string;
  maxPlayers: 2 | 3 | 4;
  mode: BattleMode;
  caseIds: string[];
  totalCost: number;
  playersCount: number;
  players: { id: string; displayName: string; avatar: string; isBot: boolean }[];
  status: BattleStatus;
  currentRound: number;
  totalRounds: number;
  winnerName?: string;
  createdAt: number;
}
