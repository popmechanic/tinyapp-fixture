// Every typed word, anywhere in the text, any case. The module imports
// nothing, so the store and this predicate stay apart.

// Lower-cases and splits the typed query on runs of whitespace, dropping any
// empty pieces, in the order typed. A blank or empty query yields no words.
export const searchWords = (query: string): string[] =>
  query
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 0);

// Admits a row when every typed word is a case-insensitive substring of its
// text. An empty word list (a blank or empty query) admits everything; a
// row with no `text` cell is read as '', so it is admitted only when the
// query is blank.
export const matchesSearch = (text: string | undefined, query: string): boolean =>
  searchWords(query).every((word) => (text ?? '').toLowerCase().includes(word));

// Reads the store's `search` value the way `filterOf` reads `filter`: a
// string is returned as is, anything else (an absent value, a number) is
// '', which is no search.
export const searchOf = (value: unknown): string =>
  typeof value === 'string' ? value : '';
