import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TeachingLoad } from '../../../domain/value-objects/TeachingLoad';

test('TeachingLoad serializes and compares equality', () => {
  const first = new TeachingLoad({ weeklyPeriods: 18, maxWeeklyPeriods: 24 });
  const second = new TeachingLoad({ weeklyPeriods: 18, maxWeeklyPeriods: 24 });

  assert.equal(first.toString(), '18/24 periods/week');
  assert.deepEqual(first.toJSON(), { weeklyPeriods: 18, maxWeeklyPeriods: 24 });
  assert.equal(first.equals(second), true);
  assert.equal(first.isWithinLimit(), true);
  assert.equal(Object.isFrozen(first), true);
});

test('TeachingLoad supports unlimited weekly periods', () => {
  const load = new TeachingLoad({ weeklyPeriods: 30 });
  assert.equal(load.toString(), '30 periods/week');
  assert.equal(load.maxWeeklyPeriods, undefined);
  assert.equal(load.isWithinLimit(), true);
});

test('TeachingLoad rejects invalid values', () => {
  assert.throws(() => new TeachingLoad({ weeklyPeriods: -1 }));
  assert.throws(() => new TeachingLoad({ weeklyPeriods: 1.5 }));
  assert.throws(() => new TeachingLoad({ weeklyPeriods: 24, maxWeeklyPeriods: 0 }));
  assert.throws(() => new TeachingLoad({ weeklyPeriods: 30, maxWeeklyPeriods: 24 }));
});

