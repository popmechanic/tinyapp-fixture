import {useEffect, useState} from 'react';

import {Input} from '@/components/ui/input';

import {useStore, STORE_ID, type TodosStore} from './Store';
import {setTodoTags} from './storeData';
import {normalizeTags} from './todoTags';

/**
 * One todo's tags, as a text box beside the row.
 *
 * `setTodoTags` is imported from `./storeData` rather than from `./Store`: the
 * store module re-exports `setTodoDue` but not this one, so `./Store` would be
 * a `TS2305`. `client/src/FilterBar.tsx` reaches `setTagFilter` the same way.
 *
 * Enter is the one commit gesture, and it is the whole of why the typed text
 * is held here rather than in the store. A keystroke writes nothing: `home,`
 * on its way to `home, urgent` would otherwise be a tag list of its own, and
 * every half-typed tag would reach the cell, the chips and the count line.
 * Enter sends the box's whole text through `setTodoTags`, which normalizes it,
 * and the box is then set to what the cell now holds — `home, urgent` typed
 * reads back `home,urgent`.
 *
 * The text is passed through unconditionally, empty included: `setTodoTags`
 * with `''` is what deletes the cell, so clearing the box and pressing Enter
 * takes the tags away. An `if (text)` guard here would make an emptied box a
 * gesture that does nothing.
 *
 * `todoText` is here for the name alone: two rows mean two tags boxes, and
 * `Tags for buy milk` is what tells them apart in the accessibility tree.
 */
export const TagsInput = ({
  rowId,
  tags,
  todoText,
}: {
  rowId: string;
  tags: string;
  todoText: string;
}) => {
  const store = useStore(STORE_ID) as TodosStore | undefined;
  const [text, setText] = useState(tags);

  // The cell is the source of truth: a `tags` that moved some other way — a
  // sync, another tab, an exam calling `setTodoTags` — replaces what is here.
  // Safe under the typist because the cell only ever moves on a commit.
  useEffect(() => {
    setText(tags);
  }, [tags]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') {
      return;
    }
    // There is no form around the row, so this submits nothing else; it is
    // here so that Enter is the commit and never also a page move.
    e.preventDefault();
    if (store) {
      setTodoTags(store, rowId, text);
    }
    setText(normalizeTags(text));
  };

  return (
    <Input
      type="text"
      id={`tags-${rowId}`}
      placeholder="tags, comma-separated"
      aria-label={`Tags for ${todoText}`}
      className="w-40 shrink-0"
      value={text}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
    />
  );
};
