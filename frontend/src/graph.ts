// Adapters converting between the API contract shape and React Flow's graph model.
import type { Edge, Node } from "@xyflow/react";

import type { Conditions, LearningPath, PathEdge, PathNode } from "./types";

export interface RFNodeData extends Record<string, unknown> {
  label: string;
  nodeType: PathNode["type"];
  componentId: string;
  description?: string;
  config?: PathNode["config"];
}

export interface RFEdgeData extends Record<string, unknown> {
  conditions: Conditions;
  priority?: number;
  isDefault?: boolean;
}

export type RFNode = Node<RFNodeData>;
export type RFEdge = Edge<RFEdgeData>;

export function pathToReactFlow(path: LearningPath): { nodes: RFNode[]; edges: RFEdge[] } {
  const nodes: RFNode[] = path.nodes.map((n) => ({
    id: n.id,
    type: "content",
    position: { x: n.position.x, y: n.position.y },
    data: {
      label: n.label,
      nodeType: n.type,
      componentId: n.componentId,
      description: n.description,
      config: n.config,
    },
  }));

  const edges: RFEdge[] = path.edges.map((e) => ({
    id: e.id,
    source: e.sourceNodeId,
    target: e.targetNodeId,
    label: e.label,
    type: "conditional",
    animated: (e.conditions?.rules?.length ?? 0) > 0,
    data: {
      conditions: e.conditions,
      priority: e.priority,
      isDefault: e.isDefault,
    },
  }));

  return { nodes, edges };
}

export function reactFlowToPath(
  meta: Pick<LearningPath, "id" | "name" | "description" | "status" | "version" | "canvas">,
  nodes: RFNode[],
  edges: RFEdge[],
): LearningPath {
  const pathNodes: PathNode[] = nodes.map((n) => ({
    id: n.id,
    componentId: n.data.componentId,
    type: n.data.nodeType,
    label: n.data.label,
    description: n.data.description || undefined,
    position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
    config: n.data.config,
  }));

  const pathEdges: PathEdge[] = edges.map((e) => ({
    id: e.id,
    sourceNodeId: e.source,
    targetNodeId: e.target,
    label: typeof e.label === "string" ? e.label : undefined,
    priority: e.data?.priority,
    isDefault: e.data?.isDefault,
    conditions: e.data?.conditions ?? { operator: "AND", rules: [] },
  }));

  return { ...meta, nodes: pathNodes, edges: pathEdges };
}
