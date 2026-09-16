/**
 * The tech icons and the hover tooltip, with `info.css` gone.
 *
 * The tooltip was painted by `#infoIcon:hover #infoTooltip`; a descendant rule
 * fired by a hover on an ancestor is exactly Tailwind's `group` — the icon is
 * the named group and the tooltip reads `group-hover/info:`, so the same two
 * elements keep the same relationship with no stylesheet between them.
 */
export const Info = () => (
  <div id="info" className="relative flex items-center gap-2">
    <div id="infoTech" className="flex items-center gap-1.5">
      <img
        src="/ts.svg"
        className="block size-5 shrink-0"
        title="Written in TypeScript"
      />
      <img
        src="/react.svg"
        className="block size-5 shrink-0"
        title="Built with React"
      />
      <img
        src="/sqlite.svg"
        className="block size-5 shrink-0"
        title="Persists data to SQLite"
      />
      <img
        src="/sync.svg"
        className="block size-5 shrink-0"
        title="Data synchronization enabled"
      />
    </div>
    <div
      id="infoIcon"
      className="group/info relative flex size-5 cursor-help items-center justify-center rounded-full border-2 border-muted-foreground text-xs font-extrabold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
    >
      i
      <div
        id="infoTooltip"
        className="invisible absolute top-full right-0 z-10 mt-2 w-80 rounded-md border border-border bg-card p-4 text-sm leading-relaxed font-normal text-foreground opacity-0 shadow-md transition-all group-hover/info:visible group-hover/info:opacity-100"
      >
        {
          "A simple todo list application demonstrating TinyBase's reactive data management with CRUD operations."
        }
      </div>
    </div>
  </div>
);
