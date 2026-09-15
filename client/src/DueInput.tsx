import {useEffect, useState} from 'react';

import {setTodoDue, useStore, STORE_ID, type TodosStore} from './Store';
import {isIsoDate} from './overdue';

/**
 * One todo's due date, as a text box beside the row.
 *
 * A text box rather than `<input type="date">` on purpose: the exam driver
 * types with a single CDP `Input.insertText` after focusing the field, and
 * inserted text does not reach a date input at all — an exam that typed
 * `2025-12-31` into one read the row back with no `due`. A text field takes the
 * whole string in one `onChange`, so what the exam types is what the store
 * sees.
 *
 * What is being typed is held here rather than in the store. Only a whole
 * `YYYY-MM-DD` is ever sent, so the half-dates a real typist passes through —
 * `2`, `2025`, `2025-0` — are never written and the store never has to speak
 * about them; and because the field shows the local text rather than the cell,
 * a controlled input cannot snap back mid-word to the date it still holds.
 * Clearing the field sends `''`, which removes the cell.
 */
export const DueInput = ({rowId, due}: {rowId: string; due: string}) => {
  const store = useStore(STORE_ID) as TodosStore | undefined;
  const [text, setText] = useState(due);

  // The cell is the source of truth: a `due` that moved some other way — a
  // sync, another tab, an exam calling `setTodoDue` — replaces what is here.
  useEffect(() => {
    setText(due);
  }, [due]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const {value} = e.target;
    setText(value);
    if (store && (value === '' || isIsoDate(value))) {
      setTodoDue(store, rowId, value);
    }
  };

  return (
    <input
      type="text"
      className="dueInput"
      id={`due-${rowId}`}
      placeholder="YYYY-MM-DD"
      aria-label="Due date"
      size={10}
      value={text}
      onChange={handleChange}
    />
  );
};
