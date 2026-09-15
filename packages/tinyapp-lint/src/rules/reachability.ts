/**
 * The reachability rule — an expected state is some seed plus a few of the
 * app's own moves.
 *
 * An expected file is a claim about where the app can get to. This rule makes
 * the claim answerable without opening anything: it walks outwards from every
 * seed by applying the store module's own mutation callbacks, and an expected
 * state it never lands on is a state no user could have produced either.
 *
 * The whole walk runs inside one `withContract(ctx.clock, …)`, so `Date.now()`
 * inside a callback is the clock instant rather than the wall clock, and a
 * callback that reaches for `fetch` or `WebSocket` makes that contract reject
 * once the walk is over. `run` lets the rejection propagate: a callback that
 * dials is not a lint finding, it is a breach of the exam's contract, and the
 * two do not belong in the same report.
 */

import {withContract} from 'tinyapp-exam';

import type {Cell, Finding, LintContext, Rule, Snapshot, SnapshotFile} from '../types';

/** How many callbacks deep the walk goes before it gives up on a seed. */
const MAX_DEPTH = 3;

/** How many distinct states one seed's walk may hold before it gives up. */
const MAX_STATES = 2000;

/** The literals the pool carries beyond what the two files themselves spell. */
const LITERALS: Cell[] = ['lint', 1, true, false];

/**
 * A state as one string, with every object's keys sorted.
 *
 * Two states that differ only in the order TinyBase happened to hand their rows
 * back are the same state, so sorting is what makes `===` on these strings mean
 * deep equality — which is the comparison both the zero-move check and the
 * distinctness check want.
 */
const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonical);
  }
  if (typeof value === 'object' && value !== null) {
    const entries = Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => [key, canonical((value as Record<string, unknown>)[key])]);
    return Object.fromEntries(entries);
  }
  return value;
};

const keyOf = (state: Snapshot): string => JSON.stringify(canonical(state));

/**
 * The arguments one seed–expected pair is walked with.
 *
 * Every row id and every cell of both files, then every value of both `values`
 * maps, then the literals — de-duplicated in that order. Both files, because a
 * move that reaches the expected state usually has to be told the text or the
 * row id the expected state is the one holding: `addTodo(store, 'buy milk')`
 * only ever produces `one-open-todo.json` if `'buy milk'` is in the pool, and
 * the seed it starts from is empty.
 *
 * The de-duplication is by type as well as by spelling, so the row id `'1'` and
 * the literal `1` are two arguments and not one.
 */
const poolFor = (seed: Snapshot, expected: Snapshot): Cell[] => {
  const pool: Cell[] = [];
  const seen = new Set<string>();
  const push = (cell: Cell): void => {
    const key = `${typeof cell}:${String(cell)}`;
    if (!seen.has(key)) {
      seen.add(key);
      pool.push(cell);
    }
  };

  for (const [tables] of [seed, expected]) {
    for (const table of Object.values(tables)) {
      for (const [rowId, row] of Object.entries(table)) {
        push(rowId);
        for (const cell of Object.values(row)) {
          push(cell);
        }
      }
    }
  }
  for (const [, values] of [seed, expected]) {
    for (const value of Object.values(values)) {
      push(value);
    }
  }
  for (const literal of LITERALS) {
    push(literal);
  }

  return pool;
};

/** The pool's Cartesian power of length `arity` — one tuple per argument list. */
const tuplesOf = (pool: Cell[], arity: number): Cell[][] => {
  let tuples: Cell[][] = [[]];
  for (let i = 0; i < arity; i++) {
    const grown: Cell[][] = [];
    for (const tuple of tuples) {
      for (const cell of pool) {
        grown.push([...tuple, cell]);
      }
    }
    tuples = grown;
  }
  return tuples;
};

/**
 * Whether `target` is `seed` itself or something the callbacks reach from it.
 *
 * Breadth-first, so the answer is found at the shallowest depth there is one,
 * and bounded twice over: `MAX_DEPTH` callbacks deep and `MAX_STATES` distinct
 * states, whichever comes first. One store is re-`setContent` per move rather
 * than built fresh — TinyBase resets a table's row-id pool along with its rows,
 * so `addRow` on a re-seeded empty store still yields `'0'`, exactly as it does
 * on a store that has only ever been empty.
 *
 * A call that throws is not a move: the pool is deliberately promiscuous, and
 * handing `addTodo` a boolean is a tuple that does not typecheck rather than a
 * state the app can be in. A call that leaves the state it was given alone is
 * not a move either.
 */
const reaches = (ctx: LintContext, seed: Snapshot, target: Snapshot): boolean => {
  const targetKey = keyOf(target);
  const seedKey = keyOf(seed);
  if (seedKey === targetKey) {
    return true;
  }

  const pool = poolFor(seed, target);
  const moves = Object.entries(ctx.callbacks).map(([, callback]) => ({
    callback,
    tuples: tuplesOf(pool, Math.max(0, callback.length - 1)),
  }));

  const store = ctx.createStore(seed);
  const seen = new Set<string>([seedKey]);
  let frontier: Snapshot[] = [seed];

  for (let depth = 1; depth <= MAX_DEPTH && frontier.length > 0; depth++) {
    const next: Snapshot[] = [];
    for (const state of frontier) {
      const stateKey = keyOf(state);
      // Re-seeding the store is the costliest part of a move, and most tuples
      // in the pool leave the state alone; `loaded` is what lets those pay for
      // it once instead of every time.
      let loaded = false;
      for (const {callback, tuples} of moves) {
        for (const tuple of tuples) {
          if (!loaded) {
            store.setContent(state);
            loaded = true;
          }
          try {
            callback(store, ...tuple);
          } catch {
            // A call that threw may have got halfway through first.
            loaded = false;
            continue;
          }
          const after = store.getContent();
          const afterKey = keyOf(after);
          if (afterKey === targetKey) {
            return true;
          }
          if (afterKey === stateKey) {
            continue;
          }
          loaded = false;
          if (seen.has(afterKey)) {
            continue;
          }
          seen.add(afterKey);
          if (seen.size >= MAX_STATES) {
            return false;
          }
          next.push(after);
        }
      }
    }
    frontier = next;
  }

  return false;
};

/** `a, b, c or d` — the callbacks the walk tried, named the way one would say them. */
const listOf = (names: string[]): string =>
  names.length <= 1
    ? (names[0] ?? '')
    : `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`;

const kindOf = (snapshots: SnapshotFile[], kind: SnapshotFile['kind']): SnapshotFile[] =>
  snapshots.filter((snapshot) => snapshot.kind === kind);

const rule: Rule = {
  name: 'reachability',

  run: async (ctx: LintContext): Promise<Finding[]> => {
    const findings: Finding[] = [];
    const seeds = kindOf(ctx.snapshots, 'seed');
    const tried = listOf(Object.keys(ctx.callbacks).sort());

    await withContract(ctx.clock, () => {
      for (const expected of kindOf(ctx.snapshots, 'expected')) {
        const reached = seeds.some((seed) =>
          reaches(ctx, seed.content, expected.content),
        );
        if (!reached) {
          findings.push({
            file: expected.path,
            subject: 'state',
            problem:
              `reached by none of the ${seeds.length} seeds within ` +
              `${MAX_DEPTH} moves of ${tried}`,
            fix: 'write the state a callback reaches from a seed, or add the seed it is reached from',
          });
        }
      }
    });

    return findings;
  },
};

export default rule;
