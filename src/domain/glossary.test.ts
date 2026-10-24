import { describe, expect, it } from "vitest";
import { glossary, glossaryEntry } from "./glossary";

const required = [
  "dm",
  "dmc",
  "sns",
  "model-ident-code",
  "information-code",
  "item-location-code",
  "disassembly-code",
  "issue-inwork",
  "csdb",
  "publication-module",
  "brex",
  "applicability",
  "fault-isolation",
  "process-module",
  "isolation-step",
  "dm-ref",
  "ietp",
] as const;

describe("glossary", () => {
  it("gives every required term a definition and a source", () => {
    expect(glossary.map((entry) => entry.id)).toEqual([...required]);
    for (const id of required) {
      const entry = glossaryEntry(id);
      expect(entry, id).toBeTruthy();
      expect(entry!.term.length).toBeGreaterThan(0);
      expect(entry!.definition.length).toBeGreaterThan(40);
      expect(entry!.source).toMatch(/Issue 7/);
    }
  });

  it("points related terms at entries that exist", () => {
    for (const entry of glossary) {
      for (const id of entry.see) expect(glossaryEntry(id), `${entry.id} -> ${id}`).toBeTruthy();
    }
  });
});
