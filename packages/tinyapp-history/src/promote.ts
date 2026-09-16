/**
 * The promotion: one transition of a recorded session written out as an exam
 * the fixture's own suite runs.
 *
 * Three files come out of it — the seed state, the expected state and the exam
 * that goes from one to the other — and none of the three is typed by a person.
 * The two states are read back out of the commits the recorder made; the mutant
 * is read off the diff between them. That is what makes a derived exam an
 * oracle rather than an opinion: the examiner picks the step, and the recording
 * says what the step did.
 *
 * A transition that moved store values alone is refused rather than promoted.
 * `applyMutant` carries store values across untouched, so a mutant naming one
 * would perturb nothing and the exam would report itself hollow — a refusal
 * with the reason is better than a file that has to be deleted again.
 */

import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';

import type {Cell, MutantEdit, Snapshot} from 'tinyapp-exam';

import {messageOf, type History} from './history';
import {mutantOf} from './mutant';
import type {Transition} from './transitions';

/** The three paths one promotion writes, in the order it writes them. */
export type Promoted = {seed: string; expected: string; exam: string};

/**
 * A snapshot as the text its file holds: one line, no spaces, then a newline.
 *
 * The keys come out in the order `at()` read them back — sorted, so `completed`
 * precedes `text` — where the fixture's hand-written snapshots spell `text`
 * first. The two orders are the same state to `toEqual`, to `setContent` and to
 * `diffContent`, so a derived file sits beside a written one without either
 * having to be re-spelled.
 */
export const snapshotText = (content: Snapshot): string =>
  JSON.stringify(content) + '\n';

/** Where a slug's three files go, relative to the root they are written under. */
export const promotedPaths = (slug: string): Promoted => ({
  seed: `state-exams/seeds/${slug}.json`,
  expected: `state-exams/expected/${slug}.json`,
  exam: `tests/state-exams/${slug}.test.ts`,
});

/** One argument of the recorded call, as the exam's source spells it. */
const argument = (arg: Cell): string => JSON.stringify(arg);

/**
 * The exam file's text for one transition.
 *
 * No `entry` and no `view`: the store diff is a derived exam's whole oracle.
 * The recording says which cells the call moved and nothing at all about the
 * page it would have painted, so an assertion about the page would be one
 * nobody derived — and the linter's view rule asks a view only of an exam whose
 * action is an interaction.
 */
export const examText = (
  slug: string,
  action: {name: string; args: Cell[]},
  mutant: MutantEdit[],
  clock: string,
): string => {
  const paths = promotedPaths(slug);
  const call = [action.name, ...action.args.map(argument)];
  return (
    [
      `import {stateExam} from 'tinyapp-exam';`,
      ``,
      `import {${action.name}, createTodosStore} from '../../client/src/storeData';`,
      ``,
      `// Derived from a recorded session by tinyapp-history: ${messageOf(action.name, action.args)}.`,
      `stateExam({`,
      `  clock: ${JSON.stringify(clock)},`,
      `  seed: '${paths.seed}',`,
      `  store: () => createTodosStore(),`,
      `  action: (store) => {`,
      `    ${call[0]!}(${['store', ...call.slice(1)].join(', ')});`,
      `  },`,
      `  expected: '${paths.expected}',`,
      `  mutant: ${JSON.stringify(mutant)},`,
      `});`,
    ].join('\n') + '\n'
  );
};

/** Writes `text` at `path`, making the directories above it first. */
const write = (path: string, text: string): void => {
  mkdirSync(dirname(path), {recursive: true});
  writeFileSync(path, text);
};

/**
 * Promotes `transition` into the three files of `slug` under `root`.
 *
 * The mutant is derived before anything is written, so a transition no mutant
 * can name leaves the tree exactly as it found it: the throw comes first and
 * there is no half-written promotion to clean up.
 */
export const promote = (
  history: History,
  transition: Transition,
  slug: string,
  root: string,
  clock: string,
): Promoted => {
  const mutant = mutantOf(transition.changes);
  if (mutant.length === 0) {
    throw new Error(
      `promote: ${transition.message} changed no table cell, ` +
        `and a mutant cannot name a store value`,
    );
  }

  const paths = promotedPaths(slug);
  write(join(root, paths.seed), snapshotText(history.at(transition.seed)));
  write(
    join(root, paths.expected),
    snapshotText(history.at(transition.expected)),
  );
  write(join(root, paths.exam), examText(slug, transition.action, mutant, clock));
  return paths;
};
