import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';

import {
  deleteTodo,
  pinTodo,
  setTodoCompleted,
  useRow,
  useStore,
  type TodoRow,
  type TodosStore,
  STORE_ID,
} from './Store';
import {DueInput} from './DueInput';
import {isOverdue} from './overdue';
export const TodoItem = ({rowId}: {rowId: string}) => {
  const todo = useRow('todos', rowId, STORE_ID) as TodoRow;
  const store = useStore(STORE_ID) as TodosStore | undefined;

  // "Now" is the page's own clock: an exam pins `Date` before a line of the app
  // runs, so this reads the exam's instant there and the wall clock elsewhere.
  const overdue = isOverdue(todo, new Date());

  const handleToggle = (checked: boolean) => {
    if (store) {
      setTodoCompleted(store, rowId, checked);
    }
  };

  const handleDelete = () => {
    if (store) {
      deleteTodo(store, rowId);
    }
  };

  // `pinned` is optional on `TodoRow`, like `due`: an unpinned todo has no
  // cell at all, so the absence reads as `false` here rather than anywhere
  // downstream.
  const pinned = todo.pinned === true;

  const handlePin = () => {
    if (store) {
      pinTodo(store, rowId, !pinned);
    }
  };

  return (
    // The three states `todoItem.css` carried as classes are three `data-*`
    // attributes, written on both branches so a view can assert the `"false"`
    // case with `attr` rather than having to spell it as an absence — and the
    // row is the `group` the text below reads its strike-through and its
    // overdue colour off, so the marks are Tailwind variants rather than
    // classes of our own.
    <li
      data-completed={todo.completed ? 'true' : 'false'}
      data-overdue={overdue ? 'true' : 'false'}
      data-pinned={pinned ? 'true' : 'false'}
      className="group flex items-center gap-3 border-b border-border p-3 last:border-b-0"
    >
      {/* `render` is what puts the row's id on the checkbox *root* — the
          `<span role="checkbox">` an exam names and a view reads `aria-checked`
          off. Passed as a plain `id` it would land on base-ui's visually hidden
          `<input>` instead, which is `aria-hidden` and carries no role. A
          `<label htmlFor>` would name a native input and gives a span nothing,
          so the name is the todo's own text as `aria-label`. */}
      <Checkbox
        render={<span id={`todo-${rowId}`} />}
        aria-label={todo.text}
        checked={todo.completed}
        onCheckedChange={handleToggle}
      />
      <span className="flex-1 select-none group-data-[completed=true]:line-through group-data-[completed=true]:opacity-60 group-data-[overdue=true]:text-primary">
        {todo.text}
      </span>
      {/* `due` is optional on `TodoRow` — a todo with no date has no cell. */}
      <DueInput rowId={rowId} due={todo.due ?? ''} todoText={todo.text} />

      {/* Two rows would otherwise carry two buttons both named `Delete`, and a
          role-and-name locator picks the first in tree order: the row's own
          text is what makes each name reach one button. */}
      <Button
        variant="outline"
        size="sm"
        aria-label={`Delete ${todo.text}`}
        onClick={handleDelete}
      >
        Delete
      </Button>
      <Button
        id={`pin-${rowId}`}
        variant="outline"
        size="sm"
        aria-label={`${pinned ? 'Unpin' : 'Pin'} ${todo.text}`}
        onClick={handlePin}
      >
        {pinned ? 'Unpin' : 'Pin'}
      </Button>
    </li>
  );
};
