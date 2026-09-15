/**
 * `lint:state` — the whole linter as one command.
 *
 * It loads the context from the repository root, runs every rule over it,
 * prints one line per finding and then one summary line, and exits 1 when
 * anything was found. The summary is printed either way and it is always the
 * last line, so a run that found nothing still says what it looked at.
 *
 * The flags are the load options by their own names, plus `--rules <dir>` for a
 * run over rules other than the linter's own — which is how a rule's exam points
 * the CLI at one seeded violation.
 */

import {resolve} from 'node:path';

import {loadContext, type LoadOptions} from './context';
import {runLint} from './lint';

/** The load options a caller may name on the command line. */
const FLAGS = ['store', 'page', 'seeds', 'expected', 'exams', 'clock'] as const;

type Parsed = {opts: Partial<LoadOptions>; rulesDir?: string};

/**
 * `--name value` pairs, over the load options and `--rules`.
 *
 * A bare `--` is dropped: `bun run lint:state -- --rules <dir>` hands it
 * through, and it names no flag.
 */
export const parseArgs = (argv: string[]): Parsed => {
  const parsed: Parsed = {opts: {}};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--' || arg === undefined) {
      continue;
    }
    const name = arg.startsWith('--') ? arg.slice(2) : arg;
    const value = argv[++i];
    if (value === undefined) {
      throw new Error(`lint:state: ${arg} needs a value`);
    }
    if (name === 'rules') {
      parsed.rulesDir = resolve(value);
    } else if ((FLAGS as readonly string[]).includes(name)) {
      parsed.opts[name as (typeof FLAGS)[number]] = value;
    } else {
      throw new Error(`lint:state: unknown option ${arg}`);
    }
  }

  return parsed;
};

const {opts, rulesDir} = parseArgs(process.argv.slice(2));

const started = performance.now();
const ctx = await loadContext(opts);
const {lines, count} = await runLint(ctx, rulesDir === undefined ? {} : {rulesDir});
const ms = Math.round(performance.now() - started);

for (const line of lines) {
  console.log(line);
}
console.log(
  `lint:state: ${count} findings over ${ctx.snapshots.length} snapshots and ${ctx.exams.length} exams in ${ms} ms`,
);

process.exit(count > 0 ? 1 : 0);
