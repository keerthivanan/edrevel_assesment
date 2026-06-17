import { useEffect } from "react";

import Canvas from "./components/Canvas";
import ComponentPalette from "./components/ComponentPalette";
import PropertiesPanel from "./components/PropertiesPanel";
import Toolbar from "./components/Toolbar";
import { useBuilder } from "./store";

export default function App() {
  const init = useBuilder((s) => s.init);
  const statusMessage = useBuilder((s) => s.statusMessage);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="app">
      <Toolbar />
      <div className="app__body">
        <ComponentPalette />
        <Canvas />
        <PropertiesPanel />
      </div>
      {statusMessage && <div className="statusbar">{statusMessage}</div>}
    </div>
  );
}
