import { useState } from "react";

import { useBuilder } from "../store";

// Top bar mirroring the mockup: title, path name, Save Draft / Publish, and load.
export default function Toolbar() {
  const { meta, save, loadPath, loading } = useBuilder();
  const setMeta = useBuilder((s) => s.setMeta);
  const [loadId, setLoadId] = useState(meta.id ?? "");

  const handleSave = async (status: "draft" | "published") => {
    setMeta({ status });
    await save();
  };

  return (
    <header className="toolbar">
      <div className="toolbar__brand">
        <div className="toolbar__logo">A</div>
        <div>
          <div className="toolbar__title">Adaptive Learning Path Builder</div>
          <div className="toolbar__subtitle">Create conditional quiz flows with adaptive sections</div>
        </div>
      </div>

      <input
        className="toolbar__name"
        value={meta.name}
        onChange={(e) => setMeta({ name: e.target.value })}
        aria-label="Learning path name"
      />

      <div className="toolbar__actions">
        <input
          className="toolbar__loadid"
          placeholder="path id to load…"
          value={loadId}
          onChange={(e) => setLoadId(e.target.value)}
          aria-label="Path id to load"
        />
        <button className="btn btn--ghost" disabled={!loadId || loading} onClick={() => loadPath(loadId)}>
          Load
        </button>
        <button className="btn btn--ghost" disabled={loading} onClick={() => handleSave("draft")}>
          Save Draft
        </button>
        <button className="btn btn--primary" disabled={loading} onClick={() => handleSave("published")}>
          ▶ Publish
        </button>
      </div>
    </header>
  );
}
