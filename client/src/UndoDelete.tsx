import {Button} from '@/components/ui/button';

import {useStore, useTable, type TodosStore, STORE_ID} from './Store';
import {undoDelete} from './storeData';

export const UndoDelete = () => {
  const store = useStore(STORE_ID) as TodosStore | undefined;
  // The button exists only while a delete is waiting to be taken back: an
  // empty `trash` renders nothing at all, and `undoDelete` empties the table,
  // so pressing Undo is what makes the button go away.
  const trash = useTable('trash', STORE_ID);

  const handleUndoDelete = () => {
    if (store) {
      undoDelete(store);
    }
  };

  if (Object.keys(trash).length === 0) {
    return null;
  }

  return (
    <Button
      id="undoDelete"
      variant="outline"
      className="mt-4 ml-2"
      onClick={handleUndoDelete}
    >
      Undo
    </Button>
  );
};
