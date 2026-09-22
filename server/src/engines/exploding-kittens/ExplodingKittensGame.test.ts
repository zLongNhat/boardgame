import assert from 'node:assert';
import test from 'node:test';
import { ExplodingKittensGame } from './ExplodingKittensGame';

test('ExplodingKittensGame - Deck setup and Defuse distribution', () => {
  const players = [
    { id: 'p1', name: 'Alice', avatar: 'av-1', isBot: false },
    { id: 'p2', name: 'Bob', avatar: 'av-2', isBot: true },
    { id: 'p3', name: 'Charlie', avatar: 'av-3', isBot: true }
  ];

  const game = new ExplodingKittensGame(players);
  game.start();

  const p1Masked = game.getMaskedState('p1');
  assert.strictEqual(p1Masked.myHand.length, 5, 'Player should start with 5 cards');
  const hasDefuse = p1Masked.myHand.some(c => c.type === 'defuse');
  assert.strictEqual(hasDefuse, true, 'Player must start with 1 Defuse card');

  // Verify state masking: opponents hand is hidden
  assert.strictEqual((p1Masked.players[1] as any).myHand, undefined, 'Opponent hand must be hidden');
  assert.strictEqual(p1Masked.players[1].cardCount, 5, 'Opponent card count is public');
  game.clearTurnTimer();
});

test('ExplodingKittensGame - Defuse insertion mechanics', () => {
  const players = [
    { id: 'p1', name: 'Alice', avatar: 'av-1', isBot: false },
    { id: 'p2', name: 'Bob', avatar: 'av-2', isBot: false }
  ];

  const game = new ExplodingKittensGame(players);
  game.start();

  const kitten = { id: 'k1', type: 'exploding_kitten' as const, name: 'Kitten', description: 'Boom' };
  (game as any).triggerDefusalEmergency('p1', kitten);

  assert.ok(game.state.pendingDefusal, 'Pending defusal must be active');
  assert.strictEqual(game.state.pendingDefusal?.playerId, 'p1');

  // Alice plays Defuse
  const aliceHand = (game as any).hands.get('p1');
  const defuseCard = aliceHand.find((c: any) => c.type === 'defuse')!;

  const res = game.handleAction('p1', {
    type: 'RESOLVE_DEFUSE',
    cardId: defuseCard.id,
    insertionMode: 'top'
  });

  assert.strictEqual(res.success, true, 'Defuse resolution must succeed');
  assert.strictEqual(game.state.pendingDefusal, null, 'Pending defusal must be cleared');
  assert.strictEqual(game.state.players[0].eliminated, false, 'Alice should survive');
  game.clearTurnTimer();
});

test('ExplodingKittensGame - Imploding Kittens expansion mechanics', () => {
  const players = [
    { id: 'p1', name: 'Alice', avatar: 'av-1', isBot: false },
    { id: 'p2', name: 'Bob', avatar: 'av-2', isBot: false }
  ];

  const game = new ExplodingKittensGame(players, 30, {
    implodingKittens: true,
    streakingKittens: false,
    barkingKittens: false,
    timebombMode: false
  });
  game.start();

  // Draw pile must contain an imploding kitten
  const drawPile: any[] = (game as any).drawPile;
  const hasImploding = drawPile.some(c => c.type === 'imploding_kitten');
  assert.strictEqual(hasImploding, true, 'Deck must contain Imploding Kitten');

  // 1. Draw face-down imploding kitten: should trigger insertion, face up
  const implodingCard = { id: 'imp-1', type: 'imploding_kitten' as const, name: 'Mèo Phát Nổ', description: '', isFaceUp: false };
  drawPile.push(implodingCard); // on top
  game.handleAction('p1', { type: 'DRAW_CARD' });

  assert.ok(game.state.pendingDefusal, 'Pending insertion must be active for face-down imploding');
  assert.strictEqual(implodingCard.isFaceUp, true, 'Card must be flipped face up');

  // Alice inserts it back at top
  game.handleAction('p1', {
    type: 'RESOLVE_DEFUSE',
    cardId: 'any',
    insertionMode: 'top'
  });
  assert.strictEqual(game.state.pendingDefusal, null, 'Insertion resolved');
  assert.strictEqual(drawPile[drawPile.length - 1].isFaceUp, true, 'Top card is now face up');

  // Check masked state sees top card face up
  const maskedState = game.getMaskedState('p1');
  assert.strictEqual(maskedState.topDrawCardIsFaceUp, true, 'Top draw card must be shown face up');

  // 2. Next draw: Bob draws face-up imploding kitten -> INSTANT ELIMINATION!
  game.handleAction('p2', { type: 'DRAW_CARD' });
  assert.strictEqual(game.state.players[1].eliminated, true, 'Bob must be eliminated immediately');
  assert.strictEqual(game.state.isGameOver, true, 'Game should end with Alice winning');
  game.clearTurnTimer();
});

test('ExplodingKittensGame - Streaking Kittens holds bomb & theft triggers boom', () => {
  const players = [
    { id: 'p1', name: 'Alice', avatar: 'av-1', isBot: false },
    { id: 'p2', name: 'Bob', avatar: 'av-2', isBot: false }
  ];

  const game = new ExplodingKittensGame(players, 30, {
    implodingKittens: false,
    streakingKittens: true,
    barkingKittens: false,
    timebombMode: false
  });
  game.start();

  const aliceHand: any[] = (game as any).hands.get('p1');
  const bobHand: any[] = (game as any).hands.get('p2');

  // Give Alice a streaking kitten
  aliceHand.push({
    id: 'streak-1',
    type: 'streaking_kitten' as const,
    name: 'Mèo Đi Dạo',
    description: ''
  });

  // Put an exploding kitten on top of draw pile
  const bomb = { id: 'bomb-1', type: 'exploding_kitten' as const, name: 'Mèo Nổ', description: '' };
  (game as any).drawPile.push(bomb);

  // Alice draws the bomb while holding Streaking Kitten
  const drawRes = game.handleAction('p1', { type: 'DRAW_CARD' });
  assert.strictEqual(drawRes.success, true);
  assert.strictEqual(game.state.pendingDefusal, null, 'Alice must NOT explode thanks to Streaking Kitten');
  assert.ok(aliceHand.some(c => c.id === 'bomb-1'), 'Alice should now hold the bomb safely in hand');

  // Now Bob steals from Alice using Cat Pair (with Feral Cat!)
  bobHand.length = 0; // clear Bob's hand
  bobHand.push(
    { id: 'cat-1', type: 'taco_cat' as const, name: 'Mèo Taco', description: '' },
    { id: 'feral-1', type: 'feral_cat' as const, name: 'Mèo Hoang', description: '' }
  );

  // Set Alice hand to only have the bomb
  aliceHand.length = 0;
  aliceHand.push(bomb);

  // Bob plays Taco Cat + Feral Cat combo targeting Alice
  game.state.currentTurnIndex = 1; // Bob's turn
  const comboRes = game.handleAction('p2', {
    type: 'PLAY_CAT_COMBO',
    cardIds: ['cat-1', 'feral-1'],
    targetPlayerId: 'p1'
  });
  assert.strictEqual(comboRes.success, true, 'Feral cat + taco cat combo must succeed');

  // Resolve nope window immediately
  (game as any).resolvePendingAction();

  // Bob stole the bomb from Alice! Since Bob has no Streaking Kitten and no Defuse, Bob triggers defusal emergency!
  assert.ok(game.state.pendingDefusal, 'Bob should trigger defusal emergency for stealing bomb');
  assert.strictEqual(game.state.pendingDefusal?.playerId, 'p2');
  game.clearTurnTimer();
});

test('ExplodingKittensGame - Timebomb mode sets turnTimeLimit to 15s', () => {
  const players = [
    { id: 'p1', name: 'Alice', avatar: 'av-1', isBot: false },
    { id: 'p2', name: 'Bob', avatar: 'av-2', isBot: false }
  ];

  const game = new ExplodingKittensGame(players, 30, {
    implodingKittens: false,
    streakingKittens: false,
    barkingKittens: false,
    timebombMode: true
  });

  assert.strictEqual(game.state.turnTimeLimit, 15, 'Timebomb mode must enforce 15s turn limit');
  game.clearTurnTimer();
});

test('ExplodingKittensGame - Cattermelon (Mèo dưa hấu) pair combo works', () => {
  const players = [
    { id: 'p1', name: 'Alice', avatar: 'av-1', isBot: false },
    { id: 'p2', name: 'Bob', avatar: 'av-2', isBot: false }
  ];

  const game = new ExplodingKittensGame(players);
  game.start();

  const aliceHand: any[] = (game as any).hands.get('p1');
  const bobHand: any[] = (game as any).hands.get('p2');

  aliceHand.length = 0;
  aliceHand.push(
    { id: 'cm-1', type: 'cattermelon' as const, name: 'Mèo Dưa Hấu', description: '' },
    { id: 'cm-2', type: 'cattermelon' as const, name: 'Mèo Dưa Hấu', description: '' }
  );

  bobHand.length = 0;
  bobHand.push({ id: 'target-card', type: 'skip' as const, name: 'Bỏ Qua', description: '' });

  const res = game.handleAction('p1', {
    type: 'PLAY_CAT_COMBO',
    cardIds: ['cm-1', 'cm-2'],
    targetPlayerId: 'p2'
  });

  assert.strictEqual(res.success, true, 'Playing pair of Cattermelon cards must succeed');
  assert.ok(game.state.pendingAction, 'Pending action must be created');
  assert.strictEqual(game.state.pendingAction?.card.type, 'cattermelon');

  // Resolve action
  (game as any).resolvePendingAction();
  assert.strictEqual(aliceHand.length, 1, 'Alice should receive stolen card');
  assert.strictEqual(aliceHand[0].id, 'target-card', 'Alice must have stolen Bob card');
  assert.strictEqual(bobHand.length, 0, 'Bob card was stolen');
  game.clearTurnTimer();
});

