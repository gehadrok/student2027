import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { BloodType } from '../../../domain/value-objects/BloodType';

test('BloodType normalizes and compares equality', () => {
  const first = new BloodType(' ab+ ');
  const second = new BloodType('AB+');

  assert.equal(first.toString(), 'AB+');
  assert.equal(first.toJSON(), 'AB+');
  assert.equal(first.equals(second), true);
  assert.equal(Object.isFrozen(first), true);
});

test('BloodType rejects unsupported values', () => {
  assert.throws(() => new BloodType('C+'));
});
