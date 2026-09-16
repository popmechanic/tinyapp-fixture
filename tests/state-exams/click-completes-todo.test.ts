import {stateExam} from 'tinyapp-exam';

import {createTodosStore} from '../../client/src/storeData';

// Clicking the first todo's checkbox completes that todo and leaves the other
// one open. The box is named the way a person would name it — "the checkbox
// called buy milk" — so the row that moves is the row that carries that text,
// whatever order the list happens to paint in.
stateExam({
  clock: '2026-01-01T00:00:00Z',
  entry: 'client/index.html',
  seed: 'state-exams/seeds/two-open-todos.json',
  store: () => createTodosStore(),
  action: {click: {role: 'checkbox', name: 'buy milk'}},
  expected: 'state-exams/expected/two-todos-first-done.json',
  view: [
    // `[data-completed="true"]` names exactly the row that was clicked: the
    // bare `#todoList li [role=checkbox]` would match both boxes, and `checked`
    // asks that *every* match read `aria-checked="true"`.
    {selector: '#todoList li[data-completed="true"] [role=checkbox]', checked: true},
    {selector: '#todoList li', count: 2},
  ],
  mutant: [{table: 'todos', row: '0', cell: 'completed', value: false}],
});
