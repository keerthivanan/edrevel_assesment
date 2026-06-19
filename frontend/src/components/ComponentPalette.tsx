import { useBuilder } from "../store";
import type { AvailableComponent } from "../types";

// Left panel: loads available content from the API and shows draggable items.
// Each item shows title, short description, content type and approx duration (PDF 3.A).
export default function ComponentPalette() {
  const components = useBuilder((s) => s.components);

  const onDragStart = (e: React.DragEvent, component: AvailableComponent) => {
    e.dataTransfer.setData("application/alpb-component", JSON.stringify(component));
    e.dataTransfer.effectAllowed = "move";
  };

  const onStructuralDragStart = (e: React.DragEvent, type: "start" | "end") => {
    e.dataTransfer.setData("application/alpb-structural", type);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside className="palette" aria-label="Available content">
      <div className="palette__header">
        <h2>Add Components</h2>
        <p>Drag an item onto the canvas to add it.</p>
      </div>

      <div className="palette__list">
        <div className="palette__group">Flow</div>
        <div className="palette__structural">
          <div
            className="structural-card structural-card--start"
            draggable
            onDragStart={(e) => onStructuralDragStart(e, "start")}
            data-testid="palette-start"
          >
            <span className="node__icon node__icon--start">▶</span> Start
          </div>
          <div
            className="structural-card structural-card--end"
            draggable
            onDragStart={(e) => onStructuralDragStart(e, "end")}
            data-testid="palette-end"
          >
            <span className="node__icon node__icon--end">■</span> Complete
          </div>
        </div>
        <div className="palette__group">Content</div>
        {components.map((c) => (
          <div
            key={c.id}
            className="palette-card"
            draggable
            onDragStart={(e) => onDragStart(e, c)}
            data-testid="palette-card"
          >
            <div className="palette-card__top">
              <span className={`chip chip--${c.type}`}>{c.type}</span>
              <span className="palette-card__duration">{c.approximateDurationMinutes} min</span>
            </div>
            <div className="palette-card__title">{c.title}</div>
            <div className="palette-card__desc">{c.shortDescription}</div>
            {c.type === "assessment" && c.metadata?.assessment && (
              <div className="palette-card__meta">
                pass {c.metadata.assessment.passingScore}/{c.metadata.assessment.maxScore}
              </div>
            )}
          </div>
        ))}
        {components.length === 0 && <div className="palette__empty">Loading content…</div>}
      </div>
    </aside>
  );
}
