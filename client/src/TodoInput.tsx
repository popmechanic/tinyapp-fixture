import './todoInput.css';
import {useState} from 'react';
import {useAddRowCallback, STORE_ID} from './Store';
import {Input} from './Input';
import {Button} from './Button';

export const TodoInput = () => {
  const [text, setText] = useState('');
  const addRow = useAddRowCallback(
    'todos',
    () => ({text: text.trim(), completed: false}),
    [text],
    STORE_ID,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      addRow();
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
