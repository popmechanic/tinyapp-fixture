/**
 * Starts one `celld dev` for a test on a disposable copy of this server, and
 * stops it the way the runtime wants: SIGTERM to the supervisor, then a wait
 * for the exit and for the port to clear — a hard kill leaves the node
 * draining with the port held, and the next start dies on it (Shelley,
 * fleet-counsel, 2026-09-17).
 *
 * The copy carries `index.ts`, `facets/`, `generated/` (built first),
 * `wrangler.jsonc`, `tsconfig.json`, a `node_modules` symlink to the
 * workspace root, and `.dev.vars` with `TINYAPP_EXAM=1` only when asked — so
 * a test can run the root with the exam surface off, as production does.
 * Two ports per instance, both loopback: the worker's, named here, and the
 * internal one `celld dev` picks for its node on 127.0.0.1:0.
 */
import {cpSync, mkdtempSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const SERVER = join(import.meta.dir, '..');
const ROOT = join(SERVER, '..');

export type Celld = {
  /** `http://127.0.0.1:<port>` */
  url: string;
  /** `ws://127.0.0.1:<port>` */
  ws: string;
  dir: string;
  stop(): Promise<void>;
};

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

export const startCelld = async (opts: {exam: boolean; readyMs?: number}): Promise<Celld> => {
  const build = Bun.spawnSync(['bun', 'build-facets.ts'], {cwd: SERVER});
  if (build.exitCode !== 0) {
    throw new Error(`build-facets: ${build.stderr.toString()}`);
  }
  const dir = mkdtempSync(join(tmpdir(), 'tinyapp-celld-'));
  for (const f of ['index.ts', 'wrangler.jsonc', 'tsconfig.json']) cpSync(join(SERVER, f), join(dir, f));
  for (const d of ['facets', 'generated']) cpSync(join(SERVER, d), join(dir, d), {recursive: true});
  symlinkSync(join(ROOT, 'node_modules'), join(dir, 'node_modules'));
  if (opts.exam) writeFileSync(join(dir, '.dev.vars'), 'TINYAPP_EXAM=1\n');
  const port = freePort();
  // `celld dev` takes no `--internal-listen` (0.5.0: `unknown argument`); it
  // starts its node with `--internal-listen 127.0.0.1:0` itself, so the second
  // port is loopback and ephemeral and nothing here names it.
  const proc = Bun.spawn(
    [binary(), 'dev', dir, '--no-watch', '--clean', '--port', String(port)],
    {
      cwd: dir,
      env: {...process.env, CELLD_ESBUILD: join(ROOT, 'node_modules', '.bin', 'esbuild'), CELLD_MAX_RSS_MB: '512'},
      stdout: 'pipe',
      stderr: 'pipe',
    },
  );
  const url = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + (opts.readyMs ?? 60_000);
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${url}/`);
      if ((await r.text()).includes('root')) break;
    } catch {
      // not up yet
    }
    if (proc.exitCode !== null) {
      throw new Error(`celld exited ${proc.exitCode} before ready:\n${await new Response(proc.stderr).text()}`);
    }
    await Bun.sleep(100);
  }
  return {
    url,
    ws: url.replace(/^http/, 'ws'),
    dir,
    stop: async () => {
      proc.kill('SIGTERM');
      await proc.exited;
      const until = Date.now() + 10_000;
      while (Date.now() < until && !(await portFree(port))) await Bun.sleep(50);
      rmSync(dir, {recursive: true, force: true});
    },
  };
};
