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

export const TodoItem = ({rowId}: {rowId: string}) => {
  const todo = useRow('todos', rowId, STORE_ID) as TodoRow;
  const store = useStore(STORE_ID) as TodosStore | undefined;

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
    <div className={`todoItem${todo.completed ? ' completed' : ''}`}>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={handleToggle}
        id={`todo-${rowId}`}
      />
      <label htmlFor={`todo-${rowId}`}>{todo.text}</label>

      <Button onClick={handleDelete}>Delete</Button>
    </div>
  );
};
