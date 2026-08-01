import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TeachingLanguage } from '../../../domain/value-objects/TeachingLanguage';

test('TeachingLanguage normalizes, serializes, and compares equality', () => {
  const first = new TeachingLanguage(' ar ');
  const second = new TeachingLanguage('AR');

  assert.equal(first.toString(), 'AR');
  assert.equal(first.toJSON(), 'AR');
  assert.equal(first.equals(second), true);
  assert.equal(Object.isFrozen(first), true);

  const threeLetter = new TeachingLanguage('ara');
  assert.equal(threeLetter.toString(), 'ARA');
});

test('TeachingLanguage rejects invalid values', () => {
  assert.throws(() => new TeachingLanguage(''));
  assert.throws(() => new TeachingLanguage('A'));
  assert.throws(() => new TeachingLanguage('ENGLISH'));
  assert.throws(() => new TeachingLanguage('A1'));
});

