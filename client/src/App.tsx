import {StrictMode, useState} from 'react';
import {Loading} from './Loading';
import {Provider} from 'tinybase/ui-react';
import {Inspector} from 'tinybase/ui-react-inspector';
import {Store} from './Store';
import {TodoInput} from './TodoInput';
import {TodoList} from './TodoList';
import {TopBar} from './TopBar';

export const App = () => (
  <>
    <TopBar />
    <Main />
  </>
);

const Main = () => {
  const [loading, setLoading] = useState(true);

  return (
    <div id="app">
      <StrictMode>
        <Provider>
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
        </Provider>
      </StrictMode>
    </div>
  );
};
