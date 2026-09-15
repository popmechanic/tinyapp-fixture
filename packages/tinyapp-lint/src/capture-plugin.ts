/**
 * The Bun plugin that lets an exam file be *read* rather than run.
 *
 * A state exam file is a `bun test` file: it imports `stateExam` from
 * `tinyapp-exam` and calls it at the top level, and `stateExam` registers a
 * `bun:test` test — which throws outright in a plain `bun` process
 * (`Cannot use test outside of the test runner`). Neither is what the linter
 * wants. It wants the spec object, and it wants no browser opened for it.
 *
 * So each exam file is loaded with its two package imports swapped for stubs:
 * `stateExam` becomes a push onto `globalThis.__captured` and every other name
 * of either package becomes a no-op. The file's own top-level call then hands
 * its spec over and returns, and nothing else in it does anything at all.
 *
 * `onResolve` is not used: measured under Bun, an `onResolve` on the bare
 * specifiers `tinyapp-exam` and `bun:test` never fires, while an `onLoad` on the
 * exam files themselves does. The rewrite therefore happens in the source text,
 * and the stubs travel as `data:` module URLs so that no file on disk has to
 * stand in for them.
 *
 * This module is a `--preload` of the capture child and of nothing else. A
 * plugin registered inside a `bun test` process would rewrite the fixture's own
 * exam files as the runner loaded them and silently drop every exam it has.
 */

import {resolve} from 'node:path';

/** The names `tinyapp-exam` exports at runtime, `stateExam` apart. */
const EXAM_NO_OPS = [
  'runStateExam',
  'STATE_EXAM_TIMEOUT_MS',
  'launchBrowser',
  'withContract',
  'browserStoreMove',
  'diffContent',
  'renderDiff',
  'storeMove',
  'READ_CONTENT',
  'assertView',
  'bundleOf',
  'pageFor',
  'renderHtml',
  'renderMove',
  'REFLECT_CHECKED',
  'applyMutant',
  'mutantPath',
  'evidenceDir',
  'examStem',
  'writeEvidence',
  'actionsOf',
  'isCallbackAction',
  'VALUES_TABLE',
];

/** The `bun:test` names an exam file may import beside its `stateExam` call. */
const BUN_TEST_NO_OPS = [
  'test',
  'it',
  'describe',
  'expect',
  'afterAll',
  'beforeAll',
  'afterEach',
  'beforeEach',
];

/** The stub that stands in for `tinyapp-exam` while an exam file is read. */
const EXAM_STUB = [
  'export const stateExam = (spec) => {globalThis.__captured.push(spec);};',
  ...EXAM_NO_OPS.map((name) => `export const ${name} = () => {};`),
].join('\n');

/**
 * The stub that stands in for `bun:test`.
 *
 * `mock` carries a `module` of its own: a file that stubs a module out before
 * importing it would otherwise throw on the property rather than on the call.
 */
const BUN_TEST_STUB = [
  ...BUN_TEST_NO_OPS.map((name) => `export const ${name} = () => {};`),
  'export const mock = Object.assign(() => {}, {module: () => {}});',
].join('\n');

/**
 * A module's source as a `data:` URL, importable without a file to hold it.
 *
 * Base64 rather than percent-encoded: measured under Bun 1.4.0, a static
 * `import` of a percent-encoded `data:` module from a file this plugin itself
 * loaded links to an empty module — `Export named 'stateExam' not found` — while
 * the base64 form links exactly as it does from an ordinary file.
 */
const dataModule = (source: string): string =>
  `data:text/javascript;base64,${Buffer.from(source, 'utf8').toString('base64')}`;

/** `text` with every character a regular expression would read as syntax quoted. */
const quoteRe = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The regular expression matching the `.test.ts` files directly under `dir`. */
export const examFilter = (dir: string): RegExp =>
  new RegExp(`^${quoteRe(resolve(dir))}[\\\\/][^\\\\/]+\\.test\\.ts$`);

/** `source` with its two package imports pointed at the stubs above. */
export const stubImports = (source: string): string =>
  source
    .replace(/from\s*(['"])tinyapp-exam\1/g, `from '${dataModule(EXAM_STUB)}'`)
    .replace(/from\s*(['"])bun:test\1/g, `from '${dataModule(BUN_TEST_STUB)}'`);

/** Registers the one `onLoad` over the exam files of `dir`. */
export const registerCapturePlugin = (dir: string): void => {
  const filter = examFilter(dir);
  Bun.plugin({
    name: 'tinyapp-lint-capture',
    setup(build) {
      build.onLoad({filter}, async (args) => ({
        contents: stubImports(await Bun.file(args.path).text()),
        loader: 'ts',
      }));
    },
  });
};

// Preloaded ahead of `capture.ts`, which takes the directory to read as its one
// argument — the same argument this plugin builds its filter from.
registerCapturePlugin(process.argv[2] ?? process.cwd());
