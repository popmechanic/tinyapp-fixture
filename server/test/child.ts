/** Runs one `test/cases/<name>.ts` in a fresh bun process and returns its JSON line. */
import {join} from 'node:path';

export const runCase = async (name: string, ...args: string[]): Promise<{code: number; out: Record<string, unknown>; err: string}> => {
  const proc = Bun.spawn(['bun', join(import.meta.dir, 'cases', `${name}.ts`), ...args], {stdout: 'pipe', stderr: 'pipe'});
  const [stdout, stderr, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
  const line = stdout.trim().split('\n').filter((l) => l.startsWith('{')).pop() ?? '{}';
  return {code, out: JSON.parse(line) as Record<string, unknown>, err: stderr};
};
