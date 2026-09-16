import {stateExam} from 'tinyapp-exam';

import {createTodosStore} from '../../client/src/storeData';

// Typing into the input named `New todo` and pressing Enter there submits the
// form — the box is reached by role and name, not by its placeholder, so a
// change to the words inside it does not move this exam. `addTodo`
// assigns row id `0` on a store seeded empty — so the state reached is the
// same one-open-todo state the callback exam reaches, by the app's own path.
stateExam({
  clock: '2026-01-01T00:00:00Z',
  entry: 'client/index.html',
  seed: 'state-exams/seeds/empty.json',
  store: () => createTodosStore(),
  action: [
    {type: [{role: 'textbox', name: 'New todo'}, 'buy milk']},
    {key: [{role: 'textbox', name: 'New todo'}, 'Enter']},
  ],
  expected: 'state-exams/expected/one-open-todo.json',
  view: {selector: '#todoList li', count: 1, text: 'buy milk'},
  mutant: [{table: 'todos', row: '0', cell: 'text', value: ''}],
});
