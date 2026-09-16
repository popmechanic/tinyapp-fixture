/**
 * A recorded session read back as candidate exams.
 *
 * A session recorder commits one store snapshot per call it performs, and
 * names each commit after the call: the function's name, `(`, the arguments
 * each `JSON.stringify`ed and joined by `, `, then `)`. Walking that log
 * oldest first turns the session into a list of *transitions* — a seed commit,
 * the call that moved it, the commit it reached — and each one is the raw
 * material of an exam: seed the page from the first, run the call, compare
 * against the second.
 *
 * The module reads a history through `HistoryReader`, a structural type it
 * spells itself rather than importing, so it depends on no sibling module; the
 * real history object, which exports the same two row shapes, is assignable to
 * it structurally and the two spellings meet in `tsc`. Its one import is the
 * `Cell` type of `tinyapp-exam`, which fixes what an argument is allowed to be.
 */

import type {Cell} from 'tinyapp-exam';

/** One row of DoltLite's `dolt_log`, newest first as it hands them. */
export type LogEntry = {commit_hash: string; message: string};

/** One row of DoltLite's diff between two commits. */
export type DiffRow = {
  to_tbl: string | null;
  to_row: string | null;
  to_cell: string | null;
  to_value: string | null;
  to_commit: string;
  from_tbl: string | null;
  from_row: string | null;
  from_cell: string | null;
  from_value: string | null;
  from_commit: string;
  diff_type: 'added' | 'modified' | 'removed';
};

/** The part of a history this module reads: its log, and a diff between two commits. */
export type HistoryReader = {
  log(): LogEntry[];
  diff(from: string, to: string): DiffRow[];
};

/** One step of a session: the commit it started from, the call, the commit it reached. */
export type Transition = {
  seed: string;
  action: {name: string; args: Cell[]};
  expected: string;
  message: string;
  changes: DiffRow[];
};

/**
 * A commit message that is a call, and the text between its parentheses.
 *
 * The `s` flag lets an argument carry a newline — a todo's text may — so the
 * `.` of the inner group spans lines rather than stopping at the first one.
 */
const CALL = /^([A-Za-z_$][\w$]*)\((.*)\)$/s;

/** An argument is a `Cell`: what `JSON.stringify` wrote, and nothing richer. */
const isCell = (value: unknown): value is Cell =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';

/**
 * Read a recorded commit message back into the call that wrote it.
 *
 * Answers `null` when the message is not a call at all — the recorder's own
 * first commit `seed` and DoltLite's root `Initialize data repository` are the
 * two such messages a real log carries — when the arguments do not parse, or
 * when any argument is not a `Cell`. `f([1])` parses as JSON but its argument
 * is an array, so it is not a call the app can perform and is refused here
 * rather than further down.
 */
export const parseMessage = (message: string): {name: string; args: Cell[]} | null => {
  const match = CALL.exec(message);
  if (!match) return null;
  const [, name, inner] = match as unknown as [string, string, string];
  let args: unknown;
  try {
    args = JSON.parse('[' + inner + ']');
  } catch {
    return null;
  }
  if (!Array.isArray(args) || !args.every(isCell)) return null;
  return {name, args};
};

/**
 * Every step of a session that names a call, oldest first.
 *
 * `log()` is newest first, so the walk reverses a copy rather than the caller's
 * array. A transition's seed is the entry immediately older than it, whatever
 * that entry's message — `seed`, another call, or a message that was skipped —
 * because that older commit is the state the call actually moved. The oldest
 * entry has nothing before it and so never ends a transition.
 */
export const listTransitions = (history: HistoryReader): Transition[] => {
  const entries = history.log().slice().reverse();
  const transitions: Transition[] = [];
  for (let i = 1; i < entries.length; i++) {
    const entry = entries[i]!;
    const action = parseMessage(entry.message);
    if (!action) continue;
    const seed = entries[i - 1]!.commit_hash;
    const expected = entry.commit_hash;
    transitions.push({
      seed,
      action,
      expected,
      message: entry.message,
      changes: history.diff(seed, expected),
    });
  }
  return transitions;
};

/**
 * The transitions as a numbered list, one line each, for a person to pick from.
 *
 * A changed store value is a row of the diff like any other, so the count is
 * simply how many rows the transition's `changes` carries. Hashes are shown to
 * eight characters, which leaves a short stub hash like `c1` whole.
 */
export const renderTransitions = (transitions: Transition[]): string =>
  transitions
    .map((transition, index) => {
      const k = transition.changes.length;
      return (
        `${index + 1}. ${transition.seed.slice(0, 8)} --${transition.message}--> ` +
        `${transition.expected.slice(0, 8)} (${k} ${k === 1 ? 'change' : 'changes'})`
      );
    })
    .join('\n');
