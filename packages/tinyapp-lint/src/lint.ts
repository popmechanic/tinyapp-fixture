/**
 * Running the rules and turning what they found into lines.
 *
 * A rule module is one file under `packages/tinyapp-lint/src/rules/` whose
 * default export is a `Rule`. `runLint` lists that directory, imports each `.ts`
 * in sorted order and awaits each `run`, so a rule is discovered by being there
 * and by nothing else — no registry to keep in step with the files.
 *
 * An absent rules directory is an empty list rather than an error: at the wave
 * that built this package there was no rule to find, and a run over a directory
 * of seeded violations names its own.
 */

import {existsSync, readdirSync} from 'node:fs';
import {join, resolve} from 'node:path';

import type {Finding, LintContext, Rule} from './types';

/** Where the linter's own rules live when a caller names no other directory. */
export const RULES_DIR = join(import.meta.dir, 'rules');

/**
 * One finding as one line: `<file>: <subject>: <what is wrong> — <the fix>`.
 *
 * The dash is a spaced em dash, so the fix is told from the problem by the one
 * separator that cannot occur inside a table, row or cell id.
 */
export const formatFinding = (f: Finding): string =>
  `${f.file}: ${f.subject}: ${f.problem} — ${f.fix}`;

/** The `.ts` rule modules of `dir`, sorted; `[]` when there is no such directory. */
const ruleFilesOf = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((name) => name.endsWith('.ts'))
        .sort()
    : [];

/**
 * Every rule's findings over `ctx`, as sorted, de-duplicated lines.
 *
 * Two rules that notice the same thing about the same subject say it once: the
 * line is the finding's whole identity, so an identical line is the same
 * finding however many rules reached it.
 */
export const runLint = async (
  ctx: LintContext,
  opts: {rulesDir?: string} = {},
): Promise<{lines: string[]; count: number}> => {
  const dir = resolve(opts.rulesDir ?? RULES_DIR);
  const found: string[] = [];

  for (const name of ruleFilesOf(dir)) {
    const rule = ((await import(join(dir, name))) as {default: Rule}).default;
    for (const finding of await rule.run(ctx)) {
      found.push(formatFinding(finding));
    }
  }

  const lines = [...new Set(found)].sort();
  return {lines, count: lines.length};
};
