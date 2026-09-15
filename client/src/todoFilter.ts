// Which rows a filter admits. The three names are the one literal this plan
// shares across its tasks, so they live here and nothing else spells them out;
// the module imports nothing, so the store and this predicate stay apart.

export const FILTERS = ['all', 'open', 'done'] as const;

export type Filter = (typeof FILTERS)[number];

// A case-sensitive membership test: anything the app does not recognise —
// a store that was never filtered, a stray value, a different casing — is
// read as 'all'.
export const filterOf = (value: unknown): Filter =>
  (FILTERS as readonly unknown[]).includes(value) ? (value as Filter) : 'all';

// Takes a boolean and never a row: a `completed` cell that a row lacks is
// read by the caller as `row.completed === true`.
export const admits = (filter: Filter, completed: boolean): boolean =>
  filter === 'all' || (filter === 'done') === completed;
