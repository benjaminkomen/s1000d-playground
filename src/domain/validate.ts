import { exprVars } from "./expr";
import { findInstruction } from "./runner";
import {
  type DataModule,
  type Diagnostic,
  type Dmc,
  type Expr,
  type FaultModule,
  type Instruction,
  type ProcessModule,
  type StepId,
} from "./types";

export function validateLibrary(modules: readonly DataModule[]): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const byDmc = new Map(modules.map((module) => [module.dmc, module]));
  for (const module of modules) {
    if (module.kind === "fault") diagnostics.push(...validateFault(module, byDmc));
    else diagnostics.push(...validateProcess(module, byDmc));
  }
  diagnostics.push(...unreachable(modules));
  return diagnostics;
}

function validateFault(module: FaultModule, byDmc: Map<Dmc, DataModule>): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const ids = new Set(module.steps.map((step) => step.id));
  if (module.steps.length === 0) {
    diagnostics.push({
      severity: "error",
      code: "structure",
      message: `${module.dmc} has no isolationStep or isolationProcedureEnd.`,
      dmc: module.dmc,
    });
  }
  for (const step of module.steps) {
    if (!step.id) {
      diagnostics.push({
        severity: "error",
        code: "structure",
        message: "An isolation step is missing its id attribute.",
        dmc: module.dmc,
        line: lineOf(module, step.id),
      });
    }
    for (const answer of step.answers) {
      if (!ids.has(answer.nextId)) {
        diagnostics.push({
          severity: "error",
          code: "broken-ref",
          message: `${answer.element} on ${step.id} points at missing id "${answer.nextId}".`,
          dmc: module.dmc,
          stepId: step.id,
          line: lineOf(module, step.id),
        });
      }
    }
    diagnostics.push(...brokenCalls(module, step.id, step.calls, byDmc));
  }
  return diagnostics;
}

function validateProcess(module: ProcessModule, byDmc: Map<Dmc, DataModule>): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const declared = new Set(module.variables.map((variable) => variable.name));
  if (module.root.length === 0) {
    diagnostics.push({
      severity: "error",
      code: "structure",
      message: `${module.dmc} has an empty dmSeq.`,
      dmc: module.dmc,
    });
  }
  walkInstructions(module.root, (item) => {
    if (item.type === "node") diagnostics.push(...brokenCalls(module, item.id, item.calls, byDmc));
    const exprs: Expr[] = [];
    if (item.type === "if" || item.type === "loop") exprs.push(item.condition);
    if (item.type === "loop" && item.preset) exprs.push(item.preset.value);
    if (item.type === "node" && item.menu) {
      for (const choice of item.menu.choices) {
        for (const assignment of choice.assignments) exprs.push(assignment.value);
      }
    }
    for (const expr of exprs) {
      for (const name of exprVars(expr)) {
        if (!declared.has(name)) {
          diagnostics.push({
            severity: "error",
            code: "broken-ref",
            message: `variableRef "${name}" on ${item.id} is not in variableDeclarations.`,
            dmc: module.dmc,
            stepId: item.id,
            line: lineOf(module, item.id),
          });
        }
      }
    }
  });
  for (const variable of module.variables) {
    if (!variable.initial) continue;
    for (const name of exprVars(variable.initial)) {
      if (!declared.has(name)) {
        diagnostics.push({
          severity: "error",
          code: "broken-ref",
          message: `variable "${variable.name}" initializes from undeclared variable "${name}".`,
          dmc: module.dmc,
        });
      }
    }
  }
  return diagnostics;
}

function brokenCalls(
  module: DataModule,
  stepId: StepId,
  calls: { dmc: Dmc; referredFragment?: StepId }[],
  byDmc: Map<Dmc, DataModule>,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  for (const call of calls) {
    const target = byDmc.get(call.dmc);
    if (!target) {
      diagnostics.push({
        severity: "error",
        code: "broken-ref",
        message: `dmRef ${call.dmc || "(missing dmCode)"} on ${stepId} does not match a loaded data module.`,
        dmc: module.dmc,
        stepId,
        line: lineOf(module, stepId),
      });
      continue;
    }
    if (call.referredFragment && !hasStep(target, call.referredFragment)) {
      diagnostics.push({
        severity: "error",
        code: "broken-ref",
        message: `referredFragment "${call.referredFragment}" is not a step in ${target.dmc}.`,
        dmc: module.dmc,
        stepId,
        line: lineOf(module, stepId),
      });
    }
  }
  return diagnostics;
}

function unreachable(modules: readonly DataModule[]): Diagnostic[] {
  const entry = modules[0];
  if (!entry) return [];
  const byDmc = new Map(modules.map((module) => [module.dmc, module]));
  const seen = new Set<string>();
  const queue: { dmc: Dmc; stepId: StepId }[] = [];
  const push = (dmc: Dmc, stepId: StepId) => {
    const key = `${dmc} ${stepId}`;
    if (seen.has(key)) return;
    seen.add(key);
    queue.push({ dmc, stepId });
  };
  if (entry.kind === "fault") push(entry.dmc, entry.entryId);
  else for (const id of reachableProcess(entry)) push(entry.dmc, id);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    const module = byDmc.get(current.dmc);
    if (!module) continue;
    if (module.kind === "fault") {
      const step = module.steps.find((item) => item.id === current.stepId);
      if (!step) continue;
      for (const answer of step.answers) push(module.dmc, answer.nextId);
      for (const call of step.calls) followCall(call.dmc, call.referredFragment, byDmc, push);
    } else {
      const item = findInstruction(module.root, current.stepId);
      if (item?.type === "node") {
        for (const call of item.calls) followCall(call.dmc, call.referredFragment, byDmc, push);
      }
    }
  }

  const diagnostics: Diagnostic[] = [];
  for (const module of modules) {
    for (const stepId of stepIds(module)) {
      if (seen.has(`${module.dmc} ${stepId}`)) continue;
      diagnostics.push({
        severity: "error",
        code: "unreachable",
        message: `${stepId} in ${module.dmc} cannot be reached from the first data module.`,
        dmc: module.dmc,
        stepId,
        line: lineOf(module, stepId),
      });
    }
  }
  return diagnostics;
}

function followCall(
  dmc: Dmc,
  fragment: StepId | undefined,
  byDmc: Map<Dmc, DataModule>,
  push: (dmc: Dmc, stepId: StepId) => void,
) {
  const target = byDmc.get(dmc);
  if (!target) return;
  if (fragment && hasStep(target, fragment)) {
    push(target.dmc, fragment);
    return;
  }
  if (target.kind === "fault") push(target.dmc, target.entryId);
  else for (const id of reachableProcess(target)) push(target.dmc, id);
}

function reachableProcess(module: ProcessModule): StepId[] {
  const ids: StepId[] = [];
  walkInstructions(module.root, (item) => ids.push(item.id));
  return ids;
}

function walkInstructions(items: readonly Instruction[], visit: (item: Instruction) => void) {
  for (const item of items) {
    visit(item);
    if (item.type === "if") {
      walkInstructions(item.then, visit);
      walkInstructions(item.else, visit);
    } else if (item.type === "loop") walkInstructions(item.body, visit);
  }
}

function stepIds(module: DataModule): StepId[] {
  if (module.kind === "fault") return module.steps.map((step) => step.id);
  return reachableProcess(module);
}

function hasStep(module: DataModule, stepId: StepId): boolean {
  return stepIds(module).includes(stepId);
}

function lineOf(module: DataModule, stepId: StepId): number | undefined {
  return module.anchors.find((anchor) => anchor.stepId === stepId)?.range.line;
}
