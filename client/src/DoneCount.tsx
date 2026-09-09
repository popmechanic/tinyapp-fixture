import {STORE_ID, useTable} from './Store';
import {countTodos} from './todoCounts';

export const DoneCount = () => {
  const table = useTable('todos', STORE_ID);
  const {done, total} = countTodos(table);

  return (
    <span id="doneCount">
      {done} of {total} done
    </span>
  );
};
