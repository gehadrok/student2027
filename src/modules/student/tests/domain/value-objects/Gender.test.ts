import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { Gender } from '../../../domain/value-objects/Gender';

test('Gender normalizes domain values and compares equality', () => {
  const first = new Gender(' Male ');
  const second = new Gender('male');

  assert.equal(first.toString(), 'male');
  assert.equal(first.toJSON(), 'male');
  assert.equal(first.equals(second), true);
  assert.equal(Object.isFrozen(first), true);
});

test('Gender rejects values outside the domain enumeration', () => {
  assert.throws(() => new Gender('unknown'));
});
