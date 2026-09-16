import {useState} from 'react';

import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';

import {addTodo, useStore, STORE_ID, type TodosStore} from './Store';

export const TodoInput = () => {
  const [text, setText] = useState('');
  const store = useStore(STORE_ID) as TodosStore | undefined;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // `addTodo` trims and refuses a blank itself, so the button and an exam's
    // action are one code path.
    if (store && addTodo(store, text) !== undefined) {
      setText('');
    }
  };

  return (
    <form id="todoInput" className="mb-6 flex gap-2" onSubmit={handleSubmit}>
      {/* The placeholder names this box for a reader; `aria-label` names it for
          the accessibility tree, which is what an exam's `{role, name}` locator
          reaches — a placeholder alone would tie the exam to the wording of a
          hint rather than to the control. */}
      <Input
        type="text"
        aria-label="New todo"
        placeholder="What needs to be done?"
        autoFocus
        className="flex-1"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <Button type="submit">Add</Button>
    </form>
  );
};
