import { describe, expect, it } from "vitest";
import { samples } from "../samples";
import { batteryXml } from "../samples/battery";
import { parseDocument, parseLibrary } from "./parse";
import { act, back, restart, startSession, view, type Session } from "./runner";
import { validateLibrary } from "./validate";

function openSample(id: string): { session: Session; errors: string[] } {
  const sample = samples.find((item) => item.id === id);
  if (!sample) throw new Error(`Missing sample ${id}`);
  const parsed = parseLibrary(sample.modules.map((module) => ({ name: module.filename, xml: module.xml })));
  const session = startSession(parsed.modules, parsed.modules[0]?.dmc ?? ("missing" as Session["entryDmc"]));
  if (!session) throw new Error(`Sample ${id} did not start`);
  return {
    session,
    errors: [...parsed.diagnostics, ...validateLibrary(parsed.modules)].map((item) => item.message),
  };
}

function visitAll(session: Session): Set<string> {
  const seen = new Set<string>();
  const visited = new Set<string>();

  const walk = (current: Session, depth: number) => {
    const state = view(current);
    visited.add(`${state.dmc}::${state.stepId}`);
    const key = [
      state.dmc,
      state.stepId,
      state.ended ? "ended" : "open",
      state.note ?? "",
      state.choices.map((choice) => `${choice.id}:${choice.label}`).join("|"),
    ].join("~");
    if (seen.has(key) || depth > 40) return;
    seen.add(key);
    if (state.ended) return;
    for (const choice of state.choices) walk(act(current, choice.id), depth + 1);
  };

  walk(session, 0);
  return visited;
}

describe("sample libraries", () => {
  it.each(samples.map((sample) => sample.id))("%s has no validation errors", (id) => {
    const opened = openSample(id);
    expect(opened.errors).toEqual([]);
  });

  it("walks the battery load-test branches to every end", () => {
    const visited = visitAll(openSample("battery").session);
    expect([...visited].map((item) => item.split("::")[1]).sort()).toEqual(
      ["bat-load", "bat-ocv", "end-fail", "end-low", "end-pass"].sort(),
    );
  });

  it("walks the engine fault tree into the called procedure and back out", () => {
    const visited = [...visitAll(openSample("engine").session)];
    for (const id of [
      "eng-crank",
      "eng-supply",
      "eng-control",
      "eng-fuel",
      "end-supply",
      "end-drive",
      "end-control",
      "end-ignition",
      "end-fuel",
      "sup-measure",
      "end-sup-ok",
      "end-sup-low",
    ]) {
      expect(visited.some((item) => item.endsWith(`::${id}`))).toBe(true);
    }
  });

  it("returns from the starter supply procedure to the calling question", () => {
    let session = openSample("engine").session;
    session = act(session, "no");
    expect(view(session).stepId).toBe("eng-supply");
    session = act(session, "call:0");
    expect(view(session).stepId).toBe("sup-measure");
    expect(view(session).banner).toMatch(/Referenced data module/);
    session = act(session, "yes");
    expect(view(session).stepId).toBe("end-sup-ok");
    session = act(session, "return");
    const returned = view(session);
    expect(returned.stepId).toBe("eng-supply");
    expect(returned.note).toMatch(/Returned from Starter supply/);
    expect(returned.callDepth).toBe(1);
    session = act(session, "yes");
    expect(view(session).stepId).toBe("eng-control");
  });

  it("walks the fan retry without getting stuck, including the back edge", () => {
    const visited = [...visitAll(openSample("retry").session)].map((item) => item.split("::")[1]);
    for (const id of ["fan-voltage", "fan-fuse", "fan-spin", "end-ok", "end-short", "end-fan"]) {
      expect(visited).toContain(id);
    }
  });

  it("walks the linear process from first dmNode to the end", () => {
    let session = openSample("linear").session;
    expect(view(session).stepId).toBe("cool-look");
    session = act(session, "continue");
    expect(view(session).stepId).toBe("cool-wipe");
    session = act(session, "continue");
    expect(view(session).stepId).toBe("cool-record");
    session = act(session, "continue");
    const done = view(session);
    expect(done.ended).toBe(true);
    expect(done.title).toBe("Procedure complete");
  });

  it("walks the lamp loop through a lit answer and through three failed attempts", () => {
    const visited = [...visitAll(openSample("lamp").session)].map((item) => item.split("::")[1]);
    for (const id of ["node-prepare", "lamp-loop", "node-observe", "if-dark", "node-reseat", "node-good", "node-record"]) {
      expect(visited).toContain(id);
    }

    let session = openSample("lamp").session;
    session = act(session, "continue");
    session = act(session, "continue");
    expect(view(session).prompt).toBe("Did the lamp light?");
    session = act(session, "menu:0");
    expect(view(session).element).toBe("dmIf");
    expect(view(session).note).toMatch(/false/);
    session = act(session, "continue");
    expect(view(session).stepId).toBe("node-good");
  });
});

describe("runner history", () => {
  it("goes back one answer and restart returns to the entry step", () => {
    let session = openSample("battery").session;
    session = act(session, "choice:1");
    expect(view(session).stepId).toBe("bat-load");
    session = back(session);
    expect(view(session).stepId).toBe("bat-ocv");
    session = act(session, "choice:1");
    session = act(session, "yes");
    session = restart(session);
    expect(view(session).stepId).toBe("bat-ocv");
    expect(view(session).canBack).toBe(false);
  });

  it("ignores an unknown choice", () => {
    const session = openSample("battery").session;
    expect(view(act(session, "missing")).stepId).toBe("bat-ocv");
  });
});

describe("validation", () => {
  it("reports XML that is not well-formed", () => {
    const parsed = parseDocument("broken.xml", "<dmodule><unclosed></dmodule>");
    expect(parsed.module).toBeNull();
    expect(parsed.diagnostics.some((item) => item.code === "well-formed")).toBe(true);
  });

  it("reports a broken nextActionRefId and an unreachable end", () => {
    const xml = batteryXml
      .replace('nextActionRefId="end-pass"', 'nextActionRefId="end-missing"')
      .replace(
        "</isolationMainProcedure>",
        `<isolationProcedureEnd id="end-orphan"><title>Orphan end</title><action>Nothing points here.</action></isolationProcedureEnd>
          </isolationMainProcedure>`,
      );
    const parsed = parseLibrary([{ name: "battery.xml", xml }]);
    const messages = validateLibrary(parsed.modules).map((item) => item.message);
    expect(messages.some((message) => message.includes("end-missing"))).toBe(true);
    expect(messages.some((message) => message.includes("end-orphan") && message.includes("cannot be reached"))).toBe(true);
  });
});
