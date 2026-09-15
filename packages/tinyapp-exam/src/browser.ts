/**
 * The browser move's engine: the machine's own Chromium, driven over the
 * DevTools protocol with nothing between us and it.
 *
 * There is no client library here and no dependency to add — a CDP connection
 * is a WebSocket carrying `{id, method, params, sessionId?}` and replies
 * `{id, result|error}`, and Bun ships both the spawn and the socket. The
 * headless shell is asked for `--remote-debugging-port=0` and answers with the
 * port it chose on the `DevTools listening on ws://…` line of its stderr: Bun
 * cannot hand a child extra pipes, so the port form is the one available, and a
 * port of `0` keeps two exams running side by side from colliding.
 *
 * Nothing the page asks for leaves the machine. `Network.setBlockedURLs` with
 * `["*"]` is installed on the session before the first navigation, and the page
 * itself arrives as a `data:` URL, so the only socket in the exam is the
 * loopback one to the process we spawned. `client/index.html` links Google
 * Fonts; with every request blocked the page falls back to the platform
 * sans-serif, and that fallback — identical on every machine, dialling nothing —
 * is the deterministic choice, not a loss.
 */

import {existsSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {REFLECT_CHECKED} from './render-move';

/** Where the fleet image keeps its headless shell. */
const DEFAULT_BINARY = '/headless-shell/headless-shell';

/** The line the shell prints once its debugging endpoint is listening. */
const DEVTOOLS_LINE = /DevTools listening on (ws:\S+)/;

/** How long that line may take. Measured at ~100 ms; this is the give-up point. */
const DEVTOOLS_TIMEOUT_MS = 15_000;

/** How long one protocol call may go unanswered before it is called a failure. */
const CALL_TIMEOUT_MS = 30_000;

/** How long `close()` waits for a polite `Browser.close` before it kills. */
const EXIT_GRACE_MS = 2_000;

/** One thing an exam does to a page. */
export type Action =
  | {click: string}
  | {type: [string, string]}
  | {key: [string, string]};

/** One open page: act on it, read from it, photograph it, close it. */
export interface Page {
  /** Performs one action, rejecting when its selector matches nothing. */
  act(action: Action): Promise<void>;
  /** The JSON value of `expression` evaluated in the page. */
  evaluate(expression: string): Promise<unknown>;
  /** The document's outer HTML with `data-checked` reflected, and a PNG. */
  snapshot(): Promise<{dom: string; screenshot: Uint8Array}>;
  /** Detaches from the target and closes it. */
  close(): Promise<void>;
}

/** One running browser process. */
export interface Browser {
  /** The arguments it was spawned with, `argv[0]` the binary. */
  readonly argv: string[];
  /** Opens `html` as a page whose clock is pinned to `clock`. */
  open(opts: {html: string; clock: string}): Promise<Page>;
  /** Ends the process and removes its user data directory. */
  close(): Promise<void>;
}

/** A reply or an event off the wire. */
type Incoming = {
  id?: number;
  result?: Record<string, unknown>;
  error?: {message?: string; code?: number};
  method?: string;
  params?: Record<string, unknown>;
  sessionId?: string;
};

/** The pieces of a connection the rest of this module speaks through. */
type Connection = {
  send(
    method: string,
    params?: Record<string, unknown>,
    sessionId?: string,
  ): Promise<Record<string, unknown>>;
  /** Resolves with the first `method` event on `sessionId`, armed when called. */
  once(method: string, sessionId: string): Promise<Record<string, unknown>>;
  close(): void;
};

/** The base64 payload as bytes. */
const fromBase64 = (base64: string): Uint8Array =>
  Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));

/** A promise that settles after `ms`, its timer unref'd so it holds nothing open. */
const after = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    (timer as unknown as {unref?: () => void}).unref?.();
  });

/**
 * The script installed on every new document of the page.
 *
 * It replaces `Date` before a line of the app runs, so `Date.now()` and a bare
 * `new Date()` are the exam's instant; `new Date(x)`, `Date.parse` and
 * `Date.UTC` keep working, inherited from the real constructor.
 */
const clockPin = (clock: string): string => {
  const instant = Date.parse(clock);
  if (Number.isNaN(instant)) {
    throw new Error(`browser: clock is not a date: ${clock}`);
  }
  return (
    `const t = ${instant}; const D = Date; globalThis.Date = class extends D ` +
    `{ constructor(...a) { super(...(a.length ? a : [t])); } static now() { return t; } }`
  );
};

/**
 * What `open` waits for after the load event: three turns of two animation
 * frames and a macrotask, capped at a second in case a machine paints no frames.
 *
 * The load event is not the moment a page is worth looking at. The app paints
 * after it — React mounts on a microtask — and a blocked request dispatches its
 * `error` a few milliseconds later still, so an exam that reads `__WS_FAILED`
 * the instant `open` resolves would be reading a page mid-sentence. Waiting is
 * the deterministic move: every turn here is the page's own clock advancing, and
 * the cap means a page that never paints costs a second rather than the call.
 */
const SETTLE =
  'new Promise(function (done) {' +
  'var left = 3; var stop = setTimeout(done, 1000);' +
  'var turn = function () {' +
  'if (left-- === 0) { clearTimeout(stop); done(); return; }' +
  'requestAnimationFrame(function () { requestAnimationFrame(function () { setTimeout(turn, 0) }) })' +
  '}; turn()' +
  '})';

/** Opens a CDP connection to `url` and resolves once it is talking. */
const connect = async (url: string): Promise<Connection> => {
  const socket = new WebSocket(url);
  const pending = new Map<
    number,
    {resolve: (value: Record<string, unknown>) => void; reject: (error: Error) => void}
  >();
  const waiters = new Map<string, ((params: Record<string, unknown>) => void)[]>();
  let closed: Error | null = null;
  let nextId = 1;

  socket.addEventListener('message', (event: MessageEvent) => {
    const message = JSON.parse(String(event.data)) as Incoming;
    if (typeof message.id === 'number') {
      const call = pending.get(message.id);
      pending.delete(message.id);
      if (call === undefined) {
        return;
      }
      if (message.error !== undefined) {
        call.reject(new Error(`browser: ${message.error.message ?? 'protocol error'}`));
      } else {
        call.resolve(message.result ?? {});
      }
      return;
    }
    if (typeof message.method !== 'string') {
      return;
    }
    const key = `${message.sessionId ?? ''} ${message.method}`;
    for (const waiter of waiters.get(key) ?? []) {
      waiter(message.params ?? {});
    }
    waiters.delete(key);
  });

  const give = (reason: string) => {
    closed = new Error(`browser: ${reason}`);
    for (const call of pending.values()) {
      call.reject(closed);
    }
    pending.clear();
  };
  socket.addEventListener('close', () => give('connection closed'));
  socket.addEventListener('error', () => give('connection failed'));

  await new Promise<void>((resolve, reject) => {
    socket.addEventListener('open', () => resolve());
    socket.addEventListener('error', () =>
      reject(new Error(`browser: cannot connect to ${url}`)),
    );
  });

  return {
    send: (method, params = {}, sessionId) => {
      if (closed !== null) {
        return Promise.reject(closed);
      }
      const id = nextId++;
      const message: Record<string, unknown> = {id, method, params};
      if (sessionId !== undefined) {
        message.sessionId = sessionId;
      }
      return new Promise<Record<string, unknown>>((resolve, reject) => {
        pending.set(id, {resolve, reject});
        socket.send(JSON.stringify(message));
        void after(CALL_TIMEOUT_MS).then(() => {
          if (pending.delete(id)) {
            reject(new Error(`browser: ${method} did not answer`));
          }
        });
      });
    },
    once: (method, sessionId) =>
      new Promise((resolve) => {
        const key = `${sessionId} ${method}`;
        waiters.set(key, [...(waiters.get(key) ?? []), resolve]);
      }),
    close: () => socket.close(),
  };
};

/**
 * Reads the shell's stderr until the DevTools line, and keeps draining it after.
 *
 * The child blocks on a full stderr pipe, so the tail is read and dropped for
 * as long as the process lives.
 */
const devtoolsUrl = async (stream: ReadableStream<Uint8Array>): Promise<string> => {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let seen = '';

  const drain = (async (): Promise<string> => {
    for (;;) {
      const {done, value} = await reader.read();
      if (done) {
        throw new Error('browser: no devtools line');
      }
      seen += decoder.decode(value, {stream: true});
      const found = DEVTOOLS_LINE.exec(seen);
      if (found !== null) {
        // Nothing awaits this: it only keeps the pipe from filling.
        void (async () => {
          try {
            for (;;) {
              const next = await reader.read();
              if (next.done) {
                return;
              }
            }
          } catch {
            return;
          }
        })();
        return found[1]!;
      }
    }
  })();

  return await Promise.race([
    drain,
    after(DEVTOOLS_TIMEOUT_MS).then((): never => {
      throw new Error('browser: no devtools line');
    }),
  ]);
};

/** The nodeId of `selector`, or a rejection naming it. */
const nodeFor = async (
  connection: Connection,
  sessionId: string,
  selector: string,
): Promise<number> => {
  const document = (await connection.send('DOM.getDocument', {}, sessionId)) as {
    root?: {nodeId?: number};
  };
  const found = (await connection.send(
    'DOM.querySelector',
    {nodeId: document.root?.nodeId ?? 0, selector},
    sessionId,
  )) as {nodeId?: number};
  if (found.nodeId === undefined || found.nodeId === 0) {
    throw new Error(`act: no element matches ${selector}`);
  }
  return found.nodeId;
};

/** The centre of a node's content box: `content` is x1 y1 x2 y2 x3 y3 x4 y4. */
const centreOf = async (
  connection: Connection,
  sessionId: string,
  nodeId: number,
): Promise<{x: number; y: number}> => {
  const box = (await connection.send('DOM.getBoxModel', {nodeId}, sessionId)) as {
    model?: {content?: number[]};
  };
  const content = box.model?.content ?? [];
  if (content.length < 6) {
    throw new Error('act: element has no box');
  }
  return {x: (content[0]! + content[4]!) / 2, y: (content[1]! + content[5]!) / 2};
};

/** Builds the `Page` facade over one attached target. */
const pageOn = (
  connection: Connection,
  sessionId: string,
  targetId: string,
): Page => {
  let open = true;
  const live = (): void => {
    if (!open) {
      throw new Error('page: closed');
    }
  };

  const evaluate = async (expression: string): Promise<unknown> => {
    live();
    const answer = (await connection.send(
      'Runtime.evaluate',
      {expression, returnByValue: true, awaitPromise: true},
      sessionId,
    )) as {
      result?: {value?: unknown};
      exceptionDetails?: {exception?: {description?: string}; text?: string};
    };
    if (answer.exceptionDetails !== undefined) {
      const detail = answer.exceptionDetails;
      throw new Error(
        `evaluate: ${detail.exception?.description ?? detail.text ?? 'threw'}`,
      );
    }
    return answer.result?.value;
  };

  return {
    evaluate,

    act: async (action: Action): Promise<void> => {
      live();
      if ('click' in action) {
        const nodeId = await nodeFor(connection, sessionId, action.click);
        const {x, y} = await centreOf(connection, sessionId, nodeId);
        for (const type of ['mousePressed', 'mouseReleased'] as const) {
          await connection.send(
            'Input.dispatchMouseEvent',
            {type, x, y, button: 'left', clickCount: 1},
            sessionId,
          );
        }
        return;
      }

      const [selector, argument] = 'type' in action ? action.type : action.key;
      const nodeId = await nodeFor(connection, sessionId, selector);
      await connection.send('DOM.focus', {nodeId}, sessionId);

      if ('type' in action) {
        await connection.send('Input.insertText', {text: argument}, sessionId);
        return;
      }

      // `Enter` carries `\r` as its text, which is what a page's keypress
      // handlers and a form's implicit submission read.
      const isEnter = argument === 'Enter';
      for (const type of ['keyDown', 'keyUp'] as const) {
        await connection.send(
          'Input.dispatchKeyEvent',
          {
            type,
            key: argument,
            code: argument,
            ...(isEnter ? {text: '\r', windowsVirtualKeyCode: 13} : {}),
          },
          sessionId,
        );
      }
    },

    snapshot: async (): Promise<{dom: string; screenshot: Uint8Array}> => {
      live();
      // The app paints after load, so `checked` is reflected onto `data-checked`
      // in the page first — the markup alone never carries a DOM property.
      await evaluate(REFLECT_CHECKED);
      const document = (await connection.send('DOM.getDocument', {}, sessionId)) as {
        root?: {nodeId?: number};
      };
      const markup = (await connection.send(
        'DOM.getOuterHTML',
        {nodeId: document.root?.nodeId ?? 0},
        sessionId,
      )) as {outerHTML?: string};
      const shot = (await connection.send(
        'Page.captureScreenshot',
        {format: 'png'},
        sessionId,
      )) as {data?: string};
      return {
        dom: markup.outerHTML ?? '',
        screenshot: fromBase64(shot.data ?? ''),
      };
    },

    close: async (): Promise<void> => {
      if (!open) {
        return;
      }
      open = false;
      await connection.send('Target.detachFromTarget', {sessionId}).catch(() => {});
      await connection.send('Target.closeTarget', {targetId}).catch(() => {});
    },
  };
};

/**
 * Spawns a browser and resolves once its DevTools endpoint is answering.
 *
 * `binary` defaults to `env.TINYAPP_BROWSER` and then to the image's
 * `/headless-shell/headless-shell`; `env` defaults to the process's own. A
 * binary that is not there rejects with `browser: no such binary <path>` before
 * anything is spawned, so nothing is left running behind the rejection.
 *
 * The default sandbox mode launches on the fleet image, so no `--no-sandbox` is
 * passed. A machine that needs it — a laptop, a container without user
 * namespaces — opts in through `env.TINYAPP_BROWSER_ARGS`, space-separated
 * flags appended to the argv.
 */
export const launchBrowser = async (opts?: {
  binary?: string;
  env?: Record<string, string | undefined>;
}): Promise<Browser> => {
  const env = opts?.env ?? (process.env as Record<string, string | undefined>);
  const binary =
    opts?.binary ??
    (env.TINYAPP_BROWSER !== undefined && env.TINYAPP_BROWSER !== ''
      ? env.TINYAPP_BROWSER
      : DEFAULT_BINARY);

  if (!existsSync(binary)) {
    throw new Error(`browser: no such binary ${binary}`);
  }

  const userDataDir = mkdtempSync(join(tmpdir(), 'tinyapp-browser-'));
  const extra = (env.TINYAPP_BROWSER_ARGS ?? '').split(/\s+/).filter((flag) => flag !== '');
  const argv = [
    binary,
    '--headless',
    '--remote-debugging-port=0',
    `--user-data-dir=${userDataDir}`,
    '--disable-gpu',
    '--hide-scrollbars',
    ...extra,
  ];

  const child = Bun.spawn(argv, {stdout: 'ignore', stderr: 'pipe'});

  const sweep = async (): Promise<void> => {
    child.kill();
    await child.exited.catch(() => undefined);
    rmSync(userDataDir, {recursive: true, force: true});
  };

  let connection: Connection;
  try {
    connection = await connect(await devtoolsUrl(child.stderr));
  } catch (error) {
    await sweep();
    throw error;
  }

  return {
    argv,

    open: async ({html, clock}: {html: string; clock: string}): Promise<Page> => {
      const pin = clockPin(clock);
      const created = (await connection.send('Target.createTarget', {
        url: 'about:blank',
      })) as {targetId?: string};
      const targetId = created.targetId ?? '';
      const attached = (await connection.send('Target.attachToTarget', {
        targetId,
        flatten: true,
      })) as {sessionId?: string};
      const sessionId = attached.sessionId ?? '';

      await connection.send('Network.enable', {}, sessionId);
      await connection.send('Network.setBlockedURLs', {urls: ['*']}, sessionId);
      await connection.send('Page.enable', {}, sessionId);
      await connection.send(
        'Page.addScriptToEvaluateOnNewDocument',
        {source: pin},
        sessionId,
      );

      // Armed before the navigation: the load of a `data:` URL can beat a
      // listener registered after the call returns.
      const loaded = connection.once('Page.loadEventFired', sessionId);
      await connection.send(
        'Page.navigate',
        {url: `data:text/html;base64,${Buffer.from(html, 'utf8').toString('base64')}`},
        sessionId,
      );
      await loaded;

      const page = pageOn(connection, sessionId, targetId);
      await page.evaluate(SETTLE);
      return page;
    },

    close: async (): Promise<void> => {
      // Asked politely first, so the shell takes its own children down with it.
      await connection.send('Browser.close').catch(() => {});
      await Promise.race([child.exited.catch(() => undefined), after(EXIT_GRACE_MS)]);
      connection.close();
      await sweep();
    },
  };
};
