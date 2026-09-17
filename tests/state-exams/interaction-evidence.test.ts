/**
 * The exam for Task 1 — "Two exams whose action is the interaction".
 *
 * It never imports the two exam files it grades. Their text is read, and the
 * specs they declare are run here through `runStateExam` — the very function
 * their `stateExam({…})` registration calls — with `ULTRA_RUN_DIR` pointed at a
 * fresh `mkdtemp` directory, with `ULTRA_TASK` and `ULTRA_EXAM_PASS` taken out
 * of the environment handed to it, and with `main` set to the exam file each
 * spec belongs to, so the helper's `evidenceDir` rule
 * (`packages/tinyapp-exam/src/evidence.ts`) lands the record at
 * `<dir>/state-exams/task-none/<stem>-none`, and the evidence is read back off
 * disk from there.
 *
 * One claim, one prover: this file's claim is the evidence an interaction
 * leaves, and it measures that itself, in this process. It used to run each exam
 * file as its own child test process and grade the child's exit status; those
 * two legs are gone, because each of those exams proves itself and the fold's
 * suite runs it once. What is left of them is the text legs — that each file
 * declares the spec its clause spells — which is what makes the specs below the
 * specs those files carry.
 *
 * The runs are memoised, so a spec that two legs read is run once.
 *
 * Legs and the Machine clauses they come from:
 *   (a) [M1] the click exam's text names the spec the clause spells, and
 *            `two-todos-first-done.json` parses to exactly the named state;
 *   (b) [M2] the Enter exam's text names its own spec;
 *   (c) [M3] each spec, run with a fresh `ULTRA_RUN_DIR`, leaves exactly the six
 *            evidence files, with the values the clause pins;
 *   (d) [M4] the click spec against `still-empty.json` is red, saying
 *            `store move: expected state not reached`;
 *   (e) [M5] the README section the Proof's third `Run:` line reads, which stops
 *            holding once that section is removed.
 */

import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {afterAll, expect, test} from 'bun:test';
import {runStateExam} from 'tinyapp-exam';

import {createTodosStore} from '../../client/src/storeData';

/** This file sits two directories below the repository root. */
const ROOT = join(import.meta.dir, '..', '..');

/** The two exam files this exam grades, as the `Run:` lines named them. */
const CLICK_EXAM = 'tests/state-exams/click-completes-todo.test.ts';
const ENTER_EXAM = 'tests/state-exams/enter-submits-todo.test.ts';

/** The evidence keys the engine reads, sorted as `readdir` returns them. */
const SIX_FILES = [
  'contract.json',
  'dom.html',
  'mutant.json',
  'screenshot.png',
  'store-diff.json',
  'walls.json',
];

/** The wall one run of a rendering exam is given here. */
const EXAM_TIMEOUT_MS = 300_000;

/**
 * The spec `tests/state-exams/click-completes-todo.test.ts` declares, written
 * out here so that this file runs it without importing it. Leg (a)'s text leg
 * is what holds the two spellings together: it reads that file and fails if any
 * part of this spec is not the part that file declares.
 */
const CLICK_SPEC = {
  clock: '2026-01-01T00:00:00Z',
  entry: 'client/index.html',
  seed: 'state-exams/seeds/two-open-todos.json',
  store: () => createTodosStore(),
  action: {click: {role: 'checkbox', name: 'buy milk'}},
  expected: 'state-exams/expected/two-todos-first-done.json',
  view: [
    {selector: '#todoList li[data-completed="true"] [role=checkbox]', checked: true},
    {selector: '#todoList li', count: 2},
  ],
  mutant: [{table: 'todos', row: '0', cell: 'completed', value: false}],
} as const;

/** The same, for `tests/state-exams/enter-submits-todo.test.ts`, held by leg (b). */
const ENTER_SPEC = {
  clock: '2026-01-01T00:00:00Z',
  entry: 'client/index.html',
  seed: 'state-exams/seeds/empty.json',
  store: () => createTodosStore(),
  action: [
    {type: [{role: 'textbox', name: 'New todo'}, 'buy milk']},
    {key: [{role: 'textbox', name: 'New todo'}, 'Enter']},
  ],
  expected: 'state-exams/expected/one-open-todo.json',
  view: {selector: '#todoList li', count: 1, text: 'buy milk'},
  mutant: [{table: 'todos', row: '0', cell: 'text', value: ''}],
} as const;

/** Every temp directory this file made, removed once the suite is done. */
const temps: string[] = [];

const freshDir = (label: string): string => {
  const dir = mkdtempSync(join(tmpdir(), `interaction-evidence-${label}-`));
  temps.push(dir);
  return dir;
};

afterAll(() => {
  for (const dir of temps) {
    rmSync(dir, {recursive: true, force: true});
  }
});

/**
 * The text of a file the task must create, or a failure that says which file is
 * missing rather than one that reads like a typo here.
 */
const readExam = (relative: string): string => {
  const path = join(ROOT, relative);
  if (!existsSync(path)) {
    throw new Error(
      `${relative} does not exist — this task must create it before its exam can grade it`,
    );
  }
  return readFileSync(path, 'utf8');
};

type ExamRun = {ok: boolean; failure: string | null; dir: string; runDir: string};

/**
 * Runs one spec through `runStateExam` — the function the exam files' own
 * `stateExam({…})` registration calls — against a fresh `ULTRA_RUN_DIR`.
 *
 * The environment handed to it is this process's own plus that directory, minus
 * `ULTRA_TASK` and `ULTRA_EXAM_PASS`, so the record lands under `task-none` and
 * a `<stem>-none` directory whatever the engine set around us; `main` is the
 * exam file the spec belongs to, which is where the stem comes from.
 */
const runExam = async (relative: string, spec: any): Promise<ExamRun> => {
  const path = join(ROOT, relative);
  if (!existsSync(path)) {
    throw new Error(
      `${relative} does not exist — this task must create it before its exam can grade it`,
    );
  }

  const runDir = freshDir(relative.replace(/[^\w.-]+/g, '-'));
  const env: Record<string, string | undefined> = {
    ...process.env,
    ULTRA_RUN_DIR: runDir,
  };
  delete env.ULTRA_TASK;
  delete env.ULTRA_EXAM_PASS;

  const outcome = await runStateExam(spec, {env: env as any, main: path});

  return {ok: outcome.ok, failure: outcome.failure, dir: outcome.dir, runDir};
};

/** One run per exam file, shared by the legs that read it. */
const runs = new Map<string, Promise<ExamRun>>();
const examRun = (relative: string, spec: any): Promise<ExamRun> => {
  const pending = runs.get(relative) ?? runExam(relative, spec);
  runs.set(relative, pending);
  return pending;
};

/** Fails with the exam's own failure when it was not green. */
const expectGreen = (run: ExamRun, relative: string): void => {
  if (!run.ok) {
    throw new Error(`the exam of ${relative} was red:\n${run.failure}`);
  }
  expect(run.ok).toBe(true);
};

/** Where the helper's `evidenceDir` rule puts this exam's record. */
const evidenceOf = (run: ExamRun, stem: string): string =>
  join(run.runDir, 'state-exams', 'task-none', `${stem}-none`);

const readEvidence = (dir: string, name: string): string =>
  readFileSync(join(dir, name), 'utf8');

const readEvidenceJson = (dir: string, name: string): any =>
  JSON.parse(readEvidence(dir, name));

/** The `{…}` object literals of a source text that hold no nested braces. */
const objectLiterals = (text: string): string[] => text.match(/\{[^{}]*\}/g) ?? [];

/** The first such literal matching every pattern, `undefined` when there is none. */
const literalWith = (text: string, ...patterns: RegExp[]): string | undefined =>
  objectLiterals(text).find((chunk) => patterns.every((p) => p.test(chunk)));

/**
 * The Enter exam's locator: the new-todo box, by role and accessible name.
 *
 * It was `input[placeholder="What needs to be done?"]` — a tag and an attribute
 * of the app's own words. Every interaction on this tree names its control the
 * way a person would instead, so the pattern is the object literal, spaced any
 * way a formatter leaves it and quoted either way.
 */
const NEW_TODO_LOCATOR = String.raw`\{\s*role\s*:\s*(['"\`])textbox\1\s*,\s*name\s*:\s*(['"\`])New todo\2\s*\}`;

/**
 * The Proof's third `Run:` line as a predicate over a README's text.
 *
 * The line was
 * `sed -n '/^## State exams/,/^## /p' <file> | tr '\n' ' ' | grep -q '<pattern>'`:
 * `sed`'s range is inclusive at both ends and runs to the end of the file when
 * the closing address never matches, and `tr` leaves the trailing newline as a
 * final space. This is that pipeline, in this process.
 */
const readmeHolds = (text: string): boolean => {
  const lines = text.split('\n');
  const start = lines.findIndex((line) => /^## State exams/.test(line));
  if (start < 0) {
    return false;
  }
  const after = lines.slice(start + 1).findIndex((line) => /^## /.test(line));
  const end = after < 0 ? lines.length : start + 1 + after + 1;
  const section = `${lines.slice(start, end).join(' ')} `;

  return /click.*type.*key.*Chromium.*TINYAPP_BROWSER.*store diff.*DOM.*screenshot/.test(
    section,
  );
};

// --- Leg (a) [M1]: the click exam ------------------------------------------

test('leg (a) [M1]: the click exam names the entry, the seed, the click, the expected state, both view entries and the mutant', () => {
  const source = readExam(CLICK_EXAM);

  // `entry` and `seed`, as the clause spells them.
  expect(source).toContain('client/index.html');
  expect(source).toContain('state-exams/seeds/two-open-todos.json');

  // `action: {click: {role: 'checkbox', name: 'buy milk'}}`.
  expect(source).toMatch(
    /click\s*:\s*\{\s*role\s*:\s*(['"`])checkbox\1\s*,\s*name\s*:\s*(['"`])buy milk\2\s*\}/,
  );

  // `expected`: the new file, not the BASE `two-todos-one-done.json`.
  expect(source).toContain('state-exams/expected/two-todos-first-done.json');

  // The view entry `{selector: '#todoList li[data-completed="true"]
  // [role=checkbox]', checked: true}` — `\bchecked` so `unchecked: true` cannot
  // stand in for it.
  expect(
    literalWith(
      source,
      /selector\s*:\s*(['"`])#todoList li\[data-completed="true"\] \[role=checkbox\]\1/,
      /\bchecked\s*:\s*true/,
    ),
  ).toBeDefined();

  // The view entry `{selector: '#todoList li', count: 2}`.
  expect(
    literalWith(
      source,
      /selector\s*:\s*(['"`])#todoList li\1/,
      /count\s*:\s*2/,
    ),
  ).toBeDefined();

  // The mutant edit `{table: 'todos', row: '0', cell: 'completed', value: false}`.
  expect(
    literalWith(
      source,
      /table\s*:\s*(['"`])todos\1/,
      /row\s*:\s*(['"`])0\1/,
      /cell\s*:\s*(['"`])completed\1/,
      /value\s*:\s*false/,
    ),
  ).toBeDefined();
});

test('leg (a) [M1]: state-exams/expected/two-todos-first-done.json parses to exactly row 0 done, row 1 open', () => {
  const path = join(ROOT, 'state-exams', 'expected', 'two-todos-first-done.json');
  if (!existsSync(path)) {
    throw new Error(
      'state-exams/expected/two-todos-first-done.json does not exist — this task must create it',
    );
  }

  expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual([
    {
      todos: {
        '0': {text: 'buy milk', completed: true},
        '1': {text: 'walk the dog', completed: false},
      },
    },
    {},
  ]);
});

// --- Leg (b) [M2]: the Enter exam ------------------------------------------

test('leg (b) [M2]: the Enter exam names the entry, the seed, the type then the key, the expected state, the view entry and the mutant', () => {
  const source = readExam(ENTER_EXAM);

  expect(source).toContain('client/index.html');
  expect(source).toContain('state-exams/seeds/empty.json');
  expect(source).toContain('state-exams/expected/one-open-todo.json');

  // `{type: [{role: 'textbox', name: 'New todo'}, 'buy milk']}`.
  const typed = source.match(
    new RegExp(
      String.raw`type\s*:\s*\[\s*` +
        NEW_TODO_LOCATOR +
        String.raw`\s*,\s*(['"\`])buy milk\3\s*\]`,
    ),
  );
  expect(typed).not.toBeNull();

  // `{key: [{role: 'textbox', name: 'New todo'}, 'Enter']}`.
  const pressed = source.match(
    new RegExp(
      String.raw`key\s*:\s*\[\s*` +
        NEW_TODO_LOCATOR +
        String.raw`\s*,\s*(['"\`])Enter\3\s*\]`,
    ),
  );
  expect(pressed).not.toBeNull();

  // The two-element list is in that order: the text is typed, then Enter.
  expect(typed?.index ?? -1).toBeGreaterThanOrEqual(0);
  expect(pressed?.index ?? -1).toBeGreaterThan(typed?.index ?? -1);

  // The view entry `{selector: '#todoList li', count: 1, text: 'buy milk'}`.
  expect(
    literalWith(
      source,
      /selector\s*:\s*(['"`])#todoList li\1/,
      /count\s*:\s*1/,
      /text\s*:\s*(['"`])buy milk\1/,
    ),
  ).toBeDefined();

  // The mutant edit `{table: 'todos', row: '0', cell: 'text', value: ''}`.
  expect(
    literalWith(
      source,
      /table\s*:\s*(['"`])todos\1/,
      /row\s*:\s*(['"`])0\1/,
      /cell\s*:\s*(['"`])text\1/,
      /value\s*:\s*(['"`])\1/,
    ),
  ).toBeDefined();
});

// --- Leg (c) [M3]: the evidence each child leaves ---------------------------

test(
  'leg (c) [M3]: the click exam leaves state-exams/task-none/click-completes-todo-none/ holding exactly the six evidence files',
  async () => {
    const run = await examRun(CLICK_EXAM, CLICK_SPEC);
    expectGreen(run, CLICK_EXAM);

    const dir = evidenceOf(run, 'click-completes-todo');
    // The helper says it wrote the record there, and it is there.
    expect(run.dir).toBe(dir);
    expect(existsSync(dir)).toBe(true);
    expect(readdirSync(dir).sort()).toEqual(SIX_FILES);

    // The store move reached the expected state: no difference at all.
    expect(readEvidenceJson(dir, 'store-diff.json')).toEqual([]);

    // A page was opened and the interaction was timed in it.
    const walls = readEvidenceJson(dir, 'walls.json');
    expect(walls.browser).toBe('ran');
    expect(typeof walls.action_ms).toBe('number');
    expect(Number.isFinite(walls.action_ms)).toBe(true);

    // The named perturbation of row 0 would have been noticed.
    const mutant = readEvidenceJson(dir, 'mutant.json');
    expect(mutant.killed).toBe(true);
    expect(mutant.path).toBe('todos/0/completed');

    // The markup shows the clicked row done and its box reflected as ticked.
    // The row said so with `class="todoItem completed"` while it had classes of
    // the app's own; it says so with the attribute the views read now.
    const dom = readEvidence(dir, 'dom.html');
    expect(dom).toContain('data-completed="true"');
    expect(dom).toContain('data-checked="true"');

    // The picture is a PNG: 89 50 4E 47.
    const png = readFileSync(join(dir, 'screenshot.png'));
    expect(Array.from(png.subarray(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47]);
  },
  EXAM_TIMEOUT_MS,
);

test(
  'leg (c) [M3]: the Enter exam leaves state-exams/task-none/enter-submits-todo-none/ with the same six files, an empty diff and a killed mutant on todos/0/text',
  async () => {
    const run = await examRun(ENTER_EXAM, ENTER_SPEC);
    expectGreen(run, ENTER_EXAM);

    const dir = evidenceOf(run, 'enter-submits-todo');
    expect(run.dir).toBe(dir);
    expect(existsSync(dir)).toBe(true);
    expect(readdirSync(dir).sort()).toEqual(SIX_FILES);

    expect(readEvidenceJson(dir, 'store-diff.json')).toEqual([]);
    expect(readEvidenceJson(dir, 'walls.json').browser).toBe('ran');

    const mutant = readEvidenceJson(dir, 'mutant.json');
    expect(mutant.killed).toBe(true);
    expect(mutant.path).toBe('todos/0/text');
  },
  EXAM_TIMEOUT_MS,
);

// --- Leg (d) [M4]: the same exam against the wrong expected state is red -----

test(
  'leg (d) [M4]: the click spec against still-empty.json is not ok and says `store move: expected state not reached`',
  async () => {
    // The file this spec belongs to still names the state the green run reaches,
    // so the only thing changed below is the state, exactly as the leg's copy of
    // that file changed only that.
    const source = readExam(CLICK_EXAM);
    expect(source).toContain('two-todos-first-done.json');

    const run = await runExam(CLICK_EXAM, {
      ...CLICK_SPEC,
      expected: 'state-exams/expected/still-empty.json',
    });

    expect(run.ok).toBe(false);
    expect(run.failure ?? '').toContain('store move: expected state not reached');
  },
  EXAM_TIMEOUT_MS,
);

// --- Leg (e) [M5]: the README section ---------------------------------------

test("leg (e) [M5]: the Proof's README predicate holds over README.md", () => {
  expect(readmeHolds(readFileSync(join(ROOT, 'README.md'), 'utf8'))).toBe(true);
});

test('leg (e) [M5]: the same predicate over a README.md without its `## State exams` section does not hold', () => {
  const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');

  const lines = readme.split('\n');
  const start = lines.findIndex((line) => line.startsWith('## State exams'));
  if (start < 0) {
    throw new Error(
      'README.md has no `## State exams` heading — this task must add that section',
    );
  }
  let end = start + 1;
  while (end < lines.length && !lines[end].startsWith('## ')) {
    end++;
  }
  const stripped = [...lines.slice(0, start), ...lines.slice(end)].join('\n');
  expect(stripped).not.toContain('## State exams');

  // Written out and read back, so the predicate grades a file on disk here too.
  const copy = join(freshDir('readme'), 'README.md');
  writeFileSync(copy, stripped);

  expect(readmeHolds(readFileSync(copy, 'utf8'))).toBe(false);
});
