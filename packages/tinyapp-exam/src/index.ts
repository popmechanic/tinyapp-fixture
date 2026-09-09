/**
 * `tinyapp-exam` — a state exam is one call: a seed, an action, the state the
 * examiner expects, a view of the page it paints and the mutant it must notice.
 *
 * The whole vocabulary is re-exported here, so a test file imports the package
 * and nothing deeper.
 */

export {runStateExam, stateExam} from './state-exam';
export type {ExamOptions, ExamOutcome} from './state-exam';

export {withContract} from './contract';
export {diffContent, renderDiff, storeMove} from './store-move';
export {assertView, renderHtml, renderMove} from './render-move';
export type {RenderResult} from './render-move';
export {applyMutant, mutantPath} from './mutant';
export {evidenceDir, examStem, writeEvidence} from './evidence';

export {VALUES_TABLE} from './types';
export type {
  Cell,
  Difference,
  ExamRecord,
  ExamStore,
  MutantEdit,
  Snapshot,
  StateExamSpec,
  Tables,
  Values,
  View,
} from './types';
