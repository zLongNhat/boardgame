import assert from 'node:assert';
import test from 'node:test';
import { UnoGame } from './UnoGame';

test('UnoGame - Game initialization and state masking', () => {
  const players = [
    { id: 'p1', name: 'Alice', avatar: 'av-1', isBot: false },
    { id: 'p2', name: 'Bob', avatar: 'av-2', isBot: true },
    { id: 'p3', name: 'Charlie', avatar: 'av-3', isBot: true }
  ];

  const game = new UnoGame(players, { mode: 'classic' });
  game.start();

  const p1Masked = game.getMaskedState('p1');
  assert.strictEqual(p1Masked.myHand.length, 7, 'Player 1 should have 7 cards');
  assert.strictEqual(p1Masked.players[1].cardCount, 7, 'Bob card count is 7');
  assert.strictEqual((p1Masked.players[1] as any).myHand, undefined, 'Bob hand cards must be hidden from Alice');
  assert.ok(p1Masked.topCard, 'Top card must be public');
  game.clearTurnTimer();
});

test('UnoGame - Free Stacking penalty accumulation', () => {
  const players = [
    { id: 'p1', name: 'Alice', avatar: 'av-1', isBot: false },
    { id: 'p2', name: 'Bob', avatar: 'av-2', isBot: false }
  ];

  const game = new UnoGame(players, {
    mode: 'no-mercy',
    rules: { freeStacking: true }
  });
  game.start();

  // Test state has pending draw
  game.state.pendingDrawCount = 2;
  game.state.pendingDrawType = 'draw_two';

  // Check valid stack plays
  const cardDrawTwo = { id: 'c1', color: 'red', value: 'draw_two' as const, pointValue: 20 };
  const cardWildFour = { id: 'c2', color: 'wild', value: 'wild_draw_four' as const, pointValue: 50 };
  const cardNormal = { id: 'c3', color: 'red', value: '5' as const, pointValue: 5 };

  assert.strictEqual(game.isPlayValid(cardDrawTwo, false, 'p1'), true, '+2 can stack on +2');
  assert.strictEqual(game.isPlayValid(cardWildFour, false, 'p1'), true, '+4 can stack on +2 with freeStacking');
  assert.strictEqual(game.isPlayValid(cardNormal, false, 'p1'), false, 'Normal card cannot be played when pending draw > 0');
  game.clearTurnTimer();
});

test('UnoGame - No Mercy 25-card elimination', () => {
  const players = [
    { id: 'p1', name: 'Alice', avatar: 'av-1', isBot: false },
    { id: 'p2', name: 'Bob', avatar: 'av-2', isBot: false }
  ];

  const game = new UnoGame(players, {
    mode: 'no-mercy',
    rules: { mercyLimit: 25 }
  });
  game.start();

  const alice = game.state.players.find(p => p.id === 'p1')!;
  alice.cardCount = 25;
  (game as any).checkMercyElimination('p1');

  assert.strictEqual(alice.eliminated, true, 'Alice should be eliminated under Mercy Rule');
  assert.strictEqual(game.state.isGameOver, true, 'Game should end if only Bob remains');
  assert.deepStrictEqual(game.state.winners, ['p2'], 'Bob should be the winner');
  game.clearTurnTimer();
});
