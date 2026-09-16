/**
 * The exam for Task 4 — `lint:ui`, the six rules as one script.
 *
 * Claim: there is one command, `bun run lint:ui`, that reads the app's styling
 * against the design system and says exactly what is outside it and what to
 * write instead.
 *
 * Every test below names the Proof leg it encodes and the Machine clause that
 * leg comes from:
 *
 *   (a) [M1] the root `package.json`'s `scripts["lint:ui"]` reads exactly
 *       `node node_modules/eslint/bin/eslint.js client/src`, and the `Run:`
 *       line `bun install --frozen-lockfile` exits 0 on the tree.
 *   (b) [M2] `eslint.config.mjs` exists at the repository root and its text
 *       contains `@shadcn/lint`; `--print-config <sample path>` exits 0 and
 *       prints JSON whose `rules` carry each of the six ids with `[0] === 2`,
 *       `shadcn/no-restyle` deep-equal to `[2, {allow: ['layout']}]`.
 *   (c) [M3] with the temporary component and sample present,
 *       `bun run lint:ui -f json` exits 1 and prints an array with exactly one
 *       entry for the sample, whose `messages[].ruleId` values include each of
 *       the six rule ids.
 *   (d) [M4] the copy of the sample under `client/src/components/ui/` has no
 *       entry at all in that array — an ignored file is not listed.
 *   (e) [M5] each finding names the fix: `p-[13px]` → `p-3.25`,
 *       `rounded-huge` → `@utility`, `"p-4"` → `owns its spacing`.
 *
 * The three temporary files are the ones spelled verbatim under Proof. They
 * carry a random suffix, are written before the run and removed in `afterAll`;
 * directories are removed only when this exam is the one that created them, so
 * a tree that already carries `client/src/components/ui/` keeps it.
 */
import {afterAll, beforeAll, describe, expect, test} from 'bun:test';
import {existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

const ROOT = join(import.meta.dir, '..');
const TIMEOUT = 60_000;

const RAND = `${process.pid.toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const UI_DIR_REL = 'client/src/components/ui';
const SAMPLE_DIR_REL = `client/src/lint-ui-tmp-${RAND}`;
const SAMPLE_REL = `${SAMPLE_DIR_REL}/Bad.tsx`;
const COMPONENT_REL = `${UI_DIR_REL}/lint-ui-tmp-${RAND}.tsx`;
const IGNORED_COPY_REL = `${UI_DIR_REL}/lint-ui-tmp-${RAND}-bad.tsx`;

/** The six rule ids, as M2 and M3 spell them. */
const RULE_IDS = [
  'shadcn/no-restyle',
  'shadcn/no-raw-colors',
  'shadcn/no-arbitrary-values',
  'shadcn/no-inline-styles',
  'shadcn/no-unknown-classes',
  'shadcn/require-static-classes',
] as const;

/** The temporary component — the second fence under Proof, verbatim. */
const COMPONENT_SOURCE = `import { cva, type VariantProps } from "class-variance-authority"
const buttonVariants = cva("inline-flex rounded-lg text-sm", { variants: { variant: { default: "bg-primary text-primary-foreground" }, size: { default: "h-8 px-2.5" } }, defaultVariants: { variant: "default", size: "default" } })
function Button({ className, variant, size, ...props }: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>) { return <button data-slot="button" className={buttonVariants({ variant, size, className })} {...props} /> }
export { Button, buttonVariants }
`;

/** The temporary sample — the third fence under Proof, verbatim, with `<rand>` filled in. */
const SAMPLE_SOURCE = [
  `import {Button} from '@/components/ui/lint-ui-tmp-${RAND}';`,
  'export const Bad = ({size}: {size: string}) => (',
  '  <div className="p-[13px] rounded-huge bg-red-500" style={{color: \'red\'}}>',
  '    <Button className="p-4">x</Button>',
  '    <Button className={`h-${size}`}>y</Button>',
  '  </div>',
  ');',
  '',
].join('\n');

type Run = {exitCode: number; stdout: string; stderr: string};

function run(cmd: string[]): Run {
  const spawned = Bun.spawnSync(cmd, {cwd: ROOT, stdout: 'pipe', stderr: 'pipe'});
  return {
    exitCode: spawned.exitCode,
    stdout: spawned.stdout.toString(),
    stderr: spawned.stderr.toString(),
  };
}

/** Assert an exit code, and put the command's own stderr in the failure a reader sees. */
function expectExit(label: string, result: Run, expected: number): void {
  if (result.exitCode !== expected) {
    throw new Error(
      `${label} exited ${result.exitCode}, expected ${expected}.\n` +
        `stdout: ${result.stdout.slice(0, 400)}\nstderr: ${result.stderr.slice(0, 800)}`,
    );
  }
  expect(result.exitCode).toBe(expected);
}

function parseJson(label: string, result: Run): any {
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(
      `${label} printed no parseable JSON (exit ${result.exitCode}).\n` +
        `stdout: ${result.stdout.slice(0, 400)}\nstderr: ${result.stderr.slice(0, 800)}`,
    );
  }
}

/** Directories this exam created, innermost last, so cleanup can undo only those. */
const createdDirs: string[] = [];

function ensureDir(relative: string): void {
  const segments = relative.split('/');
  for (let i = 1; i <= segments.length; i += 1) {
    const partial = segments.slice(0, i).join('/');
    const absolute = join(ROOT, partial);
    if (!existsSync(absolute)) {
      mkdirSync(absolute);
      createdDirs.push(absolute);
    }
  }
}

beforeAll(() => {
  ensureDir(UI_DIR_REL);
  ensureDir(SAMPLE_DIR_REL);
  writeFileSync(join(ROOT, COMPONENT_REL), COMPONENT_SOURCE);
  writeFileSync(join(ROOT, SAMPLE_REL), SAMPLE_SOURCE);
  // M4: the same sample, copied under `client/src/components/ui/`.
  writeFileSync(join(ROOT, IGNORED_COPY_REL), SAMPLE_SOURCE);
});

afterAll(() => {
  for (const relative of [COMPONENT_REL, SAMPLE_REL, IGNORED_COPY_REL]) {
    rmSync(join(ROOT, relative), {force: true});
  }
  rmSync(join(ROOT, SAMPLE_DIR_REL), {recursive: true, force: true});
  for (const absolute of createdDirs.slice().reverse()) {
    if (existsSync(absolute) && readdirSync(absolute).length === 0) {
      rmSync(absolute, {recursive: true, force: true});
    }
  }
});

let printConfigRun: Run | null = null;
function printConfig(): Run {
  if (printConfigRun === null) {
    printConfigRun = run(['node', 'node_modules/eslint/bin/eslint.js', '--print-config', SAMPLE_REL]);
  }
  return printConfigRun;
}

function printedRules(): Record<string, unknown> {
  const result = printConfig();
  const config = parseJson('`eslint --print-config`', result);
  return config.rules ?? {};
}

let lintRun: Run | null = null;
function lint(): Run {
  if (lintRun === null) {
    lintRun = run(['bun', 'run', 'lint:ui', '-f', 'json']);
  }
  return lintRun;
}

function lintEntries(): Array<{filePath: string; messages: Array<{ruleId: string; message: string}>}> {
  const parsed = parseJson('`bun run lint:ui -f json`', lint());
  expect(Array.isArray(parsed)).toBe(true);
  return parsed;
}

function sampleEntry() {
  const matching = lintEntries().filter((entry) => entry.filePath.endsWith(`lint-ui-tmp-${RAND}/Bad.tsx`));
  expect(matching.length).toBe(1);
  return matching[0]!;
}

describe('leg (a) [M1] — the script Task 1 wrote, and no package added', () => {
  test('the root `package.json` parses with `scripts["lint:ui"]` exactly `node node_modules/eslint/bin/eslint.js client/src`', () => {
    const manifest = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    expect(manifest.scripts['lint:ui']).toBe('node node_modules/eslint/bin/eslint.js client/src');
  });

  test('the `Run:` line `bun install --frozen-lockfile` exits 0 on the tree', () => {
    expectExit('`bun install --frozen-lockfile`', run(['bun', 'install', '--frozen-lockfile']), 0);
  }, TIMEOUT);
});

describe('leg (b) [M2] — the config at the root, carrying the six rules', () => {
  test('`eslint.config.mjs` exists at the repository root and its text contains `@shadcn/lint`', () => {
    const configPath = join(ROOT, 'eslint.config.mjs');
    expect(existsSync(configPath)).toBe(true);
    expect(readFileSync(configPath, 'utf8')).toContain('@shadcn/lint');
  });

  test('`eslint --print-config <sample path>` exits 0 and prints JSON', () => {
    const result = printConfig();
    expectExit('`eslint --print-config`', result, 0);
    expect(typeof parseJson('`eslint --print-config`', result)).toBe('object');
  }, TIMEOUT);

  for (const ruleId of RULE_IDS) {
    test(`the printed config's \`rules\` carry \`${ruleId}\` with first element 2`, () => {
      const rules = printedRules();
      const entry = rules[ruleId];
      expect(Array.isArray(entry)).toBe(true);
      expect((entry as unknown[])[0]).toBe(2);
    }, TIMEOUT);
  }

  test("the printed `shadcn/no-restyle` entry deep-equals `[2, {allow: ['layout']}]`", () => {
    expect(printedRules()['shadcn/no-restyle']).toEqual([2, {allow: ['layout']}]);
  }, TIMEOUT);
});

describe('leg (c) [M3] — the run over the temporary sample', () => {
  test('`bun run lint:ui -f json` exits 1 with the temporary component and sample present', () => {
    expectExit('`bun run lint:ui -f json`', lint(), 1);
  }, TIMEOUT);

  test(`the printed array holds exactly one entry whose \`filePath\` ends with \`lint-ui-tmp-${RAND}/Bad.tsx\``, () => {
    const matching = lintEntries().filter((entry) => entry.filePath.endsWith(`lint-ui-tmp-${RAND}/Bad.tsx`));
    expect(matching.length).toBe(1);
  }, TIMEOUT);

  for (const ruleId of RULE_IDS) {
    test(`the sample entry's \`messages.map((m) => m.ruleId)\` contains \`${ruleId}\``, () => {
      expect(sampleEntry().messages.map((message) => message.ruleId)).toContain(ruleId);
    }, TIMEOUT);
  }
});

describe('leg (d) [M4] — an ignored file is not listed', () => {
  test(`the array has no entry whose \`filePath\` contains \`lint-ui-tmp-${RAND}-bad\``, () => {
    const listed = lintEntries()
      .map((entry) => entry.filePath)
      .filter((filePath) => filePath.includes(`lint-ui-tmp-${RAND}-bad`));
    expect(listed).toEqual([]);
  }, TIMEOUT);
});

describe('leg (e) [M5] — each finding names the fix', () => {
  function messageContaining(needle: string): string {
    const matching = sampleEntry().messages.map((message) => message.message).filter((text) => text.includes(needle));
    expect(matching.length).toBeGreaterThan(0);
    return matching[0]!;
  }

  test('the message containing `p-[13px]` contains `p-3.25`', () => {
    expect(messageContaining('p-[13px]')).toContain('p-3.25');
  }, TIMEOUT);

  test('the message containing `rounded-huge` contains `@utility`', () => {
    expect(messageContaining('rounded-huge')).toContain('@utility');
  }, TIMEOUT);

  test('the message containing `"p-4"` contains `owns its spacing`', () => {
    expect(messageContaining('"p-4"')).toContain('owns its spacing');
  }, TIMEOUT);
});
