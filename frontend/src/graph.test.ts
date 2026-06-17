import { describe, expect, it } from "vitest";

import example from "../learning-path.example.json";
import { pathToReactFlow, reactFlowToPath } from "./graph";
import type { LearningPath } from "./types";

const path = example as LearningPath;

describe("graph adapters", () => {
  it("maps every node and edge to React Flow", () => {
    const { nodes, edges } = pathToReactFlow(path);
    expect(nodes).toHaveLength(path.nodes.length);
    expect(edges).toHaveLength(path.edges.length);
    expect(nodes[0].position).toEqual(path.nodes[0].position);
    expect(nodes[1].data.nodeType).toBe(path.nodes[1].type);
  });

  it("round-trips back to the contract shape preserving positions, labels and rules", () => {
    const { nodes, edges } = pathToReactFlow(path);
    const meta = {
      id: path.id,
      name: path.name,
      description: path.description,
      status: path.status,
      version: path.version,
    };
    const back = reactFlowToPath(meta, nodes, edges);

    expect(back.nodes.map((n) => n.id)).toEqual(path.nodes.map((n) => n.id));
    expect(back.nodes.map((n) => n.label)).toEqual(path.nodes.map((n) => n.label));
    expect(back.nodes.map((n) => n.position)).toEqual(path.nodes.map((n) => n.position));

    const easyEdge = back.edges.find((e) => e.id === "edge-math1-easy");
    expect(easyEdge?.conditions.rules).toHaveLength(2);
    const rangeRule = easyEdge?.conditions.rules.find((r) => r.metric === "score_range");
    expect(rangeRule?.range).toEqual({ min: 0, max: 49, minInclusive: true, maxInclusive: true });
  });

  it("animates edges that carry conditions", () => {
    const { edges } = pathToReactFlow(path);
    const conditional = edges.find((e) => e.id === "edge-math1-easy");
    const unconditional = edges.find((e) => e.id === "edge-start-math1");
    expect(conditional?.animated).toBe(true);
    expect(unconditional?.animated).toBe(false);
  });
});
