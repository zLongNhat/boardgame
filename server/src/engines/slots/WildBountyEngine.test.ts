import { test, describe } from 'node:test';
import assert from 'node:assert';
import { UserManager } from '../../auth/UserManager';
import { WildBountyEngine, REEL_HEIGHTS } from './WildBountyEngine';

describe('Wild Bounty Showdown Slot Engine Tests', () => {
  const userManager = new UserManager();
  const engine = new WildBountyEngine(userManager);

  const runId = Date.now().toString(36);
  const u = userManager.register(`cowboy_${runId}`, 'pass123', 'Sheriff Joe', 'av-dragon');
  assert.ok(u.user);
  userManager.addBalance(u.user.id, 50000, 'test-coins');

  test('Verify reel heights layout is [3, 4, 5, 5, 4, 3]', () => {
    assert.deepStrictEqual(REEL_HEIGHTS, [3, 4, 5, 5, 4, 3]);
  });

  test('Normal spin executes and returns valid cascade sequence', () => {
    const balanceBefore = userManager.getBalance(u.user!.id);
    const spinRes = engine.spin(u.user!.id, 20);

    assert.strictEqual(spinRes.success, true);
    assert.ok(spinRes.result);
    assert.strictEqual(spinRes.result.betAmount, 20);
    assert.ok(spinRes.result.cascades.length >= 1);

    const firstGrid = spinRes.result.cascades[0].grid;
    assert.strictEqual(firstGrid.length, 6);
    assert.deepStrictEqual(firstGrid.map(col => col.length), [3, 4, 5, 5, 4, 3]);

    // Initial multiplier must be 1 in base game
    assert.strictEqual(spinRes.result.cascades[0].multiplier, 1);

    // Balance after spin should reflect deducted bet + any win
    const balanceAfter = userManager.getBalance(u.user!.id);
    assert.strictEqual(balanceAfter, balanceBefore - 20 + spinRes.result.totalWin);
  });

  test('Feature Buy gives 3+ Scatters and awards 10+ Free Spins', () => {
    const buyRes = engine.spin(u.user!.id, 20, { buyFeature: true });
    assert.strictEqual(buyRes.success, true);
    assert.ok(buyRes.result);
    assert.ok(buyRes.result.scattersCount >= 3);
    assert.ok(buyRes.result.triggeredFreeSpins >= 10);

    const freeSpins = engine.getFreeSpins(u.user!.id);
    assert.ok(freeSpins);
    assert.ok(freeSpins.remaining >= 10);
  });

  test('Free spin costs 0 coins and starts with 8x multiplier', () => {
    const balanceBefore = userManager.getBalance(u.user!.id);
    const freeSpinsBefore = engine.getFreeSpins(u.user!.id)!.remaining;

    const freeSpinRes = engine.spin(u.user!.id, 20);
    assert.strictEqual(freeSpinRes.success, true);
    assert.strictEqual(freeSpinRes.result!.isFreeSpin, true);

    // Initial cascade in Free Spins starts at 8x
    assert.strictEqual(freeSpinRes.result!.cascades[0].multiplier, 8);

    // User was not charged bet
    const balanceAfter = userManager.getBalance(u.user!.id);
    assert.strictEqual(balanceAfter, balanceBefore + freeSpinRes.result!.totalWin);

    const freeSpinsAfter = engine.getFreeSpins(u.user!.id)?.remaining ?? 0;
    const expectedRemaining = freeSpinsBefore - 1 + freeSpinRes.result!.triggeredFreeSpins;
    assert.strictEqual(freeSpinsAfter, expectedRemaining);
  });
});
