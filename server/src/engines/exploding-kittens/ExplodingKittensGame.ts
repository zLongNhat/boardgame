import crypto from 'crypto';
import { BaseGame } from '../BaseGame';
import {
  EKAction,
  EKCard,
  EKPlayer,
  ExplodingKittensCardType,
  ExplodingKittensGameState,
  MaskedEKGameState,
  MaskedEKPlayer,
  PendingAction,
  PendingDefusal,
  PendingFavor
} from './types';

const CARD_DEFINITIONS: { type: ExplodingKittensCardType; name: string; description: string; count: number }[] = [
  { type: 'attack', name: 'Tấn Công (2X)', description: 'Kết thúc lượt không cần rút bài và ép người kế tiếp đánh 2 lượt.', count: 4 },
  { type: 'skip', name: 'Bỏ Qua', description: 'Kết thúc lượt ngay lập tức mà không cần rút bài.', count: 4 },
  { type: 'favor', name: 'Xin Xỏ', description: 'Ép một người chơi bất kỳ phải nộp cho bạn 1 lá bài họ chọn.', count: 4 },
  { type: 'shuffle', name: 'Xáo Bài', description: 'Xáo trộn lại toàn bộ chồng bài rút một cách ngẫu nhiên.', count: 4 },
  { type: 'see_the_future', name: 'Soi Tương Lai (3X)', description: 'Bí mật xem trước 3 lá bài trên cùng của chồng bài rút.', count: 5 },
  { type: 'nope', name: 'Chặn Nope!', description: 'Chặn đứng tác dụng của thẻ bài bất kỳ. Có thể bị chặn tiếp bởi Nope khác.', count: 5 },
  { type: 'taco_cat', name: 'Mèo Taco', description: 'Đánh cặp mèo giống nhau để cướp ngẫu nhiên 1 lá bài từ đối thủ.', count: 4 },
  { type: 'hairy_potato_cat', name: 'Mèo Khoai Tây', description: 'Đánh cặp mèo giống nhau để cướp ngẫu nhiên 1 lá bài từ đối thủ.', count: 4 },
  { type: 'rainbow_ralphing_cat', name: 'Mèo Cầu Vồng', description: 'Đánh cặp mèo giống nhau để cướp ngẫu nhiên 1 lá bài từ đối thủ.', count: 4 },
  { type: 'beard_cat', name: 'Mèo Râu Xù', description: 'Đánh cặp mèo giống nhau để cướp ngẫu nhiên 1 lá bài từ đối thủ.', count: 4 },
  { type: 'cattermelon', name: 'Mèo Dưa Hấu', description: 'Đánh cặp mèo giống nhau để cướp ngẫu nhiên 1 lá bài từ đối thủ.', count: 4 }
];

export class ExplodingKittensGame extends BaseGame<ExplodingKittensGameState, EKAction, MaskedEKGameState> {
  private drawPile: EKCard[] = [];
  private discardPile: EKCard[] = [];
  private hands: Map<string, EKCard[]> = new Map();

  private nopeTimer: NodeJS.Timeout | null = null;
  private defusalTimer: NodeJS.Timeout | null = null;

  constructor(
    players: { id: string; name: string; avatar: string; isBot: boolean }[],
    turnTimeLimit: number = 30
  ) {
    const ekPlayers: EKPlayer[] = players.map(p => ({
      ...p,
      connected: true,
      cardCount: 0,
      defuseCount: 1,
      eliminated: false,
      isExploded: false
    }));

    const initialState: ExplodingKittensGameState = {
      gameType: 'exploding-kittens',
      players: ekPlayers,
      currentTurnIndex: 0,
      direction: 1,
      turnTimeLimit,
      turnStartTime: Date.now(),
      isGameOver: false,
      winners: [],
      logs: [],
      drawPileCount: 0,
      discardPile: [],
      pendingTurnsForCurrentPlayer: 1,
      pendingAction: null,
      pendingDefusal: null,
      pendingFavor: null
    };

    super(initialState);
  }

  public start(): void {
    const playerCount = this.state.players.length;
    this.hands.clear();
    this.discardPile = [];

    // 1. Build starter non-exploding deck
    let generalDeck: EKCard[] = [];
    for (const def of CARD_DEFINITIONS) {
      for (let i = 0; i < def.count; i++) {
        generalDeck.push({
          id: crypto.randomUUID(),
          type: def.type,
          name: def.name,
          description: def.description
        });
      }
    }
    generalDeck = BaseGame.shuffleDeck(generalDeck);

    // 2. Deal 1 Defuse and 4 cards to each player (total 5 cards each)
    for (const player of this.state.players) {
      const playerHand: EKCard[] = [
        {
          id: crypto.randomUUID(),
          type: 'defuse',
          name: 'Gỡ Bom',
          description: 'Tự cứu mình khỏi bị nổ tung. Bí mật nhét lại lá Mèo Nổ vào bộ bài.'
        },
        ...generalDeck.splice(0, 4)
      ];
      this.hands.set(player.id, playerHand);
      player.cardCount = playerHand.length;
      player.defuseCount = 1;
      player.eliminated = false;
      player.isExploded = false;
    }

    // 3. Add remaining Defuses (6 - playerCount)
    const extraDefuses = Math.max(0, 6 - playerCount);
    for (let i = 0; i < extraDefuses; i++) {
      generalDeck.push({
        id: crypto.randomUUID(),
        type: 'defuse',
        name: 'Gỡ Bom',
        description: 'Tự cứu mình khỏi bị nổ tung. Bí mật nhét lại lá Mèo Nổ vào bộ bài.'
      });
    }

    // 4. Add (playerCount - 1) Exploding Kittens
    for (let i = 0; i < playerCount - 1; i++) {
      generalDeck.push({
        id: crypto.randomUUID(),
        type: 'exploding_kitten',
        name: 'Mèo Nổ',
        description: 'Rút phải lá này nếu không có thẻ Gỡ Bom, bạn sẽ bị nổ tung và thua cuộc!'
      });
    }

    // 5. Final deck shuffle
    this.drawPile = BaseGame.shuffleDeck(generalDeck);
    this.state.drawPileCount = this.drawPile.length;
    this.state.discardPile = [];
    this.state.currentTurnIndex = 0;
    this.state.pendingTurnsForCurrentPlayer = 1;
    this.state.pendingAction = null;
    this.state.pendingDefusal = null;
    this.state.pendingFavor = null;
    this.state.isGameOver = false;

    this.addLog(`Exploding Kittens started with ${playerCount} players! ${playerCount - 1} Kittens in the deck.`, 'info');
    this.resetTurnTimer();
    this.emitStateChange();
  }

  public handleAction(playerId: string, action: EKAction): { success: boolean; message?: string } {
    if (this.state.isGameOver) return { success: false, message: 'Game is over.' };

    const playerIndex = this.state.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return { success: false, message: 'Player not found.' };
    const player = this.state.players[playerIndex];
    if (player.eliminated) return { success: false, message: 'Player is eliminated.' };

    // 1. NOPE can be played anytime during a pendingAction window
    if (action.type === 'PLAY_NOPE') {
      return this.handlePlayNope(playerId, action.cardId);
    }

    // 2. FAVOR response (if pending favor belongs to this player)
    if (action.type === 'GIVE_FAVOR_CARD') {
      return this.handleGiveFavorCard(playerId, action.cardId);
    }

    // 3. DEFUSE response (if player is currently defusing)
    if (action.type === 'RESOLVE_DEFUSE') {
      return this.handleResolveDefuse(playerId, action);
    }

    // If there is an active Nope window or pending Defusal, block other actions
    if (this.state.pendingAction) {
      return { success: false, message: 'Wait for the Nope window to resolve.' };
    }
    if (this.state.pendingDefusal) {
      return { success: false, message: 'A player is currently defusing an Exploding Kitten!' };
    }
    if (this.state.pendingFavor) {
      return { success: false, message: 'Waiting for favor card selection.' };
    }

    // Regular turn actions
    if (this.state.currentTurnIndex !== playerIndex) {
      return { success: false, message: 'Not your turn.' };
    }

    switch (action.type) {
      case 'DRAW_CARD':
        return this.handleDrawCard(playerId);
      case 'PLAY_ACTION':
        return this.handlePlayActionCard(playerId, action.cardId, action.targetPlayerId);
      case 'PLAY_CAT_COMBO':
        return this.handlePlayCatCombo(playerId, action.cardIds, action.targetPlayerId, action.requestedType);
      default:
        return { success: false, message: 'Unsupported action.' };
    }
  }

  private handlePlayNope(playerId: string, cardId: string): { success: boolean; message?: string } {
    if (!this.state.pendingAction) {
      return { success: false, message: 'Nothing to Nope right now!' };
    }

    const hand = this.hands.get(playerId);
    if (!hand) return { success: false, message: 'Hand not found.' };

    const cardIndex = hand.findIndex(c => c.id === cardId && c.type === 'nope');
    if (cardIndex === -1) {
      return { success: false, message: 'You do not have a Nope card.' };
    }

    // Consume Nope card
    const [nopeCard] = hand.splice(cardIndex, 1);
    this.discardPile.push(nopeCard);
    this.state.discardPile = [...this.discardPile];
    this.state.lastPlayedBy = playerId;
    this.state.lastPlayedCard = nopeCard;

    const player = this.state.players.find(p => p.id === playerId)!;
    player.cardCount = hand.length;

    // Increment Nope counter
    this.state.pendingAction.nopeCount++;
    const isNowNoped = this.state.pendingAction.nopeCount % 2 === 1;

    this.addLog(
      `${player.name} slammed a NOPE! 🚫 (Total Nopes: ${this.state.pendingAction.nopeCount} -> ${isNowNoped ? 'ACTION CANCELLED' : 'ACTION RESTORED'})`,
      'special',
      playerId
    );

    // Reset reaction timer to give 3 more seconds for counter-nopes
    this.resetNopeTimer(3000);
    this.emitStateChange();
    return { success: true };
  }

  private startPendingAction(action: PendingAction) {
    this.state.pendingAction = action;
    this.resetNopeTimer(3000);
    this.emitStateChange();
  }

  private resetNopeTimer(durationMs: number = 3000) {
    if (this.nopeTimer) {
      clearTimeout(this.nopeTimer);
    }
    this.state.pendingAction!.expiresAt = Date.now() + durationMs;

    this.nopeTimer = setTimeout(() => {
      this.resolvePendingAction();
    }, durationMs);
    if (this.nopeTimer && typeof this.nopeTimer.unref === 'function') {
      this.nopeTimer.unref();
    }
  }

  private resolvePendingAction() {
    if (this.nopeTimer) {
      clearTimeout(this.nopeTimer);
      this.nopeTimer = null;
    }

    const pending = this.state.pendingAction;
    if (!pending) return;

    this.state.pendingAction = null;

    // If odd number of Nopes, the action is cancelled!
    if (pending.nopeCount % 2 === 1) {
      this.addLog(`Action [${pending.card.name}] was successfully NOPED and cancelled!`, 'warning');
      this.emitStateChange();
      return;
    }

    // Otherwise, action executes!
    this.addLog(`Action [${pending.card.name}] resolves!`, 'info');

    if (pending.actionType === 'cat_pair') {
      this.executeCatPair(pending.initiatorId, pending.targetPlayerId!);
    } else if (pending.actionType === 'cat_triple') {
      this.executeCatTriple(pending.initiatorId, pending.targetPlayerId!, pending.requestedCardType);
    } else {
      this.executeCardAction(pending.initiatorId, pending.card.type, pending.targetPlayerId);
    }

    this.emitStateChange();
  }

  private handlePlayActionCard(playerId: string, cardId: string, targetPlayerId?: string): { success: boolean; message?: string } {
    const hand = this.hands.get(playerId)!;
    const cardIndex = hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return { success: false, message: 'Card not in hand.' };

    const card = hand[cardIndex];
    if (card.type === 'nope' || card.type === 'defuse' || card.type === 'exploding_kitten') {
      return { success: false, message: 'This card cannot be played as an action now.' };
    }

    if (card.type.endsWith('_cat')) {
      return { success: false, message: 'Cat cards must be played as a pair or triple combo.' };
    }

    if (card.type === 'favor' && !targetPlayerId) {
      return { success: false, message: 'You must select a target player for Favor.' };
    }

    // Remove card from hand and move to discard
    hand.splice(cardIndex, 1);
    this.discardPile.push(card);
    this.state.discardPile = [...this.discardPile];
    this.state.lastPlayedBy = playerId;
    this.state.lastPlayedCard = card;

    const player = this.state.players.find(p => p.id === playerId)!;
    player.cardCount = hand.length;

    this.addLog(`${player.name} wants to play ${card.name}... (3s Nope window)`, 'action', playerId);

    // Trigger Nope window
    this.startPendingAction({
      id: crypto.randomUUID(),
      initiatorId: playerId,
      card,
      actionType: 'single_card',
      targetPlayerId,
      nopeCount: 0,
      expiresAt: Date.now() + 3000
    });

    return { success: true };
  }

  private handlePlayCatCombo(
    playerId: string,
    cardIds: string[],
    targetPlayerId: string,
    requestedType?: ExplodingKittensCardType
  ): { success: boolean; message?: string } {
    if (!targetPlayerId || targetPlayerId === playerId) {
      return { success: false, message: 'Please select a valid opponent.' };
    }

    const hand = this.hands.get(playerId)!;
    const selectedCards = hand.filter(c => cardIds.includes(c.id));

    if (selectedCards.length !== 2 && selectedCards.length !== 3) {
      return { success: false, message: 'Cat combos require exactly 2 or 3 matching cat cards.' };
    }

    const firstType = selectedCards[0].type;
    const allMatch = selectedCards.every(c => c.type === firstType && c.type.endsWith('_cat'));
    if (!allMatch) {
      return { success: false, message: 'All selected cards must be the same cat type.' };
    }

    // Remove cards from hand
    for (const card of selectedCards) {
      const idx = hand.findIndex(c => c.id === card.id);
      if (idx !== -1) hand.splice(idx, 1);
      this.discardPile.push(card);
    }
    this.state.discardPile = [...this.discardPile];
    this.state.lastPlayedBy = playerId;
    this.state.lastPlayedCard = selectedCards[0];

    const player = this.state.players.find(p => p.id === playerId)!;
    player.cardCount = hand.length;

    const comboType = selectedCards.length === 2 ? 'cat_pair' : 'cat_triple';
    this.addLog(`${player.name} played a ${selectedCards[0].name} combo (${selectedCards.length}x)! (3s Nope window)`, 'special', playerId);

    this.startPendingAction({
      id: crypto.randomUUID(),
      initiatorId: playerId,
      card: selectedCards[0],
      actionType: comboType,
      targetPlayerId,
      requestedCardType: requestedType,
      additionalCardIds: cardIds,
      nopeCount: 0,
      expiresAt: Date.now() + 3000
    });

    return { success: true };
  }

  private executeCardAction(playerId: string, cardType: ExplodingKittensCardType, targetPlayerId?: string) {
    const player = this.state.players.find(p => p.id === playerId)!;

    switch (cardType) {
      case 'attack': {
        // Ends turn without drawing and passes 2 turns to next player
        this.addLog(`${player.name} attacked! Next player must take 2 turns!`, 'action', playerId);
        this.state.pendingTurnsForCurrentPlayer = 0;
        this.advanceTurn(1, 2);
        break;
      }

      case 'skip': {
        this.addLog(`${player.name} skipped a turn without drawing!`, 'action', playerId);
        this.state.pendingTurnsForCurrentPlayer--;
        if (this.state.pendingTurnsForCurrentPlayer <= 0) {
          this.advanceTurn(1, 1);
        } else {
          this.addLog(`${player.name} has ${this.state.pendingTurnsForCurrentPlayer} turn(s) remaining.`, 'info', playerId);
          this.resetTurnTimer();
        }
        break;
      }

      case 'shuffle': {
        this.drawPile = BaseGame.shuffleDeck(this.drawPile);
        this.addLog(`${player.name} shuffled the Draw Deck!`, 'action', playerId);
        break;
      }

      case 'see_the_future': {
        // Privately emit the top 3 cards to this player
        const top3 = this.drawPile.slice(-3).reverse();
        this.emitPrivateMessage(playerId, 'ek_see_future', { cards: top3 });
        this.addLog(`${player.name} peered into the future... 🔮`, 'action', playerId);
        break;
      }

      case 'favor': {
        if (!targetPlayerId) break;
        const target = this.state.players.find(p => p.id === targetPlayerId);
        if (!target) break;

        this.state.pendingFavor = {
          fromPlayerId: targetPlayerId,
          toPlayerId: playerId
        };
        this.addLog(`${player.name} asked for a FAVOR from ${target.name}!`, 'action', playerId);
        break;
      }
    }
  }

  private executeCatPair(initiatorId: string, targetId: string) {
    const initiator = this.state.players.find(p => p.id === initiatorId)!;
    const target = this.state.players.find(p => p.id === targetId)!;
    const targetHand = this.hands.get(targetId);
    const initiatorHand = this.hands.get(initiatorId)!;

    if (!targetHand || targetHand.length === 0) {
      this.addLog(`${target.name} has no cards to steal!`, 'warning');
      return;
    }

    // Steal random card
    const randIdx = crypto.randomInt(0, targetHand.length);
    const [stolen] = targetHand.splice(randIdx, 1);
    initiatorHand.push(stolen);

    initiator.cardCount = initiatorHand.length;
    target.cardCount = targetHand.length;
    initiator.defuseCount = initiatorHand.filter(c => c.type === 'defuse').length;
    target.defuseCount = targetHand.filter(c => c.type === 'defuse').length;

    this.addLog(`${initiator.name} stole a card from ${target.name}!`, 'special', initiatorId);
  }

  private executeCatTriple(initiatorId: string, targetId: string, requestedType?: ExplodingKittensCardType) {
    const initiator = this.state.players.find(p => p.id === initiatorId)!;
    const target = this.state.players.find(p => p.id === targetId)!;
    const targetHand = this.hands.get(targetId);
    const initiatorHand = this.hands.get(initiatorId)!;

    if (!targetHand || !requestedType) return;

    const matchIdx = targetHand.findIndex(c => c.type === requestedType);
    if (matchIdx !== -1) {
      const [stolen] = targetHand.splice(matchIdx, 1);
      initiatorHand.push(stolen);

      initiator.cardCount = initiatorHand.length;
      target.cardCount = targetHand.length;
      initiator.defuseCount = initiatorHand.filter(c => c.type === 'defuse').length;
      target.defuseCount = targetHand.filter(c => c.type === 'defuse').length;

      this.addLog(`${initiator.name} demanded [${stolen.name}] from ${target.name} and GOT IT!`, 'special', initiatorId);
    } else {
      this.addLog(`${initiator.name} demanded [${requestedType}] from ${target.name}, but they didn't have it!`, 'info', initiatorId);
    }
  }

  private handleGiveFavorCard(playerId: string, cardId: string): { success: boolean; message?: string } {
    const favor = this.state.pendingFavor;
    if (!favor || favor.fromPlayerId !== playerId) {
      return { success: false, message: 'You are not requested to give a favor card.' };
    }

    const giverHand = this.hands.get(playerId);
    if (!giverHand) return { success: false, message: 'Hand not found.' };

    const cardIdx = giverHand.findIndex(c => c.id === cardId);
    if (cardIdx === -1) return { success: false, message: 'Card not in hand.' };

    const [card] = giverHand.splice(cardIdx, 1);
    const receiverHand = this.hands.get(favor.toPlayerId)!;
    receiverHand.push(card);

    const giver = this.state.players.find(p => p.id === playerId)!;
    const receiver = this.state.players.find(p => p.id === favor.toPlayerId)!;

    giver.cardCount = giverHand.length;
    receiver.cardCount = receiverHand.length;
    giver.defuseCount = giverHand.filter(c => c.type === 'defuse').length;
    receiver.defuseCount = receiverHand.filter(c => c.type === 'defuse').length;

    this.addLog(`${giver.name} handed over a favor card to ${receiver.name}.`, 'special', playerId);
    this.state.pendingFavor = null;

    this.emitStateChange();
    return { success: true };
  }

  private handleDrawCard(playerId: string): { success: boolean; message?: string } {
    if (this.drawPile.length === 0) {
      return { success: false, message: 'Draw pile is empty.' };
    }

    const player = this.state.players.find(p => p.id === playerId)!;
    const drawn = this.drawPile.pop()!;
    this.state.drawPileCount = this.drawPile.length;

    if (drawn.type === 'exploding_kitten') {
      // Exploding Kitten drawn!
      this.addLog(`💥 ${player.name} DREW AN EXPLODING KITTEN! 💣`, 'warning', playerId);
      this.triggerDefusalEmergency(playerId, drawn);
      return { success: true };
    }

    // Normal card drawn
    const hand = this.hands.get(playerId)!;
    hand.push(drawn);
    player.cardCount = hand.length;
    if (drawn.type === 'defuse') {
      player.defuseCount++;
    }

    this.addLog(`${player.name} drew a card safely.`, 'info', playerId);

    this.state.pendingTurnsForCurrentPlayer--;
    if (this.state.pendingTurnsForCurrentPlayer <= 0) {
      this.advanceTurn(1, 1);
    } else {
      this.addLog(`${player.name} still has ${this.state.pendingTurnsForCurrentPlayer} turn(s) left!`, 'info', playerId);
      this.resetTurnTimer();
      this.emitStateChange();
    }

    return { success: true };
  }

  private triggerDefusalEmergency(playerId: string, kittenCard: EKCard) {
    this.clearTurnTimer();

    const player = this.state.players.find(p => p.id === playerId)!;
    const hand = this.hands.get(playerId) || [];
    const hasDefuse = hand.some(c => c.type === 'defuse');

    this.state.pendingDefusal = {
      playerId,
      kittenCard,
      expiresAt: Date.now() + 10000 // 10 seconds emergency window
    };

    if (hasDefuse) {
      this.addLog(`🚨 ${player.name} has 10 seconds to play a DEFUSE card!`, 'warning', playerId);
    } else {
      this.addLog(`💀 ${player.name} has NO Defuse card! Preparing for explosion...`, 'warning', playerId);
    }

    this.defusalTimer = setTimeout(() => {
      this.handleDefusalTimeout();
    }, 10000);
    if (this.defusalTimer && typeof this.defusalTimer.unref === 'function') {
      this.defusalTimer.unref();
    }

    this.emitStateChange();
  }

  private handleResolveDefuse(
    playerId: string,
    action: Extract<EKAction, { type: 'RESOLVE_DEFUSE' }>
  ): { success: boolean; message?: string } {
    if (!this.state.pendingDefusal || this.state.pendingDefusal.playerId !== playerId) {
      return { success: false, message: 'You are not in a defusal emergency.' };
    }

    const hand = this.hands.get(playerId);
    if (!hand) return { success: false, message: 'Hand not found.' };

    const defuseIdx = hand.findIndex(c => c.type === 'defuse');
    if (defuseIdx === -1) {
      return { success: false, message: 'You do not have a Defuse card!' };
    }

    // Clear defusal timer
    if (this.defusalTimer) {
      clearTimeout(this.defusalTimer);
      this.defusalTimer = null;
    }

    // 1. Consume Defuse card to discard pile
    const [defuseCard] = hand.splice(defuseIdx, 1);
    this.discardPile.push(defuseCard);
    this.state.discardPile = [...this.discardPile];
    this.state.lastPlayedBy = playerId;
    this.state.lastPlayedCard = defuseCard;

    const player = this.state.players.find(p => p.id === playerId)!;
    player.cardCount = hand.length;
    player.defuseCount = hand.filter(c => c.type === 'defuse').length;

    // 2. Secretly insert the Kitten back into the draw deck
    const kitten = this.state.pendingDefusal.kittenCard;
    const deckLen = this.drawPile.length;

    if (action.insertionMode === 'top') {
      this.drawPile.push(kitten); // Top is at end of array
      this.addLog(`${player.name} secretly inserted the Kitten back into the deck!`, 'special', playerId);
    } else if (action.insertionMode === 'bottom') {
      this.drawPile.unshift(kitten);
      this.addLog(`${player.name} secretly inserted the Kitten back into the deck!`, 'special', playerId);
    } else if (action.insertionMode === 'random') {
      const idx = crypto.randomInt(0, deckLen + 1);
      this.drawPile.splice(idx, 0, kitten);
      this.addLog(`${player.name} secretly inserted the Kitten back into the deck!`, 'special', playerId);
    } else if (action.insertionMode === 'index' && typeof action.targetIndex === 'number') {
      const clampedIdx = Math.max(0, Math.min(deckLen, action.targetIndex));
      this.drawPile.splice(clampedIdx, 0, kitten);
      this.addLog(`${player.name} secretly inserted the Kitten back into the deck!`, 'special', playerId);
    }

    this.state.drawPileCount = this.drawPile.length;
    this.state.pendingDefusal = null;

    // Turn completes
    this.state.pendingTurnsForCurrentPlayer--;
    if (this.state.pendingTurnsForCurrentPlayer <= 0) {
      this.advanceTurn(1, 1);
    } else {
      this.resetTurnTimer();
      this.emitStateChange();
    }

    return { success: true };
  }

  private handleDefusalTimeout() {
    if (this.defusalTimer) {
      clearTimeout(this.defusalTimer);
      this.defusalTimer = null;
    }

    if (!this.state.pendingDefusal) return;

    const playerId = this.state.pendingDefusal.playerId;
    const player = this.state.players.find(p => p.id === playerId)!;

    // Player explodes!
    player.eliminated = true;
    player.isExploded = true;

    // Discard all player's cards
    const hand = this.hands.get(playerId) || [];
    this.discardPile.push(...hand);
    this.state.discardPile = [...this.discardPile];
    this.hands.set(playerId, []);
    player.cardCount = 0;
    player.defuseCount = 0;

    this.addLog(`💥💥💥 BOOM! ${player.name} exploded and is ELIMINATED from the game!`, 'warning', playerId);

    this.state.pendingDefusal = null;

    // Check remaining survivors
    const survivors = this.state.players.filter(p => !p.eliminated);
    if (survivors.length === 1) {
      this.handlePlayerWon(survivors[0].id);
      return;
    }

    // Advance turn to next survivor
    this.state.pendingTurnsForCurrentPlayer = 1;
    this.advanceTurn(1, 1);
  }

  private advanceTurn(step: number = 1, newPendingTurns: number = 1) {
    if (this.state.isGameOver) return;

    this.state.currentTurnIndex = this.getNextPlayerIndex(step);
    this.state.pendingTurnsForCurrentPlayer = newPendingTurns;

    const next = this.getCurrentPlayer();
    if (next) {
      this.addLog(`It is now ${next.name}'s turn (${this.state.pendingTurnsForCurrentPlayer} turn(s)).`, 'info');
    }

    this.resetTurnTimer();
    this.emitStateChange();
  }

  public handleTurnTimeout(): void {
    const current = this.getCurrentPlayer();
    if (!current || this.state.isGameOver) return;

    this.addLog(`${current.name} timed out! Auto-drawing card...`, 'warning', current.id);
    this.handleDrawCard(current.id);
  }

  private handlePlayerWon(playerId: string) {
    const winner = this.state.players.find(p => p.id === playerId);
    const name = winner ? winner.name : 'Unknown';
    this.addLog(`👑 ${name} is the SOLE SURVIVOR and wins the game!`, 'win', playerId);
    this.emitGameOver([playerId]);
  }

  public getMaskedState(playerId: string): MaskedEKGameState {
    const myHand = this.hands.get(playerId) || [];

    const maskedPlayers: MaskedEKPlayer[] = this.state.players.map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      isBot: p.isBot,
      connected: p.connected,
      cardCount: p.cardCount,
      eliminated: p.eliminated
    }));

    return {
      gameType: 'exploding-kittens',
      drawPileCount: this.drawPile.length,
      discardPile: this.state.discardPile,
      lastPlayedBy: this.state.lastPlayedBy,
      lastPlayedCard: this.state.lastPlayedCard,
      currentTurnIndex: this.state.currentTurnIndex,
      direction: this.state.direction,
      turnTimeLimit: this.state.turnTimeLimit,
      turnStartTime: this.state.turnStartTime,
      isGameOver: this.state.isGameOver,
      winners: this.state.winners,
      players: maskedPlayers,
      myHand,
      pendingTurns: this.state.pendingTurnsForCurrentPlayer,
      pendingAction: this.state.pendingAction,
      pendingDefusal: this.state.pendingDefusal,
      pendingFavor: this.state.pendingFavor,
      logs: this.state.logs
    };
  }

  public handleDisconnect(playerId: string): void {
    const player = this.state.players.find(p => p.id === playerId);
    if (player) {
      player.connected = false;
      this.addLog(`${player.name} disconnected.`, 'warning', playerId);
      this.emitStateChange();
    }
  }

  public handleReconnect(playerId: string): void {
    const player = this.state.players.find(p => p.id === playerId);
    if (player) {
      player.connected = true;
      this.addLog(`${player.name} reconnected!`, 'info', playerId);
      this.emitStateChange();
    }
  }
}
