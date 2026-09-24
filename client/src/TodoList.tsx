import {useSortedRowIds, useTable, useValue, STORE_ID} from './Store';
import {TodoItem} from './TodoItem';
import {ClearCompleted} from './ClearCompleted';
import {UndoDelete} from './UndoDelete';
import {FilterBar} from './FilterBar';
import {SortBar} from './SortBar';
import {SearchBox} from './SearchBox';
import {admits, filterOf} from './todoFilter';
import {orderTodos} from './todoOrder';
import {activeTag, hasTag, tagsInUse} from './todoTags';
import {matchesSearch, searchOf} from './todoSearch';

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
  // Read once, outside the filter callback — hooks are not called inside
  // loops — the search text the box last wrote to the store.
  const search = searchOf(useValue('search', STORE_ID));
  // The filters compose — a row has to be admitted by the status choice, to
  // carry the chosen tag, and to match the search — and all three hide rows
  // from the list and from nothing else: the counter in the top bar goes on
  // reading the whole table.
  const shown = todoIds.filter(
    (id) =>
      admits(filter, table[id]?.completed === true) &&
      hasTag(table[id]?.tags, tag) &&
      matchesSearch(table[id]?.text, search),
  );
  // Pinned rows to the top, and — when the sort setting is on — the dated
  // rows above the undated ones within each group, soonest first.
  const ordered = orderTodos(shown, table, useValue('sort', STORE_ID));

  return (
    <>
      {/* Mounted once, here, because both `App` and `StaticPage` render
          `TodoList` — so the live page and the linter's static render carry
          the bar by this one line. */}
      <FilterBar />
      <SortBar />
      <SearchBox />
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
