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
