declare module '*.css' {
  const content: string;
  export default content;
}

// This file stays a global script (no top-level `export`) so the wildcard
// `*.css` declaration above keeps working; the Window merge is therefore
// written at top level rather than inside a `declare global` block.
// The two globals a harness sets *into* a page before the app loads: the state
// a snapshot page starts from, and the flag an exam raises to be handed the
// page's store, database and persister back. The handles the page writes *out*
// are declared beside the store, in `storeData.ts`.
interface Window {
  __TINYAPP_SEED__?: import('./storeData').TodosContent;
  __TINYAPP_EXAM__?: boolean;
}
