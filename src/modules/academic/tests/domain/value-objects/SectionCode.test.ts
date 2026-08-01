import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { SectionCode } from '../../../domain/value-objects/SectionCode';

test('SectionCode normalizes, serializes, and compares equality', () => {
  const first = new SectionCode(' section a ');
  const second = new SectionCode('SECTION-A');

  assert.equal(first.toString(), 'SECTION-A');
  assert.equal(first.toJSON(), 'SECTION-A');
  assert.equal(first.equals(second), true);
  assert.equal(Object.isFrozen(first), true);
});

test('SectionCode rejects invalid values', () => {
  assert.throws(() => new SectionCode(''));
  assert.throws(() => new SectionCode('S'));
  assert.throws(() => new SectionCode('SECTION--A'));
});

