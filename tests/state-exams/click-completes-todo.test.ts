import {stateExam} from 'tinyapp-exam';

import {createTodosStore} from '../../client/src/storeData';

// Clicking the first todo's checkbox completes that todo and leaves the other
// one open. `TodoList` renders rows ascending by row id, so `#todo-0` is the
// first `.todoItem` and `Page.act` clicks the first match of its selector —
// hence row `0` is the one that moves.
stateExam({
  clock: '2026-01-01T00:00:00Z',
  entry: 'client/index.html',
  seed: 'state-exams/seeds/two-open-todos.json',
  store: () => createTodosStore(),
  action: {click: '.todoItem input[type=checkbox]'},
  expected: 'state-exams/expected/two-todos-first-done.json',
  view: [
    // `.todoItem.completed` names exactly the row that was clicked: the bare
    // `.todoItem input[type=checkbox]` would match both boxes, and `checked`
    // asks that *every* match read `data-checked="true"`.
    {selector: '.todoItem.completed input[type=checkbox]', checked: true},
    {selector: '.todoItem', count: 2},
  ],
  mutant: [{table: 'todos', row: '0', cell: 'completed', value: false}],
});
