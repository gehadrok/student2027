import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { PeriodNumber } from '../../../domain/value-objects/PeriodNumber';

test('PeriodNumber serializes, and compares equality', () => {
  const first = new PeriodNumber(1);
  const second = new PeriodNumber(1);

  assert.equal(first.toString(), '1');
  assert.equal(first.toJSON(), 1);
  assert.equal(first.equals(second), true);
  assert.equal(Object.isFrozen(first), true);
});

test('PeriodNumber rejects invalid values', () => {
  assert.throws(() => new PeriodNumber(0));
  assert.throws(() => new PeriodNumber(-1));
  assert.throws(() => new PeriodNumber(1.5));
});

