// Exam for task 1, legs (h)-(l): the determinism contract of M5 and M6.
//
// M5. `withContract(clock, fn)` rejects with the message `contract: clock is required`
//     without calling `fn` when `clock` is not a non-empty string; otherwise, while `fn`
//     runs, `Date.now()` returns `Date.parse(clock)` and `new Date().toISOString()` returns
//     `new Date(clock).toISOString()`, and both `Date.now` and the `Date` constructor are the
//     originals again after `withContract` settles, resolved or rejected.
// M6. While `fn` runs, a call to `globalThis.fetch(url)` or a `new globalThis.WebSocket(url)`
//     makes `withContract` reject with the message `contract breach: <url>` (`url` as the
//     caller spelled it), and `globalThis.fetch` and `globalThis.WebSocket` are the originals
//     again after it settles, whether or not `fn` breached.

import {expect, test} from 'bun:test';
import {withContract} from '../src/contract';

const CLOCK = '2026-01-01T00:00:00Z';
const CLOCK_MS = 1767225600000; // Date.parse('2026-01-01T00:00:00Z')
const CLOCK_ISO = '2026-01-01T00:00:00.000Z';

/** Run `thunk` and return the error it produced, or `null` when it settled green. */
const settle = async (thunk: () => unknown): Promise<unknown> => {
  try {
    await thunk();
    return null;
  } catch (error) {
    return error;
  }
};

const messageOf = (error: unknown): string => {
  expect(error).toBeInstanceOf(Error);
  return (error as Error).message;
};

test('leg (h) [M5]: a clock that is not a non-empty string is refused before fn runs', async () => {
  let calls = 0;
  const fn = () => {
    calls += 1;
  };

  const emptyClock = await settle(() => withContract('', fn));
  expect(messageOf(emptyClock)).toBe('contract: clock is required');

  const missingClock = await settle(() =>
    withContract(undefined as unknown as string, fn),
  );
  expect(messageOf(missingClock)).toBe('contract: clock is required');

  expect(calls).toBe(0);
});

test('leg (h) [M5]: a throwing fn rejects with its own message and the clock is restored', async () => {
  const OriginalDate = globalThis.Date;
  const before = Date.now();

  const thrown = await settle(() =>
    withContract(CLOCK, () => {
      throw new Error('boom');
    }),
  );

  expect(messageOf(thrown)).toBe('boom');
  expect(globalThis.Date).toBe(OriginalDate);
  expect(Math.abs(Date.now() - before)).toBeLessThanOrEqual(60000);
});

test('leg (i) [M5]: inside the contract the clock is pinned, and afterwards it is the real one again', async () => {
  const OriginalDate = globalThis.Date;
  const before = Date.now();

  let nowInside: number | null = null;
  let isoInside: string | null = null;

  await withContract(CLOCK, () => {
    nowInside = Date.now();
    isoInside = new Date().toISOString();
  });

  expect(nowInside).toBe(CLOCK_MS);
  expect(isoInside).toBe(CLOCK_ISO);

  expect(globalThis.Date).toBe(OriginalDate);
  expect(Math.abs(Date.now() - before)).toBeLessThanOrEqual(60000);
});

test('leg (j) [M5][M6]: a fetch is a breach naming the url, and fetch plus the clock are restored', async () => {
  const originalFetch = globalThis.fetch;
  const OriginalDate = globalThis.Date;
  const originalNow = Date.now;
  const url = 'http://127.0.0.1:9/x';

  const breach = await settle(() => withContract(CLOCK, () => fetch(url)));

  expect(messageOf(breach)).toBe('contract breach: http://127.0.0.1:9/x');

  expect(globalThis.fetch).toBe(originalFetch);
  expect(globalThis.Date).toBe(OriginalDate);
  expect(Date.now).toBe(originalNow);
});

test('leg (k) [M5][M6]: a WebSocket is a breach naming the url, and WebSocket plus the clock are restored', async () => {
  const OriginalWebSocket = globalThis.WebSocket;
  const OriginalDate = globalThis.Date;
  const url = 'ws://127.0.0.1:9/';

  const breach = await settle(() =>
    withContract(CLOCK, () => {
      new WebSocket(url);
    }),
  );

  expect(messageOf(breach)).toBe('contract breach: ws://127.0.0.1:9/');

  expect(globalThis.WebSocket).toBe(OriginalWebSocket);
  expect(globalThis.Date).toBe(OriginalDate);
});

test('leg (l) [M6]: after a green fn, fetch and WebSocket are the originals again', async () => {
  const originalFetch = globalThis.fetch;
  const OriginalWebSocket = globalThis.WebSocket;

  await withContract(CLOCK, () => {
    // a move that touches nothing forbidden
  });

  expect(globalThis.fetch).toBe(originalFetch);
  expect(globalThis.WebSocket).toBe(OriginalWebSocket);
});
