// The one ordering rule the list and the static render share, imported by
// neither `todoFilter.ts`'s pattern nor the store: this module imports
// nothing, so the order a list is shown in stays apart from what decides
// which rows are shown at all.

/**
 * Orders `ids` for display: pinned rows first, and — only when `sort` is
 * `'due'` — within each pinned group the rows carrying a `due` before the
 * rows that do not, dated rows ascending by the `YYYY-MM-DD` string. Every
 * other tie is left exactly as `ids` gave it: `Array.prototype.sort` is
 * stable, so a group that shares a key never gets reshuffled by this call.
 *
 * `pinned` has no schema default, so a row that has never been pinned has no
 * such cell — the read is `=== true` rather than a truthiness test, for the
 * same reason `TodoList.tsx` already reads it that way.
 */
export const orderTodos = (
  ids: readonly string[],
  table: Record<string, {pinned?: boolean; due?: string}>,
  sort: unknown,
): string[] => {
  const pinnedRank = (id: string): number => (table[id]?.pinned === true ? 0 : 1);
  const dueRank = (id: string): number => (table[id]?.due === undefined ? 1 : 0);

  return [...ids].sort((a, b) => {
    const pinnedDiff = pinnedRank(a) - pinnedRank(b);
    if (pinnedDiff !== 0) {
      return pinnedDiff;
    }
    if (sort !== 'due') {
      return 0;
    }
    const dueDiff = dueRank(a) - dueRank(b);
    if (dueDiff !== 0) {
      return dueDiff;
    }
    const dueA = table[a]?.due;
    const dueB = table[b]?.due;
    if (dueA !== undefined && dueB !== undefined && dueA !== dueB) {
      return dueA < dueB ? -1 : 1;
    }
    return 0;
  });
};
