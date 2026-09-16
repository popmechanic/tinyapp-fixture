import {Button} from '@/components/ui/button';

import {useStore, type TodosStore, STORE_ID} from './Store';
import {clearCompleted} from './storeData';

export const ClearCompleted = () => {
  const store = useStore(STORE_ID) as TodosStore | undefined;

  const handleClearCompleted = () => {
    if (store) {
      clearCompleted(store);
    }
  };

  return (
    <Button
      id="clearCompleted"
      variant="outline"
      className="mt-4"
      onClick={handleClearCompleted}
    >
      Clear completed
    </Button>
  );
};
