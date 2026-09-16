/**
 * The exam for Task 1 — "Every package the plan needs, installed once — the one
 * writer of the manifests and the lockfile".
 *
 * One `test` per entry the Proof names, each named for its leg and for the
 * Machine clause it comes from:
 *
 *   (a) [M1] `client/package.json` — the nine entries this task adds, each at
 *            its named range under its named section, and the fifteen entries
 *            it carried at BASE (twelve packages, three scripts) still at
 *            exactly their BASE values;
 *   (b) [M2] the root `package.json` — the four devDependencies this task adds,
 *            `scripts["lint:ui"]` exactly `node node_modules/eslint/bin/eslint.js
 *            client/src`, and the eight BASE entries (three packages, four
 *            scripts — `typecheck` by its two ends — and `workspaces`);
 *   (c) [M3] `packages/tinyapp-exam/package.json` — `bun-plugin-tailwind` and
 *            `tailwindcss` under `dependencies`, and the four BASE entries;
 *   (d) [M4] `bun install --frozen-lockfile` exits 0, and for each of the
 *            thirteen package names this task installs — one test per name — a
 *            `node_modules/<name>/package.json` under the root, `client/` or
 *            `packages/tinyapp-exam/` parses with that `name`; the
 *            `@types/node/package.json` so found parses with a `version`
 *            starting `26.`;
 *   (e) [M5] `bun run typecheck` exits 0 and `bun run lint:state` exits 0.
 *
 * Two readings this file makes, written down because the task leaves them open:
 *
 *   - M4's "installed" is read off disk, not through the resolver: each
 *     candidate `node_modules/<name>/package.json` is read with `readFileSync`,
 *     as the task's context asks, because `Bun.resolveSync` honours a package's
 *     `exports` map and throws for one that does not export `./package.json`.
 *     The three directories searched are the root and the two workspaces Bun
 *     nests a copy under on a version conflict; the first one that holds the
 *     file is the one read.
 *   - M2 pins `typecheck` to "its BASE text" and gives the text by its two ends;
 *     leg (b) says "`typecheck` by its two ends". This exam therefore asserts
 *     those two ends and pins nothing between them, so a `typecheck` that grows
 *     a project in the middle is not a red leg here.
 *
 * `ROOT` is the repository root, one directory above `tests/`. The four tests
 * that spawn a child carry timeouts well above what the same commands cost at
 * BASE (install 0.01 s, `typecheck` 7.4 s, `lint:state` 2.9 s): Bun's default
 * per-test 5 s is not enough for a child `bun` process.
 */

import {readFileSync} from 'node:fs';
import {join, resolve} from 'node:path';

import {expect, test} from 'bun:test';

const ROOT = resolve(import.meta.dir, '..');

type Manifest = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  workspaces?: string[];
  main?: string;
};

const manifestAt = (path: string): Manifest =>
  JSON.parse(readFileSync(join(ROOT, path), 'utf8')) as Manifest;

const CLIENT_MANIFEST = 'client/package.json';
const ROOT_MANIFEST = 'package.json';
const EXAM_MANIFEST = 'packages/tinyapp-exam/package.json';

type Section = 'dependencies' | 'devDependencies' | 'scripts';

/** The entry a manifest's section holds under `name`, or `undefined`. */
const entryOf = (
  manifestPath: string,
  section: Section,
  name: string,
): string | undefined => manifestAt(manifestPath)[section]?.[name];

/**
 * One test per entry: `<manifest>` carries `<name>` under `<section>` at
 * exactly `<value>`.
 */
const pinEntry = (
  leg: string,
  manifestPath: string,
  section: Section,
  name: string,
  value: string,
): void => {
  test(`${leg} ${manifestPath} ${section}.${name} is ${value}`, () => {
    expect(entryOf(manifestPath, section, name)).toBe(value);
  });
};

// ---------------------------------------------------------------------------
// (a) [M1] client/package.json
// ---------------------------------------------------------------------------

/** M1's nine new entries: seven `dependencies`, two `devDependencies`. */
const CLIENT_ADDED_DEPENDENCIES: Array<[string, string]> = [
  ['@base-ui/react', '^1.8.0'],
  ['@fontsource-variable/geist', '^5.3.0'],
  ['class-variance-authority', '^0.7.1'],
  ['cn', '^0.3.0'],
  ['lucide-react', '^1.46.0'],
  ['shadcn', '^4.21.0'],
  ['tw-animate-css', '^1.4.0'],
];

const CLIENT_ADDED_DEV_DEPENDENCIES: Array<[string, string]> = [
  ['tailwindcss', '^4.3.3'],
  ['@tailwindcss/vite', '^4.3.3'],
];

/** M1's retention rows: five `dependencies`, seven `devDependencies`. */
const CLIENT_BASE_DEPENDENCIES: Array<[string, string]> = [
  ['tinybase', '^9.7.0'],
  ['react', '^19.2.8'],
  ['react-dom', '^19.2.8'],
  ['reconnecting-websocket', '^4.4.0'],
  ['@sqlite.org/sqlite-wasm', '^3.53.0-build1'],
];

const CLIENT_BASE_DEV_DEPENDENCIES: Array<[string, string]> = [
  ['@happy-dom/global-registrator', '^20.14.0'],
  // The shadcn CLI rewrites this one to `^22`; M1 says it stays `^26.4.1`.
  ['@types/node', '^26.4.1'],
  ['@types/react', '^19.2.18'],
  ['@types/react-dom', '^19.2.5'],
  ['@vitejs/plugin-react', '^6.1.1'],
  ['typescript', '^6.0.3'],
  ['vite', '^8.2.2'],
];

/** M1's three BASE scripts. */
const CLIENT_BASE_SCRIPTS: Array<[string, string]> = [
  ['dev', 'vite'],
  ['build', 'tsc && vite build'],
  ['preview', 'vite preview'],
];

for (const [name, range] of CLIENT_ADDED_DEPENDENCIES) {
  pinEntry('(a) [M1] adds', CLIENT_MANIFEST, 'dependencies', name, range);
}
for (const [name, range] of CLIENT_ADDED_DEV_DEPENDENCIES) {
  pinEntry('(a) [M1] adds', CLIENT_MANIFEST, 'devDependencies', name, range);
}
for (const [name, range] of CLIENT_BASE_DEPENDENCIES) {
  pinEntry('(a) [M1] keeps', CLIENT_MANIFEST, 'dependencies', name, range);
}
for (const [name, range] of CLIENT_BASE_DEV_DEPENDENCIES) {
  pinEntry('(a) [M1] keeps', CLIENT_MANIFEST, 'devDependencies', name, range);
}
for (const [name, text] of CLIENT_BASE_SCRIPTS) {
  pinEntry('(a) [M1] keeps', CLIENT_MANIFEST, 'scripts', name, text);
}

// ---------------------------------------------------------------------------
// (b) [M2] the root package.json
// ---------------------------------------------------------------------------

/** M2's four new root devDependencies. */
const ROOT_ADDED_DEV_DEPENDENCIES: Array<[string, string]> = [
  ['eslint', '^10.10.0'],
  ['@typescript-eslint/parser', '^8.70.0'],
  ['@shadcn/lint', '^0.1.0'],
  ['tailwindcss', '^4.3.3'],
];

/** M2's retention rows: three packages and three whole scripts. */
const ROOT_BASE_DEV_DEPENDENCIES: Array<[string, string]> = [
  ['@types/bun', '^1.3.0'],
  ['tinyapp-exam', 'workspace:*'],
  ['typescript', '^6.0.3'],
];

const ROOT_BASE_SCRIPTS: Array<[string, string]> = [
  ['lint:state', 'bun packages/tinyapp-lint/src/cli.ts'],
  ['history', 'bun packages/tinyapp-history/src/cli.ts'],
  ['test', 'bun run typecheck && bun test'],
];

for (const [name, range] of ROOT_ADDED_DEV_DEPENDENCIES) {
  pinEntry('(b) [M2] adds', ROOT_MANIFEST, 'devDependencies', name, range);
}

test('(b) [M2] adds package.json scripts.lint:ui, exactly the linter entry', () => {
  expect(entryOf(ROOT_MANIFEST, 'scripts', 'lint:ui')).toBe(
    'node node_modules/eslint/bin/eslint.js client/src',
  );
});

for (const [name, range] of ROOT_BASE_DEV_DEPENDENCIES) {
  pinEntry('(b) [M2] keeps', ROOT_MANIFEST, 'devDependencies', name, range);
}
for (const [name, text] of ROOT_BASE_SCRIPTS) {
  pinEntry('(b) [M2] keeps', ROOT_MANIFEST, 'scripts', name, text);
}

test('(b) [M2] keeps package.json scripts.typecheck at its BASE text, by its two ends', () => {
  const typecheck = entryOf(ROOT_MANIFEST, 'scripts', 'typecheck') ?? '';
  expect(typecheck.startsWith('bun run --cwd client tsc --noEmit')).toBe(true);
  expect(typecheck.endsWith('bunx tsc -p packages/tinyapp-exam --noEmit')).toBe(
    true,
  );
});

test('(b) [M2] keeps package.json workspaces', () => {
  expect(manifestAt(ROOT_MANIFEST).workspaces).toEqual([
    'client',
    'server',
    'packages/*',
  ]);
});

// ---------------------------------------------------------------------------
// (c) [M3] packages/tinyapp-exam/package.json
// ---------------------------------------------------------------------------

/** M3's two new entries. */
const EXAM_ADDED_DEPENDENCIES: Array<[string, string]> = [
  ['bun-plugin-tailwind', '^0.1.2'],
  ['tailwindcss', '^4.3.3'],
];

/** M3's retention rows: two `dependencies` and one `devDependency`. */
const EXAM_BASE_DEPENDENCIES: Array<[string, string]> = [
  ['tinybase', '^9.7.0'],
  ['node-html-parser', '^9.0.4'],
];

for (const [name, range] of EXAM_ADDED_DEPENDENCIES) {
  pinEntry('(c) [M3] adds', EXAM_MANIFEST, 'dependencies', name, range);
}
for (const [name, range] of EXAM_BASE_DEPENDENCIES) {
  pinEntry('(c) [M3] keeps', EXAM_MANIFEST, 'dependencies', name, range);
}
pinEntry(
  '(c) [M3] keeps',
  EXAM_MANIFEST,
  'devDependencies',
  '@happy-dom/global-registrator',
  '^20.14.0',
);

test('(c) [M3] keeps packages/tinyapp-exam/package.json main', () => {
  expect(manifestAt(EXAM_MANIFEST).main).toBe('src/index.ts');
});

// ---------------------------------------------------------------------------
// (d) [M4] the thirteen packages are installed, and the lockfile agrees
// ---------------------------------------------------------------------------

/**
 * The three places Bun may hold a package: hoisted at the root, or nested under
 * a workspace on a version conflict.
 */
const NODE_MODULES_DIRS = [
  join(ROOT, 'node_modules'),
  join(ROOT, 'client', 'node_modules'),
  join(ROOT, 'packages', 'tinyapp-exam', 'node_modules'),
];

/**
 * The `package.json` of an installed package, read off disk — never through
 * `Bun.resolveSync`, which honours an `exports` map and throws for a package
 * that does not export `./package.json`.
 */
const installedManifest = (name: string): {name?: string; version?: string} => {
  const tried: string[] = [];
  for (const dir of NODE_MODULES_DIRS) {
    const path = join(dir, name, 'package.json');
    tried.push(path);
    try {
      return JSON.parse(readFileSync(path, 'utf8')) as {
        name?: string;
        version?: string;
      };
    } catch {
      // Not installed here; try the next of the three.
    }
  }
  throw new Error(
    `no readable node_modules/${name}/package.json; looked at:\n  ${tried.join('\n  ')}`,
  );
};

/**
 * A command spawned at the repository root. A non-zero exit puts the child's
 * output on this process's, so a red leg reads as whatever the command said
 * rather than as a bare exit code.
 */
const runAtRoot = (command: string[]): number => {
  const child = Bun.spawnSync(command, {
    cwd: ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  if (child.exitCode !== 0) {
    console.error(
      `${command.join(' ')} exited ${child.exitCode}\n${child.stdout.toString()}\n${child.stderr.toString()}`,
    );
  }
  return child.exitCode;
};

test(
  '(d) [M4] bun install --frozen-lockfile exits 0 — the lockfile agrees with all four manifests',
  () => {
    expect(runAtRoot(['bun', 'install', '--frozen-lockfile'])).toBe(0);
  },
  120_000,
);

/** M4's thirteen names. */
const INSTALLED_PACKAGES = [
  '@base-ui/react',
  '@fontsource-variable/geist',
  'class-variance-authority',
  'cn',
  'lucide-react',
  'shadcn',
  'tw-animate-css',
  'tailwindcss',
  '@tailwindcss/vite',
  'eslint',
  '@typescript-eslint/parser',
  '@shadcn/lint',
  'bun-plugin-tailwind',
];

for (const name of INSTALLED_PACKAGES) {
  test(`(d) [M4] ${name} is installed`, () => {
    expect(installedManifest(name).name).toBe(name);
  });
}

test('(d) [M4] the installed @types/node is a 26.x', () => {
  const manifest = installedManifest('@types/node');
  expect(manifest.name).toBe('@types/node');
  expect(manifest.version?.startsWith('26.')).toBe(true);
});

// ---------------------------------------------------------------------------
// (e) [M5] nothing installed changed the app
// ---------------------------------------------------------------------------

test(
  '(e) [M5] bun run typecheck exits 0',
  () => {
    expect(runAtRoot(['bun', 'run', 'typecheck'])).toBe(0);
  },
  300_000,
);

test(
  '(e) [M5] bun run lint:state exits 0',
  () => {
    expect(runAtRoot(['bun', 'run', 'lint:state'])).toBe(0);
  },
  180_000,
);
