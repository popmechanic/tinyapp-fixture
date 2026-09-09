import './topBar.css';
import {DoneCount} from './DoneCount';
import {Info} from './Info';
import {Title} from './Title';

export const TopBar = () => (
  <div id="topBar">
    <Title />
    <DoneCount />
    <Info />
  </div>
);
