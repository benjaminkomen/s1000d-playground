import { assign, evalExpr, formatValue, truthy } from "./expr";
import {
  type ChoiceView,
  type Crumb,
  type DataModule,
  type DmCall,
  type Dmc,
  type FaultModule,
  type FaultStep,
  type Instruction,
  type ProcessModule,
  type RunnerView,
  type StepId,
  type Value,
} from "./types";

const LOOP_CAP = 8;

interface FaultFrame {
  kind: "fault";
  dmc: Dmc;
  stepId: StepId;
  returnedFrom?: string;
}

type ProcessScreen =
  | { type: "node"; nodeId: StepId }
  | { type: "decision"; nodeId: StepId; result: boolean }
  | { type: "loop-enter"; nodeId: StepId; iteration: number; capped: boolean }
  | { type: "loop-exit"; nodeId: StepId; iteration: number; capped: boolean }
  | { type: "end" };

interface ProcessFrame {
  kind: "process";
  dmc: Dmc;
  stack: { list: Instruction[]; index: number }[];
  loopParents: (StepId | null)[];
  variables: Record<string, Value>;
  loopIter: Record<string, number>;
  screen: ProcessScreen;
  returnedFrom?: string;
}

type Frame = FaultFrame | ProcessFrame;

export interface Session {
  modules: readonly DataModule[];
  entryDmc: Dmc;
  frames: Frame[];
  path: Crumb[];
  past: { frames: Frame[]; path: Crumb[] }[];
}

export function startSession(modules: readonly DataModule[], entryDmc: Dmc): Session | null {
  const entry = modules.find((module) => module.dmc === entryDmc) ?? modules[0];
  if (!entry) return null;
  const frame = openModule(entry, entry.kind === "fault" ? entry.entryId : undefined);
  const crumb = crumbFor(entry, currentStepId(frame, entry), undefined);
  return { modules, entryDmc: entry.dmc, frames: [frame], path: [crumb], past: [] };
}

export function view(session: Session): RunnerView {
  const frame = top(session);
  const module = mustModule(session, frame.dmc);
  const base = {
    dmc: module.dmc,
    moduleTitle: `${module.techName}${module.infoName ? ` / ${module.infoName}` : ""}`,
    techName: module.techName,
    infoName: module.infoName,
    summary: module.summary,
    path: session.path,
    canBack: session.past.length > 0,
    callDepth: session.frames.length,
    banner:
      session.frames.length > 1
        ? "Referenced data module. Finish it, then return to the caller."
        : undefined,
  };

  if (frame.kind === "fault") {
    const step = faultStep(module as FaultModule, frame.stepId);
    const choices = faultChoices(step, session.frames.length > 1);
    return {
      ...base,
      stepId: step.id,
      element: step.role,
      title: step.title,
      body: step.actions,
      prompt: step.question,
      note: noteFor(frame.returnedFrom, step),
      choices,
      ended: choices.length === 0,
      variables: [],
    };
  }

  const process = module as ProcessModule;
  const shown = processView(process, frame, session.frames.length > 1);
  return {
    ...base,
    ...shown,
    variables: process.variables.map((variable) => ({
      name: variable.name,
      value: formatValue(frame.variables[variable.name]),
    })),
    note: [shown.note, frame.returnedFrom ? `Returned from ${frame.returnedFrom}.` : ""]
      .filter(Boolean)
      .join(" "),
  };
}

export function act(session: Session, choiceId: string): Session {
  const before = view(session);
  if (!before.choices.some((choice) => choice.id === choiceId)) return session;
  const past = [...session.past, { frames: clone(session.frames), path: clone(session.path) }];
  const next = applyChoice(session, choiceId);
  return { ...next, past };
}

export function back(session: Session): Session {
  const previous = session.past[session.past.length - 1];
  if (!previous) return session;
  return {
    ...session,
    frames: previous.frames,
    path: previous.path,
    past: session.past.slice(0, -1),
  };
}

export function restart(session: Session): Session {
  return startSession(session.modules, session.entryDmc) ?? session;
}

function applyChoice(session: Session, choiceId: string): Session {
  const frame = top(session);
  if (choiceId === "return") return doReturn(session);
  if (choiceId.startsWith("call:")) {
    const index = Number(choiceId.slice(5));
    const call = callsOf(session, frame)[index];
    if (!call) return session;
    return pushCall(session, call);
  }
  if (frame.kind === "fault") {
    const module = mustModule(session, frame.dmc) as FaultModule;
    const step = faultStep(module, frame.stepId);
    const answer = step.answers.find((item) => item.id === choiceId);
    if (!answer) return session;
    const nextFrame: FaultFrame = { kind: "fault", dmc: frame.dmc, stepId: answer.nextId };
    return {
      ...session,
      frames: replaceTop(session.frames, nextFrame),
      path: [...session.path, crumbFor(module, answer.nextId, answer.label)],
    };
  }
  return applyProcess(session, frame, choiceId);
}

function applyProcess(session: Session, frame: ProcessFrame, choiceId: string): Session {
  const module = mustModule(session, frame.dmc) as ProcessModule;
  let next = frame;
  if (frame.screen.type === "node" && choiceId.startsWith("menu:")) {
    const node = findInstruction(module.root, frame.screen.nodeId);
    const menuIndex = Number(choiceId.slice(5));
    const choice = node && node.type === "node" ? node.menu?.choices[menuIndex] : undefined;
    if (!choice) return session;
    let variables = frame.variables;
    for (const assignment of choice.assignments) variables = assign(assignment, variables);
    next = advance({ ...frame, variables, returnedFrom: undefined });
  } else if (frame.screen.type === "node") {
    next = advance({ ...frame, returnedFrom: undefined });
  } else if (frame.screen.type === "decision") {
    const item = findInstruction(module.root, frame.screen.nodeId);
    if (!item || item.type !== "if") return session;
    const branch = frame.screen.result ? item.then : item.else;
    next =
      branch.length === 0
        ? advance(frame)
        : arrive({
            ...frame,
            stack: [...frame.stack, { list: branch, index: 0 }],
            loopParents: [...frame.loopParents, null],
          });
  } else if (frame.screen.type === "loop-enter") {
    const item = findInstruction(module.root, frame.screen.nodeId);
    if (!item || item.type !== "loop") return session;
    next = arrive({
      ...frame,
      stack: [...frame.stack, { list: item.body, index: 0 }],
      loopParents: [...frame.loopParents, item.id],
    });
  } else if (frame.screen.type === "loop-exit") {
    next = advance(frame);
  } else {
    return session;
  }
  const stepId = currentStepId(next, module);
  const via = viewChoiceLabel(module, frame, choiceId);
  return {
    ...session,
    frames: replaceTop(session.frames, next),
    path: [...session.path, crumbFor(module, stepId, via)],
  };
}

function pushCall(session: Session, call: DmCall): Session {
  const target = session.modules.find((module) => module.dmc === call.dmc);
  if (!target) return session;
  const entry = target.kind === "fault" ? target.entryId : undefined;
  let frames = session.frames;
  if (call.linkShow === "replaceAndNoReturn") frames = frames.slice(0, -1);
  const opened = openModule(target, entry);
  if (target.kind === "fault" && call.referredFragment && target.steps.some((step) => step.id === call.referredFragment)) {
    (opened as FaultFrame).stepId = call.referredFragment;
  }
  return {
    ...session,
    frames: [...frames, opened],
    path: [...session.path, crumbFor(target, currentStepId(opened, target), `Run ${call.title}`)],
  };
}

function doReturn(session: Session): Session {
  if (session.frames.length < 2) return session;
  const leaving = top(session);
  const leavingModule = mustModule(session, leaving.dmc);
  const frames = session.frames.slice(0, -1);
  const caller = frames[frames.length - 1];
  if (!caller) return session;
  frames[frames.length - 1] = { ...caller, returnedFrom: leavingModule.techName };
  const callerModule = mustModule(session, caller.dmc);
  return {
    ...session,
    frames,
    path: [
      ...session.path,
      crumbFor(callerModule, currentStepId(caller, callerModule), `Return from ${leavingModule.techName}`),
    ],
  };
}

function openModule(module: DataModule, stepId: StepId | undefined): Frame {
  if (module.kind === "fault") {
    return { kind: "fault", dmc: module.dmc, stepId: stepId && module.steps.some((step) => step.id === stepId) ? stepId : module.entryId };
  }
  const variables: Record<string, Value> = {};
  for (const variable of module.variables) {
    variables[variable.name] = variable.initial
      ? evalExpr(variable.initial, variables)
      : { type: "unset" };
  }
  return arrive({
    kind: "process",
    dmc: module.dmc,
    stack: [{ list: module.root, index: 0 }],
    loopParents: [null],
    variables,
    loopIter: {},
    screen: { type: "end" },
  });
}

function arrive(frame: ProcessFrame): ProcessFrame {
  const topFrame = frame.stack[frame.stack.length - 1];
  if (!topFrame || topFrame.index >= topFrame.list.length) return unwind(frame);
  const item = topFrame.list[topFrame.index];
  if (!item) return unwind(frame);
  if (item.type === "node") return { ...frame, screen: { type: "node", nodeId: item.id } };
  if (item.type === "if") {
    return {
      ...frame,
      screen: { type: "decision", nodeId: item.id, result: truthy(evalExpr(item.condition, frame.variables)) },
    };
  }
  const iteration = (frame.loopIter[item.id] ?? 0) + 1;
  const variables = item.preset ? assign(item.preset, frame.variables) : frame.variables;
  const capped = iteration > LOOP_CAP;
  const open = !capped && truthy(evalExpr(item.condition, variables));
  return {
    ...frame,
    variables,
    loopIter: { ...frame.loopIter, [item.id]: iteration },
    screen: {
      type: open ? "loop-enter" : "loop-exit",
      nodeId: item.id,
      iteration,
      capped,
    },
  };
}

function advance(frame: ProcessFrame): ProcessFrame {
  const stack = frame.stack.map((entry, index) =>
    index === frame.stack.length - 1 ? { ...entry, index: entry.index + 1 } : entry,
  );
  return unwind({ ...frame, stack });
}

function unwind(frame: ProcessFrame): ProcessFrame {
  let current = frame;
  while (current.stack.length > 0) {
    const cursor = current.stack[current.stack.length - 1];
    if (cursor && cursor.index < cursor.list.length) return arrive(current);
    const loopId = current.loopParents[current.loopParents.length - 1] ?? null;
    current = {
      ...current,
      stack: current.stack.slice(0, -1),
      loopParents: current.loopParents.slice(0, -1),
    };
    if (loopId) return current.stack.length === 0 ? { ...current, screen: { type: "end" } } : arrive(current);
    if (current.stack.length === 0) return { ...current, screen: { type: "end" } };
    const parent = current.stack[current.stack.length - 1];
    if (!parent) return { ...current, screen: { type: "end" } };
    current = {
      ...current,
      stack: current.stack.slice(0, -1).concat({ ...parent, index: parent.index + 1 }),
    };
  }
  return { ...current, screen: { type: "end" } };
}

function processView(
  module: ProcessModule,
  frame: ProcessFrame,
  hasCaller: boolean,
): Omit<
  RunnerView,
  | "dmc"
  | "moduleTitle"
  | "techName"
  | "infoName"
  | "summary"
  | "path"
  | "canBack"
  | "callDepth"
  | "banner"
  | "variables"
> {
  const screen = frame.screen;
  if (screen.type === "end") {
    const choices = hasCaller ? [{ id: "return", label: "Return to caller", element: "dmRef" }] : [];
    return {
      stepId: module.root.at(-1)?.id ?? asMissing(),
      element: "dmSeq",
      title: "Procedure complete",
      body: ["The dmSeq has finished."],
      choices,
      ended: choices.length === 0,
    };
  }
  const item = findInstruction(module.root, screen.nodeId);
  if (!item) {
    return {
      stepId: screen.nodeId,
      element: "dmNode",
      title: screen.nodeId,
      body: [],
      choices: [],
      ended: true,
    };
  }
  if (item.type === "node" && screen.type === "node") {
    const choices: ChoiceView[] = [
      ...item.calls.map((call, index) => ({
        id: `call:${index}`,
        label: `Run ${call.title}`,
        element: "dmRef",
      })),
    ];
    if (item.menu) {
      item.menu.choices.forEach((choice, index) => {
        choices.push({ id: `menu:${index}`, label: choice.label, element: "menuChoice" });
      });
    } else {
      choices.push({ id: "continue", label: "Continue", element: "dmNode" });
    }
    return {
      stepId: item.id,
      element: "dmNode",
      title: item.title,
      body: item.body,
      prompt: item.menu?.prompt,
      choices,
      ended: false,
    };
  }
  if (item.type === "if" && screen.type === "decision") {
    const taken = screen.result ? "dmThenSeq" : "dmElseSeq";
    return {
      stepId: item.id,
      element: "dmIf",
      title: item.human,
      body: [],
      note: `The condition is ${screen.result ? "true" : "false"}.`,
      choices: [{ id: "continue", label: `Follow ${taken}`, element: taken }],
      ended: false,
    };
  }
  if (item.type === "loop" && (screen.type === "loop-enter" || screen.type === "loop-exit")) {
    const entering = screen.type === "loop-enter";
    return {
      stepId: item.id,
      element: "dmLoop",
      title: item.human,
      body: [],
      note: entering
        ? `The dmLoop condition is true. Iteration ${screen.iteration}.`
        : screen.capped
          ? `Stopped after ${LOOP_CAP} iterations so the loop cannot run forever.`
          : "The dmLoop condition is false, so the loop ends.",
      choices: [
        {
          id: "continue",
          label: entering ? "Enter dmSeq" : "Leave dmLoop",
          element: entering ? "dmSeq" : "dmLoop",
        },
      ],
      ended: false,
    };
  }
  return {
    stepId: item.id,
    element: item.type,
    title: item.id,
    body: [],
    choices: [],
    ended: true,
  };
}

function faultChoices(step: FaultStep, hasCaller: boolean): ChoiceView[] {
  if (step.role === "isolationProcedureEnd") {
    return hasCaller ? [{ id: "return", label: "Return to caller", element: "dmRef" }] : [];
  }
  const choices: ChoiceView[] = step.calls.map((call, index) => ({
    id: `call:${index}`,
    label: `Run ${call.title}`,
    element: "dmRef",
  }));
  for (const answer of step.answers) {
    choices.push({ id: answer.id, label: answer.label, element: answer.element });
  }
  return choices;
}

function noteFor(returnedFrom: string | undefined, step: FaultStep): string | undefined {
  const parts = [];
  if (returnedFrom) parts.push(`Returned from ${returnedFrom}.`);
  if (step.role === "isolationStep" && step.calls.length > 0) {
    const call = step.calls[0];
    if (call) {
      parts.push(
        `behavior linkShow is ${call.linkShow}. Open the referenced data module, then answer this step.`,
      );
    }
  }
  return parts.join(" ") || undefined;
}

function callsOf(session: Session, frame: Frame): DmCall[] {
  const module = mustModule(session, frame.dmc);
  if (frame.kind === "fault") return faultStep(module as FaultModule, frame.stepId).calls;
  if (frame.screen.type !== "node") return [];
  const node = findInstruction((module as ProcessModule).root, frame.screen.nodeId);
  return node && node.type === "node" ? node.calls : [];
}

function faultStep(module: FaultModule, stepId: StepId): FaultStep {
  return (
    module.steps.find((step) => step.id === stepId) ?? {
      id: stepId,
      role: "isolationStep",
      title: `Missing step ${stepId}`,
      actions: [],
      answers: [],
      calls: [],
    }
  );
}

export function findInstruction(items: readonly Instruction[], id: StepId): Instruction | null {
  for (const item of items) {
    if (item.id === id) return item;
    if (item.type === "if") {
      const found = findInstruction(item.then, id) ?? findInstruction(item.else, id);
      if (found) return found;
    } else if (item.type === "loop") {
      const found = findInstruction(item.body, id);
      if (found) return found;
    }
  }
  return null;
}

function currentStepId(frame: Frame, module: DataModule): StepId {
  if (frame.kind === "fault") return frame.stepId;
  if (frame.screen.type === "end") return module.kind === "process" ? module.root.at(-1)?.id ?? asMissing() : asMissing();
  return frame.screen.nodeId;
}

function crumbFor(module: DataModule, stepId: StepId, via: string | undefined): Crumb {
  return { dmc: module.dmc, stepId, label: labelFor(module, stepId), via };
}

function labelFor(module: DataModule, stepId: StepId): string {
  if (module.kind === "fault") return module.steps.find((step) => step.id === stepId)?.title ?? stepId;
  const item = findInstruction(module.root, stepId);
  if (!item) return "Procedure complete";
  if (item.type === "node") return item.title;
  return item.human;
}

function viewChoiceLabel(module: ProcessModule, frame: ProcessFrame, choiceId: string): string {
  if (frame.screen.type === "node" && choiceId.startsWith("menu:")) {
    const node = findInstruction(module.root, frame.screen.nodeId);
    const choice = node && node.type === "node" ? node.menu?.choices[Number(choiceId.slice(5))] : undefined;
    return choice?.label ?? choiceId;
  }
  if (frame.screen.type === "decision") return frame.screen.result ? "Condition true" : "Condition false";
  if (frame.screen.type === "loop-enter") return "Loop again";
  if (frame.screen.type === "loop-exit") return "Loop ended";
  return "Continue";
}

function top(session: Session): Frame {
  const frame = session.frames[session.frames.length - 1];
  if (!frame) throw new Error("Session has no frame.");
  return frame;
}

function mustModule(session: Session, dmc: Dmc): DataModule {
  const module = session.modules.find((item) => item.dmc === dmc);
  if (!module) throw new Error(`Missing data module ${dmc}.`);
  return module;
}

function replaceTop(frames: Frame[], frame: Frame): Frame[] {
  return frames.slice(0, -1).concat(frame);
}

function asMissing(): StepId {
  return "missing" as StepId;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function hasCaller(session: Session): boolean {
  return session.frames.length > 1;
}
