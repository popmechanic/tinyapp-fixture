import {StrictMode, useState} from 'react';
import {Loading} from './Loading';
import {Provider} from 'tinybase/ui-react';
import {Inspector} from 'tinybase/ui-react-inspector';
import {Store} from './Store';
import {TodoInput} from './TodoInput';
import {TodoList} from './TodoList';
import {TopBar} from './TopBar';

// The one `Provider` lives here, wrapping both halves of the page: TinyBase
// provides a store downward only, so the top bar has to sit inside it to read
// the todos table.
export const App = () => (
  <Provider>
    <TopBar />
    <Main />
  </Provider>
);

const Main = () => {
  const [loading, setLoading] = useState(true);

  return (
    <div id="app">
      <StrictMode>
        <Store onReady={() => setLoading(false)} />
        {loading ? (
          <Loading />
        ) : (
          <>
            <TodoInput />
            <TodoList />
            <Inspector />
          </>
        )}
      </StrictMode>
    </div>
  );
};
