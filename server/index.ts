/**
 * The root: one `AppRoot` per app instance, the supervisor of every module.
 *
 * Each module of the app is a Durable Object Facet of this object, loaded from
 * `generated/facets.ts` through the Worker Loader with no network. A client
 * dials `/sync/<module>` and the root forwards the socket to that module's
 * facet; nothing else reaches a facet except through here, which makes the root
 * the app's capability holder.
 *
 * Under `TINYAPP_EXAM=1` (from `.dev.vars`, never a deploy) the root also serves
 * the exam surface, every verb a facet operation:
 *
 *   /exam/content?f=<facet>            the facet's getContent()
 *   /exam/rows?f=<facet>               the SQLite rows its persister wrote
 *   /exam/fork?from=<facet>&to=<facet> a fresh facet seeded from another's content
 *   /exam/reload?f=<facet>             abort and restart the facet on the current code, state kept
 *   /exam/discard?f=<facet>            delete the facet and its database
 *   /exam/events                       a WebSocket the harness opens; every module transition is sent on it
 *   /exam/transition                   POST from a module object (through SELF): one finished transaction
 *
 * A facet name is `<module>` or `<module>@<label>`: the part before `@` picks
 * the code, the whole name picks the database. So `todos@probe-7` is a fork of
 * `todos` running the same class on its own rows.
 */
import {DurableObject} from 'cloudflare:workers';
import {FACETS} from './generated/facets';
import {Facet} from './facets/todos';

export {Facet};

type Env = {
  APP: DurableObjectNamespace<AppRoot>;
  /** The worker itself, handed to module objects so they can report to the root. */
  SELF: Fetcher;
  /** The module objects, one named Durable Object per `<instance>/<module>[@label]`. */
  MODULES: DurableObjectNamespace<Facet>;
  LOADER: WorkerLoader;
  TINYAPP_EXAM?: string;
  /** `facet` runs a module as a Durable Object Facet of the root; `named` (the default) as a named Durable Object. */
  MODULE_SHAPE?: 'facet' | 'named';
};

/**
 * A facet's 101 crosses the root as a bare status: on celld 0.5.0 the
 * `Upgrade`, `Connection` and `Sec-WebSocket-Accept` headers a client checks
 * are missing from a response forwarded from a facet (read 2026-09-16, laptop;
 * a direct Durable Object's 101 is the comparison), so the root re-wraps the
 * socket with the handshake headers RFC 6455 §4.2.2 asks for.
 */
const upgraded = async (request: Request, response: Response): Promise<Response> => {
  const socket = (response as Response & {webSocket?: WebSocket}).webSocket;
  if (response.status !== 101 || socket === undefined || socket === null) {
    return response;
  }
  const key = request.headers.get('Sec-WebSocket-Key') ?? '';
  const digest = await crypto.subtle.digest(
    'SHA-1',
    new TextEncoder().encode(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'),
  );
  const accept = btoa(String.fromCharCode(...new Uint8Array(digest)));
  return new Response(null, {
    status: 101,
    webSocket: socket,
    headers: {Upgrade: 'websocket', Connection: 'Upgrade', 'Sec-WebSocket-Accept': accept},
  });
};

/** The app instance every request of this fixture reaches. */
const APP_INSTANCE = 'fixture';

const moduleOf = (facetName: string): string => facetName.split('@')[0]!;

export class AppRoot extends DurableObject<Env> {
  #examOn(): boolean {
    return this.env.TINYAPP_EXAM === '1';
  }

  #worker(module: string): WorkerStub {
    const facet = FACETS[module];
    if (facet === undefined) {
      throw new Error(`no such module: ${module}`);
    }
    return this.env.LOADER.get(`${module}@${facet.version}`, () => ({
      compatibilityDate: '2026-09-01',
      mainModule: 'facet.js',
      modules: {'facet.js': facet.code},
      env: {TINYAPP_EXAM: this.#examOn() ? '1' : '', SELF: this.env.SELF},
      globalOutbound: null,
    }));
  }

  #facet(name: string): Fetcher {
    if (this.env.MODULE_SHAPE === 'facet') {
      return this.ctx.facets.get(name, () => ({
        class: this.#worker(moduleOf(name)).getDurableObjectClass('Facet'),
      }));
    }
    // Named shape: the same class, its own SQLite, addressed by name under
    // this instance. Read 2026-09-16 on celld 0.5.0: a WebSocket a facet
    // accepts does not cross back to the root (the 101 arrives with no
    // socket), while a named Durable Object's does, so this is the shape the
    // sync runs on until celld carries a facet's socket.
    return this.env.MODULES.getByName(`${APP_INSTANCE}/${name}`) as unknown as Fetcher;
  }

  /** The harness socket sends nothing the root reads; a message is ignored. */
  webSocketMessage(): void {}
  webSocketClose(): void {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/sync/')) {
      const name = url.pathname.slice('/sync/'.length);
      if (FACETS[moduleOf(name)] === undefined) {
        return new Response(`no such module: ${moduleOf(name)}`, {status: 404});
      }
      const forwarded = new Request(request);
      forwarded.headers.set('x-tinyapp-module', name);
      return upgraded(request, await this.#facet(name).fetch(forwarded));
    }
    if (url.pathname.startsWith('/exam/')) {
      if (!this.#examOn()) {
        return new Response('not found', {status: 404});
      }
      return this.#exam(url.pathname.slice('/exam/'.length), url, request);
    }
    return new Response('tinyapp-fixture root', {status: 200});
  }

  /** A module's transition, fanned out to every harness socket. */
  #transition(body: string): void {
    for (const ws of this.ctx.getWebSockets('events')) {
      try {
        ws.send(body);
      } catch {
        // A closed harness socket is dropped by the runtime on its own.
      }
    }
  }

  async #exam(verb: string, url: URL, request: Request): Promise<Response> {
    const f = url.searchParams.get('f') ?? '';
    switch (verb) {
      case 'events': {
        if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') {
          return new Response('upgrade required', {status: 426});
        }
        const [client, server] = Object.values(new WebSocketPair()) as [WebSocket, WebSocket];
        this.ctx.acceptWebSocket(server, ['events']);
        return new Response(null, {status: 101, webSocket: client});
      }
      case 'transition': {
        if (request.method !== 'POST') {
          return new Response('POST', {status: 405});
        }
        const body = await request.text();
        this.#transition(body);
        return new Response('ok');
      }
      case 'content':
      case 'rows':
        return this.#facet(f).fetch(new Request(`http://facet/exam/${verb}`));
      case 'fork': {
        const from = url.searchParams.get('from') ?? '';
        const to = url.searchParams.get('to') ?? '';
        if (moduleOf(from) !== moduleOf(to)) {
          return new Response('a fork keeps its module', {status: 400});
        }
        const content = await this.#facet(from).fetch(new Request('http://facet/exam/content'));
        return this.#facet(to).fetch(
          new Request('http://facet/exam/seed', {method: 'POST', body: await content.text()}),
        );
      }
      case 'reload':
        if (this.env.MODULE_SHAPE === 'facet') {
          this.ctx.facets.abort(f, 'reload');
        }
        return this.#facet(f).fetch(new Request('http://facet/exam/content'));
      case 'discard':
        if (this.env.MODULE_SHAPE === 'facet') {
          this.ctx.facets.delete(f);
          return new Response(`discarded ${f}`);
        }
        return this.#facet(f).fetch(new Request('http://facet/exam/discard'));
      default:
        return new Response(`no such exam verb: ${verb}`, {status: 404});
    }
  }
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return env.APP.getByName(APP_INSTANCE).fetch(request);
  },
};
