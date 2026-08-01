import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { StudentNumber } from '../../../domain/value-objects/StudentNumber';

test('StudentNumber normalizes and compares equality', () => {
  const first = new StudentNumber(' 2027 0001 ');
  const second = new StudentNumber('2027-0001');

  assert.equal(first.toString(), '2027-0001');
  assert.equal(first.toJSON(), '2027-0001');
  assert.equal(first.equals(second), true);
  assert.equal(Object.isFrozen(first), true);
});

test('StudentNumber rejects invalid values', () => {
  assert.throws(() => new StudentNumber('ab'));
  assert.throws(() => new StudentNumber('2027--0001'));
});
