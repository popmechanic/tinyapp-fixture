import {stateExam} from 'tinyapp-exam';

import {setTodoCompleted, createTodosStore} from '../../client/src/storeData';

// Derived from a recorded session by tinyapp-history: setTodoCompleted("0", true).
stateExam({
  clock: "2026-01-01T00:00:00Z",
  seed: 'state-exams/seeds/derived-complete-first-todo.json',
  store: () => createTodosStore(),
  action: (store) => {
    setTodoCompleted(store, "0", true);
  },
  expected: 'state-exams/expected/derived-complete-first-todo.json',
  mutant: [{"table":"todos","row":"0","cell":"completed","value":false}],
});
