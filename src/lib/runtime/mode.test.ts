import test from 'node:test';
import assert from 'node:assert/strict';
import { getRuntimeModeConfig, INTEGRATION_MODE, isMockMode, KAYAN_API_BASE_URL } from './mode';

test('mock mode is the default so USE_MOCK keeps working without configuration', () => {
  const config = getRuntimeModeConfig();
  assert.equal(config.mode, 'mock');
  assert.equal(config.useMock, true);
  assert.equal(isMockMode(), true);
  assert.equal(INTEGRATION_MODE, 'mock');
});

test('no host, port or credential is hardcoded into the API base URL', () => {
  assert.equal(KAYAN_API_BASE_URL, '');
  assert.equal(/localhost|127\.0\.0\.1|https?:\/\//i.test(KAYAN_API_BASE_URL), false);
});

test('the resolved configuration reports which source decided the mode', () => {
  const config = getRuntimeModeConfig();
  assert.ok(['VITE_USE_MOCK', 'USE_MOCK', 'default'].includes(config.source));
});
