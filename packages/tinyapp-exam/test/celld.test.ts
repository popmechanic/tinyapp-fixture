// Exam for task 1, legs (a)-(e): the exam helper owns the runtime and speaks
// the root's exam surface.
//
// M1. `tinyapp-exam` exports `startCelld({serverDir, exam, budgetMb, readyMs})`, which runs
//     `bun build-facets.ts` in `serverDir`, copies `index.ts`, `wrangler.jsonc`,
//     `tsconfig.json`, `facets/` and `generated/` into a fresh directory under
//     `os.tmpdir()`, symlinks that directory's `node_modules` to the workspace root's,
//     writes `.dev.vars` containing `TINYAPP_EXAM=1` there only when `exam` is true, and
//     spawns `<binary> dev <dir> --no-watch --clean --port <p>` with `<p>` a free loopback
//     port, `<binary>` `process.env.CELLD_BIN` else `celld` on `PATH`, and an env carrying
//     `CELLD_ESBUILD=<root>/node_modules/.bin/esbuild` and `CELLD_MAX_RSS_MB=<budgetMb,
//     default 512>`; it resolves to `{url, ws, dir, port, stop}` once `GET <url>/` answers a
//     body containing `root`, rejects with a message carrying the exit code and the
//     process's stderr when the process exits first, and rejects naming `readyMs` (default
//     `60000`) when neither happens in time.
// M2. `stop()` sends SIGTERM to the process, awaits its exit, waits at most 10 s until a new
//     listener binds `<p>`, then removes `dir`; after `stop()` resolves, `<p>` is bindable
//     and `dir` does not exist.
// M3. `tinyapp-exam` exports `examSurface(url)` returning `{content, rows, fork, reload,
//     discard, events}`: the first five each `fetch` `<url>/exam/<verb>?…` with the named
//     query (`f`, or `from` and `to`), resolve to the parsed JSON body (`discard` to its
//     text), and reject with a message carrying the status code and the body when the status
//     is not 2xx; `events` opens a WebSocket to `<ws>/exam/events`, calls `onTransition` with
//     each message parsed as `{module, seq, content, at}`, and returns `{close()}`.
// M4. `server/test/celld.ts` is gone, and `server/test/exam-surface.test.ts` and
//     `server/test/recorder.test.ts` import `startCelld` from `tinyapp-exam` and are green.
//
// The legs, and where each is answered below:
//   (a) [M1] both flags: `/` says `root`, `/exam/content?f=todos` is 404 with the flag off
//       and 200 `[{},{}]` with it on, `.dev.vars` absent / `TINYAPP_EXAM=1`, each instance on
//       a port of its own, the copy list and the `node_modules` symlink in `dir`, and the
//       spawn's argv and env pinned through the probe-binary route the leg allows.
//   (b) [M1] a stand-in binary that exits 3 printing `boom`; a stand-in that never listens
//       under `readyMs: 1500`.
//   (c) [M2] `stop()` frees the port and removes the copy, inside 15 s.
//   (d) [M3] the six verbs over a running exam instance, including a transition whose
//       `module` is the forked name.
//   (e) [M4] the three static halves of the `Run:` lines. The fourth (`bun test` over the
//       two server tests) stays the driver's `Run:` line: an exam never runs another
//       package's tests.
//
// This file starts real `celld dev` runtimes against the repository's own `server/`
// directory and needs a celld binary (`CELLD_BIN`, else `celld` on `PATH`). Every runtime it
// starts it stops; the stand-in binaries it writes for leg (b) live in a temp directory it
// removes.
import {afterAll, beforeAll, expect, test} from 'bun:test';
import {chmodSync, existsSync, lstatSync, mkdtempSync, readFileSync, readlinkSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {examSurface, startCelld} from 'tinyapp-exam';

/** The workspace root, three directories above this file; `server/` is the fixture's own. */
const ROOT = join(import.meta.dir, '..', '..', '..');
const SERVER = join(ROOT, 'server');

type Started = {url: string; ws: string; dir: string; port: number; stop(): Promise<void>};

const bindable = (port: number): boolean => {
  try {
    const server = Bun.listen({hostname: '127.0.0.1', port, socket: {data() {}}});
    server.stop(true);
    return true;
  } catch {
    return false;
  }
};

/**
 * Whether a pid is still a live process on this Linux. A reaped pid has no
 * `/proc` entry; a pid whose exit the parent has not collected sits in state
 * `Z` and is not running either.
 */
const running = (pid: number): boolean => {
  let stat: string;
  try {
    stat = readFileSync(`/proc/${pid}/stat`, 'utf8');
  } catch {
    return false;
  }
  const state = stat.slice(stat.lastIndexOf(')') + 2).split(' ')[0];
  return state !== 'Z';
};

const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/** Runs a call expected to reject and hands back its message, or `resolved`. */
const rejection = async (call: Promise<unknown>): Promise<string> =>
  call.then(() => 'resolved: the call did not reject', messageOf);

let scripts: string;
let on: Started;
let off: Started;

/** Writes one stand-in `celld` and returns its path. */
const standIn = (name: string, body: string): string => {
  const path = join(scripts, name);
  writeFileSync(path, body);
  chmodSync(path, 0o755);
  return path;
};

/** Names `bin` through `CELLD_BIN` for one `startCelld` call, then restores the env. */
const withBinary = async <T>(bin: string, call: () => Promise<T>): Promise<T> => {
  const had = process.env.CELLD_BIN;
  process.env.CELLD_BIN = bin;
  try {
    return await call();
  } finally {
    if (had === undefined) delete process.env.CELLD_BIN;
    else process.env.CELLD_BIN = had;
  }
};

beforeAll(async () => {
  scripts = mkdtempSync(join(tmpdir(), 'tinyapp-celld-exam-'));
  // One at a time: both starts build the facets in the same `serverDir`, and
  // two builds writing `generated/` at once is a race this exam has no use for.
  off = (await startCelld({serverDir: SERVER, exam: false})) as Started;
  on = (await startCelld({serverDir: SERVER, exam: true})) as Started;
}, 180_000);

afterAll(async () => {
  await off?.stop();
  await on?.stop();
  rmSync(scripts, {recursive: true, force: true});
}, 60_000);

// (a) [M1] Two runtimes, the exam surface off and on.
test('(a) the flag-off runtime serves the root and no exam verb, and carries no .dev.vars', async () => {
  const root = await fetch(`${off.url}/`);
  expect([root.status, (await root.text()).includes('root')]).toEqual([200, true]);

  const verb = await fetch(`${off.url}/exam/content?f=todos`);
  expect(verb.status).toBe(404);

  expect(existsSync(join(off.dir, '.dev.vars'))).toBe(false);
}, 60_000);

test('(a) the flag-on runtime answers /exam/content?f=todos with [{},{}], and its .dev.vars reads TINYAPP_EXAM=1', async () => {
  const verb = await fetch(`${on.url}/exam/content?f=todos`);
  expect(verb.status).toBe(200);
  expect(await verb.json()).toEqual([{}, {}]);

  expect(readFileSync(join(on.dir, '.dev.vars'), 'utf8').trim()).toBe('TINYAPP_EXAM=1');
}, 60_000);

test('(a) each instance resolves {url, ws, dir, port} on a loopback port of its own', () => {
  for (const instance of [off, on]) {
    expect([typeof instance.port, instance.url, instance.ws]).toEqual([
      'number',
      `http://127.0.0.1:${instance.port}`,
      `ws://127.0.0.1:${instance.port}`,
    ]);
  }
  expect(off.port === on.port).toBe(false);
}, 30_000);

test('(a) dir is the copy list and a node_modules symlink to the workspace root', () => {
  const held = ['index.ts', 'wrangler.jsonc', 'tsconfig.json', 'facets', 'generated'].filter((f) =>
    existsSync(join(on.dir, f)),
  );
  expect(held).toEqual(['index.ts', 'wrangler.jsonc', 'tsconfig.json', 'facets', 'generated']);
  expect(on.dir.startsWith(tmpdir())).toBe(true);
  expect(lstatSync(join(on.dir, 'node_modules')).isSymbolicLink()).toBe(true);
  expect(readlinkSync(join(on.dir, 'node_modules'))).toBe(join(ROOT, 'node_modules'));
}, 30_000);

// (a) [M1] The spawn itself, read through a probe binary that records its argv and env.
// The probe exits at once, so the call rejects; what it wrote is the evidence.
test('(a) the spawn is `dev <dir> --no-watch --clean --port <p>` with CELLD_ESBUILD and CELLD_MAX_RSS_MB in its env', async () => {
  const probe = async (opts: {exam: boolean; budgetMb?: number}): Promise<{argv: string[]; esbuild: string; maxRss: string; devVars: string | null}> => {
    const out = join(scripts, `probe-${opts.exam ? 'on' : 'off'}-${opts.budgetMb ?? 'default'}.txt`);
    const bin = standIn(
      `probe-${opts.exam ? 'on' : 'off'}-${opts.budgetMb ?? 'default'}.sh`,
      [
        '#!/bin/sh',
        '{',
        '  for a in "$@"; do printf \'ARG %s\\n\' "$a"; done',
        "  printf 'ESBUILD %s\\n' \"$CELLD_ESBUILD\"",
        "  printf 'MAXRSS %s\\n' \"$CELLD_MAX_RSS_MB\"",
        '  if [ -f "$2/.dev.vars" ]; then printf \'DEVVARS %s\\n\' "$(cat "$2/.dev.vars")"; fi',
        `} > '${out}'`,
        'exit 0',
        '',
      ].join('\n'),
    );
    await withBinary(bin, () =>
      rejection(startCelld({serverDir: SERVER, readyMs: 8000, ...opts}) as Promise<unknown>),
    );
    const lines = readFileSync(out, 'utf8').split('\n').filter((l) => l !== '');
    const argv = lines.filter((l) => l.startsWith('ARG ')).map((l) => l.slice(4));
    const one = (tag: string): string | null => {
      const line = lines.find((l) => l.startsWith(`${tag} `));
      return line === undefined ? null : line.slice(tag.length + 1);
    };
    if (argv[1] !== undefined) rmSync(argv[1], {recursive: true, force: true});
    return {argv, esbuild: one('ESBUILD') ?? '', maxRss: one('MAXRSS') ?? '', devVars: one('DEVVARS')};
  };

  for (const exam of [false, true]) {
    const seen = await probe({exam});
    // `dev <dir> --no-watch --clean --port <p>`, the port a free loopback one.
    const port = Number(seen.argv[5]);
    expect([seen.argv[0], seen.argv[2], seen.argv[3], seen.argv[4], seen.argv.length]).toEqual([
      'dev',
      '--no-watch',
      '--clean',
      '--port',
      6,
    ]);
    expect([Number.isInteger(port), port > 0 && port < 65_536]).toEqual([true, true]);
    expect(seen.argv[1]?.startsWith(tmpdir())).toBe(true);
    // The env the leg names: esbuild found without a global install, and the
    // default budget, because celld's own thresholds never fire in an exe VM.
    expect(seen.esbuild.endsWith('node_modules/.bin/esbuild')).toBe(true);
    expect(existsSync(seen.esbuild)).toBe(true);
    expect(seen.maxRss).toBe('512');
    // `.dev.vars` is written before the spawn, and only when `exam` is true.
    expect([exam, seen.devVars]).toEqual([exam, exam ? 'TINYAPP_EXAM=1' : null]);
  }

  // `budgetMb` is what `CELLD_MAX_RSS_MB` carries when it is given.
  const budgeted = await probe({exam: false, budgetMb: 777});
  expect(budgeted.maxRss).toBe('777');
}, 120_000);

// (b) [M1] The two ways a start fails.
test('(b) a binary that prints boom and exits 3 rejects with a message carrying 3 and boom', async () => {
  const bin = standIn('boom.sh', ['#!/bin/sh', 'echo boom >&2', 'exit 3', ''].join('\n'));
  const message = await withBinary(bin, () =>
    rejection(startCelld({serverDir: SERVER, exam: false, readyMs: 20_000}) as Promise<unknown>),
  );
  expect([message.includes('3'), message.includes('boom'), message]).toEqual([true, true, message]);
}, 90_000);

test('(b) a binary that never listens rejects naming readyMs, and is no longer running', async () => {
  const pidFile = join(scripts, 'sleeper.pid');
  // `exec` so the pid recorded is the pid of the process that stays: a SIGTERM
  // to the spawned child is a SIGTERM to this one.
  const bin = standIn('sleeper.sh', ['#!/bin/sh', `printf '%s' $$ > '${pidFile}'`, 'exec sleep 600', ''].join('\n'));
  const message = await withBinary(bin, () =>
    rejection(startCelld({serverDir: SERVER, exam: false, readyMs: 1500}) as Promise<unknown>),
  );
  expect([message.includes('1500'), message]).toEqual([true, message]);

  const pid = Number(readFileSync(pidFile, 'utf8').trim());
  expect(Number.isInteger(pid)).toBe(true);
  const until = Date.now() + 5000;
  while (Date.now() < until && running(pid)) await Bun.sleep(50);
  const alive = running(pid);
  // Whatever the verdict, nothing of this exam's is left behind.
  if (alive) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // already gone
    }
  }
  expect(alive).toBe(false);
}, 90_000);

// (c) [M2] The stop.
test('(c) stop() frees the port and removes the copy, inside 15 s', async () => {
  const instance = (await startCelld({serverDir: SERVER, exam: true})) as Started;
  const {port, dir} = instance;
  expect(existsSync(dir)).toBe(true);
  const started = Date.now();
  await instance.stop();
  const elapsed = Date.now() - started;
  expect([bindable(port), existsSync(dir), elapsed < 15_000]).toEqual([true, false, true]);
}, 120_000);

// (d) [M3] The client for the root's exam verbs.
test('(d) fork seeds a sibling facet: content of the fork equals content of its source', async () => {
  const surface = examSurface(on.url);
  const source = await surface.content('todos');
  const forked = await surface.fork('todos', 'todos@x');
  expect(await surface.content('todos@x')).toEqual(source);
  expect(forked).toEqual(source);
}, 60_000);

test('(d) discard answers text containing discarded, and the facet reads [{},{}] after it', async () => {
  const surface = examSurface(on.url);
  const said = await surface.discard('todos@x');
  expect([typeof said, String(said).includes('discarded')]).toEqual(['string', true]);
  expect(await surface.content('todos@x')).toEqual([{}, {}]);
}, 60_000);

test('(d) reload resolves to the facet content, and rows to an object of table names', async () => {
  const surface = examSurface(on.url);
  expect(await surface.reload('todos')).toEqual(await surface.content('todos'));

  const rows = (await surface.rows('todos')) as Record<string, unknown>;
  expect([typeof rows, Array.isArray(rows), rows === null]).toEqual(['object', false, false]);
  const keys = Object.keys(rows);
  // Every key a table name of the app's own — never one of the runtime's
  // underscore-led tables — and every value that table's rows.
  expect(keys.filter((k) => typeof k === 'string' && !k.startsWith('_'))).toEqual(keys);
  expect(keys.filter((k) => Array.isArray(rows[k]))).toEqual(keys);
}, 60_000);

test('(d) a verb the root does not serve rejects with a message carrying 404', async () => {
  const message = await rejection(examSurface(off.url).content('todos'));
  expect([message.includes('404'), message]).toEqual([true, message]);
}, 60_000);

test('(d) events delivers the forked module a transition of its own name', async () => {
  const surface = examSurface(on.url);
  const seen: Array<Record<string, unknown>> = [];
  const socket = surface.events((t) => {
    seen.push(t as unknown as Record<string, unknown>);
  });
  try {
    // The socket has to be up before the fork, or the transition it causes is
    // fanned out to nobody.
    await Bun.sleep(1000);
    await surface.fork('todos', 'todos@y');
    // Transitions of other modules share this socket, so the assertion is over
    // the forked module's own.
    const until = Date.now() + 5000;
    let hit: Record<string, unknown> | undefined;
    while (Date.now() < until) {
      hit = seen.find((t) => t['module'] === 'todos@y');
      if (hit !== undefined) break;
      await Bun.sleep(50);
    }
    // On a miss the whole delivery is the failure's message.
    expect([hit?.['module'] ?? seen, typeof hit?.['seq']]).toEqual(['todos@y', 'number']);
    expect([typeof hit?.['at'], Array.isArray(hit?.['content'])]).toEqual(['number', true]);
  } finally {
    const closed = await Promise.resolve(socket.close()).then(() => 'closed', (e) => `threw: ${messageOf(e)}`);
    expect(closed).toBe('closed');
  }
}, 90_000);

// (e) [M4] The local helper is gone and the two server tests import the package.
// The fourth `Run:` line — `bun test` over those two — is the driver's to run:
// an exam proves its own claim and never runs another package's tests.
test('(e) server/test/celld.ts does not exist', () => {
  expect(existsSync(join(SERVER, 'test', 'celld.ts'))).toBe(false);
});

test('(e) both server tests import startCelld from tinyapp-exam', () => {
  const imports = ['exam-surface.test.ts', 'recorder.test.ts'].map((f) => {
    const source = readFileSync(join(SERVER, 'test', f), 'utf8');
    return [f, source.includes("from 'tinyapp-exam'"), /import\s*\{[^}]*\bstartCelld\b[^}]*\}\s*from\s*'tinyapp-exam'/.test(source)];
  });
  expect(imports).toEqual([
    ['exam-surface.test.ts', true, true],
    ['recorder.test.ts', true, true],
  ]);
});
