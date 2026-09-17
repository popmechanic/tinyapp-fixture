import {useSortedRowIds, useTable, useValue, STORE_ID} from './Store';
import {TodoItem} from './TodoItem';
import {ClearCompleted} from './ClearCompleted';
import {UndoDelete} from './UndoDelete';
import {FilterBar} from './FilterBar';
import {admits, filterOf} from './todoFilter';
import {activeTag, hasTag, tagsInUse} from './todoTags';

export const TodoList = () => {
  const todoIds = useSortedRowIds(
    'todos',
    undefined,
    false,
    0,
    undefined,
    STORE_ID,
  );
  const table = useTable('todos', STORE_ID);
  const filter = filterOf(useValue('filter', STORE_ID));
  // Read against the tags actually in use, so a `tag` no row carries any more
  // reads as no tag filter and never strands the list behind an empty one.
  const tag = activeTag(useValue('tag', STORE_ID), tagsInUse(table));
  // The two filters compose — a row has to be admitted by the status choice and
  // to carry the chosen tag — and both hide rows from the list and from nothing
  // else: the counter in the top bar goes on reading the whole table.
  const shown = todoIds.filter(
    (id) =>
      admits(filter, table[id]?.completed === true) &&
      hasTag(table[id]?.tags, tag),
  );
  // Pinned rows to the top, and nothing else moved: `sort` is stable, so the
  // rows that share a group keep the ascending-by-row-id order `todoIds` gave
  // them. `pinned` has no schema default — an unpinned todo has no such cell —
  // so the read is `=== true` rather than a truthiness test.
  const ordered = [...shown].sort(
    (a, b) =>
      Number(table[b]?.pinned === true) - Number(table[a]?.pinned === true),
  );

  return (
    <>
      {/* Mounted once, here, because both `App` and `StaticPage` render
          `TodoList` — so the live page and the linter's static render carry
          the bar by this one line. */}
      <FilterBar />
      {/* `todoList.css` drew the empty list's "No todos yet" line with
          `#todoList:empty::before`. A pseudo-element is not a class Tailwind
          generates, so the line is an element now, rendered only when the
          shown list is empty and rendered *beside* the list rather than in it:
          `#todoList` is still exactly one element, and `#todoList li` is still
          absent, which is what the empty-list exam reads. `empty:hidden` is
          what keeps the box itself from showing as an empty frame above it. */}
      <ul
        id="todoList"
        className="m-0 w-full list-none overflow-hidden rounded-md border border-border bg-card p-0 empty:hidden"
      >
        {ordered.map((id) => (
          <TodoItem key={id} rowId={id} />
        ))}
      </ul>
      {ordered.length === 0 ? (
        <p
          id="todoListEmpty"
          className="m-0 w-full rounded-md border border-border bg-card p-8 text-center text-muted-foreground"
        >
          No todos yet. Add one above!
        </p>
      ) : null}
      <ClearCompleted />
      {/* Renders nothing while the trash is empty, so the page carries an Undo
          button only between a delete and the press that takes it back. */}
      <UndoDelete />
    </>
  );
};
