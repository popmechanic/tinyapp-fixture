import {Button} from '@/components/ui/button';

import {setFilter, setTagFilter} from './storeData';
import {STORE_ID, useStore, useTable, useValue, type TodosStore} from './Store';
import {FILTERS, filterOf} from './todoFilter';
import {activeTag, tagsInUse} from './todoTags';

// The three names are `todoFilter`'s; what they read as is the bar's own
// business, so the labels live here and the names stay shared. A label is also
// the button's accessible name, which is how an exam reaches it.
const LABELS = {all: 'All', open: 'Open', done: 'Done'} as const;

export const FilterBar = () => {
  const store = useStore(STORE_ID) as TodosStore | undefined;
  // A store that was never filtered carries no `filter` value at all, and
  // `filterOf` reads that — as it reads anything it does not recognise — as All.
  const filter = filterOf(useValue('filter', STORE_ID));
  // One chip per tag any todo is using, alphabetical, and none at all while
  // nothing is tagged. The chosen tag is read against that list rather than
  // taken as stored, so a `tag` no row carries any more is no filter at all.
  const inUse = tagsInUse(useTable('todos', STORE_ID));
  const tag = activeTag(useValue('tag', STORE_ID), inUse);

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
      {/* The chips sit inside the bar, and the span is rendered whether or not
          there is a chip in it: an untagged list paints `#tagChips` and nothing
          under it, so the exams that pin `#filterBar button` at three over an
          untagged state go on reading three. */}
      <span id="tagChips" className="flex gap-2">
        {inUse.map((name) => (
          // The accessible name is `Tag <tag>` rather than the tag itself, so a
          // todo tagged `Open` never gives its chip the Open button's name. The
          // visible text is the bare tag; `data-tag` is what a view selects on.
          <Button
            key={name}
            data-tag={name}
            aria-label={`Tag ${name}`}
            variant={tag === name ? 'default' : 'outline'}
            data-active={tag === name ? 'true' : 'false'}
            onClick={() => {
              if (store) {
                // A second click on the pressed chip clears the filter: `''` is
                // what tells `setTagFilter` to delete the value.
                setTagFilter(store, tag === name ? '' : name);
              }
            }}
          >
            {name}
          </Button>
        ))}
      </span>
    </div>
  );
};
