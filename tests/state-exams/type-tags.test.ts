/**
 * Exam for Task 1 — "The tags box in the row — typed, entered, carried".
 *
 * `tests/state-exams/type-due-date.test.ts` in shape: the file's whole state
 * exam is the single `stateExam({…})` in it, declared first, and every other
 * leg is an ordinary `bun:test` block beside it. One test per thing a leg
 * asserts — and, where a leg says "one test per row", one test per row — so
 * that a red run names the case rather than the file:
 *
 *   (a) [M1] the one `stateExam` of the file: on the page over
 *            `state-exams/seeds/two-open-todos.json`, typing `home, urgent`
 *            into the textbox named `Tags for walk the dog` and then pressing
 *            `Enter` on it reaches
 *            `state-exams/expected/two-todos-second-tagged.json`, the page then
 *            shows `#tags-1` at `home,urgent`, `#tags-0` empty, `#taggedCount`
 *            once reading `1 tagged` and two `#todoList li`, and the mutant
 *            that drops the `tags` cell the typing put there is killed — plus
 *            the expected file's own content, pinned against the M1 literal
 *            written out below;
 *   (b) [M2] the static markup `renderStatic` paints over that expected
 *            content, per row `0` and `1`: exactly one `#tags-N` in the row and
 *            it is an `input` with `type="text"` and `data-slot="input"`; its
 *            `placeholder`; its `aria-label`; its `value`; and the document
 *            order `#due-N` → `#tags-N` → the `Delete ` button;
 *   (c) [M3] `TagsInput` rendered for row `1` under a `Provider` over a
 *            `createTodosStore()` holding the expected content, read after each
 *            of its four steps in order: mounted, typed, entered, cleared.
 *
 * M4's leg (d) is the Proof's own `Run:` line, the one over
 * `tests/state-exams/type-due-date.test.ts`. It is not encoded here and must not
 * be: an exam proves its own claim through imports and calls and never spawns a
 * test runner or runs another exam, so that leg is graded by the run the driver
 * makes of that file on this tree, not by a child process started from this one.
 *
 * Five readings this file makes, written down because they are choices:
 *
 *   - Nothing imports `client/src/TagsInput.tsx` statically. It does not exist
 *     at BASE, and a static import of an absent module fails the whole file at
 *     load — legs (a) and (b) would then report that one import instead of the
 *     thing each is itself about. Leg (c) reaches it with a
 *     computed-specifier `await import(resolve(ROOT, …))` inside its own test
 *     body, the precedent `tests/state-exams/set-todo-tags.test.ts` set for
 *     `client/src/todoTags.ts`. `renderStatic` and `createTodosStore` do exist
 *     at BASE and are imported statically; the second is also what makes this
 *     an interaction exam that bundles at all.
 *   - Every fixture read and every render happens inside a test body, never at
 *     module level: the state linter's (`lint:state`) capture child imports this
 *     file with `stateExam` and `bun:test` stubbed out, so a `readFileSync`
 *     or `renderStatic` would surface as `capture failed` rather than as the
 *     finding it is. Nothing here opens a network or spawns a process.
 *   - A row is tied to its row id through the checkbox `id="todo-N"` the row
 *     already renders, found by `[role=checkbox]` rather than by a tag — the
 *     design system's checkbox is a `<span>` carrying that role, and the id is
 *     on it. Reading the id off the markup rather than assuming the row order
 *     is what makes the `#tags-0`/`#tags-1` pins below pins on *those rows*.
 *   - Leg (b)'s three ordering indices are each asserted `>= 0` before they are
 *     compared, so an element that is missing altogether says so rather than
 *     reading as `-1 < 3`.
 *   - Leg (c) registers `@happy-dom/global-registrator` inside its own test
 *     body and unregisters it in `finally` after a 25 ms drain, so leg (a)'s
 *     CDP driver — which runs first and uses the real `fetch` and `WebSocket` —
 *     never sees happy-dom's, and a red step still leaves the process clean.
 *     The box's value is set through the prototype's own `value` setter and an
 *     `input` event is dispatched: a plain `box.value = …` is swallowed by
 *     React's value tracker and fires no `onChange`.
 *
 * Measured at BASE (2026-09-17): `renderToStaticMarkup` emits `value=""` as a
 * real attribute for a controlled input whose value is the empty string, so
 * `#tags-0`'s empty value is read as an attribute and not as an absence — the
 * same reading `{attr: {name: 'value', value: ''}}` makes of the live page in
 * leg (a).
 */

import {readFileSync} from 'node:fs';
import {join, resolve} from 'node:path';

import {expect, test} from 'bun:test';
import {parse, type HTMLElement} from 'node-html-parser';
// A type-only import, so nothing is added to what this file loads at runtime.
import type {ComponentType} from 'react';

import {stateExam} from 'tinyapp-exam';

import {renderStatic} from '../../client/src/StaticPage';
import {
  createTodosStore,
  STORE_ID,
  type TodosContent,
} from '../../client/src/storeData';

// This file sits two directories below the repository root, which is also the
// test runner's cwd — the module and fixture reads are anchored there, and so
// are the repository-relative paths the state exam below names.
const ROOT = resolve(import.meta.dir, '..', '..');

/** The seed M1 acts on and M3's last step comes back to. */
const SEED = 'state-exams/seeds/two-open-todos.json';

/** The state M1 expects, which M2 renders and M3's store holds. */
const EXPECTED = 'state-exams/expected/two-todos-second-tagged.json';

/** The seed content M1 and M3 pin, written out. */
const TWO_OPEN_TODOS = [
  {
    todos: {
      '0': {text: 'buy milk', completed: false},
      '1': {text: 'walk the dog', completed: false},
    },
  },
  {},
];

/** The expected content M1 pins, written out — the seed plus row 1's tags. */
const SECOND_TAGGED = [
  {
    todos: {
      '0': {text: 'buy milk', completed: false},
      '1': {text: 'walk the dog', completed: false, tags: 'home,urgent'},
    },
  },
  {},
];

/** The accessible name the tags box carries in each row, by row id. */
const NAME_BY_ROW: Record<string, string> = {
  '0': 'Tags for buy milk',
  '1': 'Tags for walk the dog',
};

/** The value each row's tags box carries in the expected state, by row id. */
const TAGS_BY_ROW: Record<string, string> = {'0': '', '1': 'home,urgent'};

/** A checked-in snapshot, as the file parses. Read inside a test body only. */
const readJson = (path: string): TodosContent =>
  JSON.parse(readFileSync(join(ROOT, path), 'utf8')) as TodosContent;

/** A store's content as plain JSON, the shape a checked-in file parses to. */
const snapshot = (store: {getContent: () => unknown}): unknown =>
  JSON.parse(JSON.stringify(store.getContent()));

/**
 * The markup of the app over `EXPECTED`, rendered once.
 *
 * Lazily, and not at module load: a render that throws belongs inside the test
 * that asked for it, where the failure is reported beside its leg.
 */
let cached: HTMLElement | undefined;
const markup = (): HTMLElement =>
  (cached ??= parse(renderStatic(readJson(EXPECTED))));

/** Every row of that markup, in document order. */
const rows = (): HTMLElement[] => markup().querySelectorAll('#todoList li');

/** The row id a row carries, read off its checkbox's `id`. */
const rowIdOf = (row: HTMLElement): string => {
  const checkbox = row.querySelector('[role=checkbox]');
  const id = checkbox?.getAttribute('id') ?? '';
  return id.startsWith('todo-') ? id.slice('todo-'.length) : id;
};

/** The row of the markup whose checkbox names `rowId`. */
const rowOf = (rowId: string): HTMLElement => {
  const row = rows().find((candidate) => rowIdOf(candidate) === rowId);
  if (row === undefined) {
    throw new Error(`no row for ${rowId}`);
  }
  return row;
};

// --- (a) [M1]: typing the tags into the second row's box and pressing Enter ---

// Typing `home, urgent` into the second row's tags box and pressing Enter
// stores those two tags on row `1` and nothing else: the page still paints two
// rows, the first row's box is still empty, the second row's box shows the
// normalized `home,urgent` the cell now holds, and the count line says one todo
// is tagged. The mutant drops the `tags` cell the typing put there — an exam
// that did not actually store it would not tell the two apart.
stateExam({
  clock: '2026-01-01T00:00:00Z',
  entry: 'client/index.html',
  seed: SEED,
  store: () => createTodosStore(),
  action: [
    {type: [{role: 'textbox', name: 'Tags for walk the dog'}, 'home, urgent']},
    {key: [{role: 'textbox', name: 'Tags for walk the dog'}, 'Enter']},
  ],
  expected: EXPECTED,
  view: [
    {selector: '#tags-1', attr: {name: 'value', value: 'home,urgent'}},
    {selector: '#tags-0', attr: {name: 'value', value: ''}},
    {selector: '#taggedCount', count: 1, text: '1 tagged'},
    {selector: '#todoList li', count: 2},
  ],
  mutant: [{table: 'todos', row: '1', cell: 'tags', absent: true}],
});

test(`leg (a) [M1] ${EXPECTED} is exactly the content M1 names`, () => {
  // The state exam above names that file; this is what says the file is the
  // literal M1 spells out, so the expected state cannot drift from the clause.
  expect(readJson(EXPECTED)).toEqual(SECOND_TAGGED as unknown as TodosContent);
});

// --- (b) [M2]: the tags box in the static render of the expected state -------

test('leg (b) [M2] the two rows of the markup over the expected state are rows 0 and 1', () => {
  // The pins below are per row id; this is what says which ids there are.
  expect(rows().map(rowIdOf)).toEqual(['0', '1']);
});

for (const rowId of ['0', '1']) {
  test(`leg (b) [M2] row ${rowId} holds exactly one #tags-${rowId}, an input with type=text and data-slot=input`, () => {
    const found = rowOf(rowId).querySelectorAll(`#tags-${rowId}`);

    expect(found.length).toBe(1);
    expect(found[0]!.tagName.toLowerCase()).toBe('input');
    expect(found[0]!.getAttribute('type')).toBe('text');
    // The box is the design system's own `Input`, which says so with its slot.
    expect(found[0]!.getAttribute('data-slot')).toBe('input');
  });

  test(`leg (b) [M2] #tags-${rowId} is placeheld "tags, comma-separated"`, () => {
    const input = rowOf(rowId).querySelector(`#tags-${rowId}`);

    expect(input).not.toBeNull();
    expect(input!.getAttribute('placeholder')).toBe('tags, comma-separated');
  });

  test(`leg (b) [M2] #tags-${rowId} is named "${NAME_BY_ROW[rowId]}"`, () => {
    const input = rowOf(rowId).querySelector(`#tags-${rowId}`);

    expect(input).not.toBeNull();
    // Two rows are two names: this is what a role-and-name locator reaches.
    expect(input!.getAttribute('aria-label')).toBe(NAME_BY_ROW[rowId]);
  });

  test(`leg (b) [M2] #tags-${rowId} carries value=${JSON.stringify(TAGS_BY_ROW[rowId])}`, () => {
    const input = rowOf(rowId).querySelector(`#tags-${rowId}`);

    expect(input).not.toBeNull();
    expect(input!.getAttribute('value')).toBe(TAGS_BY_ROW[rowId]);
  });

  test(`leg (b) [M2] in row ${rowId}, #due-${rowId} comes before #tags-${rowId}, which comes before the Delete button`, () => {
    const elements = rowOf(rowId).querySelectorAll('*');
    const dueAt = elements.findIndex(
      (element) => element.getAttribute('id') === `due-${rowId}`,
    );
    const tagsAt = elements.findIndex(
      (element) => element.getAttribute('id') === `tags-${rowId}`,
    );
    const deleteAt = elements.findIndex((element) =>
      (element.getAttribute('aria-label') ?? '').startsWith('Delete '),
    );

    // Asserted first so that a missing element says it is missing, rather than
    // passing the comparison below as a `-1`.
    expect(dueAt).toBeGreaterThanOrEqual(0);
    expect(tagsAt).toBeGreaterThanOrEqual(0);
    expect(deleteAt).toBeGreaterThanOrEqual(0);

    expect(dueAt).toBeLessThan(tagsAt);
    expect(tagsAt).toBeLessThan(deleteAt);
  });
}

// --- (c) [M3]: TagsInput typed, entered and cleared over a live store --------

test('leg (c) [M3] TagsInput holds the cell, writes it on Enter only, and clears it on an empty Enter', async () => {
  const {GlobalRegistrator} = await import('@happy-dom/global-registrator');

  GlobalRegistrator.register();
  try {
    (globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT =
      true;

    const React = await import('react');
    const {act} = React;
    const {createRoot} = await import('react-dom/client');
    const UiReact = (await import('tinybase/ui-react/with-schemas')) as {
      Provider: ComponentType<Record<string, unknown>>;
    };
    // The module this task produces. See this file's header on the specifier.
    const {TagsInput} = (await import(
      resolve(ROOT, 'client/src/TagsInput.tsx')
    )) as {TagsInput: ComponentType<Record<string, unknown>>};

    const store = createTodosStore(readJson(EXPECTED));

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        React.createElement(
          UiReact.Provider,
          {storesById: {[STORE_ID]: store}},
          React.createElement(TagsInput, {
            rowId: '1',
            tags: 'home,urgent',
            todoText: 'walk the dog',
          }),
        ),
      );
    });

    const box = document.querySelector('#tags-1') as HTMLInputElement | null;
    expect(box).not.toBeNull();

    // Step one: mounted over the expected content, the box reads the cell.
    expect(box!.value).toBe('home,urgent');

    // The prototype's own setter, then a bubbling `input` event: React's value
    // tracker swallows a plain assignment and would fire no `onChange` at all.
    const typeInto = async (value: string) => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )!.set!;
      await act(async () => {
        setter.call(box!, value);
        box!.dispatchEvent(new Event('input', {bubbles: true}));
      });
    };

    const pressEnter = async () => {
      await act(async () => {
        box!.dispatchEvent(
          new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}),
        );
      });
    };

    // Step two: typing alone changes nothing — the cell is still what it was,
    // and the box shows the text as typed, spaces and all.
    await typeInto('home, urgent, work');
    expect(store.getCell('todos', '1', 'tags')).toBe('home,urgent');
    expect(box!.value).toBe('home, urgent, work');

    // Step three: Enter is the one commit gesture, and it commits the whole
    // text normalized — and the box then shows what the cell now holds.
    await pressEnter();
    expect(store.getCell('todos', '1', 'tags')).toBe('home,urgent,work');
    expect(box!.value).toBe('home,urgent,work');

    // Step four: clearing the box and pressing Enter takes the tags away —
    // the cell is gone, not emptied, so the store is the seed again. An
    // `if (text)` guard on the commit is the defect this step catches.
    await typeInto('');
    await pressEnter();
    expect(store.getCell('todos', '1', 'tags')).toBeUndefined();
    expect(readJson(SEED)).toEqual(TWO_OPEN_TODOS as unknown as TodosContent);
    expect(snapshot(store)).toEqual(readJson(SEED));

    await act(async () => {
      root.unmount();
    });
  } finally {
    // The last `root.unmount()` leaves one React scheduler macrotask queued,
    // whose first statement reads `window`. Let it drain before the DOM goes,
    // or it throws between files; no assertion above depends on this.
    await new Promise((done) => setTimeout(done, 25));
    GlobalRegistrator.unregister();
  }
});
