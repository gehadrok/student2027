import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { AcademicCalendarDate } from '../../../domain/value-objects/AcademicCalendarDate';

test('AcademicCalendarDate normalizes to UTC midnight and compares equality', () => {
  const first = new AcademicCalendarDate(new Date('2024-09-01T14:30:00Z'));
  const second = new AcademicCalendarDate(new Date('2024-09-01T00:00:00Z'));

  assert.equal(first.toString(), '2024-09-01');
  assert.equal(first.toJSON(), '2024-09-01');
  assert.equal(first.equals(second), true);
  assert.equal(first.isoDate, '2024-09-01');
  assert.equal(first.dayOfWeek, 0); // Sunday
  assert.equal(Object.isFrozen(first), true);
});

test('AcademicCalendarDate rejects invalid dates', () => {
  assert.throws(() => new AcademicCalendarDate(new Date('not-a-date')));
});

