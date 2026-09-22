export type GameType = 'uno' | 'exploding-kittens' | 'tien-len';
export type UnoMode = 'classic' | 'no-mercy' | 'flex';
export type UnoColor = 'red' | 'blue' | 'green' | 'yellow' | 'wild';

export interface UserStats {
  unoWins: number;
  explodingKittensWins: number;
  tienLenWins: number;
  totalWins: number;
  totalGames: number;
}

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  stats: UserStats;
}

export interface RoomPlayer {
  id: string;
  sessionId?: string;
  userId?: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isBot: boolean;
  isReady: boolean;
  connected: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface EKExpansions {
  implodingKittens: boolean;
  streakingKittens: boolean;
  barkingKittens: boolean;
  timebombMode: boolean;
}

export interface RoomSettings {
  gameType: GameType;
  turnTimeLimit: number;
  unoMode: UnoMode;
  unoRules: {
    freeStacking: boolean;
    jumpIn: boolean;
    sevenZero: boolean;
    unoPenalty: boolean;
    mercyLimit: number;
    drawToMatch: boolean;
  };
  tienLenFirstTurnRule: boolean;
  ekExpansions: EKExpansions;
}

export interface RoomState {
  id: string;
  hostId: string;
  players: RoomPlayer[];
  settings: RoomSettings;
  inGame: boolean;
  chatMessages: ChatMessage[];
}

export interface GameLogEntry {
  id: string;
  timestamp: number;
  message: string;
  type: 'info' | 'action' | 'warning' | 'win' | 'special';
  playerId?: string;
}

// UNO
export interface UnoCard {
  id: string;
  color: UnoColor;
  value: string;
  pointValue: number;
  flexColor?: UnoColor;
  flexValue?: string;
}

export interface MaskedUnoPlayer {
  id: string;
  name: string;
  avatar: string;
  isBot: boolean;
  connected: boolean;
  cardCount: number;
  hasCalledUno: boolean;
  flexPowerActive: boolean;
  eliminated?: boolean;
  score?: number;
}

export interface MaskedUnoGameState {
  gameType: 'uno';
  mode: UnoMode;
  rules: RoomSettings['unoRules'];
  activeColor: UnoColor;
  topCard: UnoCard;
  lastPlayedBy?: string;
  lastPlayedCard?: UnoCard;
  lastPlayTimestamp?: number;
  pendingDrawCount: number;
  drawPileCount: number;
  currentTurnIndex: number;
  direction: 1 | -1;
  turnTimeLimit: number;
  turnStartTime: number;
  isGameOver: boolean;
  winners: string[];
  players: MaskedUnoPlayer[];
  myHand: UnoCard[];
  myFlexPower: boolean;
  canCallUno: boolean;
  canCatchUno: string[];
  logs: GameLogEntry[];
}

// Exploding Kittens
export type EKCardType =
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
  | 'cattermelon'
  // Imploding Kittens
  | 'imploding_kitten'
  | 'targeted_attack'
  | 'reverse'
  | 'draw_from_bottom'
  | 'feral_cat'
  | 'alter_the_future_3x'
  // Streaking Kittens
  | 'streaking_kitten'
  | 'super_skip'
  | 'see_the_future_5x'
  | 'alter_the_future_5x'
  | 'swap_top_and_bottom'
  | 'catomic_bomb'
  | 'garbage_collection'
  | 'curse_of_cat_butt'
  // Barking Kittens
  | 'barking_kitten'
  | 'personal_attack'
  | 'bury'
  | 'ill_take_that'
  | 'share_the_future';

export interface EKCard {
  id: string;
  type: EKCardType;
  name: string;
  description: string;
  isFaceUp?: boolean;
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

export interface PendingAction {
  id: string;
  initiatorId: string;
  card: EKCard;
  actionType: 'single_card' | 'cat_pair' | 'cat_triple';
  targetPlayerId?: string;
  requestedCardType?: EKCardType;
  nopeCount: number;
  expiresAt: number;
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
  logs: GameLogEntry[];
  topDrawCardIsFaceUp?: boolean;
  topDrawCardName?: string;
  ekExpansions?: EKExpansions;
  curseActive?: boolean;
}

// Tiến Lên
export type Suit = 'spades' | 'clubs' | 'diamonds' | 'hearts';
export type CardValue = '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' | '2';

export interface TLCard {
  id: string;
  suit: Suit;
  value: CardValue;
  rankValue: number;
  suitValue: number;
  overallRank: number;
}

export interface CardCombo {
  type: string;
  cards: TLCard[];
  highestCard: TLCard;
  length: number;
}

export interface PlayedTrick {
  playerId: string;
  combo: CardCombo;
  timestamp: number;
}

export interface MaskedTLPlayer {
  id: string;
  name: string;
  avatar: string;
  isBot: boolean;
  connected: boolean;
  cardCount: number;
  hasPassedCurrentRound: boolean;
  rank?: number;
  isCong?: boolean;
  eliminated?: boolean;
}

export interface MaskedTLGameState {
  gameType: 'tien-len';
  players: MaskedTLPlayer[];
  currentTurnIndex: number;
  direction: 1 | -1;
  turnTimeLimit: number;
  turnStartTime: number;
  isGameOver: boolean;
  winners: string[];
  myHand: TLCard[];
  currentTrick: PlayedTrick | null;
  trickHistory: PlayedTrick[];
  firstTurnRule: boolean;
  logs: GameLogEntry[];
}

export type AnyMaskedGameState = MaskedUnoGameState | MaskedEKGameState | MaskedTLGameState;
