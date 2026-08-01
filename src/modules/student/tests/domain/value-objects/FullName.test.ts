import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { FullName } from '../../../domain/value-objects/FullName';

test('FullName normalizes parts and serializes', () => {
  const name = new FullName({ firstName: ' Ali ', middleName: '  Ahmed ', lastName: ' Saleh ' });

  assert.equal(name.toString(), 'Ali Ahmed Saleh');
  assert.deepEqual(name.toJSON(), { firstName: 'Ali', middleName: 'Ahmed', lastName: 'Saleh' });
  assert.equal(name.equals(new FullName({ firstName: 'Ali', middleName: 'Ahmed', lastName: 'Saleh' })), true);
  assert.equal(Object.isFrozen(name), true);
});

test('FullName rejects missing required names', () => {
  assert.throws(() => new FullName({ firstName: '', lastName: 'Saleh' }));
  assert.throws(() => new FullName({ firstName: 'Ali', lastName: ' ' }));
});
