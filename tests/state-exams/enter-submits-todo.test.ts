import {stateExam} from 'tinyapp-exam';

import {createTodosStore} from '../../client/src/storeData';

// Typing into the input and pressing Enter submits the form, and `addTodo`
// assigns row id `0` on a store seeded empty — so the state reached is the
// same one-open-todo state the callback exam reaches, by the app's own path.
stateExam({
  clock: '2026-01-01T00:00:00Z',
  entry: 'client/index.html',
  seed: 'state-exams/seeds/empty.json',
  store: () => createTodosStore(),
  action: [
    {type: ['input[placeholder="What needs to be done?"]', 'buy milk']},
    {key: ['input[placeholder="What needs to be done?"]', 'Enter']},
  ],
  expected: 'state-exams/expected/one-open-todo.json',
  view: {selector: '.todoItem', count: 1, text: 'buy milk'},
  mutant: [{table: 'todos', row: '0', cell: 'text', value: ''}],
});
