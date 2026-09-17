/**
 * The root's exam surface as a client: one object per running runtime, one
 * method per verb the root serves under `TINYAPP_EXAM=1`.
 *
 *   content(f)        `/exam/content?f=<facet>`      the facet's getContent()
 *   rows(f)           `/exam/rows?f=<facet>`         the SQLite rows its persister wrote
 *   fork(from, to)    `/exam/fork?from=&to=`         a fresh facet seeded from another's content
 *   reload(f)         `/exam/reload?f=<facet>`       restart on the current code, state kept
 *   discard(f)        `/exam/discard?f=<facet>`      delete the facet and its database
 *   events(cb)        `/exam/events`                 every module transition, as it happens
 *
 * The verbs the root does not serve — and every verb at all on a runtime
 * without the flag — answer 404, and a 404 arrives here as a rejection carrying
 * the status and the body, not as a value.
 *
 * `fork` dials `<ws>/sync/<to>` and hangs up before it asks. The root stamps
 * `x-tinyapp-module` on a `/sync/` forward and on nothing else, so that dial is
 * where the module object learns its own name; without it the seed's transition
 * would be reported with an empty `module` and a harness could not tell whose
 * it was.
 */
import type {Snapshot} from './types';

/** One finished transaction of a module object, as the root sends it. */
export type Transition = {module: string; seq: number; content: Snapshot; at: number};

/** The open transitions socket. */
export type Events = {close(): Promise<void>};

export type ExamSurface = {
  content(f: string): Promise<Snapshot>;
  rows(f: string): Promise<Record<string, unknown[]>>;
  fork(from: string, to: string): Promise<Snapshot>;
  reload(f: string): Promise<Snapshot>;
  discard(f: string): Promise<string>;
  events(onTransition: (transition: Transition) => void): Events;
  /** Any verb, by name — including one the root does not serve. */
  call(verb: string, params?: Record<string, string>): Promise<unknown>;
};

/** How long to wait on a socket handshake or hang-up before going on without it. */
const SOCKET_MS = 5_000;

/** Resolves on the first of `open`, `close` or `error`, and on the timeout regardless. */
const settled = (socket: WebSocket, ms: number): Promise<void> =>
  new Promise<void>((resolve) => {
    const done = (): void => resolve();
    socket.addEventListener('open', done, {once: true});
    socket.addEventListener('close', done, {once: true});
    socket.addEventListener('error', done, {once: true});
    setTimeout(done, ms);
  });

const hangUp = async (socket: WebSocket): Promise<void> => {
  const closed = new Promise<void>((resolve) => {
    socket.addEventListener('close', () => resolve(), {once: true});
  });
  socket.close();
  await Promise.race([closed, Bun.sleep(SOCKET_MS)]);
};

export const examSurface = (url: string): ExamSurface => {
  const ws = url.replace(/^http/, 'ws');
  /** Sockets still shaking hands; a verb waits for them, so no transition of its own is missed. */
  const opening: Promise<void>[] = [];

  const ask = async (verb: string, params: Record<string, string>, as: 'json' | 'text'): Promise<unknown> => {
    await Promise.all(opening);
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${url}/exam/${verb}${query === '' ? '' : `?${query}`}`);
    const body = await response.text();
    if (!response.ok) {
      throw new Error(`exam ${verb}: ${response.status} ${body}`);
    }
    return as === 'text' ? body : (JSON.parse(body) as unknown);
  };

  /** Dial `/sync/<name>` and hang up, so the module object learns its name from the root. */
  const prime = async (name: string): Promise<void> => {
    const socket = new WebSocket(`${ws}/sync/${name}`);
    await settled(socket, SOCKET_MS);
    await hangUp(socket);
  };

  return {
    content: async (f) => (await ask('content', {f}, 'json')) as Snapshot,
    rows: async (f) => (await ask('rows', {f}, 'json')) as Record<string, unknown[]>,
    fork: async (from, to) => {
      await Promise.all(opening);
      await prime(to);
      return (await ask('fork', {from, to}, 'json')) as Snapshot;
    },
    reload: async (f) => (await ask('reload', {f}, 'json')) as Snapshot,
    discard: async (f) => (await ask('discard', {f}, 'text')) as string,
    call: (verb, params) => ask(verb, params ?? {}, 'json'),
    events: (onTransition) => {
      const socket = new WebSocket(`${ws}/exam/events`);
      const open = settled(socket, SOCKET_MS);
      opening.push(open);
      socket.addEventListener('message', (event: MessageEvent) => {
        onTransition(JSON.parse(String(event.data)) as Transition);
      });
      return {
        close: async () => {
          await open;
          await hangUp(socket);
        },
      };
    },
  };
};
