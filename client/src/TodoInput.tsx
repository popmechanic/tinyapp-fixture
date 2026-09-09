import './todoInput.css';
import {useState} from 'react';
import {addTodo, useStore, STORE_ID, type TodosStore} from './Store';
import {Input} from './Input';
import {Button} from './Button';

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
    <form id="todoInput" onSubmit={handleSubmit}>
      <Input
        value={text}
        onChange={setText}
        placeholder="What needs to be done?"
        autoFocus
      />
      <Button type="submit" variant="primary">
        Add
      </Button>
    </form>
  );
};
