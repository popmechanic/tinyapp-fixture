import {Button} from '@/components/ui/button';

import {setSort} from './storeData';
import {STORE_ID, useStore, useValue, type TodosStore} from './Store';

// Sits outside `#filterBar`: `filter-bar.test.ts` and `filter-done.test.ts`
// pin `#filterBar button` at exactly three over untagged states, so a sort
// button inside that bar would turn both red.
export const SortBar = () => {
  const store = useStore(STORE_ID) as TodosStore | undefined;
  const active = useValue('sort', STORE_ID) === 'due';

  return (
    <div id="sortBar" className="mb-4 flex gap-2">
      <Button
        id="sort-due"
        aria-label="Sort by due date"
        variant={active ? 'default' : 'outline'}
        data-active={active ? 'true' : 'false'}
        onClick={() => {
          if (store) {
            setSort(store, active ? '' : 'due');
          }
        }}
      >
        Sort by due date
      </Button>
    </div>
  );
};
