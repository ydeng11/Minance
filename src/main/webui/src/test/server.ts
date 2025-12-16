import { createRequire } from 'module';

const ensureLocalStorage = () => {
  const store = new Map<string, string>();
  const memoryStorage: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => store.delete(key),
    setItem: (key: string, value: string) => store.set(key, value),
  };

  Object.defineProperty(globalThis, 'localStorage', {
    value: memoryStorage,
    writable: false,
    configurable: true,
  });
};

const require = createRequire(import.meta.url);
ensureLocalStorage();
const { setupServer } = require('msw/node') as typeof import('msw/node');

/**
 * Shared MSW server instance for unit/integration tests.
 * Handlers are registered per-test via server.use.
 */
export const server = setupServer();
