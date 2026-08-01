import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { EmailAddress } from '../../../domain/value-objects/EmailAddress';

test('EmailAddress trims, lowercases, serializes, and compares equality', () => {
  const first = new EmailAddress(' Student@School.EDU ');
  const second = new EmailAddress('student@school.edu');

  assert.equal(first.toString(), 'student@school.edu');
  assert.equal(first.toJSON(), 'student@school.edu');
  assert.equal(first.equals(second), true);
  assert.equal(Object.isFrozen(first), true);
});

test('EmailAddress rejects invalid email addresses', () => {
  assert.throws(() => new EmailAddress('student'));
  assert.throws(() => new EmailAddress('student@school'));
});
