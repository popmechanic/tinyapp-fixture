import './filterBar.css';
import {setFilter} from './storeData';
import {STORE_ID, useStore, useValue, type TodosStore} from './Store';
import {FILTERS, filterOf} from './todoFilter';

// The three names are `todoFilter`'s; what they read as is the bar's own
// business, so the labels live here and the names stay shared.
const LABELS = {all: 'All', open: 'Open', done: 'Done'} as const;

export const FilterBar = () => {
  const store = useStore(STORE_ID) as TodosStore | undefined;
  // A store that was never filtered carries no `filter` value at all, and
  // `filterOf` reads that — as it reads anything it does not recognise — as All.
  const filter = filterOf(useValue('filter', STORE_ID));

  return (
    <div id="filterBar">
      {FILTERS.map((name) => (
        <button
          key={name}
          id={`filter-${name}`}
          type="button"
          data-active={filter === name ? 'true' : 'false'}
          onClick={() => {
            if (store) {
              setFilter(store, name);
            }
          }}
        >
          {LABELS[name]}
        </button>
      ))}
    </div>
  );
};
