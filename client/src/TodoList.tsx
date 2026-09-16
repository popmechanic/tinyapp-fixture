import './todoList.css';
import {useSortedRowIds, STORE_ID} from './Store';
import {TodoItem} from './TodoItem';
import {ClearCompleted} from './ClearCompleted';
import {UndoDelete} from './UndoDelete';

export const TodoList = () => {
  const todoIds = useSortedRowIds(
    'todos',
    undefined,
    false,
    0,
    undefined,
    STORE_ID,
  );

  return (
    <>
      <div id="todoList">
        {todoIds.map((id) => (
          <TodoItem key={id} rowId={id} />
        ))}
      </div>
      <ClearCompleted />
      <UndoDelete />
    </>
  );
};
