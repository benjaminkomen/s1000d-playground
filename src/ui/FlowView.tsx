import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { buildFlow, layoutFlow, nodeId } from "../domain/flow";
import type { DataModule, Dmc, StepId } from "../domain/types";

interface FlowViewProps {
  modules: readonly DataModule[];
  currentDmc?: Dmc;
  currentStepId?: StepId;
  focusedDmc?: Dmc;
  focusedStepId?: StepId;
  onSelect: (dmc: Dmc, stepId: StepId) => void;
}

type StepData = {
  title: string;
  element: string;
  stepId: StepId;
  dmc: Dmc;
  focused: boolean;
  current: boolean;
};

function StepNode({ data }: NodeProps<Node<StepData, "step">>) {
  return (
    <div className={`flow-node${data.focused ? " is-focused" : ""}${data.current ? " is-current" : ""}`} data-testid="flow-node" data-step-id={data.stepId}>
      <Handle type="target" position={Position.Left} />
      <span>{data.element}</span>
      <strong>{data.title}</strong>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes = { step: StepNode };

export function FlowView({ modules, currentDmc, currentStepId, focusedDmc, focusedStepId, onSelect }: FlowViewProps) {
  const graph = buildFlow(modules);
  const entry = modules[0];
  const entryNode = entry
    ? nodeId(entry.dmc, entry.kind === "fault" ? entry.entryId : entry.root[0]?.id ?? ("missing" as StepId))
    : undefined;
  const positions = layoutFlow(graph, entryNode);
  const nodes = graph.nodes.map((node) => ({
    id: node.id,
    type: "step" as const,
    position: positions.get(node.id) ?? { x: 0, y: 0 },
    data: {
      title: node.title,
      element: node.element,
      stepId: node.stepId,
      dmc: node.dmc,
      focused: node.dmc === focusedDmc && node.stepId === focusedStepId,
      current: node.dmc === currentDmc && node.stepId === currentStepId,
    },
    style: { width: 210 },
  }));
  const edges = graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.from,
    target: edge.to,
    label: edge.label,
  }));

  return (
    <div className="flow-frame" data-testid="flow-view">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        onNodeClick={(_event, node) => {
          const data = node.data as StepData;
          onSelect(data.dmc, data.stepId);
        }}
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
