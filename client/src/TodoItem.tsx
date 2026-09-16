import './todoItem.css';
import {
  deleteTodo,
  setTodoCompleted,
  useRow,
  useStore,
  type TodoRow,
  type TodosStore,
  STORE_ID,
} from './Store';
import {Button} from './Button';
import {DueInput} from './DueInput';
import {isOverdue} from './overdue';
export const TodoItem = ({rowId}: {rowId: string}) => {
  const todo = useRow('todos', rowId, STORE_ID) as TodoRow;
  const store = useStore(STORE_ID) as TodosStore | undefined;

  // "Now" is the page's own clock: an exam pins `Date` before a line of the app
  // runs, so this reads the exam's instant there and the wall clock elsewhere.
  const overdue = isOverdue(todo, new Date());

  const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (store) {
      setTodoCompleted(store, rowId, e.target.checked);
    }
  };

  const handleDelete = () => {
    if (store) {
      deleteTodo(store, rowId);
    }
  };

  return (
    // `data-overdue` is written on both branches, so a view can assert the
    // `"false"` case with `attr` rather than having to spell it as an absence.
    <div
      className={`todoItem${todo.completed ? ' completed' : ''}${
        overdue ? ' overdue' : ''
      }`}
      data-overdue={overdue ? 'true' : 'false'}
    >
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={handleToggle}
        id={`todo-${rowId}`}
      />
      <label htmlFor={`todo-${rowId}`}>{todo.text}</label>
      {/* `due` is optional on `TodoRow` — a todo with no date has no cell. */}
      <DueInput rowId={rowId} due={todo.due ?? ''} />

      <Button onClick={handleDelete}>Delete</Button>
    </div>
  );
};
