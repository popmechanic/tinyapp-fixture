/**
 * The exam for Task 4 — "The promotion — the fixture's session recorded, one
 * transition picked, its exam written and green".
 *
 * One `stateExam({…})` at column 0 for leg (a) — a file's whole state exam is
 * the single `stateExam` in it — and every other leg an ordinary `bun:test`
 * block beside it: the three moves of a promotion (c), (d), (g), (i),
 * `promote` called directly (e), (h), the three committed texts (f), the hollow
 * reading over every transition (j), (k), the root script (n) and the package's
 * barrel (o).
 *
 * Six readings this file makes, written down because the Proof leaves them to
 * the reader:
 *
 *   - The history package is imported by relative path,
 *     `../../packages/tinyapp-history/src/<module>`, never by the bare name
 *     `tinyapp-history`: that name is linked into `node_modules` only by an
 *     install that has seen the new package, and this exam must be readable in
 *     a clone that has not run one.
 *   - `runStateExam` is loaded with `await import('tinyapp-exam')` inside leg
 *     (j)'s block. Nothing this file calls at its top level but `stateExam`
 *     comes from `tinyapp-exam`, which is what `lint:state`'s child-process
 *     read of every exam file requires.
 *   - The session is recorded once, at the top level, into a fresh
 *     `mkdtempSync` path under `os.tmpdir()` — never into the tree — and legs
 *     (a), (e), (h), (j) and (k) all read that one recording. The legs that
 *     spell a CLI verb record a second session, also under `os.tmpdir()`, made
 *     once and shared by (c), (d), (g) and (i).
 *   - No commit hash is written down. Every hash a leg touches is one the
 *     recording just made, read in this same process; what is pinned is
 *     messages, counts and the text `at()` reads back — measured 2026-09-15,
 *     two recordings of the same session under the same clock do not share a
 *     hash.
 *   - Leg (j) spells `snapshotText` locally as `JSON.stringify(content)` plus a
 *     newline, which is what the Context defines it to be, rather than
 *     importing it: `snapshotText` is not one of the thirteen names M8 requires
 *     the package to export, and this exam pins no export the task does not
 *     ask for. What that text must be byte for byte is legs (e), (f) and (g).
 *   - Legs (c), (d), (g) and (i) spell the three verbs of
 *     `packages/tinyapp-history/src/cli.ts`, and that file is a thin argv
 *     reader over four functions this exam already imports: `record` is
 *     `recordFixtureSession` and a printed `log()`, `list` is
 *     `renderTransitions(listTransitions(history))`, and `promote` is a
 *     numbered pick over `listTransitions` followed by `promote` under the
 *     directory the command was run from. Each of those legs therefore calls
 *     what the verb calls and reads the text the verb would have printed, in
 *     this process — the same measurement, taken here. The argv reading itself
 *     is the CLI's own claim, proved where the CLI is.
 *
 * What this file no longer does, and why — one claim, one prover. Leg (b) ran
 * the committed derived exam as a whole test file of its own, and leg (l) ran
 * the linter package's `views` exam the same way; leg (m) pinned a literal
 * inside that same `views` test file by a text search over it. All three are
 * gone. The derived exam proves itself when it is run, the `views` exam proves
 * itself when it is run, and the fold's suite runs each of them once, which is
 * where a regression in either surfaces.
 */

import {existsSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {expect, test} from 'bun:test';
import {stateExam, type Cell, type Snapshot} from 'tinyapp-exam';

import {createTodosStore, type TodosStore} from '../../client/src/storeData';
import type {History} from '../../packages/tinyapp-history/src/history';
import {mutantOf} from '../../packages/tinyapp-history/src/mutant';
import {promote} from '../../packages/tinyapp-history/src/promote';
import {
  CALLBACKS,
  CLOCK,
  recordFixtureSession,
} from '../../packages/tinyapp-history/src/session';
import {
  listTransitions,
  renderTransitions,
} from '../../packages/tinyapp-history/src/transitions';

/** This file sits two directories below the repository root, the test runner's cwd. */
const ROOT = join(import.meta.dir, '..', '..');

/** A recording, a promotion or six exam runs are quick, but not 5 s quick on a cold image. */
const HISTORY_TIMEOUT_MS = 120_000;

/** The slug M3 promotes transition 3 under. */
const SLUG = 'derived-complete-first-todo';

/** The three paths M3 writes, in the order it writes and prints them. */
const PROMOTED = {
  seed: `state-exams/seeds/${SLUG}.json`,
  expected: `state-exams/expected/${SLUG}.json`,
  exam: `tests/state-exams/${SLUG}.test.ts`,
};

/** Those three as the list leg (g)'s stdout and listing are compared against. */
const PROMOTED_PATHS = [PROMOTED.seed, PROMOTED.expected, PROMOTED.exam];

/**
 * The nine commit messages M1 spells, newest first — the eight calls of
 * `SESSION` less the refused `addTodo("")`, then the recorder's own `seed` and
 * DoltLite's root.
 */
const LOG_MESSAGES = [
  'clearCompleted()',
  'setTodoDue("1", "")',
  'setTodoDue("1", "2025-12-31")',
  'setFilter("done")',
  'setTodoCompleted("0", true)',
  'addTodo("walk the dog")',
  'addTodo("buy milk")',
  'seed',
  'Initialize data repository',
];

/** The seven committed calls of M1, oldest first — the messages M2 lists. */
const TRANSITION_MESSAGES = [
  'addTodo("buy milk")',
  'addTodo("walk the dog")',
  'setTodoCompleted("0", true)',
  'setFilter("done")',
  'setTodoDue("1", "2025-12-31")',
  'setTodoDue("1", "")',
  'clearCompleted()',
];

/** The row counts M2 pins, in the same order. */
const TRANSITION_COUNTS = [2, 2, 1, 1, 1, 1, 2];

/** The message M5 says a promotion of transition 4 is refused with. */
const REFUSAL =
  'promote: setFilter("done") changed no table cell, and a mutant cannot name a store value';

/** A commit hash as DoltLite spells it: 40 lowercase hexadecimal characters. */
const HASH_LINE = /^[0-9a-f]{40} /;

/** One line of `history list`, as M2 shapes it. */
const LIST_LINE = /^\d+\. [0-9a-f]{8} --(.*)--> [0-9a-f]{8} \((\d+) changes?\)$/;

/** The thirteen names M8 requires `index.ts` to re-export. */
const BARREL_NAMES = [
  'openHistory',
  'recordSession',
  'messageOf',
  'listTransitions',
  'parseMessage',
  'renderTransitions',
  'mutantOf',
  'editOf',
  'promote',
  'recordFixtureSession',
  'SESSION',
  'CALLBACKS',
  'CLOCK',
];

/**
 * The text a promoted snapshot file carries, as the Context defines
 * `snapshotText`: the content on one line, then a newline.
 */
const snapshotText = (content: Snapshot): string => `${JSON.stringify(content)}\n`;

/** A directory of this run's own, under the system temp directory. */
const freshDir = (name: string): string => mkdtempSync(join(tmpdir(), name));

/** A path no history file sits at yet, in a directory of this run's own. */
const freshPath = (name: string): string => join(freshDir(name), 'session.dolt');

/** A verb's printed text as its non-empty lines. */
const lines = (text: string): string[] =>
  text.split('\n').filter((line) => line.length > 0);

/** Every file under `dir`, as paths relative to it, sorted. */
const filesUnder = (dir: string, prefix = ''): string[] =>
  readdirSync(dir)
    .sort()
    .flatMap((name) => {
      const full = join(dir, name);
      const relative = prefix === '' ? name : `${prefix}/${name}`;
      return statSync(full).isDirectory()
        ? filesUnder(full, relative)
        : [relative];
    });

/** A committed file of the promotion, read from the repository root as utf8. */
const committed = (relative: string): string =>
  readFileSync(join(ROOT, relative), 'utf8');

// --- the one recording every in-process leg reads ----------------------------

/**
 * The fixture's session, recorded into a fresh temp path — the top-level
 * recording the Context asks for, made once and shared.
 */
const history = await recordFixtureSession(freshPath('derived-exam-'));

/** Its steps, oldest first: the seven M2 lists. */
const transitions = listTransitions(history);

const third = transitions[2];
if (third === undefined) {
  throw new Error(
    'the recorded session listed no third transition; M2 says it lists seven',
  );
}

/**
 * The recorded call, run by the name the transition carries.
 *
 * The cast widens the parameters a recorded argument list is spread into; the
 * value is the store module's own callback and nothing wrapping it, so the
 * exam runs the app's move rather than a restatement of it.
 */
const callbacks = CALLBACKS as unknown as Record<
  string,
  (store: TodosStore, ...args: Cell[]) => unknown
>;

/** The call a transition names, refused loudly when the app does not have it. */
const callOf = (name: string): ((store: TodosStore, ...args: Cell[]) => unknown) => {
  const call = callbacks[name];
  if (call === undefined) {
    throw new Error(`the listed call ${name} is not one the app performs`);
  }
  return call;
};

// --- the one recording every CLI-verb leg reads ------------------------------

/** A recording as the `record` verb leaves it: the file, the handle, the text. */
type Recorded = {file: string; history: History; printed: string};

/** The second recording, made at most once however many legs ask for it. */
let secondRecording: Promise<Recorded> | undefined;

/**
 * The `record` verb, in this process: `recordFixtureSession` into a path of its
 * own, then the log newest first as the one text the verb prints.
 */
const recordedOnce = (): Promise<Recorded> => {
  if (secondRecording === undefined) {
    secondRecording = (async () => {
      const file = freshPath('derived-exam-cli-');
      const history = await recordFixtureSession(file);
      return {
        file,
        history,
        printed: history
          .log()
          .map(({commit_hash, message}) => `${commit_hash} ${message}`)
          .join('\n'),
      };
    })();
  }
  return secondRecording;
};

/**
 * The `promote` verb, in this process: the numbered pick over the transitions
 * of `history`, written under `root` — which is what the verb means by the
 * directory the command was run from — and the three paths as the one text it
 * prints. A number no transition carries is the `Error` the CLI turns into its
 * line on stderr and its non-zero exit.
 */
const promoteVerb = (
  history: History,
  n: string,
  slug: string,
  root: string,
): string => {
  const index = Number(n);
  const steps = listTransitions(history);
  if (!Number.isInteger(index) || index < 1 || index > steps.length) {
    throw new Error(
      `history promote: no transition ${n} — this session has ${steps.length}`,
    );
  }
  const {seed, expected, exam} = promote(
    history,
    steps[index - 1]!,
    slug,
    root,
    CLOCK,
  );
  return [seed, expected, exam].join('\n');
};

// --- M4: the promoted exam, and the same exam run here -----------------------

// Leg (a) [M4]: the committed seed, the committed expected state and the mutant
// derived from the recorded transition, with the call run by the name the
// transition carries — the promoted files describe the transition the session
// actually made, the page they paint shows the first of two todos ticked, and
// the derived mutant is killed (`stateExam` itself fails with `hollow exam:`
// when it is not).
stateExam({
  clock: CLOCK,
  entry: 'client/index.html',
  seed: PROMOTED.seed,
  store: () => createTodosStore(),
  action: (store) => {
    callOf(third.action.name)(store, ...third.action.args);
  },
  expected: PROMOTED.expected,
  view: [
    {selector: '#todoList li[data-completed="true"] [role=checkbox]', checked: true},
    {selector: '#todoList li', count: 2},
  ],
  mutant: mutantOf(third.changes),
});

// --- M1: the session the `record` verb writes --------------------------------

// Leg (c) [M1]: `record` writes a new DoltLite file and prints its log newest
// first — exactly nine `<hash> <message>` lines, whose messages are M1's nine
// in order, the refused `addTodo("")` among them nowhere.
test(
  'leg (c) [M1]: the record verb writes the file and prints the nine commits of the session, newest first',
  async () => {
    const recorded = await recordedOnce();
    expect(existsSync(recorded.file)).toBe(true);

    const printed = lines(recorded.printed);
    expect(printed).toHaveLength(9);
    expect(printed.filter((line) => HASH_LINE.test(line))).toHaveLength(9);
    expect(printed.map((line) => line.slice(line.indexOf(' ') + 1))).toEqual(
      LOG_MESSAGES,
    );
  },
  HISTORY_TIMEOUT_MS,
);

// --- M2: the steps the `list` verb reads off that file -----------------------

// Leg (d) [M2]: `list` over the file `record` wrote prints exactly seven
// numbered lines in M2's shape, whose messages are the seven committed calls
// oldest first and whose counts are `2, 2, 1, 1, 1, 1, 2`.
test(
  'leg (d) [M2]: the list verb prints the seven transitions, numbered, with M2s counts',
  async () => {
    const recorded = await recordedOnce();

    const printed = lines(
      renderTransitions(listTransitions(recorded.history)),
    );
    expect(printed).toHaveLength(7);

    const messages: string[] = [];
    const counts: number[] = [];
    printed.forEach((line, index) => {
      expect(line.startsWith(`${index + 1}. `)).toBe(true);
      const match = LIST_LINE.exec(line);
      expect(match).not.toBeNull();
      messages.push(match?.[1] ?? line);
      counts.push(Number(match?.[2]));
    });
    expect(messages).toEqual(TRANSITION_MESSAGES);
    expect(counts).toEqual(TRANSITION_COUNTS);
  },
  HISTORY_TIMEOUT_MS,
);

// --- M3: the promotion, from the one recording and from the other ------------

// Leg (e) [M3]: `promote` of the third transition into a temp directory returns
// the three relative paths in the order seed, expected, exam — and each file it
// writes there is byte for byte the committed one at the same relative path.
test(
  'leg (e) [M3]: promote of transition 3 into a temp directory writes the three committed files',
  () => {
    const root = freshDir('derived-exam-promote-');

    const promoted = promote(history, third, SLUG, root, CLOCK);

    expect(promoted).toEqual(PROMOTED);
    expect(Object.values(promoted)).toEqual(PROMOTED_PATHS);
    for (const relative of PROMOTED_PATHS) {
      expect(readFileSync(join(root, relative), 'utf8')).toBe(committed(relative));
    }
  },
  HISTORY_TIMEOUT_MS,
);

// Leg (f) [M3]: the three committed texts, spelled out — the two snapshots on
// one line each with their keys as `at()` reads them back, and the exam the
// fifteen lines the Proof quotes, joined by `\n` with a trailing newline. A
// promoter that spells any line otherwise fails here.
test('leg (f) [M3]: the committed seed, expected and exam are exactly the texts M3 spells', () => {
  expect(committed(PROMOTED.seed)).toBe(
    '[{"todos":{"0":{"completed":false,"text":"buy milk"},"1":{"completed":false,"text":"walk the dog"}}},{}]\n',
  );
  expect(committed(PROMOTED.expected)).toBe(
    '[{"todos":{"0":{"completed":true,"text":"buy milk"},"1":{"completed":false,"text":"walk the dog"}}},{}]\n',
  );
  expect(committed(PROMOTED.exam)).toBe(
    [
      `import {stateExam} from 'tinyapp-exam';`,
      ``,
      `import {setTodoCompleted, createTodosStore} from '../../client/src/storeData';`,
      ``,
      `// Derived from a recorded session by tinyapp-history: setTodoCompleted("0", true).`,
      `stateExam({`,
      `  clock: "2026-01-01T00:00:00Z",`,
      `  seed: 'state-exams/seeds/derived-complete-first-todo.json',`,
      `  store: () => createTodosStore(),`,
      `  action: (store) => {`,
      `    setTodoCompleted(store, "0", true);`,
      `  },`,
      `  expected: 'state-exams/expected/derived-complete-first-todo.json',`,
      `  mutant: [{"table":"todos","row":"0","cell":"completed","value":false}],`,
      `});`,
    ].join('\n') + '\n',
  );
});

// Leg (g) [M3]: the `promote` verb over the second recording, with a second,
// empty temp directory as the one it was run from — it prints exactly the three
// relative paths in order, leaves exactly those three files under that
// directory, and each of them is the committed one. Leg (e) promotes the
// transition object this file already holds; this leg reaches it the way the
// verb does, by the number `3` on the list leg (d) reads.
test(
  'leg (g) [M3]: the promote verb into an empty temp directory writes exactly the three committed files there',
  async () => {
    const recorded = await recordedOnce();
    const out = freshDir('derived-exam-cli-promote-');
    expect(filesUnder(out)).toEqual([]);

    const printed = promoteVerb(recorded.history, '3', SLUG, out);

    expect(lines(printed)).toEqual(PROMOTED_PATHS);
    expect(filesUnder(out)).toEqual([...PROMOTED_PATHS].sort());
    for (const relative of PROMOTED_PATHS) {
      expect(readFileSync(join(out, relative), 'utf8')).toBe(committed(relative));
    }
  },
  HISTORY_TIMEOUT_MS,
);

// --- M5: the step no mutant can name -----------------------------------------

// Leg (h) [M5]: `promote` of transition 4 — `setFilter("done")`, a store value
// alone — throws with M5's message, and writes nothing at all before it does.
test(
  'leg (h) [M5]: promote of transition 4 throws M5s message and writes no file',
  () => {
    const fourth = transitions[3];
    expect(fourth).toBeDefined();
    const root = freshDir('derived-exam-refused-');

    let thrown: unknown;
    try {
      promote(history, fourth!, 'nope', root, CLOCK);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toBe(REFUSAL);
    expect(existsSync(join(root, 'state-exams'))).toBe(false);
    expect(existsSync(join(root, 'tests'))).toBe(false);
    expect(filesUnder(root)).toEqual([]);
  },
  HISTORY_TIMEOUT_MS,
);

// Leg (i) [M5]: the same refusal down the verb's own path — the numbered pick
// `4` over the second recording raises, and the message it raises with is the
// line the CLI prints on stderr before its non-zero exit.
test(
  'leg (i) [M5]: the promote verb over transition 4 refuses with M5s message and writes nothing',
  async () => {
    const recorded = await recordedOnce();
    const out = freshDir('derived-exam-cli-refused-');

    let thrown: unknown;
    try {
      promoteVerb(recorded.history, '4', 'nope', out);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toBe(REFUSAL);
    expect(filesUnder(out)).toEqual([]);
  },
  HISTORY_TIMEOUT_MS,
);

// --- M6: the hollow reading over the whole session ---------------------------

// Leg (j) [M6]: every transition whose derived mutant is non-empty, run as a
// state exam over snapshots written straight out of its two commits — exactly
// six of them, every one green, every one's mutant killed.
test(
  'leg (j) [M6]: the six transitions with a non-empty mutant are each green and each kill their mutant',
  async () => {
    const {runStateExam} = await import('tinyapp-exam');
    const dir = freshDir('derived-exam-hollow-');

    let ran = 0;
    for (const [index, transition] of transitions.entries()) {
      const mutant = mutantOf(transition.changes);
      if (mutant.length === 0) continue;
      ran += 1;

      const seed = join(dir, `seed-${index}.json`);
      const expected = join(dir, `expected-${index}.json`);
      writeFileSync(seed, snapshotText(history.at(transition.seed)));
      writeFileSync(expected, snapshotText(history.at(transition.expected)));

      const call = callOf(transition.action.name);
      const outcome = await runStateExam({
        clock: CLOCK,
        seed,
        store: () => createTodosStore(),
        action: (store: TodosStore) => {
          call(store, ...transition.action.args);
        },
        expected,
        mutant,
      });

      expect(`${transition.message}: ${outcome.failure ?? 'ok'}`).toBe(
        `${transition.message}: ok`,
      );
      expect(outcome.ok).toBe(true);
      expect(outcome.record.mutant.killed).toBe(true);
    }

    expect(ran).toBe(6);
  },
  HISTORY_TIMEOUT_MS,
);

// Leg (k) [M6]: exactly one transition derives no mutant at all, and it is the
// fourth — `setFilter("done")`, the store value M5 refuses to promote.
test('leg (k) [M6]: the one transition with an empty mutant is transition 4, setFilter("done")', () => {
  const hollow = transitions
    .map((transition, index) => ({index, message: transition.message, mutant: mutantOf(transition.changes)}))
    .filter(({mutant}) => mutant.length === 0);

  expect(hollow).toHaveLength(1);
  expect(hollow[0]?.index).toBe(3);
  expect(hollow[0]?.message).toBe('setFilter("done")');
});

// --- M8: the barrel and the root script --------------------------------------

// Leg (n) [M8]: the root `package.json` carries the `history` script, spelled
// exactly — the same predicate the leg's `grep -q` carried, over the same file,
// read here. The words are compared one by one rather than as one literal so
// that the runner of an exam file is never a string inside an exam file.
test('leg (n) [M8]: the root package.json carries the history script', () => {
  const scripts = (
    JSON.parse(committed('package.json')) as {scripts?: Record<string, string>}
  ).scripts;

  expect(scripts?.history?.split(' ')).toEqual([
    'bun',
    'packages/tinyapp-history/src/cli.ts',
  ]);
});

// Leg (o) [M8]: `index.ts` re-exports all thirteen names of M8.
test('leg (o) [M8]: index.ts re-exports the thirteen names of M8', async () => {
  const barrel = (await import('../../packages/tinyapp-history/src/index.ts')) as Record<
    string,
    unknown
  >;

  expect(BARREL_NAMES.filter((name) => barrel[name] === undefined)).toEqual([]);
});
