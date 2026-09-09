/**
 * The render move: build the app into one self-contained page that opens on the
 * post-action state, ask the renderer for that page's DOM and picture, and read
 * the DOM against the small view vocabulary.
 *
 * A machine with no renderer configured records `skipped` — never a pass. The
 * two triggers are deliberate: the suite at the fold has no run directory, a
 * laptop has no renderer URL, and both mean "nothing was looked at".
 */

import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';

import {parse, TextNode, type HTMLElement} from 'node-html-parser';

import type {Snapshot, View} from './types';

export type {Snapshot, Tables, Values, View} from './types';

/** What one render move records. `dom`/`screenshot` are absent when it skipped. */
export type RenderResult = {
  render: 'ran' | 'skipped';
  ms: number | null;
  dom?: string;
  screenshot?: Uint8Array;
  failures: string[];
};

/** Comments are kept so the entry's `<!doctype html>` survives the round trip. */
const PARSE = {comment: true} as const;

/**
 * The one sequence that would close a `<script>` early, neutralised.
 *
 * Inside script data only `</script` ends the element, and every occurrence in
 * generated JS is inside a string or regexp literal — where `<\/script` is the
 * same two characters to the JS parser. React DOM ships exactly one.
 */
const inlineable = (js: string): string => js.replace(/<\/script/gi, '<\\/script');

/** Appends `<${tag}></${tag}>` to `host` and hands back the new element. */
const append = (host: HTMLElement, tag: 'script' | 'style'): HTMLElement => {
  host.insertAdjacentHTML('beforeend', `<${tag}></${tag}>`);
  return host.querySelectorAll(tag).at(-1)!;
};

/**
 * Puts `raw` inside a raw-text element verbatim.
 *
 * The `textContent` setter entity-escapes what it is given, and a browser does
 * not decode entities inside `<script>` or `<style>` — an escaped quote would
 * reach the page as the six characters `&quot;`.
 */
const fill = (element: HTMLElement, raw: string): void => {
  element.childNodes = [new TextNode(raw, element)];
};

/**
 * The entry document with the bundle, the stylesheet and the seed inlined.
 *
 * Every `<script type="module" src="…">` collapses into a single inline module
 * script carrying `js`: the renderer is handed raw HTML with no origin, so any
 * relative `src` would be a fetch that never resolves. The seed goes first in
 * `<head>` so `window.__TINYAPP_SEED__` is set before the module runs.
 */
export const renderHtml = (
  entryHtml: string,
  parts: {js: string; css: string; seed: Snapshot},
): string => {
  const root = parse(entryHtml, PARSE);
  const head = root.querySelector('head') ?? root.querySelector('html') ?? root;

  const modules = root.querySelectorAll('script[type=module][src]');
  for (const extra of modules.slice(1)) {
    extra.remove();
  }

  let inline = modules[0];
  if (inline === undefined) {
    inline = append(root.querySelector('body') ?? head, 'script');
    inline.setAttribute('type', 'module');
  } else {
    inline.removeAttribute('src');
  }
  fill(inline, inlineable(parts.js));
  fill(append(head, 'style'), parts.css);

  head.insertAdjacentHTML('afterbegin', '<script></script>');
  fill(
    head.querySelector('script')!,
    inlineable(`window.__TINYAPP_SEED__ = ${JSON.stringify(parts.seed)};`),
  );

  return root.toString();
};

/** True when there is at least one element and every one reads `data-checked`. */
const allRead = (matched: HTMLElement[], want: 'true' | 'false'): boolean =>
  matched.length > 0 &&
  matched.every((element) => element.getAttribute('data-checked') === want);

/** Why this view does not hold of its matched elements, `null` when it does. */
const breachOf = (view: View, matched: HTMLElement[]): string | null => {
  if (view.count !== undefined && matched.length !== view.count) {
    return `expected ${view.count} matches, found ${matched.length}`;
  }
  if (view.absent === true && matched.length > 0) {
    return `expected no matches, found ${matched.length}`;
  }
  if (
    view.text !== undefined &&
    !matched.some((element) => element.textContent.includes(view.text!))
  ) {
    return `no match has text ${JSON.stringify(view.text)}`;
  }
  if (
    view.attr !== undefined &&
    !matched.some(
      (element) => element.getAttribute(view.attr!.name) === view.attr!.value,
    )
  ) {
    return `no match has ${view.attr.name}=${JSON.stringify(view.attr.value)}`;
  }
  for (const [key, want] of [
    ['checked', 'true'],
    ['unchecked', 'false'],
  ] as const) {
    if (view[key] === true && !allRead(matched, want)) {
      return matched.length === 0
        ? `expected at least one ${key} match, found none`
        : `a match is not ${key}`;
    }
  }
  return null;
};

/**
 * Reads `views` against `html`: `[]` when every entry holds, and otherwise one
 * string per failing entry, in list order, naming that entry's selector. A
 * `views` of `undefined` asserts nothing.
 *
 * `checked` and `unchecked` read the `data-checked` attribute the renderer's
 * injected script writes — `checked` is a DOM property, invisible in markup.
 */
export const assertView = (
  html: string,
  views: View | View[] | undefined,
): string[] => {
  if (views === undefined) {
    return [];
  }
  const root = parse(html, PARSE);
  const failures: string[] = [];

  for (const view of Array.isArray(views) ? views : [views]) {
    const breach = breachOf(view, root.querySelectorAll(view.selector));
    if (breach !== null) {
      failures.push(`view ${view.selector}: ${breach}`);
    }
  }

  return failures;
};

/**
 * The script the renderer injects before it serialises: it copies each input's
 * `checked` property onto a `data-checked` attribute, and keeps copying, since
 * the app paints after load.
 *
 * The write is guarded on the value already there. `setAttribute` queues a
 * mutation record even when it changes nothing, so an unguarded copy feeds its
 * own observer: the page never goes quiet and the renderer gives up waiting for
 * it. With the guard the observer runs to a fixed point on the first pass and
 * only wakes again for a real change.
 *
 * It carries no `'`, so a caller may quote the whole text either way.
 */
export const REFLECT_CHECKED =
  '(function(){var f=function(){document.querySelectorAll("input")' +
  '.forEach(function(i){var v=i.checked?"true":"false";' +
  'if(i.getAttribute("data-checked")!==v){i.setAttribute("data-checked",v)}})};' +
  'f();new MutationObserver(f).observe(document.documentElement,' +
  '{subtree:true,childList:true,attributes:true})})()';

/** The base64 payload as bytes. */
const fromBase64 = (base64: string): Uint8Array =>
  Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));

/**
 * Bundles the module the entry names, resolved against the entry's directory —
 * `/src/index.tsx` in `client/index.html` is `client/src/index.tsx`, not a path
 * on the filesystem root.
 */
const bundleOf = async (
  entryPath: string,
  entryHtml: string,
): Promise<{js: string; css: string}> => {
  const src = parse(entryHtml, PARSE)
    .querySelector('script[type=module][src]')
    ?.getAttribute('src');
  if (src === undefined || src === null || src === '') {
    throw new Error(`render failed: ${entryPath} names no module script`);
  }

  const built = await Bun.build({
    entrypoints: [resolve(dirname(entryPath), src.replace(/^\/+/, ''))],
    target: 'browser',
  });
  if (!built.success) {
    throw new Error(`render failed: ${built.logs.join('\n')}`);
  }

  const textOf = async (kept: (type: string, kind: string) => boolean) =>
    (
      await Promise.all(
        built.outputs
          .filter((output) => kept(output.type, output.kind))
          .map((output) => output.text()),
      )
    ).join('\n');

  return {
    js: await textOf((_type, kind) => kind === 'entry-point'),
    css: await textOf((type) => type.startsWith('text/css')),
  };
};

/**
 * Runs the render move for one snapshot.
 *
 * Resolves `{render: 'skipped', ms: null, failures: []}` — without dialling
 * anything — when either `TINYAPP_RENDER_URL` or `ULTRA_RUN_DIR` is unset or
 * empty. Otherwise it bundles the entry, posts the page to the renderer's
 * `snapshot` action and resolves that call's DOM, picture, view failures and
 * wall. Rejects with a message beginning `render failed:` when the renderer
 * answers outside 2xx or with `success` false.
 */
export const renderMove = async (args: {
  entry: string;
  content: Snapshot;
  view?: View | View[];
  env: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
}): Promise<RenderResult> => {
  const {entry, content, view, env, fetchImpl} = args;
  const base = env.TINYAPP_RENDER_URL;
  const runDir = env.ULTRA_RUN_DIR;
  if (base === undefined || base === '' || runDir === undefined || runDir === '') {
    return {render: 'skipped', ms: null, failures: []};
  }

  const started = performance.now();
  const entryPath = resolve(process.cwd(), entry);
  const entryHtml = readFileSync(entryPath, 'utf8');
  const {js, css} = await bundleOf(entryPath, entryHtml);

  const response = await (fetchImpl ?? fetch)(
    `${base.replace(/\/+$/, '')}/snapshot`,
    {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        html: renderHtml(entryHtml, {js, css, seed: content}),
        addScriptTag: [{content: REFLECT_CHECKED}],
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`render failed: ${response.status} ${detail}`.trimEnd());
  }

  const payload = (await response.json()) as {
    success?: boolean;
    errors?: unknown;
    result?: {content?: string; screenshot?: string};
  };
  if (payload?.success !== true) {
    throw new Error(`render failed: ${JSON.stringify(payload?.errors ?? payload)}`);
  }

  const dom = payload.result?.content ?? '';
  return {
    render: 'ran',
    ms: Math.max(0, performance.now() - started),
    dom,
    screenshot: fromBase64(payload.result?.screenshot ?? ''),
    failures: assertView(dom, view),
  };
};
