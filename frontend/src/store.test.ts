import { beforeEach, describe, expect, it } from "vitest";

import { useBuilder } from "./store";
import type { AvailableComponent } from "./types";

const assessment: AvailableComponent = {
  id: "cmp-assess-math-1",
  title: "Math Module 1 Assessment",
  shortDescription: "Baseline diagnostic.",
  type: "assessment",
  approximateDurationMinutes: 35,
  metadata: { assessment: { maxScore: 100, passingScore: 50 } },
};

const unit: AvailableComponent = {
  id: "cmp-unit-math-2-easy",
  title: "Math Module 2 - Easy",
  shortDescription: "Remediation unit.",
  type: "unit",
  approximateDurationMinutes: 35,
  metadata: { unit: { recommendedMinutes: 30 } },
};

function reset() {
  useBuilder.setState({
    components: [],
    nodes: [],
    edges: [],
    meta: { name: "Test", status: "draft" },
    selectedNodeId: null,
    selectedEdgeId: null,
  });
}

describe("builder store", () => {
  beforeEach(reset);

  it("adds a node from a component and carries assessment config", () => {
    useBuilder.getState().addComponentNode(assessment, { x: 10, y: 20 });
    const { nodes } = useBuilder.getState();
    expect(nodes).toHaveLength(1);
    expect(nodes[0].data.nodeType).toBe("assessment");
    expect(nodes[0].data.config?.assessment).toEqual({ maxScore: 100, passingScore: 50 });
    expect(nodes[0].position).toEqual({ x: 10, y: 20 });
  });

  it("creates a conditional edge on connect and selects it", () => {
    const s = useBuilder.getState();
    s.addComponentNode(assessment, { x: 0, y: 0 });
    s.addComponentNode(unit, { x: 0, y: 200 });
    const [a, b] = useBuilder.getState().nodes;
    s.onConnect({ source: a.id, target: b.id, sourceHandle: null, targetHandle: null });
    const { edges, selectedEdgeId } = useBuilder.getState();
    expect(edges).toHaveLength(1);
    expect(edges[0].data?.conditions).toEqual({ operator: "AND", rules: [] });
    expect(selectedEdgeId).toBe(edges[0].id);
  });

  it("adds, updates and removes rules on an edge", () => {
    const s = useBuilder.getState();
    s.addComponentNode(assessment, { x: 0, y: 0 });
    s.addComponentNode(unit, { x: 0, y: 200 });
    const [a, b] = useBuilder.getState().nodes;
    s.onConnect({ source: a.id, target: b.id, sourceHandle: null, targetHandle: null });
    const edgeId = useBuilder.getState().edges[0].id;

    s.addRule(edgeId, {
      id: "r1",
      sourceType: "assessment",
      sourceNodeId: a.id,
      metric: "passed",
      operator: "eq",
      value: true,
    });
    expect(useBuilder.getState().edges[0].data?.conditions.rules).toHaveLength(1);

    s.updateRule(edgeId, "r1", { value: false });
    expect(useBuilder.getState().edges[0].data?.conditions.rules[0].value).toBe(false);

    s.removeRule(edgeId, "r1");
    expect(useBuilder.getState().edges[0].data?.conditions.rules).toHaveLength(0);
  });

  it("deleting a node also removes its connected edges", () => {
    const s = useBuilder.getState();
    s.addComponentNode(assessment, { x: 0, y: 0 });
    s.addComponentNode(unit, { x: 0, y: 200 });
    const [a, b] = useBuilder.getState().nodes;
    s.onConnect({ source: a.id, target: b.id, sourceHandle: null, targetHandle: null });

    s.selectNode(a.id);
    s.deleteSelected();
    const { nodes, edges } = useBuilder.getState();
    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe(b.id);
    expect(edges).toHaveLength(0);
  });

  it("toggles the AND/OR operator", () => {
    const s = useBuilder.getState();
    s.addComponentNode(assessment, { x: 0, y: 0 });
    s.addComponentNode(unit, { x: 0, y: 200 });
    const [a, b] = useBuilder.getState().nodes;
    s.onConnect({ source: a.id, target: b.id, sourceHandle: null, targetHandle: null });
    const edgeId = useBuilder.getState().edges[0].id;
    s.setEdgeOperator(edgeId, "OR");
    expect(useBuilder.getState().edges[0].data?.conditions.operator).toBe("OR");
  });
});
