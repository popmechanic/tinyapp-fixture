import {getUniqueId} from 'tinybase';
import ReactDOM from 'react-dom/client';
import {App} from './App';
import {readSeed} from './storeData';

// A rendered snapshot page has no room path of its own: redirecting it away
// from `/` would mean the renderer never sees the app.
if (readSeed() === undefined && location.pathname === '/') {
  location.assign('/' + getUniqueId());
}

const root = document.getElementById('root')!;

addEventListener('load', () => {
  ReactDOM.createRoot(root).render(<App />);
});
