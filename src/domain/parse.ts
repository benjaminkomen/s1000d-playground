import { formatDmc, readDmCode } from "./dmc";
import { parseExpr } from "./expr";
import { rangeOf, scanElements } from "./scan";
import {
  asDmc,
  asStepId,
  type Assignment,
  type DataModule,
  type Diagnostic,
  type DmCall,
  type FaultAnswer,
  type FaultModule,
  type FaultStep,
  type Instruction,
  type LinkActuate,
  type LinkShow,
  type Menu,
  type ParsedDocument,
  type ProcessModule,
  type StepId,
  type VariableDecl,
} from "./types";

export function parseDocument(name: string, xml: string): ParsedDocument {
  const diagnostics: Diagnostic[] = [];
  const doc = parseXml(xml, diagnostics);
  if (!doc) return { name, module: null, diagnostics };

  const root = doc.documentElement;
  if (!root || root.localName !== "dmodule") {
    diagnostics.push({
      severity: "error",
      code: "structure",
      message: "The root element must be dmodule.",
    });
    return { name, module: null, diagnostics };
  }

  const dmCode = root.querySelector("dmIdent > dmCode");
  const code = dmCode ? readDmCode(dmCode) : null;
  if (!code) {
    diagnostics.push({
      severity: "error",
      code: "structure",
      message: "dmIdent/dmCode is missing one or more required attributes.",
    });
    return { name, module: null, diagnostics };
  }

  const dmc = formatDmc(code);
  const title = readDmTitle(root.querySelector("dmAddressItems > dmTitle"));
  const techName = title.techName || dmc;
  const infoName = title.infoName;
  const scanned = scanElements(xml);
  const seen = new Set<string>();
  for (const element of scanned) {
    if (!element.id) continue;
    if (seen.has(element.id)) {
      diagnostics.push({
        severity: "error",
        code: "duplicate-id",
        message: `Duplicate id "${element.id}".`,
        dmc,
        stepId: element.id,
        line: element.line,
      });
    }
    seen.add(element.id);
  }

  const fault = root.querySelector("content > faultIsolation");
  const process = root.querySelector("content > process");
  if (fault) {
    return {
      name,
      module: parseFault(fault, { dmc, techName, infoName, scanned }),
      diagnostics,
    };
  }
  if (process) {
    return {
      name,
      module: parseProcess(process, { dmc, techName, infoName, scanned }),
      diagnostics,
    };
  }

  diagnostics.push({
    severity: "error",
    code: "structure",
    message: "content has neither faultIsolation nor process.",
    dmc,
  });
  return { name, module: null, diagnostics };
}

export function parseLibrary(documents: { name: string; xml: string }[]): {
  modules: DataModule[];
  diagnostics: Diagnostic[];
} {
  const modules: DataModule[] = [];
  const diagnostics: Diagnostic[] = [];
  const seen = new Set<string>();
  for (const document of documents) {
    const parsed = parseDocument(document.name, document.xml);
    diagnostics.push(...parsed.diagnostics);
    if (!parsed.module) continue;
    if (seen.has(parsed.module.dmc)) {
      diagnostics.push({
        severity: "error",
        code: "duplicate-id",
        message: `Two data modules use the DMC ${parsed.module.dmc}.`,
        dmc: parsed.module.dmc,
      });
      continue;
    }
    seen.add(parsed.module.dmc);
    modules.push(parsed.module);
  }
  return { modules, diagnostics };
}

function readDmTitle(title: Element | null): { techName: string; infoName: string } {
  const techName = textOf(title ? child(title, "techName") : null);
  const infoName = [textOf(title ? child(title, "infoName") : null), textOf(title ? child(title, "infoNameVariant") : null)]
    .filter(Boolean)
    .join(" ");
  return { techName, infoName };
}

function child(element: Element, name: string): Element | null {
  return [...element.children].find((item) => item.localName === name) ?? null;
}

function parseXml(xml: string, diagnostics: Diagnostic[]): Document | null {
  if (!xml.trim()) {
    diagnostics.push({
      severity: "error",
      code: "well-formed",
      message: "The document is empty.",
    });
    return null;
  }
  try {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const error = doc.getElementsByTagName("parsererror")[0];
    if (error) {
      diagnostics.push({
        severity: "error",
        code: "well-formed",
        message: cleanParserError(error.textContent ?? "XML is not well-formed."),
      });
      return null;
    }
    return doc;
  } catch (error) {
    diagnostics.push({
      severity: "error",
      code: "well-formed",
      message: error instanceof Error ? error.message : "XML is not well-formed.",
    });
    return null;
  }
}

function cleanParserError(text: string): string {
  const line = text.replace(/\s+/g, " ").trim();
  return line || "XML is not well-formed.";
}

interface ParseContext {
  dmc: ReturnType<typeof formatDmc>;
  techName: string;
  infoName: string;
  scanned: ReturnType<typeof scanElements>;
}

function parseFault(fault: Element, ctx: ParseContext): FaultModule {
  const procedure = fault.querySelector("faultIsolationProcedure");
  const main = procedure?.querySelector("isolationProcedure > isolationMainProcedure");
  const steps: FaultStep[] = [];
  if (main) {
    for (const element of walkFaultNodes(main)) steps.push(parseFaultStep(element));
  }
  const summary = textOf(procedure ? child(procedure, "faultDescr") : null);
  const anchors = anchorsFor(ctx, steps.map((step) => step.id));
  return {
    kind: "fault",
    dmc: ctx.dmc,
    techName: ctx.techName,
    infoName: ctx.infoName,
    summary,
    anchors,
    entryId: steps[0]?.id ?? asStepId("missing-entry"),
    steps,
  };
}

function walkFaultNodes(main: Element): Element[] {
  const nodes: Element[] = [];
  for (const child of [...main.children]) {
    if (child.localName === "isolationStep" || child.localName === "isolationProcedureEnd") {
      nodes.push(child);
    } else if (child.localName === "isolationStepAlts") {
      nodes.push(...[...child.children].filter((item) => item.localName === "isolationStep"));
    } else if (child.localName === "isolationProcedureEndAlts") {
      nodes.push(
        ...[...child.children].filter((item) => item.localName === "isolationProcedureEnd"),
      );
    }
  }
  return nodes;
}

function parseFaultStep(element: Element): FaultStep {
  const id = asStepId(element.getAttribute("id") ?? "");
  const role = element.localName === "isolationProcedureEnd" ? "isolationProcedureEnd" : "isolationStep";
  const actions = [...element.children]
    .filter((child) => child.localName === "action")
    .map((action) => textSkipping(action, new Set(["dmRef"])))
    .filter(Boolean);
  const questionElement = [...element.children].find((child) => child.localName === "isolationStepQuestion");
  const question = questionElement ? textOf(questionElement) : undefined;
  const title = textOf([...element.children].find((child) => child.localName === "title") ?? null);
  const calls = [...element.querySelectorAll("action dmRef")].map(readDmRef);
  return {
    id,
    role,
    title: title || question || id,
    actions,
    question: question || undefined,
    answers: readAnswers(element),
    calls,
  };
}

function readAnswers(step: Element): FaultAnswer[] {
  const answers: FaultAnswer[] = [];
  const yesNo = step.querySelector("isolationStepAnswer > yesNoAnswer");
  if (yesNo) {
    const yes = child(yesNo, "yesAnswer");
    const no = child(yesNo, "noAnswer");
    if (yes?.getAttribute("nextActionRefId")) {
      answers.push({
        id: "yes",
        label: "Yes",
        element: "yesAnswer",
        nextId: asStepId(yes.getAttribute("nextActionRefId") ?? ""),
      });
    }
    if (no?.getAttribute("nextActionRefId")) {
      answers.push({
        id: "no",
        label: "No",
        element: "noAnswer",
        nextId: asStepId(no.getAttribute("nextActionRefId") ?? ""),
      });
    }
  }
  const choices = [...step.querySelectorAll("isolationStepAnswer > listOfChoices > choice")];
  choices.forEach((choice, index) => {
    const next = choice.getAttribute("nextActionRefId");
    if (!next) return;
    answers.push({
      id: `choice:${index}`,
      label: textOf(choice) || `Choice ${index + 1}`,
      element: "choice",
      nextId: asStepId(next),
    });
  });
  return answers;
}

function parseProcess(process: Element, ctx: ParseContext): ProcessModule {
  const declarations = child(process, "variableDeclarations");
  const variables = declarations
    ? [...declarations.children].filter((item) => item.localName === "variable").map(readVariable)
    : [];
  const rootElement = [...process.children].find((child) => child.localName === "dmSeq");
  const root = rootElement ? readSequence(rootElement) : [];
  const ids = collectIds(root);
  return {
    kind: "process",
    dmc: ctx.dmc,
    techName: ctx.techName,
    infoName: ctx.infoName,
    summary: "",
    anchors: anchorsFor(ctx, ids),
    variables,
    root,
  };
}

function readVariable(element: Element): VariableDecl {
  const initial = child(element, "initialize")
    ? child(child(element, "initialize") as Element, "expression")
    : null;
  return {
    name: element.getAttribute("variableName") ?? "",
    description: element.getAttribute("variableDescr") ?? undefined,
    valueType: element.getAttribute("valueType") ?? "string",
    initial: initial ? parseExpr(initial) : null,
  };
}

function readSequence(seq: Element): Instruction[] {
  const items: Instruction[] = [];
  for (const child of [...seq.children]) {
    if (child.localName === "dmNode") items.push(readNode(child));
    else if (child.localName === "dmNodeAlts") {
      const first = [...child.children].find((item) => item.localName === "dmNode");
      if (first) items.push(readNode(first));
    } else if (child.localName === "dmIf") items.push(readIf(child));
    else if (child.localName === "dmLoop") items.push(readLoop(child));
    else if (child.localName === "dmSeqAlts") {
      const first = [...child.children].find((item) => item.localName === "dmSeq");
      if (first) items.push(...readSequence(first));
    }
  }
  return items;
}

let generated = 0;

function readNode(element: Element): Instruction {
  const id = asStepId(element.getAttribute("id") || `dmNode-${generated++}`);
  const title = textOf([...element.children].find((child) => child.localName === "title") ?? null);
  const body = [...element.querySelectorAll("proceduralStep para, proceduralStep title")]
    .map((node) => textOf(node))
    .filter(Boolean);
  const calls = [...element.children]
    .filter((child) => child.localName === "dmRef")
    .map(readDmRef);
  const menuElement = element.querySelector("dialog > menu");
  return {
    type: "node",
    id,
    title: title || body[0] || id,
    body,
    calls,
    menu: menuElement ? readMenu(menuElement) : undefined,
  };
}

function readMenu(menu: Element): Menu {
  const prompt = textOf(child(menu, "prompt")) || "Choose one";
  const choices = [...menu.children]
    .filter((item) => item.localName === "menuChoice")
    .map((choice) => ({
      label: textOf(child(choice, "prompt")) || "Choice",
      assignments: readAssertions(choice),
    }));
  return { prompt, choices };
}

function readAssertions(element: Element): Assignment[] {
  return [...element.children]
    .filter((child) => child.localName === "assertion")
    .map((assertion) => {
      const name = assertion.querySelector("variableRef")?.getAttribute("variableName") ?? "";
      const expression = [...assertion.children].find((child) => child.localName === "expression");
      return {
        name,
        value: expression ? parseExpr(expression) : { type: "str" as const, value: "" },
      };
    })
    .filter((assignment) => assignment.name);
}

function readIf(element: Element): Instruction {
  const id = asStepId(element.getAttribute("id") || `dmIf-${generated++}`);
  const expression = [...element.children].find((child) => child.localName === "expression");
  const thenSeq = [...element.children].find((child) => child.localName === "dmThenSeq");
  const elseSeq = [...element.children].find((child) => child.localName === "dmElseSeq");
  const condition = expression ? parseExpr(expression) : { type: "bool" as const, value: false };
  return {
    type: "if",
    id,
    human: expression?.getAttribute("humanReadableForm") || id,
    condition,
    then: thenSeq ? readSequence(thenSeq) : [],
    else: elseSeq ? readSequence(elseSeq) : [],
  };
}

function readLoop(element: Element): Instruction {
  const id = asStepId(element.getAttribute("id") || `dmLoop-${generated++}`);
  const expression = [...element.children].find((child) => child.localName === "expression");
  const body = [...element.children].find((child) => child.localName === "dmSeq");
  const preset = [...element.children].find((child) => child.localName === "variablePreSet");
  const assignments = preset ? readAssertions(preset) : [];
  const condition = expression ? parseExpr(expression) : { type: "bool" as const, value: false };
  return {
    type: "loop",
    id,
    human: expression?.getAttribute("humanReadableForm") || id,
    preset: assignments[0],
    condition,
    body: body ? readSequence(body) : [],
  };
}

function collectIds(items: Instruction[]): StepId[] {
  const ids: StepId[] = [];
  for (const item of items) {
    ids.push(item.id);
    if (item.type === "if") {
      ids.push(...collectIds(item.then), ...collectIds(item.else));
    } else if (item.type === "loop") {
      ids.push(...collectIds(item.body));
    }
  }
  return ids;
}

function readDmRef(element: Element): DmCall {
  const dmCode = element.querySelector("dmRefIdent > dmCode");
  const code = dmCode ? readDmCode(dmCode) : null;
  const title = readDmTitle(element.querySelector("dmRefAddressItems > dmTitle"));
  const techName = title.techName;
  const infoName = title.infoName;
  const behavior = child(element, "behavior");
  const fragment = element.getAttribute("referredFragment");
  return {
    dmc: code ? formatDmc(code) : asDmc(""),
    title: [techName, infoName].filter(Boolean).join(" / ") || "Referenced data module",
    linkShow: readLinkShow(behavior?.getAttribute("linkShow")),
    linkActuate: readLinkActuate(behavior?.getAttribute("linkActuate")),
    referredFragment: fragment ? asStepId(fragment) : undefined,
  };
}

function readLinkShow(value: string | null | undefined): LinkShow {
  if (
    value === "newPane" ||
    value === "embedInContext" ||
    value === "replaceAndReturnToSource" ||
    value === "replaceAndNoReturn"
  ) {
    return value;
  }
  return "unspecified";
}

function readLinkActuate(value: string | null | undefined): LinkActuate {
  if (value === "onLoad" || value === "onRequest") return value;
  return "unspecified";
}

function anchorsFor(ctx: ParseContext, ids: StepId[]) {
  return ids.flatMap((stepId) => {
    const found = ctx.scanned.find((element) => element.id === stepId);
    return found ? [{ stepId, range: rangeOf(found) }] : [];
  });
}

function textOf(element: Element | null | undefined): string {
  if (!element) return "";
  return (element.textContent ?? "").replace(/\s+/g, " ").trim();
}

function textSkipping(element: Element, skip: Set<string>): string {
  let out = "";
  for (const node of [...element.childNodes]) {
    if (node.nodeType === Node.TEXT_NODE) out += node.textContent ?? "";
    else if (node.nodeType === Node.ELEMENT_NODE) {
      const child = node as Element;
      if (skip.has(child.localName)) continue;
      out += ` ${textSkipping(child, skip)}`;
    }
  }
  return out.replace(/\s+/g, " ").trim();
}
