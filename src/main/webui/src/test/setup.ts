import '@testing-library/jest-dom';
import { expect, afterEach, beforeAll, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { server } from './server';

// Extends Vitest's expect method with methods from react-testing-library
expect.extend(matchers);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

// Runs a cleanup after each test case (e.g. clearing jsdom) and resets MSW.
afterEach(() => {
  server.resetHandlers();
  cleanup();
});

afterAll(() => {
  server.close();
});
