/**
 * The determinism contract: an action runs with the clock pinned and the
 * network unplugged, and every global it borrows is handed back.
 *
 * Bun runs every test file of one `bun test` invocation in a single process, so
 * a global left replaced leaks into the next file. Restoring in a `finally` is
 * part of the contract, not housekeeping.
 */

/**
 * Runs `fn` with `Date` pinned to `clock` and `fetch`/`WebSocket` blocked.
 *
 * Rejects with `contract: clock is required` — without calling `fn` — when
 * `clock` is not a non-empty string, with `contract breach: <url>` when `fn`
 * reaches for the network, and otherwise with whatever `fn` threw. `Date`,
 * `Date.now`, `fetch` and `WebSocket` are the originals again once the returned
 * promise settles, resolved or rejected, breached or not.
 */
export const withContract = async (
  clock: string,
  fn: () => unknown,
): Promise<void> => {
  if (typeof clock !== 'string' || clock.length === 0) {
    throw new Error('contract: clock is required');
  }

  const realDate = globalThis.Date;
  const realFetch = globalThis.fetch;
  const realWebSocket = globalThis.WebSocket;
  const instant = realDate.parse(clock);

  // The first url the action reached for, `null` while it stays honest.
  let breach: string | null = null;
  const breached = (url: unknown): Error => {
    const spelled = typeof url === 'string' ? url : String(url);
    if (breach === null) {
      breach = spelled;
    }
    return new Error(`contract breach: ${spelled}`);
  };

  // `new Date()` is the clock instant; `new Date(x)`, `Date.parse` and
  // `Date.UTC` keep working, inherited from the real constructor.
  class ContractDate extends realDate {
    constructor(...args: unknown[]) {
      super(...((args.length === 0 ? [instant] : args) as [number]));
    }

    static now(): number {
      return instant;
    }
  }

  class ContractWebSocket {
    constructor(url: unknown) {
      throw breached(url);
    }
  }

  globalThis.Date = ContractDate as unknown as DateConstructor;
  globalThis.fetch = ((url: unknown) => {
    throw breached(url);
  }) as unknown as typeof fetch;
  globalThis.WebSocket = ContractWebSocket as unknown as typeof WebSocket;

  try {
    await fn();
  } catch (error) {
    // A breach outranks whatever the action made of it — even a swallowed one
    // is reported, so `fn` cannot catch its way out of the contract.
    if (breach === null) {
      throw error;
    }
  } finally {
    globalThis.Date = realDate;
    globalThis.fetch = realFetch;
    globalThis.WebSocket = realWebSocket;
  }

  if (breach !== null) {
    throw new Error(`contract breach: ${breach}`);
  }
};
