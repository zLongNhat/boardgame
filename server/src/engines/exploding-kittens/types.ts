import { BaseGameState, BasePlayer } from '../BaseGame';

export type ExplodingKittensCardType =
  | 'exploding_kitten'
  | 'defuse'
  | 'attack'
  | 'skip'
  | 'favor'
  | 'shuffle'
  | 'see_the_future'
  | 'nope'
  | 'taco_cat'
  | 'hairy_potato_cat'
  | 'rainbow_ralphing_cat'
  | 'beard_cat'
  | 'cattermelon';

export interface EKCard {
  id: string;
  type: ExplodingKittensCardType;
  name: string;
  description: string;
}

export interface EKPlayer extends BasePlayer {
  cardCount: number;
  defuseCount: number;
  isExploded?: boolean;
}

export interface PendingAction {
  id: string;
  initiatorId: string;
  card: EKCard;
  actionType: 'single_card' | 'cat_pair' | 'cat_triple';
  targetPlayerId?: string;
  requestedCardType?: ExplodingKittensCardType;
  additionalCardIds?: string[];
  nopeCount: number; // 0 = not noped, 1 = noped, 2 = nope-noped, etc.
  expiresAt: number; // Unix timestamp
}

export interface PendingDefusal {
  playerId: string;
  kittenCard: EKCard;
  expiresAt: number;
}

export interface PendingFavor {
  fromPlayerId: string;
  toPlayerId: string;
}

export interface ExplodingKittensGameState extends BaseGameState {
  gameType: 'exploding-kittens';
  drawPileCount: number;
  discardPile: EKCard[];
  lastPlayedBy?: string;
  lastPlayedCard?: EKCard;
  players: EKPlayer[];
  pendingTurnsForCurrentPlayer: number; // For Attack accumulation
  pendingAction: PendingAction | null;
  pendingDefusal: PendingDefusal | null;
  pendingFavor: PendingFavor | null;
}

export interface MaskedEKPlayer {
  id: string;
  name: string;
  avatar: string;
  isBot: boolean;
  connected: boolean;
  cardCount: number;
  eliminated?: boolean;
}

export interface MaskedEKGameState {
  gameType: 'exploding-kittens';
  drawPileCount: number;
  discardPile: EKCard[];
  lastPlayedBy?: string;
  lastPlayedCard?: EKCard;
  currentTurnIndex: number;
  direction: 1 | -1;
  turnTimeLimit: number;
  turnStartTime: number;
  isGameOver: boolean;
  winners: string[];
  players: MaskedEKPlayer[];
  myHand: EKCard[];
  pendingTurns: number;
  pendingAction: PendingAction | null;
  pendingDefusal: PendingDefusal | null;
  pendingFavor: PendingFavor | null;
  logs: BaseGameState['logs'];
}

export type EKAction =
  | { type: 'DRAW_CARD' }
  | { type: 'PLAY_ACTION'; cardId: string; targetPlayerId?: string }
  | { type: 'PLAY_CAT_COMBO'; cardIds: string[]; targetPlayerId: string; requestedType?: ExplodingKittensCardType }
  | { type: 'PLAY_NOPE'; cardId: string }
  | { type: 'RESOLVE_DEFUSE'; cardId: string; insertionMode: 'top' | 'bottom' | 'random' | 'index'; targetIndex?: number }
  | { type: 'GIVE_FAVOR_CARD'; cardId: string };
