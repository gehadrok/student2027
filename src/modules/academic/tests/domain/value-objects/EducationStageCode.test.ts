import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { EducationStageCode } from '../../../domain/value-objects/EducationStageCode';

test('EducationStageCode normalizes, serializes, and compares equality', () => {
  const first = new EducationStageCode(' primary ');
  const second = new EducationStageCode('PRIMARY');

  assert.equal(first.toString(), 'PRIMARY');
  assert.equal(first.toJSON(), 'PRIMARY');
  assert.equal(first.equals(second), true);
  assert.equal(Object.isFrozen(first), true);
});

test('EducationStageCode rejects invalid values', () => {
  assert.throws(() => new EducationStageCode(''));
  assert.throws(() => new EducationStageCode('A'));
  assert.throws(() => new EducationStageCode('PRIMARY--STAGE'));
});

