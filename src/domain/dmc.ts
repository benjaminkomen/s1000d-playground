import { asDmc, type DmCode, type Dmc } from "./types";

export function formatDmc(code: DmCode): Dmc {
  return asDmc(
    [
      code.modelIdentCode,
      code.systemDiffCode,
      code.systemCode,
      `${code.subSystemCode}${code.subSubSystemCode}`,
      code.assyCode,
      `${code.disassyCode}${code.disassyCodeVariant}`,
      `${code.infoCode}${code.infoCodeVariant}`,
      code.itemLocationCode,
    ].join("-"),
  );
}

const CODE_ATTRS = [
  "modelIdentCode",
  "systemDiffCode",
  "systemCode",
  "subSystemCode",
  "subSubSystemCode",
  "assyCode",
  "disassyCode",
  "disassyCodeVariant",
  "infoCode",
  "infoCodeVariant",
  "itemLocationCode",
] as const;

export function readDmCode(element: Element): DmCode | null {
  const code = {} as DmCode;
  for (const name of CODE_ATTRS) {
    const value = element.getAttribute(name);
    if (!value) return null;
    code[name] = value;
  }
  return code;
}

export function dmCodeAttributes(code: DmCode): string {
  return CODE_ATTRS.map((name) => `${name}="${code[name]}"`).join(" ");
}
