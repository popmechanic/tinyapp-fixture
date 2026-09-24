import {Input} from '@/components/ui/input';

import {useStore, useValue, STORE_ID, type TodosStore} from './Store';
import {setSearch} from './storeData';
import {searchOf} from './todoSearch';

/**
 * The one search box above the list, controlled by the store rather than by
 * local state: every keystroke is a store write (`setSearch`), and the box
 * reads back exactly what the store holds (`searchOf`). No form, no button —
 * there is nothing to commit, so there is nothing to submit.
 */
export const SearchBox = () => {
  const store = useStore(STORE_ID) as TodosStore | undefined;

  return (
    <Input
      type="search"
      id="searchBox"
      aria-label="Search todos"
      placeholder="Search todos"
      value={searchOf(useValue('search', STORE_ID))}
      onChange={(e) => store && setSearch(store, e.target.value)}
      className="mb-4 w-full"
    />
  );
};
