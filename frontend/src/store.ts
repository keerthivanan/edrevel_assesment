// Central canvas/graph state (PDF section 2: "clear state management").
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from "@xyflow/react";
import { create } from "zustand";

import { fetchComponents, loadLearningPath, saveLearningPath } from "./api/client";
import { pathToReactFlow, reactFlowToPath, type RFEdge, type RFNode } from "./graph";
import type { AvailableComponent, Conditions, LearningPath, NodeType, Rule } from "./types";

let idCounter = 1;
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${idCounter++}`;

function defaultConditions(): Conditions {
  return { operator: "AND", rules: [] };
}

function nodeTypeForComponent(c: AvailableComponent): NodeType {
  return c.type; // "unit" | "assessment" map 1:1 to node types
}

interface BuilderState {
  // Data
  components: AvailableComponent[];
  nodes: RFNode[];
  edges: RFEdge[];
  meta: Pick<LearningPath, "id" | "name" | "description" | "status" | "version">;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  loading: boolean;
  statusMessage: string | null;

  // Lifecycle
  init: () => Promise<void>;
  loadPath: (id: string) => Promise<void>;
  save: () => Promise<void>;

  // React Flow change handlers
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (conn: Connection) => void;

  // Mutations
  addComponentNode: (component: AvailableComponent, position: { x: number; y: number }) => void;
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  updateNode: (id: string, patch: Partial<RFNode["data"]>) => void;
  updateEdge: (id: string, patch: Partial<RFEdge["data"]> & { label?: string }) => void;
  deleteSelected: () => void;

  // Rule editing (PDF 3.D)
  addRule: (edgeId: string, rule: Rule) => void;
  updateRule: (edgeId: string, ruleId: string, patch: Partial<Rule>) => void;
  removeRule: (edgeId: string, ruleId: string) => void;
  setEdgeOperator: (edgeId: string, operator: "AND" | "OR") => void;

  setMeta: (patch: Partial<BuilderState["meta"]>) => void;
}

export const useBuilder = create<BuilderState>((set, get) => ({
  components: [],
  nodes: [],
  edges: [],
  meta: { name: "Untitled Learning Path", status: "draft" },
  selectedNodeId: null,
  selectedEdgeId: null,
  loading: false,
  statusMessage: null,

  init: async () => {
    set({ loading: true });
    try {
      const res = await fetchComponents();
      set({ components: res.items });
    } catch (e) {
      set({ statusMessage: `Failed to load components: ${(e as Error).message}` });
    } finally {
      set({ loading: false });
    }
  },

  loadPath: async (id) => {
    set({ loading: true });
    try {
      const path = await loadLearningPath(id);
      const { nodes, edges } = pathToReactFlow(path);
      set({
        nodes,
        edges,
        meta: {
          id: path.id,
          name: path.name,
          description: path.description,
          status: path.status,
          version: path.version,
        },
        selectedNodeId: null,
        selectedEdgeId: null,
        statusMessage: `Loaded "${path.name}".`,
      });
    } catch (e) {
      set({ statusMessage: `Load failed: ${(e as Error).message}` });
    } finally {
      set({ loading: false });
    }
  },

  save: async () => {
    const { meta, nodes, edges } = get();
    if (nodes.length < 2 || edges.length < 1) {
      set({ statusMessage: "Need at least 2 nodes and 1 connection to save (per schema)." });
      return;
    }
    set({ loading: true });
    try {
      const payload = reactFlowToPath(meta, nodes, edges);
      const saved = await saveLearningPath(payload);
      set({
        meta: { ...meta, id: saved.id, version: saved.version },
        statusMessage: `Saved "${saved.name}" (id: ${saved.id}, v${saved.version}).`,
      });
    } catch (e) {
      set({ statusMessage: `Save failed: ${(e as Error).message}` });
    } finally {
      set({ loading: false });
    }
  },

  onNodesChange: (changes) =>
    set({ nodes: applyNodeChanges(changes, get().nodes) as RFNode[] }),

  onEdgesChange: (changes) =>
    set({ edges: applyEdgeChanges(changes, get().edges) as RFEdge[] }),

  onConnect: (conn) => {
    const id = uid("edge");
    const newEdge: RFEdge = {
      id,
      source: conn.source!,
      target: conn.target!,
      type: "conditional",
      data: { conditions: defaultConditions(), priority: get().edges.length + 1 },
    };
    set({ edges: addEdge(newEdge, get().edges) as RFEdge[], selectedEdgeId: id, selectedNodeId: null });
  },

  addComponentNode: (component, position) => {
    const id = uid("node");
    const node: RFNode = {
      id,
      type: "content",
      position,
      data: {
        label: component.title,
        nodeType: nodeTypeForComponent(component),
        componentId: component.id,
        description: component.shortDescription,
        config: {
          approximateDurationMinutes: component.approximateDurationMinutes,
          ...(component.type === "assessment" && component.metadata?.assessment
            ? { assessment: component.metadata.assessment }
            : {}),
        },
      },
    };
    set({ nodes: [...get().nodes, node], selectedNodeId: id, selectedEdgeId: null });
  },

  selectNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  selectEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),

  updateNode: (id, patch) =>
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...patch } } : n,
      ),
    }),

  updateEdge: (id, patch) =>
    set({
      edges: get().edges.map((e) => {
        if (e.id !== id) return e;
        const { label, ...dataPatch } = patch;
        return {
          ...e,
          ...(label !== undefined ? { label } : {}),
          data: { ...e.data, ...dataPatch } as RFEdge["data"],
        };
      }),
    }),

  deleteSelected: () => {
    const { selectedNodeId, selectedEdgeId, nodes, edges } = get();
    if (selectedNodeId) {
      set({
        nodes: nodes.filter((n) => n.id !== selectedNodeId),
        edges: edges.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId),
        selectedNodeId: null,
      });
    } else if (selectedEdgeId) {
      set({ edges: edges.filter((e) => e.id !== selectedEdgeId), selectedEdgeId: null });
    }
  },

  addRule: (edgeId, rule) =>
    set({
      edges: get().edges.map((e) =>
        e.id === edgeId
          ? {
              ...e,
              animated: true,
              data: {
                ...e.data,
                conditions: {
                  operator: e.data?.conditions.operator ?? "AND",
                  rules: [...(e.data?.conditions.rules ?? []), rule],
                },
              } as RFEdge["data"],
            }
          : e,
      ),
    }),

  updateRule: (edgeId, ruleId, patch) =>
    set({
      edges: get().edges.map((e) =>
        e.id === edgeId
          ? {
              ...e,
              data: {
                ...e.data,
                conditions: {
                  operator: e.data!.conditions.operator,
                  rules: e.data!.conditions.rules.map((r) =>
                    r.id === ruleId ? ({ ...r, ...patch } as Rule) : r,
                  ),
                },
              } as RFEdge["data"],
            }
          : e,
      ),
    }),

  removeRule: (edgeId, ruleId) =>
    set({
      edges: get().edges.map((e) =>
        e.id === edgeId
          ? {
              ...e,
              data: {
                ...e.data,
                conditions: {
                  operator: e.data!.conditions.operator,
                  rules: e.data!.conditions.rules.filter((r) => r.id !== ruleId),
                },
              } as RFEdge["data"],
            }
          : e,
      ),
    }),

  setEdgeOperator: (edgeId, operator) =>
    set({
      edges: get().edges.map((e) =>
        e.id === edgeId
          ? {
              ...e,
              data: { ...e.data, conditions: { ...e.data!.conditions, operator } } as RFEdge["data"],
            }
          : e,
      ),
    }),

  setMeta: (patch) => set({ meta: { ...get().meta, ...patch } }),
}));

export { uid };
