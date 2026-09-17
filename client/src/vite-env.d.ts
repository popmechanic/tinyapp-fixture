declare module '*.css' {
  const content: string;
  export default content;
}

// This file stays a global script (no top-level `export`) so the wildcard
// `*.css` declaration above keeps working; the Window merge is therefore
// written at top level rather than inside a `declare global` block.
// The three globals a harness sets *into* a page before the app loads: the
// state a snapshot page starts from, the flag an exam raises to be handed the
// page's store, database and persister back, and the origin an exam hands in
// for the page to sync to instead of the built-in server. The handles the page
// writes *out* are declared beside the store, in `storeData.ts`.
interface Window {
  __TINYAPP_SEED__?: import('./storeData').TodosContent;
  __TINYAPP_EXAM__?: boolean;
  __TINYAPP_SYNC__?: string;
}
