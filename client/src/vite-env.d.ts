declare module '*.css' {
  const content: string;
  export default content;
}

// This file stays a global script (no top-level `export`) so the wildcard
// `*.css` declaration above keeps working; the Window merge is therefore
// written at top level rather than inside a `declare global` block.
interface Window {
  __TINYAPP_SEED__?: import('./storeData').TodosContent;
}
