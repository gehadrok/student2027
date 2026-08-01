import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { GradeLevelCode } from '../../../domain/value-objects/GradeLevelCode';

test('GradeLevelCode normalizes, serializes, and compares equality', () => {
  const first = new GradeLevelCode(' grade 7 ');
  const second = new GradeLevelCode('GRADE-7');

  assert.equal(first.toString(), 'GRADE-7');
  assert.equal(first.toJSON(), 'GRADE-7');
  assert.equal(first.equals(second), true);
  assert.equal(Object.isFrozen(first), true);
});

test('GradeLevelCode rejects invalid values', () => {
  assert.throws(() => new GradeLevelCode(''));
  assert.throws(() => new GradeLevelCode('G'));
  assert.throws(() => new GradeLevelCode('GRADE--7'));
});

