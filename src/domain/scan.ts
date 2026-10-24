import { asStepId, type SourceRange, type StepId } from "./types";

export interface ScannedElement {
  name: string;
  id?: StepId;
  attrs: Record<string, string>;
  start: number;
  end: number;
  line: number;
}

export function scanElements(xml: string): ScannedElement[] {
  const elements: ScannedElement[] = [];
  const stack: ScannedElement[] = [];
  let i = 0;
  let line = 1;

  const bump = (text: string) => {
    for (const char of text) {
      if (char === "\n") line += 1;
    }
  };

  while (i < xml.length) {
    const lt = xml.indexOf("<", i);
    if (lt === -1) break;
    bump(xml.slice(i, lt));
    if (xml.startsWith("<!--", lt)) {
      const close = xml.indexOf("-->", lt + 4);
      const end = close === -1 ? xml.length : close + 3;
      bump(xml.slice(lt, end));
      i = end;
      continue;
    }
    if (xml.startsWith("<![CDATA[", lt)) {
      const close = xml.indexOf("]]>", lt + 9);
      const end = close === -1 ? xml.length : close + 3;
      bump(xml.slice(lt, end));
      i = end;
      continue;
    }
    if (xml.startsWith("<?", lt)) {
      const close = xml.indexOf("?>", lt + 2);
      const end = close === -1 ? xml.length : close + 2;
      bump(xml.slice(lt, end));
      i = end;
      continue;
    }
    if (xml.startsWith("</", lt)) {
      const close = xml.indexOf(">", lt + 2);
      const end = close === -1 ? xml.length : close + 1;
      const open = stack.pop();
      if (open) open.end = end;
      bump(xml.slice(lt, end));
      i = end;
      continue;
    }

    const startLine = line;
    const close = xml.indexOf(">", lt + 1);
    if (close === -1) break;
    const raw = xml.slice(lt + 1, close);
    const selfClosing = /\/\s*$/.test(raw);
    const body = selfClosing ? raw.replace(/\/\s*$/, "") : raw;
    const nameMatch = /^([A-Za-z_][\w:.-]*)/.exec(body.trim());
    const name = nameMatch?.[1]?.split(":").pop() ?? "";
    const attrs = readAttrs(body);
    const element: ScannedElement = {
      name,
      id: attrs.id ? asStepId(attrs.id) : undefined,
      attrs,
      start: lt,
      end: close + 1,
      line: startLine,
    };
    elements.push(element);
    if (!selfClosing) stack.push(element);
    bump(xml.slice(lt, close + 1));
    i = close + 1;
  }

  return elements;
}

function readAttrs(body: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const pattern = /([A-Za-z_][\w:.-]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
  for (const match of body.matchAll(pattern)) {
    const key = match[1]?.split(":").pop();
    if (!key) continue;
    attrs[key] = match[3] ?? match[4] ?? "";
  }
  return attrs;
}

export function rangeOf(element: ScannedElement): SourceRange {
  return { start: element.start, end: element.end, line: element.line };
}

export function innermostAt(
  anchors: { stepId: StepId; range: SourceRange }[],
  offset: number,
): StepId | null {
  let best: { stepId: StepId; size: number } | null = null;
  for (const anchor of anchors) {
    const { start, end } = anchor.range;
    if (offset < start || offset > end) continue;
    const size = end - start;
    if (!best || size < best.size) best = { stepId: anchor.stepId, size };
  }
  return best?.stepId ?? null;
}
