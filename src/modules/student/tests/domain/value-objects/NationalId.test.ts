import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { NationalId } from '../../../domain/value-objects/NationalId';

test('NationalId normalizes separators and compares equality', () => {
  const first = new NationalId(' 123-456 789 ');
  const second = new NationalId('123456789');

  assert.equal(first.toString(), '123456789');
  assert.equal(first.toJSON(), '123456789');
  assert.equal(first.equals(second), true);
  assert.equal(first.hasChecksumCandidate(), true);
  assert.equal(Object.isFrozen(first), true);
});

test('NationalId rejects non-digits and invalid lengths', () => {
  assert.throws(() => new NationalId('12345'));
  assert.throws(() => new NationalId('12345A789'));
});
