import {
  createMergeableStore,
  type Content,
  type MergeableStore,
  type Row,
} from 'tinybase/with-schemas';

import {isIsoDate} from './overdue';
import {isNormalizedTags, normalizeTags, parseTags} from './todoTags';

// The cells of a todo, written once. `todos` and `trash` are both this literal,
// so a cell a later change adds to a todo is a cell of a trashed todo by
// construction — a deleted row is the row it was, not a hand-picked subset of
// it, whatever the schema grows to hold.
const TODO_CELLS = {
  text: {type: 'string', default: ''},
  completed: {type: 'boolean', default: false},
  // No default, deliberately: a cell with one is materialised into the
  // `getContent()` of every row TinyBase holds, which would write a `due`
  // into every seed and expected state already checked in. Without one, a
  // todo that has no date has no `due` cell at all.
  due: {type: 'string'},
  // No default either, and for `due`'s reason: a `pinned: false` materialised
  // into every row would rewrite all eighteen snapshots checked in before the
  // cell existed. A todo that is not pinned has no `pinned` cell at all.
  pinned: {type: 'boolean'},
  // The tags of a todo, as one string: the tags joined by `,` with no spaces,
  // no empty tag and no repeat, in the order they were typed. No default, for
  // `due`'s reason — a `tags: ''` materialised into every row would rewrite
  // every snapshot checked in before the cell existed. A todo with no tags has
  // no `tags` cell at all. `todoTags.ts` is the spelling; this is the type.
  tags: {type: 'string'},
} as const;

export const TABLES_SCHEMA = {
  todos: TODO_CELLS,
  // Where the last deleted todo waits. At most one row ever sits here — that
  // is `deleteTodo`'s contract, not the schema's: the linter's invariants are
  // per row and cannot speak about how many rows a table holds.
  trash: TODO_CELLS,
} as const;

// The chosen filter, and nowhere else. Deliberately no `default`: a default
// would put `{filter: 'all'}` into a store nobody has filtered, so every
// snapshot checked in beside the seeds would stop loading to itself. An absent
// value is how the app says All.
export const VALUES_SCHEMA = {
  filter: {type: 'string'},
  // The chosen tag filter: one tag, or absent. No default either, and for the
  // same reason — a store nobody has filtered by tag carries no `tag` value,
  // which is how the app says every tag.
  tag: {type: 'string'},
  // The chosen sort, or absent. No default, for `filter` and `tag`'s reason —
  // a default would materialise `{sort: ...}` into every store's
  // `getContent()`, rewriting every snapshot checked in before this value
  // existed. An absent value is how the app says unsorted.
  sort: {type: 'string'},
} as const;

// What every row of a table must satisfy, whoever wrote the row: the UI, an
// exam's seed, or an expected state checked in beside it. The schema says what
// a cell is; an invariant says what a row means, and carries the sentence to
// say when a row stops meaning it.
export type Invariant = {
  table: keyof typeof TABLES_SCHEMA;
  predicate: (row: Record<string, string | number | boolean>, rowId: string) => boolean;
  message: string;
};

export const INVARIANTS: Invariant[] = [
  {
    table: 'todos',
    predicate: (row) =>
      row.completed !== true || (typeof row.text === 'string' && row.text !== ''),
    message: 'a completed todo has non-empty text',
  },
  // Appended, never inserted: the linter's own exam reads the entry above as
  // `INVARIANTS[0]`. An absent `due` satisfies this one, which is what keeps
  // every row written before the cell existed a row that still holds.
  {
    table: 'todos',
    predicate: (row) =>
      row.due === undefined || (typeof row.due === 'string' && isIsoDate(row.due)),
    message: 'a due date is absent or a valid YYYY-MM-DD',
  },
  // A trashed todo is a todo: the row `deleteTodo` copies across is the row it
  // was, so the rule about what a completed todo means goes on holding while
  // it waits. Appended for the same reason as the entry above.
  {
    table: 'trash',
    predicate: (row) =>
      row.completed !== true || (typeof row.text === 'string' && row.text !== ''),
    message: 'a completed todo in the trash has non-empty text',
  },
  // Appended for the same reason as the two above. An absent `tags` satisfies
  // it, so every row written before the cell existed is a row that still
  // holds; a row that has the cell holds only if the cell is what
  // `normalizeTags` would have written — no blanks, no spaces, no repeats.
  {
    table: 'todos',
    predicate: (row) =>
      row.tags === undefined ||
      (typeof row.tags === 'string' && isNormalizedTags(row.tags)),
    message: 'tags are absent or a comma-joined list of distinct non-empty tags',
  },
];

export type TodoRow = Row<typeof TABLES_SCHEMA, 'todos'>;

export type Schemas = [typeof TABLES_SCHEMA, typeof VALUES_SCHEMA];

export type TodosStore = MergeableStore<Schemas>;

export type TodosContent = Content<Schemas>;

export const STORE_ID = 'todos';

// The handles a page hands *out*, declared beside the store they belong to.
// (The three a harness sets *into* a page — `__TINYAPP_SEED__`,
// `__TINYAPP_EXAM__` and `__TINYAPP_SYNC__` — are declared in `vite-env.d.ts`.)
//
// The seeded page hands its store back the way it was handed its seed: on
// `window`, under a name the exam knows. A normal page leaves no such handle,
// so the two are told apart by its absence and not by its contents. A page
// flying the exam flag hands over the same handle unseeded, plus the SQLite
// database it opened and — once it has loaded what it persisted — its
// persister; `Store.tsx` is what writes those two.
declare global {
  interface Window {
    __TINYAPP_STORE__?: TodosStore;
    __TINYAPP_DB__?: unknown;
    __TINYAPP_PERSISTER__?: unknown;
  }
}

const exposeStore = (store: TodosStore | undefined): void => {
  if (typeof window === 'undefined') {
    return;
  }
  if (store === undefined) {
    delete window.__TINYAPP_STORE__;
  } else {
    window.__TINYAPP_STORE__ = store;
  }
};

export const createTodosStore = (seed?: TodosContent): TodosStore => {
  const store = createMergeableStore()
    .setTablesSchema(TABLES_SCHEMA)
    .setValuesSchema(VALUES_SCHEMA)
    .setDefaultContent([
      {
        todos: {
          '1': {text: 'Learn TinyBase', completed: false},
          '2': {text: 'Build an app', completed: false},
        },
      },
      {},
    ]);
  const created: TodosStore = seed === undefined ? store : store.setContent(seed);
  // A seeded store is exposed as it always was, flag or no flag; an unseeded
  // one under the exam flag, and — since the sync handle — under that too, so
  // an exam that points the page at its own runtime can read the very store
  // the synchronizer syncs. Creating an unexposed store on a page that once
  // held one clears the handle rather than leaving a stale one.
  const exposed =
    seed !== undefined || readExamFlag() || readSyncOrigin() !== undefined;
  exposeStore(exposed ? created : undefined);
  return created;
};

// The three mutations below are the single code path shared by the UI's
// buttons and by any headless caller (an exam, the seeded snapshot page).

export const addTodo = (store: TodosStore, text: string): string | undefined => {
  const trimmed = text.trim();
  return trimmed === ''
    ? undefined
    : store.addRow('todos', {text: trimmed, completed: false});
};

export const setTodoCompleted = (
  store: TodosStore,
  id: string,
  completed: boolean,
): void => {
  store.setPartialRow('todos', id, {completed});
};

/**
 * Sets row `id`'s due date, or clears it when `due` is `''`.
 *
 * Nothing but a real `YYYY-MM-DD` is ever written: a date that does not parse
 * is refused outright rather than stored and reported later, so the invariant
 * above only ever has to speak about a state that arrived some other way — a
 * hand-written seed, or an expected file.
 */
export const setTodoDue = (store: TodosStore, id: string, due: string): void => {
  if (due === '') {
    store.delCell('todos', id, 'due');
  } else if (isIsoDate(due)) {
    store.setPartialRow('todos', id, {due});
  }
};

/**
 * Pins todo `id`, or unpins it.
 *
 * Unpinning deletes the cell rather than writing `false`, so a todo that has
 * been pinned and unpinned is byte for byte the todo it was — the shape every
 * snapshot checked in before the cell existed still has. A `delCell` of a cell
 * that is not there is a no-op, so unpinning an unpinned todo is one too.
 *
 * An id the list does not hold is left alone: `setPartialRow` on a missing row
 * would create a phantom row out of the schema's defaults rather than fail.
 */
export const pinTodo = (store: TodosStore, id: string, pinned: boolean): void => {
  if (!store.hasRow('todos', id)) {
    return;
  }
  if (pinned) {
    store.setPartialRow('todos', id, {pinned: true});
  } else {
    store.delCell('todos', id, 'pinned');
  }
};

/**
 * Sets todo `id`'s tags from what was typed, or clears them when it names none.
 *
 * `text` is whatever a reader typed — `'home, urgent'`, `' , '`, a repeat — and
 * what is stored is `normalizeTags` of it, so the cell only ever holds the tidy
 * list the invariant beside the schema asks for. Clearing deletes the cell
 * rather than writing `''`, so a todo that has been tagged and untagged is byte
 * for byte the todo it was, exactly as unpinning leaves it.
 *
 * An id the list does not hold is left alone, for `pinTodo`'s reason:
 * `setPartialRow` on a missing row would create a phantom row out of the
 * schema's defaults rather than fail.
 */
export const setTodoTags = (store: TodosStore, id: string, text: string): void => {
  if (!store.hasRow('todos', id)) {
    return;
  }
  const tags = normalizeTags(text);
  if (tags === '') {
    store.delCell('todos', id, 'tags');
  } else {
    store.setPartialRow('todos', id, {tags});
  }
};

/**
 * Chooses the tag to filter by, or clears the choice when `tag` is `''`.
 *
 * Only a single already-normalized tag is ever written: `'home,urgent'` is two
 * tags and not one, and `' home'` is a tag nobody typed that way, so both leave
 * the store exactly as it was rather than being tidied into something the
 * caller did not ask for.
 *
 * The tag is deliberately *not* checked against the table — a filter on a tag
 * no row carries any more is `activeTag`'s business, which reads a stale filter
 * as no filter, so a tag that goes out of use never strands the list.
 */
export const setTagFilter = (store: TodosStore, tag: string): void => {
  if (tag === '') {
    store.delValue('tag');
    return;
  }
  const tags = parseTags(tag);
  if (tags.length === 1 && tags[0] === tag) {
    store.setValue('tag', tag);
  }
};

/**
 * Moves todo `id` out of the list and into the trash, whole.
 *
 * One transaction, so no listener ever sees the row in neither table or in
 * both. The `delTable` comes first: the trash holds the last delete and only
 * that one, so a second Delete replaces what was waiting rather than piling up
 * beside it. An id the list does not hold is left alone — nothing is deleted,
 * so nothing goes to the trash and whatever was waiting there stays.
 */
export const deleteTodo = (store: TodosStore, id: string): void => {
  store.transaction(() => {
    if (!store.hasRow('todos', id)) {
      return;
    }
    store.delTable('trash');
    store.setRow('trash', id, store.getRow('todos', id));
    store.delRow('todos', id);
  });
};

/**
 * Puts the waiting todo back under the id it had, exactly as it was.
 *
 * With nothing waiting the loop body never runs, so an undo on an empty trash
 * leaves the store untouched rather than writing an empty table into it.
 */
export const undoDelete = (store: TodosStore): void => {
  store.transaction(() => {
    store.getRowIds('trash').forEach((id) => {
      store.setRow('todos', id, store.getRow('trash', id));
      store.delRow('trash', id);
    });
  });
};

export const clearCompleted = (store: TodosStore): void => {
  store.transaction(() => {
    store.getRowIds('todos').forEach((id) => {
      if (store.getCell('todos', id, 'completed') === true) {
        store.delRow('todos', id);
      }
    });
  });
};

// The three names the app knows, spelled here once. The schema says `filter`
// holds a string, so it would take `'bogus'` without complaint — this guard is
// what refuses it, and an unknown name leaves the store exactly as it was.
export const setFilter = (store: TodosStore, filter: string): void => {
  if (filter === 'all' || filter === 'open' || filter === 'done') {
    store.setValue('filter', filter);
  }
};

/**
 * Chooses the sort, or clears it when `sort` is `''`.
 *
 * `''` deletes the value rather than writing it, so an unsorted store is byte
 * for byte the store it was before this value existed — exactly as
 * `setFilter` leaves an unrecognised name alone rather than storing it.
 */
export const setSort = (store: TodosStore, sort: string): void => {
  if (sort === '') {
    store.delValue('sort');
  } else if (sort === 'due') {
    store.setValue('sort', 'due');
  }
};

// A rendered snapshot page hands its starting state over on `window`; outside
// a browser (or without a seed) there is simply none.
export const readSeed = (): TodosContent | undefined =>
  typeof window === 'undefined' ? undefined : window.__TINYAPP_SEED__;

/**
 * Whether this page was opened by an exam, which is the one thing that makes it
 * hand its own innards over.
 *
 * Read exactly like `readSeed`, and as narrowly: only the literal `true` raises
 * the flag, so a page that happens to carry the name under some other value is
 * the normal page it was. Outside a browser there is no flag at all — the
 * linter imports this module under Bun, where `window` is undefined.
 */
export const readExamFlag = (): boolean =>
  typeof window === 'undefined' ? false : window.__TINYAPP_EXAM__ === true;

/**
 * The origin an exam handed in for this page to sync to, or none.
 *
 * A third mode beside the seed and the exam flag: an ordinary, unseeded,
 * unflagged page that starts both its links as usual, but dials the origin it
 * was given rather than the built-in server. Read exactly like the other two,
 * and as narrowly — only a WebSocket origin counts, so a page carrying the name
 * under an `http://` URL, a number or `''` is the normal page it was, and
 * outside a browser (the linter imports this module under Bun) there is no
 * handle at all.
 *
 * `config.ts` is what turns the origin into the URL a module is synced at.
 */
export const readSyncOrigin = (): string | undefined => {
  if (typeof window === 'undefined') {
    return undefined;
  }
  const origin = window.__TINYAPP_SYNC__;
  return typeof origin === 'string' &&
    (origin.startsWith('ws://') || origin.startsWith('wss://'))
    ? origin
    : undefined;
};
