// Exam for task 3 — "The exam finds a control by role and name — and reads a shadcn page",
// leg (g) [M7].
//
// M7. The state exam clicking `{role: 'checkbox', name: 'buy milk'}` on the page seeded from
//     `state-exams/seeds/two-open-todos.json` reaches
//     `state-exams/expected/two-todos-first-done.json`, shows `#todo-0` checked and `#todo-1`
//     unchecked, and kills the mutant setting row `0`'s `completed` to `false`.
//
// The sibling exam `click-completes-todo.test.ts` reaches the same state through the selector
// `.todoItem input[type=checkbox]` — a class of the app's own and a tag. This one names the
// control the way a person would, "the checkbox called buy milk", and so it lands on row `0`
// whatever the page is styled with: at this wave the row is
// `<input type="checkbox" id="todo-0">` with `<label htmlFor>`, and once the shadcn Checkbox
// takes its place the accessible name is the same and the views still read.
//
// The views name `#todo-0` and `#todo-1` — an id and no tag, no class of the app's own — so
// they hold on both trees: `checked` reads `data-checked="true"` on this wave's input and
// `aria-checked="true"` on the shadcn root, which is what M4 adds to `assertView`.

import {stateExam} from 'tinyapp-exam';

import {createTodosStore} from '../../client/src/storeData';

stateExam({
  clock: '2026-01-01T00:00:00Z',
  entry: 'client/index.html',
  seed: 'state-exams/seeds/two-open-todos.json',
  store: () => createTodosStore(),
  // The action is the click M7 names, by role and accessible name. `buy milk` is row `0`'s
  // text, so the accessibility tree resolves it to that row's checkbox and no other.
  action: {click: {role: 'checkbox', name: 'buy milk'}},
  expected: 'state-exams/expected/two-todos-first-done.json',
  view: [
    {selector: '#todo-0', checked: true},
    {selector: '#todo-1', unchecked: true},
  ],
  mutant: [{table: 'todos', row: '0', cell: 'completed', value: false}],
});
