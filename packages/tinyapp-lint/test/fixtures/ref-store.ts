/**
 * A store module in the loader's convention, carrying one reference.
 *
 * `loadContext` reads a store module for exactly three things: its raw
 * `TABLES_SCHEMA`, its `INVARIANTS`, and every exported function of arity >= 1
 * whose name starts with neither `create` nor `read`. This module exports the
 * first two and no function at all, so a run pointed at it has this schema, no
 * invariant and no callback — which leaves the one line such a run prints the
 * `references` rule's own.
 *
 * `todos.owner` is the reference: the app's `ref` key, which TinyBase does not
 * know and drops from the schema a store keeps, and which therefore survives
 * only here in the module's own export.
 */

import type {Invariant} from '../../src/types';

export const TABLES_SCHEMA = {
  users: {
    name: {type: 'string', default: ''},
  },
  todos: {
    text: {type: 'string', default: ''},
    owner: {type: 'string', default: '', ref: 'users'},
  },
} as const;

export const INVARIANTS: Invariant[] = [];
