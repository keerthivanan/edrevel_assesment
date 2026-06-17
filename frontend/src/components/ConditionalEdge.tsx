import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";

import type { RFEdgeData } from "../graph";

// Custom edge that surfaces how many conditions gate the connection (PDF 3.D).
export default function ConditionalEdge(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, label, selected } =
    props;
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const d = data as RFEdgeData | undefined;
  const ruleCount = d?.conditions?.rules?.length ?? 0;
  const text = (typeof label === "string" && label) || (ruleCount > 0 ? `${ruleCount} rule${ruleCount > 1 ? "s" : ""}` : "always");

  return (
    <>
      <BaseEdge
        id={props.id}
        path={edgePath}
        style={{
          stroke: selected ? "#6366f1" : "#cbd5e1",
          strokeWidth: selected ? 2.5 : 1.5,
          strokeDasharray: ruleCount > 0 ? "6 4" : undefined,
        }}
      />
      <EdgeLabelRenderer>
        <div
          className={`edge-label ${d?.isDefault ? "edge-label--default" : ""} ${selected ? "edge-label--selected" : ""}`}
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
        >
          {d?.isDefault ? "default" : text}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
