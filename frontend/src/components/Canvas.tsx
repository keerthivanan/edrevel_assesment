import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type EdgeMouseHandler,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useRef } from "react";

import { useBuilder } from "../store";
import type { AvailableComponent } from "../types";
import ConditionalEdge from "./ConditionalEdge";
import ContentNode from "./ContentNode";

const nodeTypes = { content: ContentNode };
const edgeTypes = { conditional: ConditionalEdge };

function CanvasInner() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const nodes = useBuilder((s) => s.nodes);
  const edges = useBuilder((s) => s.edges);
  const onNodesChange = useBuilder((s) => s.onNodesChange);
  const onEdgesChange = useBuilder((s) => s.onEdgesChange);
  const onConnect = useBuilder((s) => s.onConnect);
  const addComponentNode = useBuilder((s) => s.addComponentNode);
  const selectNode = useBuilder((s) => s.selectNode);
  const selectEdge = useBuilder((s) => s.selectEdge);

  const onNodeClick: NodeMouseHandler = useCallback((_, n) => selectNode(n.id), [selectNode]);
  const onEdgeClick: EdgeMouseHandler = useCallback((_, e) => selectEdge(e.id), [selectEdge]);
  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData("application/alpb-component");
      if (!raw) return;
      const component = JSON.parse(raw) as AvailableComponent;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      addComponentNode(component, position);
    },
    [screenToFlowPosition, addComponentNode],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  return (
    <div className="canvas" ref={wrapperRef} onDrop={onDrop} onDragOver={onDragOver}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        defaultViewport={{ x: 0, y: 0, zoom: 0.85 }}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} color="#e2e8f0" />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          nodeStrokeWidth={3}
          nodeBorderRadius={6}
          maskColor="rgba(241, 245, 249, 0.7)"
          nodeColor={(n) => {
            const t = (n.data as { nodeType?: string } | undefined)?.nodeType;
            return (
              { assessment: "#8b5cf6", unit: "#3b82f6", start: "#10b981", end: "#475569" }[
                t ?? ""
              ] ?? "#94a3b8"
            );
          }}
        />
      </ReactFlow>
    </div>
  );
}

export default function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
