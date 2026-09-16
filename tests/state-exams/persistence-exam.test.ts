// Exam for task 2, leg (h) [M8]: the persistence exam as a registered `bun test`, and the
// seeded exam still working beside it.
//
// M8. `persistenceExam(spec)` registers one bun test named
//     `persistence exam: <examStem(Bun.main)>` with timeout `STATE_EXAM_TIMEOUT_MS` whose
//     body awaits `runPersistenceExam(spec)` and throws an `Error` with message `failure`
//     when `ok` is false — the one top-level `persistenceExam({…})` of this file, over the
//     honest stand-in with M5's spec, is green; and the seeded exam still works: the state
//     exam clicking `{role: 'checkbox', name: 'buy milk'}` on the page seeded from
//     `state-exams/seeds/two-open-todos.json` reaches
//     `state-exams/expected/two-todos-first-done.json`, shows `#todo-0` checked and `#todo-1`
//     unchecked, and kills the mutant setting row `0`'s `completed` to `false`.
// M1. This file imports `persistenceExam`, `runPersistenceExam` and `contentOf` from
//     `tinyapp-exam`, and `bun run lint:state` exits 0 on the tree while it does — the lint
//     capture child links the stub and returns, which is leg (a)'s second `Run:` line.
//
// This file never skips. A machine with no Chromium is this exam's red, not its excuse: the
// no-browser half of the task sits in `packages/tinyapp-exam/test/persistence-move.test.ts`.
//
// Nothing here is done at module level but the two registrations and the imports — the lint
// capture child imports this file for its spec alone, so the child process leg builds its
// files inside its own test body.

import {mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

import {expect, test} from 'bun:test';
import {
  contentOf,
  examStem,
  persistenceExam,
  runPersistenceExam,
  stateExam,
} from 'tinyapp-exam';

import {createTodosStore} from '../../client/src/storeData';

/** This file sits two directories below the repository root. */
const ROOT = join(import.meta.dir, '..', '..');

/** The stand-in fixture this exam is run against, as paths from `process.cwd()`. */
const FIXTURE_DIR = 'packages/tinyapp-exam/test/fixtures/persistence';

/** The content the fixture saves and is read back as. */
const ONE_ROW = [{todos: {'0': {text: 'buy milk', completed: false}}}, {}];

// ---------------------------------------------------------------- the registrations

// The persistence exam itself: the page opened unseeded on the driver's own loopback origin,
// the `Add` button clicked, the save waited for, the page reloaded, and the store and the
// rows read back — M5's spec exactly, registered here as one `bun test`.
persistenceExam({
  clock: '2026-01-01T00:00:00Z',
  entry: `${FIXTURE_DIR}/entry.html`,
  assets: {'/hello.txt': `${FIXTURE_DIR}/hello.txt`},
  action: {click: {role: 'button', name: 'Add'}},
  expected: `${FIXTURE_DIR}/expected-one-row.json`,
  table: 'todos',
  view: {selector: '#rows li', count: 1, text: 'buy milk'},
  mutant: [{table: 'todos', row: '0', cell: 'text', value: ''}],
});

// And the seeded exam beside it, unchanged by any of this: a seeded page is exactly the page
// it was at BASE, flag or no flag.
stateExam({
  clock: '2026-01-01T00:00:00Z',
  entry: 'client/index.html',
  seed: 'state-exams/seeds/two-open-todos.json',
  store: () => createTodosStore(),
  action: {click: {role: 'checkbox', name: 'buy milk'}},
  expected: 'state-exams/expected/two-todos-first-done.json',
  view: [
    {selector: '#todo-0', checked: true},
    {selector: '#todo-1', unchecked: true},
  ],
  mutant: [{table: 'todos', row: '0', cell: 'completed', value: false}],
});

// ---------------------------------------------------------------- (h) [M8]

test('leg (h) [M8]: the three names link here, and the registration above is named for this file', () => {
  // The imports are the point: a capture child that cannot link them is `bun run lint:state`
  // dying as `capture failed`, which is leg (a)'s second `Run:` line.
  expect(typeof persistenceExam).toBe('function');
  expect(typeof runPersistenceExam).toBe('function');
  expect(typeof contentOf).toBe('function');

  // So the test registered above is `persistence exam: persistence-exam`.
  expect(examStem(Bun.main)).toBe('persistence-exam');

  // And `contentOf` reads the stamped row the fixture writes as the content it stands for.
  expect(
    contentOf(
      JSON.parse(
        '[[{"todos":[{"0":[{"text":["buy milk","H1",1],"completed":[false,"H2",2]},"",3]},"",4]},"",5],[{},"",0]]',
      ),
    ),
  ).toEqual(ONE_ROW);
});

test(
  'leg (h) [M8]: a red registration, seen from outside — the child exits 1 and says which exam and why',
  () => {
    // Inside the workspace, so `tinyapp-exam` resolves from the file the child runs.
    const dir = join(ROOT, 'packages/tinyapp-exam/test', `tmp-${Math.random().toString(36).slice(2)}`);
    const here = `packages/tinyapp-exam/test/${dir.split('/').at(-1)}`;

    try {
      mkdirSync(dir, {recursive: true});
      writeFileSync(
        join(dir, 'buy-bread.json'),
        `${JSON.stringify([{todos: {'0': {text: 'buy bread', completed: false}}}, {}])}\n`,
      );
      writeFileSync(
        join(dir, 'red.test.ts'),
        [
          "import {persistenceExam} from 'tinyapp-exam';",
          '',
          'persistenceExam({',
          "  clock: '2026-01-01T00:00:00Z',",
          `  entry: '${FIXTURE_DIR}/entry.html',`,
          `  assets: {'/hello.txt': '${FIXTURE_DIR}/hello.txt'},`,
          "  action: {click: {role: 'button', name: 'Add'}},",
          `  expected: '${here}/buy-bread.json',`,
          "  table: 'todos',",
          "  view: {selector: '#rows li', count: 1, text: 'buy milk'},",
          "  mutant: [{table: 'todos', row: '0', cell: 'text', value: ''}],",
          '});',
          '',
        ].join('\n'),
      );

      const child = Bun.spawnSync(['bun', 'test', `${here}/red.test.ts`], {
        cwd: ROOT,
        stdout: 'pipe',
        stderr: 'pipe',
      });
      const decoder = new TextDecoder();
      const output = `${decoder.decode(child.stdout)}${decoder.decode(child.stderr)}`;
      if (child.exitCode !== 0 && !output.includes('persistence exam: red')) {
        console.log(`bun test ${here}/red.test.ts exited ${child.exitCode}:\n${output}`);
      }

      // The registration is named for the file that declares it, and its body throws the
      // failure the run resolved.
      expect(output).toContain('persistence exam: red');
      expect(output).toContain('persistence: expected state not reached after reload');
      expect(child.exitCode).toBe(1);
    } finally {
      rmSync(dir, {recursive: true, force: true});
    }
  },
  300_000,
);
