import { Handle, Position, type NodeProps } from "@xyflow/react";

import type { RFNodeData } from "../graph";

const ICONS: Record<string, string> = {
  start: "▶",
  end: "■",
  unit: "▤",
  assessment: "✓",
};

const TYPE_LABEL: Record<string, string> = {
  start: "Start",
  end: "End",
  unit: "Unit",
  assessment: "Assessment",
};

export default function ContentNode({ data, selected }: NodeProps) {
  const d = data as RFNodeData;
  const isTerminal = d.nodeType === "start" || d.nodeType === "end";
  const minutes = d.config?.approximateDurationMinutes;
  const assess = d.config?.assessment;

  return (
    <div
      className={`node node--${d.nodeType} ${selected ? "node--selected" : ""}`}
      data-testid="content-node"
    >
      {d.nodeType !== "start" && (
        <Handle type="target" position={Position.Top} className="node__handle" />
      )}

      <div className="node__row">
        <span className={`node__icon node__icon--${d.nodeType}`}>{ICONS[d.nodeType]}</span>
        <div className="node__text">
          <div className="node__title">{d.label}</div>
          {!isTerminal && (
            <div className="node__subtitle">
              {assess ? `pass ${assess.passingScore}/${assess.maxScore}` : TYPE_LABEL[d.nodeType]}
              {minutes ? ` · ${minutes} min` : ""}
            </div>
          )}
        </div>
      </div>

      {d.nodeType !== "end" && (
        <Handle type="source" position={Position.Bottom} className="node__handle" />
      )}
    </div>
  );
}
