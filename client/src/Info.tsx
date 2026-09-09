import './info.css';

export const Info = () => (
  <div id="info">
    <div id="infoTech">
      <img
        src="/ts.svg"
        className="infoTechIcon"
        title="Written in TypeScript"
      />
      <img src="/react.svg" className="infoTechIcon" title="Built with React" />
      <img
        src="/sqlite.svg"
        className="infoTechIcon"
        title="Persists data to SQLite"
      />
      <img
        src="/sync.svg"
        className="infoTechIcon"
        title="Data synchronization enabled"
      />
    </div>
    <div id="infoIcon">
      i
      <div id="infoTooltip">
        {
          "A simple todo list application demonstrating TinyBase's reactive data management with CRUD operations."
        }
      </div>
    </div>
  </div>
);
