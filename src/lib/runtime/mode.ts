export type IntegrationMode = 'mock' | 'live';

export interface RuntimeModeConfig {
  mode: IntegrationMode;
  useMock: boolean;
  apiBaseUrl: string;
  source: 'VITE_USE_MOCK' | 'USE_MOCK' | 'default';
}

type EnvBag = Record<string, string | undefined>;

function readImportMetaEnv(): EnvBag {
  try {
    // Static member access so Vite can statically replace these at build/dev time.
    return {
      VITE_USE_MOCK: import.meta.env.VITE_USE_MOCK,
      VITE_KAYAN_API_BASE_URL: import.meta.env.VITE_KAYAN_API_BASE_URL,
    };
  } catch {
    return {};
  }
}

function readProcessEnv(): EnvBag {
  try {
    return typeof process !== 'undefined' && process.env ? (process.env as EnvBag) : {};
  } catch {
    return {};
  }
}

function readFlag(raw: string | undefined): boolean | null {
  if (raw === undefined || raw === null) return null;
  const value = String(raw).trim().toLowerCase();
  if (value === '') return null;
  if (value === 'true' || value === '1' || value === 'yes' || value === 'on') return true;
  if (value === 'false' || value === '0' || value === 'no' || value === 'off') return false;
  return null;
}

function readBaseUrl(...bags: EnvBag[]): string {
  for (const bag of bags) {
    const raw = bag.KAYAN_API_BASE_URL ?? bag.VITE_KAYAN_API_BASE_URL;
    if (typeof raw === 'string' && raw.trim() !== '') return raw.trim().replace(/\/+$/, '');
  }
  return '';
}

function resolveConfig(): RuntimeModeConfig {
  const metaEnv = readImportMetaEnv();
  const nodeEnv = readProcessEnv();

  const candidates: Array<{ value: boolean | null; source: RuntimeModeConfig['source'] }> = [
    { value: readFlag(metaEnv.VITE_USE_MOCK), source: 'VITE_USE_MOCK' },
    { value: readFlag(nodeEnv.USE_MOCK), source: 'USE_MOCK' },
    { value: readFlag(nodeEnv.VITE_USE_MOCK), source: 'VITE_USE_MOCK' },
  ];

  for (const candidate of candidates) {
    if (candidate.value !== null) {
      return {
        mode: candidate.value ? 'mock' : 'live',
        useMock: candidate.value,
        apiBaseUrl: readBaseUrl(metaEnv, nodeEnv),
        source: candidate.source,
      };
    }
  }

  return {
    mode: 'mock',
    useMock: true,
    apiBaseUrl: readBaseUrl(metaEnv, nodeEnv),
    source: 'default',
  };
}

const config = resolveConfig();

export const USE_MOCK: boolean = config.useMock;

export const INTEGRATION_MODE: IntegrationMode = config.mode;

export const KAYAN_API_BASE_URL: string = config.apiBaseUrl;

export function isMockMode(): boolean {
  return config.mode === 'mock';
}

export function getRuntimeModeConfig(): RuntimeModeConfig {
  return { ...config };
}
