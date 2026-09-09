// Exam for task 4, legs (a)-(g): the evidence writer of M1-M5.
//
// M1. `evidenceDir(stem, env)` returns
//     `<env.ULTRA_RUN_DIR>/state-exams/task-<env.ULTRA_TASK>/<stem>-<env.ULTRA_EXAM_PASS>`
//     when `env.ULTRA_RUN_DIR` is a non-empty string — with `ULTRA_TASK` and
//     `ULTRA_EXAM_PASS` each read as `none` when unset or empty — and that directory
//     exists when it returns.
// M2. When `env.ULTRA_RUN_DIR` is unset or empty, `evidenceDir(stem, env)` returns a
//     directory that exists, lies under `os.tmpdir()`, has a basename beginning
//     `tinyapp-exam-<stem>-`, and differs between two calls.
// M3. `writeEvidence(dir, record)` writes `store-diff.json` (the `storeDiff` array),
//     `mutant.json` (`{killed, path, edits}`), `contract.json` (`{clock, breach}`) and
//     `walls.json` (`{store_ms, render_ms, mutant_ms, render}`), each as
//     `JSON.stringify(value, null, 2)` followed by one newline, and returns the sorted
//     list of file names it wrote.
// M4. `dom.html` (the `dom` string, utf-8) and `screenshot.png` (the `screenshot` bytes)
//     are written only when the record carries them; a record without them leaves neither
//     file, and `writeEvidence` returns exactly the four names.
// M5. `examStem(mainPath)` returns the basename of `mainPath` with a trailing `.test.ts`
//     or `.test.tsx` removed, or with its last extension removed when it has neither.

import {afterAll, expect, test} from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import type {ExamRecord} from '../src/types';
import {evidenceDir, examStem, writeEvidence} from '../src/evidence';

/** Directories this exam made, or made `evidenceDir` make, to be swept at the end. */
const madeDirs: string[] = [];

/** A fresh scratch directory to stand in for a run directory. */
const scratch = (): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tinyapp-exam-fixture-'));
  madeDirs.push(dir);
  return dir;
};

const remember = (dir: string): string => {
  madeDirs.push(dir);
  return dir;
};

afterAll(() => {
  for (const dir of madeDirs) fs.rmSync(dir, {recursive: true, force: true});
});

/** The record of leg (d): no `dom`, no `screenshot`. Keys in the order M3 spells them. */
const plainRecord = (): ExamRecord => ({
  walls: {store_ms: 3, render_ms: null, mutant_ms: 1, render: 'skipped'},
  mutant: {
    killed: true,
    path: 'todos/0/completed',
    edits: [{table: 'todos', row: '0', cell: 'completed', value: true}],
  },
  contract: {clock: '2026-01-01T00:00:00Z', breach: null},
  storeDiff: [
    {table: 'todos', row: '0', cell: 'completed', got: true, wanted: false},
  ],
});

const read = (dir: string, name: string): string =>
  fs.readFileSync(path.join(dir, name), 'utf-8');

test('leg (a) [M1]: a run dir, a task and a pass name the directory exactly, and it exists', () => {
  const runDir = scratch();
  const env = {ULTRA_RUN_DIR: runDir, ULTRA_TASK: '3', ULTRA_EXAM_PASS: '0'};

  const dir = evidenceDir('buy-milk', env);

  expect(dir).toBe(path.join(runDir, 'state-exams', 'task-3', 'buy-milk-0'));
  expect(fs.existsSync(dir)).toBe(true);
  expect(fs.statSync(dir).isDirectory()).toBe(true);
});

test('leg (b) [M1]: an unset or empty task and pass each read as `none`', () => {
  const runDir = scratch();
  const expected = path.join(
    runDir,
    'state-exams',
    'task-none',
    'buy-milk-none',
  );

  const unset = evidenceDir('buy-milk', {ULTRA_RUN_DIR: runDir});
  expect(unset).toBe(expected);
  expect(fs.existsSync(unset)).toBe(true);

  const empty = evidenceDir('buy-milk', {
    ULTRA_RUN_DIR: runDir,
    ULTRA_TASK: '',
  });
  expect(empty).toBe(expected);

  const bothEmpty = evidenceDir('buy-milk', {
    ULTRA_RUN_DIR: runDir,
    ULTRA_TASK: '',
    ULTRA_EXAM_PASS: '',
  });
  expect(bothEmpty).toBe(expected);
  expect(fs.existsSync(bothEmpty)).toBe(true);
});

test('leg (c) [M2]: no run dir means a fresh directory of its own under the temp dir', () => {
  const tmpReal = fs.realpathSync(os.tmpdir());

  const first = remember(evidenceDir('buy-milk', {}));
  const second = remember(evidenceDir('buy-milk', {ULTRA_RUN_DIR: ''}));

  for (const dir of [first, second]) {
    expect(fs.existsSync(dir)).toBe(true);
    expect(fs.statSync(dir).isDirectory()).toBe(true);
    expect(path.dirname(fs.realpathSync(dir))).toBe(tmpReal);
    expect(path.basename(dir).startsWith('tinyapp-exam-buy-milk-')).toBe(true);
  }

  expect(first).not.toBe(second);

  const third = remember(evidenceDir('buy-milk', {}));
  expect(third).not.toBe(first);
});

test('leg (d) [M3]: the four JSON files are written, named sorted, and byte-exact', () => {
  const dir = scratch();
  const record = plainRecord();

  const written = writeEvidence(dir, record);

  expect(written).toEqual([
    'contract.json',
    'mutant.json',
    'store-diff.json',
    'walls.json',
  ]);

  const cases: Array<[string, unknown]> = [
    ['store-diff.json', record.storeDiff],
    ['mutant.json', record.mutant],
    ['contract.json', record.contract],
    ['walls.json', record.walls],
  ];

  for (const [name, value] of cases) {
    const bytes = read(dir, name);
    expect(JSON.parse(bytes)).toEqual(value as never);
    expect(bytes).toBe(JSON.stringify(value, null, 2) + '\n');
  }
});

test('leg (e) [M4]: a record without a picture leaves neither dom.html nor screenshot.png', () => {
  const dir = scratch();

  const written = writeEvidence(dir, plainRecord());

  expect(written).toEqual([
    'contract.json',
    'mutant.json',
    'store-diff.json',
    'walls.json',
  ]);
  expect(fs.existsSync(path.join(dir, 'dom.html'))).toBe(false);
  expect(fs.existsSync(path.join(dir, 'screenshot.png'))).toBe(false);
  expect(fs.readdirSync(dir).sort()).toEqual([
    'contract.json',
    'mutant.json',
    'store-diff.json',
    'walls.json',
  ]);
});

test('leg (f) [M4]: a record with a picture writes the DOM and the screenshot too', () => {
  const dir = scratch();
  const record: ExamRecord = {
    ...plainRecord(),
    walls: {store_ms: 3, render_ms: 7, mutant_ms: 1, render: 'ran'},
    dom: '<p>x</p>',
    screenshot: new Uint8Array([137, 80, 78, 71]),
  };

  const written = writeEvidence(dir, record);

  expect(written).toEqual([
    'contract.json',
    'dom.html',
    'mutant.json',
    'screenshot.png',
    'store-diff.json',
    'walls.json',
  ]);

  expect(read(dir, 'dom.html')).toBe('<p>x</p>');

  const png = fs.readFileSync(path.join(dir, 'screenshot.png'));
  expect(Array.from(new Uint8Array(png))).toEqual([137, 80, 78, 71]);

  expect(read(dir, 'walls.json')).toBe(
    JSON.stringify(record.walls, null, 2) + '\n',
  );
});

test('leg (g) [M5]: the stem drops a .test.ts or .test.tsx suffix, else the last extension', () => {
  expect(examStem('/x/tests/state-exams/buy-milk.test.ts')).toBe('buy-milk');
  expect(examStem('/x/a/b.test.tsx')).toBe('b');
  expect(examStem('/x/probe.ts')).toBe('probe');
});
