import {useState} from 'react';

import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';

import {renameTodo} from './storeData';
import {STORE_ID, useStore, type TodosStore} from './Store';

/**
 * One todo's rename control: a button that opens a text box beside the row.
 *
 * The editing state and the draft text are local React state, not store
 * data — it is not the app's data, it is where the caret is. Opening the box
 * resets the draft to the current text every time, so a second Rename after
 * an Escape starts from what the row holds now rather than from stale text.
 *
 * `onFocus` selects the box's whole contents: the exam driver types with one
 * CDP `Input.insertText` after focusing the field, and inserted text replaces
 * a selection, so a box that opens holding `buy milk` ends holding exactly
 * what was typed rather than the old words with the new ones appended.
 *
 * Enter commits through `renameTodo`, which trims and refuses all-space text;
 * Escape closes the box without writing anything.
 */
export const RenameTodo = ({
  rowId,
  todoText,
}: {
  rowId: string;
  todoText: string;
}) => {
  const store = useStore(STORE_ID) as TodosStore | undefined;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todoText);

  const handleRenameClick = () => {
    setDraft(todoText);
    setEditing((was) => !was);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDraft(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (store) {
        renameTodo(store, rowId, draft);
      }
      setEditing(false);
    } else if (e.key === 'Escape') {
      setEditing(false);
    }
  };

  return (
    <>
      {editing ? (
        <Input
          type="text"
          id={`rename-box-${rowId}`}
          aria-label={`New text for ${todoText}`}
          className="w-40 shrink-0"
          autoFocus
          value={draft}
          onChange={handleChange}
          onFocus={(e) => e.target.select()}
          onKeyDown={handleKeyDown}
        />
      ) : null}
      <Button
        id={`rename-${rowId}`}
        variant="outline"
        size="sm"
        aria-label={`Rename ${todoText}`}
        onClick={handleRenameClick}
      >
        Rename
      </Button>
    </>
  );
};
