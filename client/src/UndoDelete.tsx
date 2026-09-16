import {useStore, useTable, type TodosStore, STORE_ID} from './Store';
import {undoDelete} from './storeData';

export const UndoDelete = () => {
  const store = useStore(STORE_ID) as TodosStore | undefined;
  const trash = useTable('trash', STORE_ID);

  const handleUndoDelete = () => {
    if (store) {
      undoDelete(store);
    }
  };

  // The button exists only while a deleted todo waits: `undoDelete` empties
  // `trash` in the same transaction that puts the row back, so the press that
  // restores the todo is also what takes the button away.
  if (Object.keys(trash).length === 0) {
    return null;
  }

  // `type` before `id`, unlike `ClearCompleted`: React emits attributes in JSX
  // order, and this is the order the markup the task quotes is written in.
  return (
    <button type="button" id="undoDelete" onClick={handleUndoDelete}>
      Undo
    </button>
  );
};
