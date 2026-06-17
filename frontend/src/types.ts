// Types mirroring the provided JSON Schema contract (available-content + learning-path).

export type ComponentType = "unit" | "assessment";
export type NodeType = "start" | "unit" | "assessment" | "end";

export interface AvailableComponent {
  id: string;
  title: string;
  shortDescription: string;
  type: ComponentType;
  approximateDurationMinutes: number;
  metadata?: {
    assessment?: { maxScore: number; passingScore: number };
    unit?: { recommendedMinutes?: number };
  };
}

export interface ComponentsResponse {
  items: AvailableComponent[];
  totalCount: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface NodeConfig {
  approximateDurationMinutes?: number;
  assessment?: { maxScore: number; passingScore: number };
}

export interface PathNode {
  id: string;
  componentId: string;
  type: NodeType;
  label: string;
  description?: string;
  position: Position;
  config?: NodeConfig;
}

export type RuleMetric =
  | "completion"
  | "passed"
  | "score"
  | "score_range"
  | "time_spent_minutes"
  | "percentage_completion";

export type RuleOperator = "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "between";

export interface RuleRange {
  min: number;
  max: number;
  minInclusive?: boolean;
  maxInclusive?: boolean;
}

export interface Rule {
  id: string;
  sourceType: "assessment" | "unit";
  sourceNodeId: string;
  metric: RuleMetric;
  operator: RuleOperator;
  value?: boolean | number | string;
  range?: RuleRange;
}

export interface Conditions {
  operator: "AND" | "OR";
  rules: Rule[];
}

export interface PathEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  label?: string;
  priority?: number;
  isDefault?: boolean;
  conditions: Conditions;
}

export interface Canvas {
  zoom?: number;
  offsetX?: number;
  offsetY?: number;
}

export interface LearningPath {
  id?: string;
  name: string;
  description?: string;
  status: "draft" | "published";
  version?: number;
  canvas?: Canvas;
  nodes: PathNode[];
  edges: PathEdge[];
}
