import {DoneCount} from './DoneCount';
import {Info} from './Info';
import {Title} from './Title';

// What `topBar.css` said, as utilities: the sticky header strip, its hairline
// and its blurred translucent ground. The colour is `bg-card`, a token, rather
// than the `--bg-header` the stylesheet mixed by hand.
export const TopBar = () => (
  <div
    id="topBar"
    className="sticky top-0 z-50 flex items-center gap-4 border-b border-border bg-card/50 px-6 py-3 shadow-sm backdrop-blur-sm"
  >
    <Title />
    <DoneCount />
    <Info />
  </div>
);
