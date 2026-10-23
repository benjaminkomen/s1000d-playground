declare const dmcBrand: unique symbol;
declare const stepIdBrand: unique symbol;

/** Data module code, the usual hyphenated form from the dmCode attributes. */
export type Dmc = string & { readonly [dmcBrand]: "Dmc" };

/** An id attribute on a step the runner can land on. */
export type StepId = string & { readonly [stepIdBrand]: "StepId" };

export function asDmc(value: string): Dmc {
  return value as Dmc;
}

export function asStepId(value: string): StepId {
  return value as StepId;
}

export interface DmCode {
  modelIdentCode: string;
  systemDiffCode: string;
  systemCode: string;
  subSystemCode: string;
  subSubSystemCode: string;
  assyCode: string;
  disassyCode: string;
  disassyCodeVariant: string;
  infoCode: string;
  infoCodeVariant: string;
  itemLocationCode: string;
}

export type LinkShow =
  | "newPane"
  | "embedInContext"
  | "replaceAndReturnToSource"
  | "replaceAndNoReturn"
  | "unspecified";

export type LinkActuate = "onLoad" | "onRequest" | "unspecified";

export interface DmCall {
  dmc: Dmc;
  title: string;
  linkShow: LinkShow;
  linkActuate: LinkActuate;
  referredFragment?: StepId;
}

export interface SourceRange {
  start: number;
  end: number;
  line: number;
}

export interface Anchor {
  stepId: StepId;
  range: SourceRange;
}

export interface FaultAnswer {
  id: string;
  label: string;
  element: "yesAnswer" | "noAnswer" | "choice";
  nextId: StepId;
}

export interface FaultStep {
  id: StepId;
  role: "isolationStep" | "isolationProcedureEnd";
  title: string;
  actions: string[];
  question?: string;
  answers: FaultAnswer[];
  calls: DmCall[];
}

export type Value =
  | { type: "boolean"; value: boolean }
  | { type: "number"; value: number }
  | { type: "string"; value: string }
  | { type: "unset" };

export type Expr =
  | { type: "var"; name: string }
  | { type: "bool"; value: boolean }
  | { type: "num"; value: number }
  | { type: "str"; value: string }
  | {
      type: "binop";
      op: string;
      kind: "boolean" | "number" | "string";
      left: Expr;
      right: Expr;
    }
  | { type: "not"; arg: Expr }
  | { type: "defined"; arg: Expr };

export interface Assignment {
  name: string;
  value: Expr;
}

export interface MenuChoice {
  label: string;
  assignments: Assignment[];
}

export interface Menu {
  prompt: string;
  choices: MenuChoice[];
}

export type Instruction =
  | {
      type: "node";
      id: StepId;
      title: string;
      body: string[];
      calls: DmCall[];
      menu?: Menu;
    }
  | {
      type: "if";
      id: StepId;
      human: string;
      condition: Expr;
      then: Instruction[];
      else: Instruction[];
    }
  | {
      type: "loop";
      id: StepId;
      human: string;
      preset?: Assignment;
      condition: Expr;
      body: Instruction[];
    };

export interface VariableDecl {
  name: string;
  description?: string;
  valueType: string;
  initial: Expr | null;
}

interface ModuleBase {
  dmc: Dmc;
  techName: string;
  infoName: string;
  summary: string;
  anchors: Anchor[];
}

export interface FaultModule extends ModuleBase {
  kind: "fault";
  entryId: StepId;
  steps: FaultStep[];
}

export interface ProcessModule extends ModuleBase {
  kind: "process";
  variables: VariableDecl[];
  root: Instruction[];
}

export type DataModule = FaultModule | ProcessModule;

export interface Diagnostic {
  severity: "error";
  code: "well-formed" | "broken-ref" | "unreachable" | "duplicate-id" | "structure";
  message: string;
  dmc?: Dmc;
  stepId?: StepId;
  line?: number;
}

export interface ParsedDocument {
  name: string;
  module: DataModule | null;
  diagnostics: Diagnostic[];
}

export interface ChoiceView {
  id: string;
  label: string;
  element: string;
}

export interface Crumb {
  dmc: Dmc;
  stepId: StepId;
  label: string;
  via?: string;
}

export interface RunnerView {
  dmc: Dmc;
  moduleTitle: string;
  techName: string;
  infoName: string;
  summary: string;
  stepId: StepId;
  element: string;
  title: string;
  body: string[];
  prompt?: string;
  note?: string;
  choices: ChoiceView[];
  ended: boolean;
  path: Crumb[];
  variables: { name: string; value: string }[];
  canBack: boolean;
  callDepth: number;
  banner?: string;
}

export interface OutlineItem {
  stepId: StepId;
  title: string;
  element: string;
}
