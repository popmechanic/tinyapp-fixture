import {STORE_ID, useTable} from './Store';
import {countTodos} from './todoCounts';
import {countTagged} from './todoTags';

// Two spans, not one: `#doneCount`'s text is pinned verbatim by the linter's own
// exam, so the tagged total is its own element beside it rather than a change to
// that span. `TopBar` lays its children out with `flex items-center gap-4`, so
// neither span needs a class of its own.
export const DoneCount = () => {
  const table = useTable('todos', STORE_ID);
  const {done, total} = countTodos(table);
  const tagged = countTagged(table);

  return (
    <>
      <span id="doneCount">
        {done} of {total} done
      </span>
      <span id="taggedCount">{tagged} tagged</span>
    </>
  );
};
