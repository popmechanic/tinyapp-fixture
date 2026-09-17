/**
 * The runtime an exam runs against: one `celld dev` on a disposable copy of a
 * server directory, started here and stopped here.
 *
 * The copy carries `index.ts`, `wrangler.jsonc`, `tsconfig.json`, `facets/` and
 * `generated/` (built first), a `node_modules` symlink to the workspace root,
 * and `.dev.vars` with `TINYAPP_EXAM=1` only when asked — so an exam can run the
 * root with the exam surface off, as production does. Two ports per instance,
 * both loopback: the worker's, named here, and the internal one `celld dev`
 * picks for its node on 127.0.0.1:0 (`celld dev` 0.5.0 takes no
 * `--internal-listen`; it answers `unknown argument`).
 *
 * Stopping is the way the runtime wants it: SIGTERM to the supervisor, then a
 * wait for the exit and for the port to clear — a hard kill leaves the node
 * draining with the port held, and the next start dies on
 * `Address already in use` (Shelley, fleet-counsel, 2026-09-17).
 *
 * Two environment variables travel with every spawn. `CELLD_ESBUILD` is how
 * celld finds esbuild without a global install; `CELLD_MAX_RSS_MB` is set
 * because celld's own thresholds read root cgroup paths an exe VM does not have
 * and would otherwise never fire.
 */
import {cpSync, mkdtempSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';

/** The argv and env one `celld dev` is spawned with. */
export type CelldSpawn = {argv: string[]; env: Record<string, string>};

export type CelldOptions = {
  /** The server directory to copy; relative paths resolve against the cwd. */
  serverDir: string;
  /** Write `.dev.vars` with `TINYAPP_EXAM=1`, turning the root's exam surface on. */
  exam: boolean;
  /** `CELLD_MAX_RSS_MB` for the spawn; 512 when unnamed. */
  budgetMb?: number;
  /** How long to wait for the root to answer; 60000 ms when unnamed. */
  readyMs?: number;
  /** Called with the spawn's argv and env just before the process starts. */
  onSpawn?: (spawn: CelldSpawn) => void;
};

export type Celld = {
  /** `http://127.0.0.1:<port>` */
  url: string;
  /** `ws://127.0.0.1:<port>` */
  ws: string;
  dir: string;
  port: number;
  /** The argv this instance was spawned with. */
  argv: string[];
  /** The env this instance was spawned with. */
  env: Record<string, string>;
  stop(): Promise<void>;
};

/** The files and directories of a server a `celld dev` needs. */
const COPY_FILES = ['index.ts', 'wrangler.jsonc', 'tsconfig.json'];
const COPY_DIRS = ['facets', 'generated'];

const freePort = (): number => {
  const server = Bun.listen({hostname: '127.0.0.1', port: 0, socket: {data() {}}});
  const port = server.port;
  server.stop(true);
  return port;
};

const portFree = async (port: number): Promise<boolean> => {
  try {
    const server = Bun.listen({hostname: '127.0.0.1', port, socket: {data() {}}});
    server.stop(true);
    return true;
  } catch {
    return false;
  }
};

const binary = (): string => {
  const named = process.env.CELLD_BIN ?? Bun.which('celld');
  if (named === null || named === undefined) {
    throw new Error('celld: no binary — set CELLD_BIN or put celld on PATH');
  }
  return named;
};

/** SIGTERM, a moment to take it, then SIGKILL — a start that failed leaves nothing running. */
const end = async (proc: Bun.Subprocess): Promise<void> => {
  proc.kill('SIGTERM');
  const exited = await Promise.race([proc.exited.then(() => true), Bun.sleep(2_000).then(() => false)]);
  if (!exited) {
    proc.kill('SIGKILL');
    await proc.exited;
  }
};

export const startCelld = async (opts: CelldOptions): Promise<Celld> => {
  const serverDir = resolve(opts.serverDir);
  const root = dirname(serverDir);
  const build = Bun.spawnSync(['bun', 'build-facets.ts'], {cwd: serverDir});
  if (build.exitCode !== 0) {
    throw new Error(`build-facets: ${build.stderr.toString()}`);
  }
  const dir = mkdtempSync(join(tmpdir(), 'tinyapp-celld-'));
  for (const f of COPY_FILES) cpSync(join(serverDir, f), join(dir, f));
  for (const d of COPY_DIRS) cpSync(join(serverDir, d), join(dir, d), {recursive: true});
  symlinkSync(join(root, 'node_modules'), join(dir, 'node_modules'));
  if (opts.exam) writeFileSync(join(dir, '.dev.vars'), 'TINYAPP_EXAM=1\n');

  const port = freePort();
  const argv = [binary(), 'dev', dir, '--no-watch', '--clean', '--port', String(port)];
  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
    CELLD_ESBUILD: join(root, 'node_modules', '.bin', 'esbuild'),
    CELLD_MAX_RSS_MB: String(opts.budgetMb ?? 512),
  };
  opts.onSpawn?.({argv, env});
  const proc = Bun.spawn(argv, {cwd: dir, env, stdout: 'pipe', stderr: 'pipe'});

  const url = `http://127.0.0.1:${port}`;
  const readyMs = opts.readyMs ?? 60_000;
  const deadline = Date.now() + readyMs;
  let ready = false;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${url}/`);
      if ((await r.text()).includes('root')) {
        ready = true;
        break;
      }
    } catch {
      // not up yet
    }
    if (proc.exitCode !== null) {
      const stderr = await new Response(proc.stderr as ReadableStream).text();
      rmSync(dir, {recursive: true, force: true});
      throw new Error(`celld exited ${proc.exitCode} before ready:\n${stderr}`);
    }
    await Bun.sleep(100);
  }
  if (!ready) {
    await end(proc);
    rmSync(dir, {recursive: true, force: true});
    throw new Error(`celld: no answer from ${url} within readyMs ${readyMs} ms`);
  }

  return {
    url,
    ws: url.replace(/^http/, 'ws'),
    dir,
    port,
    argv,
    env,
    stop: async () => {
      proc.kill('SIGTERM');
      await proc.exited;
      const until = Date.now() + 10_000;
      while (Date.now() < until && !(await portFree(port))) await Bun.sleep(50);
      rmSync(dir, {recursive: true, force: true});
    },
  };
};
