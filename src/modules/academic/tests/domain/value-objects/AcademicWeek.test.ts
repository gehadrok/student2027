import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { AcademicWeek } from '../../../domain/value-objects/AcademicWeek';

test('AcademicWeek serializes with week padding, and compares equality', () => {
  const first = new AcademicWeek(1);
  const second = new AcademicWeek(1);

  assert.equal(first.toString(), 'W01');
  assert.equal(new AcademicWeek(9).toString(), 'W09');
  assert.equal(new AcademicWeek(10).toString(), 'W10');
  assert.equal(first.toJSON(), 1);
  assert.equal(first.equals(second), true);
  assert.equal(Object.isFrozen(first), true);
});

test('AcademicWeek rejects invalid values', () => {
  assert.throws(() => new AcademicWeek(0));
  assert.throws(() => new AcademicWeek(53));
  assert.throws(() => new AcademicWeek(-1));
  assert.throws(() => new AcademicWeek(1.5));
});

