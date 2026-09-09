import {getUniqueId} from 'tinybase';
import ReactDOM from 'react-dom/client';
import {App} from './App';

if (location.pathname === '/') {
  location.assign('/' + getUniqueId());
}

const root = document.getElementById('root')!;

addEventListener('load', () => {
  ReactDOM.createRoot(root).render(<App />);
});
