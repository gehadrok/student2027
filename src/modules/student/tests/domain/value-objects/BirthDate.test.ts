import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { BirthDate } from '../../../domain/value-objects/BirthDate';

test('BirthDate serializes and calculates age', () => {
  const birthDate = new BirthDate('2010-08-15');

  assert.equal(birthDate.toString(), '2010-08-15');
  assert.equal(birthDate.toJSON(), '2010-08-15');
  assert.equal(birthDate.ageAt(new Date('2026-08-14T00:00:00.000Z')), 15);
  assert.equal(birthDate.ageAt(new Date('2026-08-15T00:00:00.000Z')), 16);
  assert.equal(birthDate.isAtLeast(16, new Date('2026-08-15T00:00:00.000Z')), true);
  assert.equal(Object.isFrozen(birthDate), true);
});

test('BirthDate rejects invalid and future dates', () => {
  assert.throws(() => new BirthDate('not-a-date'));
  const nextYear = new Date();
  nextYear.setUTCFullYear(nextYear.getUTCFullYear() + 1);
  assert.throws(() => new BirthDate(nextYear));
});
