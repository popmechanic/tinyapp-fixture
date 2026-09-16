import {Button} from '@/components/ui/button';

import {setFilter} from './storeData';
import {STORE_ID, useStore, useValue, type TodosStore} from './Store';
import {FILTERS, filterOf} from './todoFilter';

// The three names are `todoFilter`'s; what they read as is the bar's own
// business, so the labels live here and the names stay shared. A label is also
// the button's accessible name, which is how an exam reaches it.
const LABELS = {all: 'All', open: 'Open', done: 'Done'} as const;

export const FilterBar = () => {
  const store = useStore(STORE_ID) as TodosStore | undefined;
  // A store that was never filtered carries no `filter` value at all, and
  // `filterOf` reads that — as it reads anything it does not recognise — as All.
  const filter = filterOf(useValue('filter', STORE_ID));

  return (
    <div id="filterBar" className="mb-4 flex gap-2">
      {FILTERS.map((name) => (
        // The pressed look is the component's own `default` variant against
        // `outline`, not a class computed here: `filterBar.css` painted it with
        // a rule on `[data-active="true"]`, and the attribute stays for the
        // exams that read the state off the markup.
        <Button
          key={name}
          id={`filter-${name}`}
          variant={filter === name ? 'default' : 'outline'}
          data-active={filter === name ? 'true' : 'false'}
          onClick={() => {
            if (store) {
              setFilter(store, name);
            }
          }}
        >
          {LABELS[name]}
        </Button>
      ))}
    </div>
  );
};
