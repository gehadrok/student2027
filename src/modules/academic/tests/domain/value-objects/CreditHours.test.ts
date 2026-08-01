import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { CreditHours } from '../../../domain/value-objects/CreditHours';

test('CreditHours serializes, and compares equality', () => {
  const first = new CreditHours(3);
  const second = new CreditHours(3);

  assert.equal(first.toString(), '3');
  assert.equal(first.toJSON(), 3);
  assert.equal(first.equals(second), true);
  assert.equal(Object.isFrozen(first), true);
});

test('CreditHours rejects invalid values', () => {
  assert.throws(() => new CreditHours(-1));
  assert.throws(() => new CreditHours(Number.NaN));
});

