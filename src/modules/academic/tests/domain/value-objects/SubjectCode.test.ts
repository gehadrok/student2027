import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { SubjectCode } from '../../../domain/value-objects/SubjectCode';

test('SubjectCode normalizes, serializes, and compares equality', () => {
  const first = new SubjectCode(' math ');
  const second = new SubjectCode('MATH');

  assert.equal(first.toString(), 'MATH');
  assert.equal(first.toJSON(), 'MATH');
  assert.equal(first.equals(second), true);
  assert.equal(Object.isFrozen(first), true);
});

test('SubjectCode rejects invalid values', () => {
  assert.throws(() => new SubjectCode(''));
  assert.throws(() => new SubjectCode('M'));
  assert.throws(() => new SubjectCode('MATH--SCIENCE'));
});

