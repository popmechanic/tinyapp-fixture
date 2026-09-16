// The persistence move's stand-in app: the page contract kept by hand.
//
// It is not the fixture's own client. It is the smallest page that honours
// everything `runPersistenceExam` reads — the exam flag, a store handle, a
// `oo1.DB`-shaped `exec`, a persister handle raised only once its load has
// settled — so the move can be exercised here before the app itself honours
// the flag. Its state lives in `localStorage`, which survives the reload, and
// its document counter lives in `sessionStorage`, which survives the reload and
// not the tab, so the two DOM snapshots say which document they are.
//
// The exam's variant pages are this file with one line changed, written into a
// temp directory by the test that wants them.

/** The content one click of `Add` leaves, and what the reloaded page reads back. */
const ADDED = '[{"todos":{"0":{"text":"buy milk","completed":false}}},{}]';

/** The same content stamped, as the SQLite persister keeps it in its `store` column. */
const ADDED_STAMPED =
  '[[{"todos":[{"0":[{"text":["buy milk","H1",1],"completed":[false,"H2",2]},"",3]},"",4]},"",5],[{},"",0]]';

/** What the `store` column holds before anything has been saved. */
const EMPTY_STAMPED = '[[{},"",0],[{},"",0]]';

document.body.dataset.flag = String(window.__TINYAPP_EXAM__ === true);
document.body.dataset.app = 'persistence-app';
document.body.dataset.origin = location.origin;
document.body.dataset.now = String(Date.now());

if (location.pathname === '/') {
  location.assign('/room');
} else {
  const loads = Number(sessionStorage.getItem('loads') ?? '0') + 1;
  sessionStorage.setItem('loads', String(loads));
  document.body.dataset.load = String(loads);
  document.body.dataset.path = location.pathname;

  const store = {
    content: JSON.parse(localStorage.getItem('content') ?? '[{},{}]'),
    getContent() {
      return this.content;
    },
    setContent(c) {
      this.content = c;
    },
  };
  window.__TINYAPP_STORE__ = store;

  const render = () => {
    const rows = store.getContent()[0].todos ?? {};
    document.querySelector('#rows').replaceChildren(
      ...Object.keys(rows).map((id) => {
        const item = document.createElement('li');
        item.id = `row-${id}`;
        item.textContent = rows[id].text;
        return item;
      }),
    );
  };
  render();

  document.querySelector('#add').addEventListener('click', () => {
    store.setContent(JSON.parse(ADDED));
    render();
    setTimeout(() => {
      localStorage.setItem('content', ADDED);
      localStorage.setItem('store', ADDED_STAMPED);
    }, 20);
  });

  window.__TINYAPP_DB__ = {
    exec({sql}) {
      document.body.dataset.sql = sql;
      return [{_id: '_', store: localStorage.getItem('store') ?? EMPTY_STAMPED}];
    },
  };

  fetch('/hello.txt')
    .then((r) => r.text())
    .then((t) => {
      document.body.dataset.asset = t;
    })
    .then(() => setTimeout(() => { window.__TINYAPP_PERSISTER__ = {loaded: true}; }, 50));
}
