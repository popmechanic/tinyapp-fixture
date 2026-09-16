// How a todo's tags are spelled, and how they are read back. The one spelling
// of both the `tags` cell and the `tag` value, so nothing else in the app has
// to know that the cell is a comma-joined list; the module imports nothing, so
// the store and these readings stay apart — the shape `todoFilter.ts` has.
//
// A cell rather than a table because the schema is typed and a cell is
// `string | number | boolean`: there is no list cell, and a second table keyed
// by todo id would be one more table to persist, sync and cross-reference for
// a value that is one row's own.

/**
 * The tags `text` names, in the order they were typed.
 *
 * Split on `,`, each piece trimmed, the empty ones dropped and a repeat dropped
 * after its first occurrence — so `' home, urgent ,,home, '` and `'home,urgent'`
 * name the same two tags, and neither `''` nor `' , '` names any.
 */
export const parseTags = (text: string): string[] => {
  const tags: string[] = [];
  for (const piece of text.split(',')) {
    const tag = piece.trim();
    if (tag !== '' && !tags.includes(tag)) {
      tags.push(tag);
    }
  }
  return tags;
};

/**
 * `text` as the cell stores it: the tags it names, joined by `,` with no spaces.
 *
 * `''` when `text` names no tag at all, which is what tells `setTodoTags` to
 * delete the cell rather than write an empty one.
 */
export const normalizeTags = (text: string): string => parseTags(text).join(',');

/**
 * Whether `tags` is already what `normalizeTags` would make of it, and not empty.
 *
 * This is the shape the `tags` cell is allowed to hold, so it is also what the
 * invariant beside the schema asks of every row that has the cell at all.
 */
export const isNormalizedTags = (tags: string): boolean =>
  tags !== '' && normalizeTags(tags) === tags;

/**
 * Every tag any row of `table` carries, once each, sorted the way a reader
 * would order them — `localeCompare`, not code points.
 */
export const tagsInUse = (table: Record<string, {tags?: string}>): string[] => {
  const seen = new Set<string>();
  for (const row of Object.values(table)) {
    for (const tag of parseTags(row.tags ?? '')) {
      seen.add(tag);
    }
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
};

/** How many rows of `table` carry at least one tag. */
export const countTagged = (table: Record<string, {tags?: string}>): number =>
  Object.values(table).filter((row) => parseTags(row.tags ?? '').length > 0)
    .length;

/**
 * The tag filter actually in force, given the tags the list has to offer.
 *
 * A stored `tag` that no row carries any more is read as no filter at all, so a
 * tag that goes out of use never strands the list behind a filter nothing
 * matches. Anything that is not a string in `inUse` — an absent value, a stray
 * number, a different casing — reads the same way: `''`, which is every row.
 */
export const activeTag = (value: unknown, inUse: readonly string[]): string =>
  typeof value === 'string' && inUse.includes(value) ? value : '';

/**
 * Whether a row whose cell is `tags` is admitted by the filter `tag`.
 *
 * No filter admits every row, including a row with no `tags` cell at all; a
 * filter matches a whole tag and never a prefix of one, which is why the cell
 * is parsed rather than searched.
 */
export const hasTag = (tags: string | undefined, tag: string): boolean =>
  tag === '' || parseTags(tags ?? '').includes(tag);
