/**
 * `bun run history <verb> <file> …` — the three moves of a promotion, at a
 * prompt.
 *
 * `record` writes the fixture's session into a new history file and prints its
 * log; `list` reads that file back as numbered transitions; `promote` takes one
 * of those numbers and writes the exam. The three are separate verbs and not
 * one command deliberately: the pick in the middle is the examiner's, and a
 * tool that recorded and promoted in a breath would be choosing for them.
 *
 * Every path a verb writes is written under the directory the command was run
 * from — see `here()` — so the promotion lands in whichever checkout the
 * examiner was standing in. Anything that goes wrong — a
 * missing verb, a missing file, a number no transition carries, a transition no
 * mutant can name — is one line on stderr and a non-zero exit.
 */

import {resolve} from 'node:path';

import {openHistory, type History} from './history';
import {promote} from './promote';
import {CLOCK, recordFixtureSession} from './session';
import {listTransitions, renderTransitions} from './transitions';

/**
 * What a verb was asked to do that it could not; caught and printed below.
 *
 * The type annotation sits on the `const` and not only on the arrow: that is
 * what makes `tsc` read a call to it as a call that does not return, so the
 * argument checks below narrow rather than merely complain.
 */
const fail: (message: string) => never = (message) => {
  throw new Error(message);
};

/** The repository root: three directories above this module. */
const CLI_ROOT = resolve(import.meta.dir, '..', '..', '..');

/**
 * The current directory a promotion is written under — what someone at a prompt
 * means by "here".
 *
 * `bun run <script>` changes into the package root before it runs the script,
 * so `process.cwd()` inside this file is the repository root however the
 * invocation was spawned; the directory the invocation actually came from is
 * what bun leaves behind in `npm_config_local_prefix`. That variable is read
 * only when `process.cwd()` is the repository root — which is exactly the case
 * where bun did the changing — so running `cli.ts` by path from anywhere still
 * writes where it stands, and an inherited variable never overrides a real cwd.
 */
const here = (): string => {
  const invoked = process.env.npm_config_local_prefix;
  return invoked !== undefined && resolve(process.cwd()) === CLI_ROOT
    ? invoked
    : process.cwd();
};

/** `record`: the fixture's session into a new file, then its log newest first. */
const record = async (file: string): Promise<void> => {
  const history = await recordFixtureSession(file);
  try {
    console.log(
      history
        .log()
        .map(({commit_hash, message}) => `${commit_hash} ${message}`)
        .join('\n'),
    );
  } finally {
    history.close();
  }
};

/** `list`: the transitions of a recorded file, numbered for the pick. */
const list = (history: History): void => {
  console.log(renderTransitions(listTransitions(history)));
};

/** `promote`: transition `n` of a recorded file, as three files under the cwd. */
const promoteOne = (history: History, n: string, slug: string): void => {
  const index = Number(n);
  const transitions = listTransitions(history);
  if (!Number.isInteger(index) || index < 1 || index > transitions.length) {
    fail(
      `history promote: no transition ${n} — this session has ${transitions.length}`,
    );
  }
  const {seed, expected, exam} = promote(
    history,
    transitions[index - 1]!,
    slug,
    here(),
    CLOCK,
  );
  console.log([seed, expected, exam].join('\n'));
};

/** The one verb the arguments name, run over the file they name. */
const run = async (argv: string[]): Promise<void> => {
  const [verb, file, ...rest] = argv;
  if (verb === undefined) {
    fail('history: usage: history <record|list|promote> <file> …');
  }
  if (file === undefined) {
    fail(`history ${verb}: usage: history ${verb} <file> …`);
  }

  if (verb === 'record') {
    await record(file);
    return;
  }

  // `list` and `promote` both read a file the recorder already wrote, so the
  // open and the close are shared and the verb only says what to do in between.
  const history = openHistory(file);
  try {
    if (verb === 'list') {
      list(history);
    } else if (verb === 'promote') {
      const [n, slug] = rest;
      if (n === undefined || slug === undefined) {
        fail('history promote: usage: history promote <file> <n> <slug>');
      }
      promoteOne(history, n, slug);
    } else {
      fail(`history: unknown verb ${verb} — expected record, list or promote`);
    }
  } finally {
    history.close();
  }
};

try {
  await run(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
