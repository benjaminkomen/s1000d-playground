import type { Assignment, Expr, Value } from "./types";

export function parseExpr(element: Element): Expr {
  const kids = [...element.children];
  if (kids.length === 3 && kids[1] && isOperator(kids[1].localName)) {
    const op = kids[1];
    const kind = operatorKind(op.localName);
    return {
      type: "binop",
      op: op.getAttribute(operatorAttr(op.localName)) ?? op.localName,
      kind,
      left: parseExpr(kids[0] as Element),
      right: parseExpr(kids[2] as Element),
    };
  }
  if (kids.length === 2 && kids[0] && isFunction(kids[0].localName)) {
    const action = kids[0].getAttribute(functionAttr(kids[0].localName));
    const arg = parseExpr(kids[1] as Element);
    if (action === "not") return { type: "not", arg };
    return { type: "defined", arg };
  }
  const only = kids[0];
  if (!only) return { type: "str", value: element.textContent?.trim() ?? "" };
  switch (only.localName) {
    case "variableRef":
      return { type: "var", name: only.getAttribute("variableName") ?? "" };
    case "booleanValue":
      return { type: "bool", value: only.getElementsByTagName("trueValue").length > 0 };
    case "integerValue":
    case "realValue":
      return { type: "num", value: Number(only.textContent?.trim() ?? "0") };
    case "stringValue":
      return { type: "str", value: only.textContent ?? "" };
    case "expression":
      return parseExpr(only);
    default:
      return { type: "str", value: only.textContent?.trim() ?? "" };
  }
}

function isOperator(name: string): boolean {
  return (
    name === "booleanOperator" ||
    name === "numberOperator" ||
    name === "stringOperator" ||
    name === "setOperator"
  );
}

function operatorKind(name: string): "boolean" | "number" | "string" {
  if (name === "numberOperator") return "number";
  if (name === "stringOperator") return "string";
  return "boolean";
}

function operatorAttr(name: string): string {
  if (name === "numberOperator") return "numberOperation";
  if (name === "stringOperator") return "stringOperation";
  if (name === "setOperator") return "setOperation";
  return "booleanOperation";
}

function isFunction(name: string): boolean {
  return (
    name === "booleanFunction" ||
    name === "numberFunction" ||
    name === "stringFunction" ||
    name === "setFunction"
  );
}

function functionAttr(name: string): string {
  if (name === "numberFunction") return "numberAction";
  if (name === "stringFunction") return "stringAction";
  if (name === "setFunction") return "setAction";
  return "booleanAction";
}

export function evalExpr(expr: Expr, variables: Record<string, Value>): Value {
  switch (expr.type) {
    case "var":
      return variables[expr.name] ?? { type: "unset" };
    case "bool":
      return { type: "boolean", value: expr.value };
    case "num":
      return { type: "number", value: expr.value };
    case "str":
      return { type: "string", value: expr.value };
    case "not": {
      const inner = evalExpr(expr.arg, variables);
      return { type: "boolean", value: !truthy(inner) };
    }
    case "defined": {
      const inner = evalExpr(expr.arg, variables);
      return { type: "boolean", value: inner.type !== "unset" };
    }
    case "binop":
      return evalBinop(expr.op, evalExpr(expr.left, variables), evalExpr(expr.right, variables));
  }
}

function evalBinop(op: string, left: Value, right: Value): Value {
  if (op === "and") return { type: "boolean", value: truthy(left) && truthy(right) };
  if (op === "or") return { type: "boolean", value: truthy(left) || truthy(right) };
  if (op === "exclusiveOr") return { type: "boolean", value: truthy(left) !== truthy(right) };
  if (op === "plus" || op === "minus" || op === "times" || op === "divide") {
    return { type: "number", value: numOp(op, asNumber(left), asNumber(right)) };
  }
  if (
    op === "lessThan" ||
    op === "greaterThan" ||
    op === "lessThanOrEqual" ||
    op === "greaterThanOrEqual"
  ) {
    return { type: "boolean", value: cmpOp(op, asNumber(left), asNumber(right)) };
  }
  if (op === "equal") return { type: "boolean", value: same(left, right) };
  if (op === "notEqual") return { type: "boolean", value: !same(left, right) };
  return { type: "unset" };
}

function numOp(op: string, left: number, right: number): number {
  if (op === "plus") return left + right;
  if (op === "minus") return left - right;
  if (op === "times") return left * right;
  if (right === 0) return Number.NaN;
  return left / right;
}

function cmpOp(op: string, left: number, right: number): boolean {
  if (op === "lessThan") return left < right;
  if (op === "greaterThan") return left > right;
  if (op === "lessThanOrEqual") return left <= right;
  return left >= right;
}

function asNumber(value: Value): number {
  if (value.type === "number") return value.value;
  if (value.type === "boolean") return value.value ? 1 : 0;
  if (value.type === "string") return Number(value.value);
  return Number.NaN;
}

function same(left: Value, right: Value): boolean {
  if (left.type === "unset" || right.type === "unset") return false;
  if (left.type === "boolean" && right.type === "boolean") return left.value === right.value;
  if (left.type === "number" && right.type === "number") return left.value === right.value;
  if (left.type === "string" && right.type === "string") return left.value === right.value;
  return false;
}

export function truthy(value: Value): boolean {
  if (value.type === "boolean") return value.value;
  if (value.type === "number") return value.value !== 0 && !Number.isNaN(value.value);
  if (value.type === "string") return value.value.length > 0;
  return false;
}

export function assign(assignment: Assignment, variables: Record<string, Value>): Record<string, Value> {
  return { ...variables, [assignment.name]: evalExpr(assignment.value, variables) };
}

export function formatValue(value: Value | undefined): string {
  if (!value || value.type === "unset") return "unset";
  if (value.type === "boolean") return value.value ? "true" : "false";
  return String(value.value);
}

export function exprVars(expr: Expr, into: Set<string> = new Set()): Set<string> {
  switch (expr.type) {
    case "var":
      if (expr.name) into.add(expr.name);
      break;
    case "binop":
      exprVars(expr.left, into);
      exprVars(expr.right, into);
      break;
    case "not":
    case "defined":
      exprVars(expr.arg, into);
      break;
    default:
      break;
  }
  return into;
}

export function describeExpr(expr: Expr): string {
  switch (expr.type) {
    case "var":
      return expr.name;
    case "bool":
      return expr.value ? "true" : "false";
    case "num":
      return String(expr.value);
    case "str":
      return expr.value;
    case "not":
      return `not ${describeExpr(expr.arg)}`;
    case "defined":
      return `defined ${describeExpr(expr.arg)}`;
    case "binop":
      return `${describeExpr(expr.left)} ${expr.op} ${describeExpr(expr.right)}`;
  }
}
