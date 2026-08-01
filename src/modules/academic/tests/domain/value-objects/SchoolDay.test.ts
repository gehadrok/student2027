import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { SchoolDay } from '../../../domain/value-objects/SchoolDay';

test('SchoolDay normalizes date, defaults instructional, and compares equality', () => {
  const first = new SchoolDay({ date: new Date('2024-09-01T14:30:00Z') });
  const second = new SchoolDay({ date: new Date('2024-09-01T00:00:00Z') });

  assert.equal(first.toString(), '2024-09-01');
  assert.equal(first.isoDate, '2024-09-01');
  assert.equal(first.isInstructional, true);
  assert.equal(first.dayOfWeek, 0); // Sunday
  assert.equal(first.equals(second), true);
  assert.equal(Object.isFrozen(first), true);
});

test('SchoolDay supports non-instructional days', () => {
  const holiday = new SchoolDay({ date: new Date('2024-09-02T00:00:00Z'), isInstructional: false });
  assert.equal(holiday.isInstructional, false);
  assert.deepEqual(holiday.toJSON(), {
    date: new Date('2024-09-02T00:00:00Z'),
    isInstructional: false
  });
});

test('SchoolDay rejects invalid dates', () => {
  assert.throws(() => new SchoolDay({ date: new Date('not-a-date') }));
});

