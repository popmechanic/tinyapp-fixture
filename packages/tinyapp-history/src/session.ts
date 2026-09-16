/**
 * The fixture's own session: the moves it makes, the clock it makes them under,
 * and the one call that records them into a history file.
 *
 * Everything a derived exam is built from starts here. The session is a literal
 * — a list of `[name, ...args]` tuples — rather than a script, so the same eight
 * calls can be replayed by the CLI, by an exam and by a reader of this file, and
 * so the commit messages the recorder writes are a function of the literal and
 * nothing else.
 *
 * `CALLBACKS` is the app's own store module, imported three levels up. That
 * import is the point: a history is a reading of the app's real moves, not of a
 * copy of them kept beside the recorder. Nothing here is ever written back into
 * the store, and the store module gains nothing — it is read through
 * `getContent()` by the recorder and is otherwise untouched.
 */

import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';

import type {Cell} from 'tinyapp-exam';

import {
  addTodo,
  clearCompleted,
  createTodosStore,
  deleteTodo,
  setFilter,
  setTodoCompleted,
  setTodoDue,
  undoDelete,
} from '../../../client/src/storeData';

import {openHistory, recordSession, type Callbacks, type History} from './history';

/**
 * The clock every recorded call runs under, and the clock a promoted exam
 * carries.
 *
 * One instant for the whole session: a recording made under a moving clock
 * would commit a different content for the same moves, and a promoted exam
 * would stop reaching the state it names.
 */
export const CLOCK = '2026-01-01T00:00:00Z';

/**
 * The app's store moves, by the name a commit message spells.
 *
 * Every mutation `client/src/storeData.ts` exports is here, whether or not the
 * fixture's session performs it: the record is what a session *may* do, and a
 * session literal picks from it.
 */
export const CALLBACKS = {
  addTodo,
  clearCompleted,
  deleteTodo,
  setFilter,
  setTodoCompleted,
  setTodoDue,
  undoDelete,
} satisfies Callbacks;

/** One call of a session: the callback's name, then the arguments it takes. */
export type SessionCall = [name: keyof typeof CALLBACKS, ...args: Cell[]];

/**
 * The fixture's session, in order.
 *
 * `addTodo("")` is in the list deliberately and not by accident: the store
 * refuses an empty todo, so that call moves nothing, stages nothing and — under
 * the recorder's `--skip-empty` — leaves no commit at all. A session that
 * records only what changed is what makes the log a list of real transitions,
 * and this call is the one that proves it.
 */
export const SESSION: SessionCall[] = [
  ['addTodo', 'buy milk'],
  ['addTodo', ''],
  ['addTodo', 'walk the dog'],
  ['setTodoCompleted', '0', true],
  ['setFilter', 'done'],
  ['setTodoDue', '1', '2025-12-31'],
  ['setTodoDue', '1', ''],
  ['clearCompleted'],
];

/**
 * Records `SESSION` into a fresh history file at `path` and hands the open
 * history back.
 *
 * The store starts from `[{}, {}]` — no todos, no filter — rather than from the
 * app's default content, so the session's own first `addTodo` is what puts row
 * `0` there and every row id below is one the session wrote. The calls are
 * awaited one at a time: each commit is of the store as the call before it left
 * it, and a session recorded concurrently would have no such order.
 *
 * The caller owns the returned history and closes it.
 */
export const recordFixtureSession = async (path: string): Promise<History> => {
  mkdirSync(dirname(path), {recursive: true});
  const history = openHistory(path);
  const recorded = recordSession(
    createTodosStore([{}, {}]),
    history,
    CALLBACKS,
    CLOCK,
  );
  for (const [name, ...args] of SESSION) {
    await recorded[name](...args);
  }
  return history;
};
