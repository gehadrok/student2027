import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { AcademicYearCode } from '../../../domain/value-objects/AcademicYearCode';

test('AcademicYearCode normalizes, serializes, and compares equality', () => {
  const first = new AcademicYearCode(' 2024-2025 ');
  const second = new AcademicYearCode('2024-2025');

  assert.equal(first.toString(), '2024-2025');
  assert.equal(first.toJSON(), '2024-2025');
  assert.equal(first.equals(second), true);
  assert.equal(Object.isFrozen(first), true);
});

test('AcademicYearCode rejects invalid values', () => {
  assert.throws(() => new AcademicYearCode(''));
  assert.throws(() => new AcademicYearCode('A'));
  assert.throws(() => new AcademicYearCode('2024--2025'));
  assert.throws(() => new AcademicYearCode('bad code with spaces too long exceeds thirty two characters'));
});

