import './todoList.css';
import {useSortedRowIds, useTable, useValue, STORE_ID} from './Store';
import {TodoItem} from './TodoItem';
import {ClearCompleted} from './ClearCompleted';
import {UndoDelete} from './UndoDelete';
import {FilterBar} from './FilterBar';
import {admits, filterOf} from './todoFilter';

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
  // The filter hides rows from the list and from nothing else: the counter in
  // the top bar goes on reading the whole table.
  const shown = todoIds.filter((id) => admits(filter, table[id]?.completed === true));

  return (
    <>
      {/* Mounted once, here, because both `App` and `StaticPage` render
          `TodoList` — so the live page and the linter's static render carry
          the bar by this one line. */}
      <FilterBar />
      <div id="todoList">
        {shown.map((id) => (
          <TodoItem key={id} rowId={id} />
        ))}
      </div>
      <ClearCompleted />
      {/* Renders nothing while the trash is empty, so the page carries an Undo
          button only between a delete and the press that takes it back. */}
      <UndoDelete />
    </>
  );
};
