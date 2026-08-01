import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { SectionCapacity } from '../../../domain/value-objects/SectionCapacity';

test('SectionCapacity serializes, and compares equality', () => {
  const first = new SectionCapacity(30);
  const second = new SectionCapacity(30);

  assert.equal(first.toString(), '30');
  assert.equal(first.toJSON(), 30);
  assert.equal(first.equals(second), true);
  assert.equal(Object.isFrozen(first), true);
});

test('SectionCapacity enforces positive capacity business rule', () => {
  assert.throws(() => new SectionCapacity(0));
  assert.throws(() => new SectionCapacity(-1));
  assert.throws(() => new SectionCapacity(1.5));
});

