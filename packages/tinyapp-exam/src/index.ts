/**
 * `tinyapp-exam` — a state exam is one call: a seed, an action, the state the
 * examiner expects, a view of the page it paints and the mutant it must notice.
 *
 * The whole vocabulary is re-exported here, so a test file imports the package
 * and nothing deeper.
 */

// The vocabulary first, and from `./types` only: `Locator` and `Action` are
// re-exported by `./browser` as well, and a name re-exported from two modules
// here would be a name exported twice.
export {actionsOf, isCallbackAction, VALUES_TABLE} from './types';
export type {
  Cell,
  ConvergenceExamSpec,
  ConvergenceRecord,
  Difference,
  ExamRecord,
  ExamStore,
  Locator,
  MutantEdit,
  PersistenceExamSpec,
  SessionTransition,
  Snapshot,
  StateExamSpec,
  Tables,
  Values,
  View,
} from './types';

export {runStateExam, stateExam, STATE_EXAM_TIMEOUT_MS} from './state-exam';
export type {ExamOptions, ExamOutcome} from './state-exam';

export {
  contentOf,
  persistenceExam,
  runPersistenceExam,
  EXAM_PRELUDE,
  PERSIST_TIMEOUT_MS,
  READY_TIMEOUT_MS,
} from './persistence-move';

export {
  convergenceExam,
  runConvergenceExam,
  CONVERGE_TIMEOUT_MS,
  SYNC_TIMEOUT_MS,
} from './convergence-move';

export {launchBrowser} from './browser';
export type {Action, Browser, Page} from './browser';

export {withContract} from './contract';
export {
  browserStoreMove,
  diffContent,
  renderDiff,
  storeMove,
  READ_CONTENT,
} from './store-move';
export {
  assertView,
  bundleOf,
  pageFor,
  renderHtml,
  renderMove,
  REFLECT_CHECKED,
} from './render-move';
export type {RenderResult} from './render-move';
export {applyMutant, mutantPath} from './mutant';
export {evidenceDir, examStem, writeEvidence} from './evidence';

// The verification host: one `celld dev` on a disposable copy of a server, and
// a client for the root's exam surface over it.
export {startCelld} from './celld';
export type {Celld, CelldOptions, CelldSpawn} from './celld';
export {examSurface} from './surface';
export type {Events, ExamSurface, Transition} from './surface';
