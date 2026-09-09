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
    <button id="clearCompleted" type="button" onClick={handleClearCompleted}>
      Clear completed
    </button>
  );
};
