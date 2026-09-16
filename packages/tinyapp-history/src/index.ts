/**
 * `tinyapp-history` — a session of the app recorded into a DoltLite file, read
 * back as candidate exams, and one of them promoted into an exam that runs.
 *
 * The whole vocabulary is re-exported here, so a caller imports the package and
 * nothing deeper. The re-exports are named rather than starred: `DiffRow` and
 * `LogEntry` are spelled by more than one module — each writes against the
 * columns it reads and imports no sibling for them — so the names are taken
 * from `./history`, the module that actually queries DoltLite for those rows.
 */

export {
  messageOf,
  openHistory,
  recordSession,
  SCHEMA_SQL,
} from './history';
export type {
  Callbacks,
  DiffRow,
  History,
  LogEntry,
  Recorded,
} from './history';

export {listTransitions, parseMessage, renderTransitions} from './transitions';
export type {HistoryReader, Transition} from './transitions';

export {editOf, mutantOf} from './mutant';

export {examText, promote, promotedPaths, snapshotText} from './promote';
export type {Promoted} from './promote';

export {CALLBACKS, CLOCK, recordFixtureSession, SESSION} from './session';
export type {SessionCall} from './session';
