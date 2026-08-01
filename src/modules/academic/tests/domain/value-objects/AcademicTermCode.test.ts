import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { AcademicTermCode } from '../../../domain/value-objects/AcademicTermCode';

test('AcademicTermCode normalizes, serializes, and compares equality', () => {
  const first = new AcademicTermCode(' term 1 ');
  const second = new AcademicTermCode('TERM-1');

  assert.equal(first.toString(), 'TERM-1');
  assert.equal(first.toJSON(), 'TERM-1');
  assert.equal(first.equals(second), true);
  assert.equal(Object.isFrozen(first), true);
});

test('AcademicTermCode rejects invalid values', () => {
  assert.throws(() => new AcademicTermCode(''));
  assert.throws(() => new AcademicTermCode('A'));
  assert.throws(() => new AcademicTermCode('TERM--1'));
});

