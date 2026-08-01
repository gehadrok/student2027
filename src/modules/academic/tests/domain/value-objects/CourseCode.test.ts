import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { CourseCode } from '../../../domain/value-objects/CourseCode';

test('CourseCode normalizes, serializes, and compares equality', () => {
  const first = new CourseCode(' math 101 ');
  const second = new CourseCode('MATH-101');

  assert.equal(first.toString(), 'MATH-101');
  assert.equal(first.toJSON(), 'MATH-101');
  assert.equal(first.equals(second), true);
  assert.equal(Object.isFrozen(first), true);
});

test('CourseCode rejects invalid values', () => {
  assert.throws(() => new CourseCode(''));
  assert.throws(() => new CourseCode('M'));
  assert.throws(() => new CourseCode('MATH--101'));
});

