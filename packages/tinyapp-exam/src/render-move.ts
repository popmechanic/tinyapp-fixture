/**
 * The render move: build the app into one self-contained page that opens on the
 * post-action state, open that page in the machine's own browser, and read its
 * DOM against the small view vocabulary.
 *
 * The renderer is local and always was meant to be: the page arrives as a
 * `data:` URL, every request it makes is blocked before it leaves, and the only
 * socket in the exam is the driver's loopback one. A spec that names no `entry`
 * has no page to build and records `skipped` — never a pass.
 */

import {readFileSync, statSync} from 'node:fs';
import {dirname, resolve} from 'node:path';

import type {BunPlugin} from 'bun';
import tailwind from 'bun-plugin-tailwind';
import {parse, TextNode, type HTMLElement} from 'node-html-parser';

import type {Browser} from './browser';
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
 *
 * A `parts` with no `seed` writes no seed script at all, and the document then
 * carries no `__TINYAPP_SEED__` anywhere: that is the unseeded page the
 * persistence move serves, which must start from its own storage and not from a
 * state handed to it.
 */
export const renderHtml = (
  entryHtml: string,
  parts: {js: string; css: string; seed?: Snapshot},
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

  if (parts.seed !== undefined) {
    head.insertAdjacentHTML('afterbegin', '<script></script>');
    fill(
      head.querySelector('script')!,
      inlineable(`window.__TINYAPP_SEED__ = ${JSON.stringify(parts.seed)};`),
    );
  }

  return root.toString();
};

/**
 * True when there is at least one element and every one reads `<want>` off
 * either `data-checked` or `aria-checked`.
 *
 * Two attributes because there are two kinds of checkbox on the page. A real
 * `<input type="checkbox">` carries its state as a DOM property, invisible in
 * markup, which the renderer's injected script copies onto `data-checked`. A
 * shadcn checkbox is base-ui's `<span role="checkbox">`, which carries
 * `aria-checked="true"|"false"` as a real attribute of its own — written by
 * React's static render too, so the linter reads it without reflecting
 * anything. Base-ui's own `data-checked=""` is the empty string, neither
 * spelling, so a `checked` view of one of those spans is answered by its
 * `aria-checked` alone.
 */
const readsChecked = (element: HTMLElement, want: 'true' | 'false'): boolean =>
  element.getAttribute('data-checked') === want ||
  element.getAttribute('aria-checked') === want;

/** True when there is at least one element and every one reads `<want>`. */
const allRead = (matched: HTMLElement[], want: 'true' | 'false'): boolean =>
  matched.length > 0 && matched.every((element) => readsChecked(element, want));

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
 * injected script writes — `checked` is a DOM property, invisible in markup —
 * or the `aria-checked` a `role="checkbox"` element carries in the markup
 * itself.
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
 * The script run in the page before it is serialised: it copies each input's
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

/** One `paths` entry of a tsconfig, split at its `*` and resolved against it. */
type PathRule = {prefix: string; suffix: string; base: string; targets: string[]};

/** What a bare specifier may be on disk, in the order the bundler would try. */
const SUFFIXES = [
  '',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '/index.ts',
  '/index.tsx',
  '/index.js',
];

/** The `paths` of the nearest `tsconfig.json` at or above `dir`, or none. */
const pathRulesFor = (dir: string): PathRule[] => {
  for (let at = dir; ; at = dirname(at)) {
    const file = resolve(at, 'tsconfig.json');
    let text: string;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      if (dirname(at) === at) {
        return [];
      }
      continue;
    }

    let options: {baseUrl?: string; paths?: Record<string, string[]>};
    try {
      options = (JSON.parse(text) as {compilerOptions?: typeof options}).compilerOptions ?? {};
    } catch {
      return [];
    }

    // The nearest tsconfig is the one that governs, paths or no paths — the
    // search stops here either way, as `tsc`'s own does.
    const base = resolve(at, options.baseUrl ?? '.');
    return Object.entries(options.paths ?? {})
      .map(([pattern, targets]) => {
        const star = pattern.indexOf('*');
        return {
          prefix: star === -1 ? pattern : pattern.slice(0, star),
          suffix: star === -1 ? '' : pattern.slice(star + 1),
          base,
          targets,
        };
      })
      .filter((rule) => rule.prefix !== '');
  }
};

/** The file `specifier` names through `rules`, or `null` for no rule and no file. */
const throughPaths = (specifier: string, rules: PathRule[]): string | null => {
  for (const rule of rules) {
    if (!specifier.startsWith(rule.prefix) || !specifier.endsWith(rule.suffix)) {
      continue;
    }
    const star = specifier.slice(rule.prefix.length, specifier.length - rule.suffix.length);
    for (const target of rule.targets) {
      const path = resolve(rule.base, target.replace('*', star));
      for (const suffix of SUFFIXES) {
        try {
          if (statSync(path + suffix).isFile()) {
            return path + suffix;
          }
        } catch {
          // Not a file here; the next spelling, then the next target.
        }
      }
    }
  }
  return null;
};

/**
 * The entry project's `paths` map, applied by hand.
 *
 * Bun's bundler reads a tsconfig `paths` map from the process's working
 * directory alone: under `bun test` a build of `client/src/index.tsx` never sees
 * `client/tsconfig.json`, and the design system's own spelling —
 * `@/components/ui/button` — comes out `Could not resolve`, though the identical
 * build succeeds under `bun run`, where the runtime's tsconfig search applies.
 * A `paths` map at the repository root cures the build and breaks the suite: a
 * root `tsconfig.json` makes every `tsc` spawned with files on its command line
 * print `TS5112`, and the exams that read `tsc`'s output assert it is empty.
 *
 * So the move carries the map itself — the nearest `tsconfig.json` above the
 * entry, the one `tsc` and Vite both obey, answered from an `onResolve` narrowed
 * to that map's own prefixes. Every other specifier is Bun's to resolve, and a
 * prefix with no file behind it falls through to Bun's error as before.
 */
const pathsPlugin = (entryDir: string): BunPlugin | null => {
  const rules = pathRulesFor(entryDir);
  if (rules.length === 0) {
    return null;
  }

  const filter = new RegExp(
    `^(${rules.map((rule) => rule.prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
  );
  return {
    name: 'tinyapp-tsconfig-paths',
    setup(build) {
      build.onResolve({filter}, (args) => {
        const found = throughPaths(args.path, rules);
        return found === null ? undefined : {path: found};
      });
    },
  };
};

/**
 * Bundles the module the entry names, resolved against the entry's directory —
 * `/src/index.tsx` in `client/index.html` is `client/src/index.tsx`, not a path
 * on the filesystem root.
 *
 * It builds the app for production by default — minified, with
 * `process.env.NODE_ENV` defined to `"production"` — and both halves of that are
 * load-bearing rather than tidy.
 *
 * Minified, because the page travels to the browser as a `data:` URL, and this
 * fixture built for development is a URL of ~2.59 M characters, over the ceiling
 * `open` refuses. Production, because a *development* React double-invokes the
 * initialiser of a component under `<StrictMode>`, which this app's `<Store/>`
 * is: `useCreateMergeableStore(() => createTodosStore(seed))` therefore makes two
 * stores, TinyBase keeps the first and renders from it, while the fixture's
 * `exposeStore` records the last. `window.__TINYAPP_STORE__` is then a stale twin
 * of the store the page is showing, and the interaction the store move performs
 * lands in the UI's store while the read goes to the other one — a click that
 * visibly ticks the box reads back uncompleted. A production build invokes once,
 * and the handle is the store the page renders from.
 *
 * Both are pinned to the one `minify` knob, and `NODE_ENV` is defined either way
 * rather than inherited from the shell: a build that changed with the ambient
 * environment would break the determinism the two-page rule rests on, and a
 * production build that was merely unminified would come in at ~1.96 M
 * characters — under the ceiling, so `minify: false` would no longer show it
 * being refused. `minify: false` is the development build, which is what a test
 * that wants to see that refusal asks for. Both builds are deterministic, so the
 * two pages the store move opens still agree byte for byte.
 */
export const bundleOf = async (
  entryPath: string,
  entryHtml: string,
  opts: {minify?: boolean} = {},
): Promise<{js: string; css: string}> => {
  const src = parse(entryHtml, PARSE)
    .querySelector('script[type=module][src]')
    ?.getAttribute('src');
  if (src === undefined || src === null || src === '') {
    throw new Error(`render failed: ${entryPath} names no module script`);
  }

  const production = opts.minify ?? true;
  const entrypoint = resolve(dirname(entryPath), src.replace(/^\/+/, ''));
  const paths = pathsPlugin(dirname(entrypoint));
  const built = await Bun.build({
    entrypoints: [entrypoint],
    target: 'browser',
    minify: production,
    // Bun's bundler does not run Tailwind: a stylesheet saying
    // `@import "tailwindcss";` comes out the far side with `@tailwind
    // utilities;` still in it and not one generated class. `bun-plugin-tailwind`
    // is what compiles it, and a page whose `.flex` never got generated is a
    // page the exam photographs unstyled. A plain stylesheet passes through it
    // unchanged, so the plugin costs the non-Tailwind entry nothing.
    plugins: paths === null ? [tailwind] : [tailwind, paths],
    define: {
      'process.env.NODE_ENV': production ? '"production"' : '"development"',
    },
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

/** The entry document, read and bundled into one page seeded with `content`. */
export const pageFor = async (
  entry: string,
  content: Snapshot,
  opts: {minify?: boolean} = {},
): Promise<string> => {
  const entryPath = resolve(process.cwd(), entry);
  const entryHtml = readFileSync(entryPath, 'utf8');
  const {js, css} = await bundleOf(entryPath, entryHtml, opts);
  return renderHtml(entryHtml, {js, css, seed: content});
};

/**
 * Runs the render move for one snapshot.
 *
 * Resolves `{render: 'skipped', ms: null, failures: []}` — without opening
 * anything — when the spec names no `entry`; there is then no page to build, and
 * that is the only reason the move skips. A run directory is not one of them: a
 * laptop renders too, and its evidence lands in a temp directory.
 *
 * Otherwise it bundles the entry, opens the page in `browser`, and resolves that
 * page's DOM, picture, view failures and wall. The page is closed before it
 * resolves; the browser is the caller's to close.
 */
export const renderMove = async (args: {
  entry?: string;
  content: Snapshot;
  view?: View | View[];
  clock: string;
  browser: Browser;
  minify?: boolean;
}): Promise<RenderResult> => {
  const {entry, content, view, clock, browser, minify} = args;
  if (entry === undefined || entry === '') {
    return {render: 'skipped', ms: null, failures: []};
  }

  const started = performance.now();
  const html = await pageFor(entry, content, {minify});

  const page = await browser.open({html, clock});
  let shot: {dom: string; screenshot: Uint8Array};
  try {
    shot = await page.snapshot();
  } finally {
    await page.close().catch(() => {});
  }

  return {
    render: 'ran',
    ms: Math.max(0, performance.now() - started),
    dom: shot.dom,
    screenshot: shot.screenshot,
    failures: assertView(shot.dom, view),
  };
};
