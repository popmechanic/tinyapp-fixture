import * as UiReact from 'tinybase/ui-react/with-schemas';
import {createMergeableStore} from 'tinybase/with-schemas';
import {renderToStaticMarkup} from 'react-dom/server';

import {
  STORE_ID,
  TABLES_SCHEMA,
  type Schemas,
  type TodosContent,
  type TodosStore,
} from './storeData';
import {TodoInput} from './TodoInput';
import {TodoList} from './TodoList';
import {TopBar} from './TopBar';

// The same `Provider` cast `Store.tsx` makes: `tinybase/ui-react/with-schemas`
// is schema-agnostic until it is told which schemas it is providing for.
const {Provider} = UiReact as UiReact.WithSchemas<Schemas>;

/**
 * The app as one page over a store that is already made — `App.tsx` without
 * `Store`, `Loading` and `Inspector`.
 *
 * Those three are the parts that reach outside the process: the persister, the
 * sync socket and the inspector's own UI. A static render wants none of them —
 * the state it paints is the state it was handed.
 */
export const StaticPage = ({store}: {store: TodosStore}) => (
  <Provider storesById={{[STORE_ID]: store}}>
    <TopBar />
    <div id="app">
      <TodoInput />
      <TodoList />
    </div>
  </Provider>
);

/** The markup the app paints over `content`, with no browser in it. */
export const renderStatic = (content: TodosContent): string =>
  renderToStaticMarkup(
    <StaticPage
      store={createMergeableStore()
        .setTablesSchema(TABLES_SCHEMA)
        .setContent(content)}
    />,
  );
