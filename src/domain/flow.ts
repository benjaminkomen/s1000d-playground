import { findInstruction } from "./runner";
import type { DataModule, Dmc, Instruction, StepId } from "./types";

export interface FlowNode {
  id: string;
  dmc: Dmc;
  stepId: StepId;
  title: string;
  element: string;
}

export interface FlowEdge {
  id: string;
  from: string;
  to: string;
  label: string;
}

export interface FlowGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export function buildFlow(modules: readonly DataModule[]): FlowGraph {
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  const seen = new Set<string>();

  const addNode = (module: DataModule, stepId: StepId, title: string, element: string) => {
    const id = nodeId(module.dmc, stepId);
    if (seen.has(id)) return id;
    seen.add(id);
    nodes.push({ id, dmc: module.dmc, stepId, title, element });
    return id;
  };

  for (const module of modules) {
    if (module.kind === "fault") {
      for (const step of module.steps) addNode(module, step.id, step.title, step.role);
      for (const step of module.steps) {
        const from = nodeId(module.dmc, step.id);
        step.answers.forEach((answer, index) => {
          if (!module.steps.some((item) => item.id === answer.nextId)) return;
          edges.push({
            id: `${from}-${answer.id}-${index}`,
            from,
            to: nodeId(module.dmc, answer.nextId),
            label: answer.label,
          });
        });
        for (const call of step.calls) addCallEdge(modules, edges, from, call.dmc, call.referredFragment);
      }
    } else {
      addProcess(modules, module, module.root, nodes, edges, seen, null);
    }
  }

  return { nodes, edges };
}

function addProcess(
  modules: readonly DataModule[],
  module: DataModule,
  items: readonly Instruction[],
  nodes: FlowNode[],
  edges: FlowEdge[],
  seen: Set<string>,
  previous: string | null,
) {
  let cursor = previous;
  items.forEach((item, index) => {
    const id = nodeId(module.dmc, item.id);
    if (!seen.has(id)) {
      seen.add(id);
      nodes.push({
        id,
        dmc: module.dmc,
        stepId: item.id,
        title: item.type === "node" ? item.title : item.human,
        element: item.type === "node" ? "dmNode" : item.type === "if" ? "dmIf" : "dmLoop",
      });
    }
    if (cursor) {
      edges.push({ id: `${cursor}-next-${id}-${index}`, from: cursor, to: id, label: "next" });
    }
    if (item.type === "node") {
      for (const call of item.calls) addCallEdge(modules, edges, id, call.dmc, call.referredFragment);
    }
    if (item.type === "if") {
      linkBranch(modules, module, item.then, id, "dmThenSeq", nodes, edges, seen);
      linkBranch(modules, module, item.else, id, "dmElseSeq", nodes, edges, seen);
    }
    if (item.type === "loop") {
      linkBranch(modules, module, item.body, id, "repeat", nodes, edges, seen);
      const tail = item.body.at(-1);
      if (tail) {
        edges.push({
          id: `${nodeId(module.dmc, tail.id)}-back-${id}`,
          from: nodeId(module.dmc, tail.id),
          to: id,
          label: "loop",
        });
      }
    }
    cursor = id;
  });
}

function linkBranch(
  modules: readonly DataModule[],
  module: DataModule,
  items: readonly Instruction[],
  from: string,
  label: string,
  nodes: FlowNode[],
  edges: FlowEdge[],
  seen: Set<string>,
) {
  const head = items[0];
  if (!head) return;
  addProcess(modules, module, items, nodes, edges, seen, null);
  edges.push({
    id: `${from}-${label}-${nodeId(module.dmc, head.id)}`,
    from,
    to: nodeId(module.dmc, head.id),
    label,
  });
}

function addCallEdge(
  modules: readonly DataModule[],
  edges: FlowEdge[],
  from: string,
  dmc: Dmc,
  fragment: StepId | undefined,
) {
  const target = modules.find((module) => module.dmc === dmc);
  if (!target) return;
  const stepId =
    fragment && has(target, fragment)
      ? fragment
      : target.kind === "fault"
        ? target.entryId
        : target.root[0]?.id;
  if (!stepId) return;
  edges.push({
    id: `${from}-call-${nodeId(dmc, stepId)}`,
    from,
    to: nodeId(dmc, stepId),
    label: "dmRef",
  });
}

function has(module: DataModule, stepId: StepId): boolean {
  if (module.kind === "fault") return module.steps.some((step) => step.id === stepId);
  return findInstruction(module.root, stepId) !== null;
}

export function nodeId(dmc: Dmc, stepId: StepId): string {
  return `${dmc}::${stepId}`;
}

export function layoutFlow(graph: FlowGraph, entryId: string | undefined): Map<string, { x: number; y: number }> {
  const rank = new Map<string, number>();
  const start = entryId && graph.nodes.some((node) => node.id === entryId) ? entryId : graph.nodes[0]?.id;
  if (start) {
    const queue = [start];
    rank.set(start, 0);
    while (queue.length > 0) {
      const id = queue.shift();
      if (!id) break;
      const here = rank.get(id) ?? 0;
      for (const edge of graph.edges) {
        if (edge.from !== id || rank.has(edge.to)) continue;
        rank.set(edge.to, here + 1);
        queue.push(edge.to);
      }
    }
  }
  const extra = graph.nodes.length === 0 ? 0 : Math.max(0, ...[...rank.values(), 0]) + 1;
  for (const node of graph.nodes) {
    if (!rank.has(node.id)) rank.set(node.id, extra);
  }
  const columns = new Map<number, string[]>();
  for (const node of graph.nodes) {
    const column = rank.get(node.id) ?? 0;
    const list = columns.get(column) ?? [];
    list.push(node.id);
    columns.set(column, list);
  }
  const positions = new Map<string, { x: number; y: number }>();
  for (const [column, ids] of columns) {
    ids.forEach((id, index) => {
      positions.set(id, { x: column * 250, y: index * 120 });
    });
  }
  return positions;
}
