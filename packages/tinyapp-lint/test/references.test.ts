/**
 * The exam for Task 3 — "The referential-integrity rule: a cell marked `ref`
 * names a row that exists".
 *
 * One `test` per Proof leg, named for its leg and for the Machine clause it
 * comes from:
 *
 *   (a) [M1] the module's default export is a `Rule` named `references`, and
 *            its `run` over `await loadContext()` returns `[]`;
 *   (b) [M2] over the hand-built context with the pinned schema and the
 *            `bad.json` snapshot, one finding, formatted character for
 *            character as the task writes it;
 *   (c) [M3] a resolvable `owner`, and a row without the `owner` cell, are
 *            both silent;
 *   (d) [M4] a snapshot without the referenced table at all still names the
 *            missing row;
 *   (e) [M5] the fixture store module, and the CLI over one seeded violation.
 *
 * Three readings this file makes, written down because they shape what is
 * asserted:
 *
 *   - The rule module and the fixture module are imported statically. Neither
 *     exists at BASE, so this file is red there on one missing-module error —
 *     the implementation's absence, not a fixture this exam forgot to build.
 *   - Legs (b)–(d) hand `run` a context spread from `await loadContext()` with
 *     `schema` and `snapshots` replaced, which is what the task's Context asks
 *     for: the fixture declares no reference today, so the rule is exercised
 *     entirely by contexts built here and no fixture file is touched.
 *   - Leg (e) asserts that the CLI's stdout *contains* the pinned line. The
 *     rules directory is shared with the plan's other rules, and the claim is
 *     about this rule's line, not about the whole run.
 *
 * Every test carries a 60 s timeout: `loadContext()` spawns a child `bun` to
 * capture the exams, and leg (e) spawns the whole CLI — Bun's default per-test
 * 5 s is not enough for either.
 */

import {existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {join, relative, resolve} from 'node:path';

import {expect, test} from 'bun:test';

import {loadContext} from '../src/context';
import {formatFinding} from '../src/lint';
import type {
  Finding,
  LintContext,
  Snapshot,
  SnapshotFile,
  TablesSchema,
} from '../src/types';
import references from '../src/rules/references';
import {INVARIANTS, TABLES_SCHEMA} from './fixtures/ref-store';

/** This file sits three directories below the repository root. */
const ROOT = resolve(import.meta.dir, '..', '..', '..');

/** A child `bun` process needs more than Bun's default per-test 5 s. */
const SPAWN_TIMEOUT_MS = 60_000;

/**
 * The schema of M2, and of every leg that follows it: `todos/owner` is a
 * reference to a row of `users`, and nothing else is.
 */
const SCHEMA: TablesSchema = {
  users: {name: {type: 'string', default: ''}},
  todos: {
    text: {type: 'string', default: ''},
    owner: {type: 'string', default: '', ref: 'users'},
  },
};

/** The tables half of M2's snapshot: `todos/0/owner` names a `users` row that is not there. */
const BAD_TABLES: Snapshot[0] = {
  users: {u1: {name: 'ann'}},
  todos: {'0': {text: 'buy milk', owner: 'u9'}},
};

/** The one snapshot file M2 names, and the path its finding is filed under. */
const BAD_PATH = 'state-exams/seeds/bad.json';

/** M2's finding, as one line — the string the task pins, character for character. */
const BAD_LINE =
  'state-exams/seeds/bad.json: todos/0/owner: refers to users/u9, which is not a row of users in this snapshot — add users/u9 to the snapshot, or point owner at an existing users row';

/** The same line under the temp directory of M5, whose middle segment is random. */
const TMP_LINE =
  /^state-exams\/lint-tmp-[^/]+\/seeds\/bad\.json: todos\/0\/owner: refers to users\/u9, which is not a row of users in this snapshot — add users\/u9 to the snapshot, or point owner at an existing users row$/;

/** One seed snapshot, as the loader would have handed it over. */
const seedOf = (tables: Snapshot[0], path: string = BAD_PATH): SnapshotFile => ({
  path,
  kind: 'seed',
  content: [tables, {}],
});

/** The default context, loaded once and shared by every leg. */
let contextPromise: Promise<LintContext> | undefined;
const contextOnce = (): Promise<LintContext> => (contextPromise ??= loadContext());

/** The default context with M2's schema and one hand-built snapshot in place of the fixture's. */
const contextOf = async (tables: Snapshot[0]): Promise<LintContext> => ({
  ...(await contextOnce()),
  schema: SCHEMA,
  snapshots: [seedOf(tables)],
});

/** What the rule found over that context. */
const runOver = async (tables: Snapshot[0]): Promise<Finding[]> =>
  await references.run(await contextOf(tables));

// (a) [M1] ---------------------------------------------------------------

test(
  '(a) [M1] the rule is named `references` and says nothing about the fixture',
  async () => {
    expect(references.name).toBe('references');
    expect(typeof references.run).toBe('function');

    // `TABLES_SCHEMA` at BASE carries no `ref` entry, so there is nothing for
    // this rule to check and nothing for it to say.
    expect(await references.run(await contextOnce())).toEqual([]);
  },
  SPAWN_TIMEOUT_MS,
);

// (b) [M2] ---------------------------------------------------------------

test(
  '(b) [M2] the dangling `owner` is one finding, formatted exactly as pinned',
  async () => {
    const findings = await runOver(BAD_TABLES);

    expect(findings).toHaveLength(1);
    expect(formatFinding(findings[0]!)).toBe(BAD_LINE);
  },
  SPAWN_TIMEOUT_MS,
);

// (c) [M3] ---------------------------------------------------------------

test(
  '(c) [M3] a resolvable reference, and a row without the cell, are both silent',
  async () => {
    // `todos/0/owner` is `u1`, and `users/u1` is right there.
    expect(
      await runOver({
        users: {u1: {name: 'ann'}},
        todos: {'0': {text: 'buy milk', owner: 'u1'}},
      }),
    ).toEqual([]);

    // Row `0` has no `owner` cell at all: a row lacking the cell is not a
    // reference, so there is nothing to resolve.
    expect(
      await runOver({
        users: {u1: {name: 'ann'}},
        todos: {'0': {text: 'buy milk'}},
      }),
    ).toEqual([]);
  },
  SPAWN_TIMEOUT_MS,
);

// (d) [M4] ---------------------------------------------------------------

test(
  '(d) [M4] a snapshot without the referenced table names the missing row',
  async () => {
    // No `users` table in this snapshot — which has no row `u1` in it either.
    const findings = await runOver({todos: {'0': {text: 'buy milk', owner: 'u1'}}});

    expect(findings).toHaveLength(1);
    expect(findings[0]!.subject).toBe('todos/0/owner');
    expect(findings[0]!.problem).toBe(
      'refers to users/u1, which is not a row of users in this snapshot',
    );
  },
  SPAWN_TIMEOUT_MS,
);

// (e) [M5] ---------------------------------------------------------------

test(
  '(e) [M5] the fixture store module, and `lint:state` over one seeded violation',
  () => {
    // Read as `unknown` before the comparison: the fixture may export its
    // schema `as const`, and the claim is about the object, not its type.
    const fixtureSchema: unknown = TABLES_SCHEMA;
    const fixtureInvariants: unknown = INVARIANTS;
    expect(fixtureSchema).toEqual(SCHEMA);
    expect(fixtureInvariants).toEqual([]);

    // `mkdtempSync` under `state-exams/`, so the finding's `file` is a path
    // under the repository root and the pinned regex can be anchored to it.
    const dir = mkdtempSync(join(ROOT, 'state-exams', 'lint-tmp-'));
    let run: {code: number; lines: string[]};

    try {
      for (const name of ['seeds', 'expected', 'exams']) {
        mkdirSync(join(dir, name));
      }
      writeFileSync(
        join(dir, 'seeds', 'bad.json'),
        JSON.stringify([BAD_TABLES, {}]),
      );

      const flag = (name: string): string =>
        `${relative(ROOT, dir).replaceAll('\\', '/')}/${name}`;

      const child = Bun.spawnSync(
        [
          'bun',
          'run',
          'lint:state',
          '--',
          '--store',
          'packages/tinyapp-lint/test/fixtures/ref-store.ts',
          '--seeds',
          flag('seeds'),
          '--expected',
          flag('expected'),
          '--exams',
          flag('exams'),
        ],
        {cwd: ROOT, stdout: 'pipe', stderr: 'pipe'},
      );

      run = {
        code: child.exitCode,
        lines: child.stdout
          .toString()
          .split('\n')
          .map((line) => line.replace(/\r$/, '')),
      };
      if (run.code !== 1) {
        // A red leg reads as whatever the CLI said, not as a bare exit code.
        console.error(child.stderr.toString());
      }
    } finally {
      rmSync(dir, {recursive: true, force: true});
    }

    expect(run.code).toBe(1);
    // Contains, not equals: the rules directory is shared with the plan's
    // other rules. This line is this rule's.
    expect(run.lines.filter((line) => TMP_LINE.test(line))).toHaveLength(1);

    expect(existsSync(dir)).toBe(false);
  },
  SPAWN_TIMEOUT_MS,
);
