import { useEffect, useMemo, useRef, useState } from "react";
import { innermostAt } from "./domain/scan";
import { parseLibrary } from "./domain/parse";
import { act, back, restart, startSession, view, type Session } from "./domain/runner";
import { validateLibrary } from "./domain/validate";
import type { Diagnostic, Dmc, StepId } from "./domain/types";
import { samples } from "./samples";
import type { GlossaryId } from "./domain/glossary";
import { FlowView } from "./ui/FlowView";
import { GlossaryPanel } from "./ui/GlossaryPanel";
import { outlineOf } from "./ui/outline";
import { RunnerPanel } from "./ui/RunnerPanel";
import { XmlEditor } from "./ui/XmlEditor";

interface DocTab {
  name: string;
  filename: string;
  xml: string;
}

export function App() {
  const initial = samples[0];
  const [sampleId, setSampleId] = useState(initial?.id ?? "");
  const [docs, setDocs] = useState<DocTab[]>(() => initial?.modules.map(copyModule) ?? []);
  const [active, setActive] = useState(0);
  const [surface, setSurface] = useState<"runner" | "xml" | "flow" | "glossary">("runner");
  const [glossaryId, setGlossaryId] = useState("dmc");
  const [session, setSession] = useState<Session | null>(null);
  const [focus, setFocus] = useState<{ dmc: Dmc; stepId: StepId } | null>(null);
  const [scrollToken, setScrollToken] = useState(0);
  const typing = useRef(false);

  const library = useMemo(() => {
    const parsed = parseLibrary(docs.map((doc) => ({ name: doc.filename, xml: doc.xml })));
    return {
      modules: parsed.modules,
      diagnostics: [...parsed.diagnostics, ...validateLibrary(parsed.modules)],
    };
  }, [docs]);

  useEffect(() => {
    const entry = library.modules[0];
    if (!entry) {
      setSession(null);
      return;
    }
    const started = startSession(library.modules, entry.dmc);
    setSession(started);
    if (typing.current) {
      typing.current = false;
      return;
    }
    if (!started) return;
    const current = view(started);
    setFocus({ dmc: current.dmc, stepId: current.stepId });
    setScrollToken((token) => token + 1);
  }, [library]);

  const current = session ? view(session) : null;
  const activeModule = library.modules[active] ?? null;
  const activeDoc = docs[active];
  const runnerModule = current
    ? library.modules.find((module) => module.dmc === current.dmc) ?? null
    : null;
  const range =
    activeModule && focus && focus.dmc === activeModule.dmc
      ? (activeModule.anchors.find((anchor) => anchor.stepId === focus.stepId)?.range ?? null)
      : null;

  function loadSample(id: string) {
    const sample = samples.find((item) => item.id === id);
    if (!sample) return;
    typing.current = false;
    setSampleId(sample.id);
    setDocs(sample.modules.map(copyModule));
    setActive(0);
    setSurface("runner");
  }

  function follow(next: Session) {
    setSession(next);
    const shown = view(next);
    setFocus({ dmc: shown.dmc, stepId: shown.stepId });
    const index = library.modules.findIndex((module) => module.dmc === shown.dmc);
    if (index >= 0) setActive(index);
    setScrollToken((token) => token + 1);
  }

  function openGlossary(id: GlossaryId) {
    setGlossaryId(id);
    setSurface("glossary");
  }

  function focusStep(dmc: Dmc, stepId: StepId) {
    setFocus({ dmc, stepId });
    const index = library.modules.findIndex((module) => module.dmc === dmc);
    if (index >= 0) setActive(index);
    setScrollToken((token) => token + 1);
  }

  return (
    <div className="app" data-surface={surface}>
      <header className="top">
        <div>
          <p className="kicker">Issue 7 element names</p>
          <h1>S1000D Playground</h1>
        </div>
        <nav className="samples" aria-label="Sample data modules">
          {samples.map((sample) => (
            <button
              key={sample.id}
              type="button"
              data-testid={`sample-${sample.id}`}
              aria-pressed={sample.id === sampleId}
              onClick={() => loadSample(sample.id)}
            >
              <strong>{sample.title}</strong>
              <span>{sample.blurb}</span>
            </button>
          ))}
        </nav>
        <nav className="surface-tabs" role="tablist" aria-label="Phone views">
          <button type="button" role="tab" data-testid="surface-runner" aria-selected={surface === "runner"} onClick={() => setSurface("runner")}>
            Runner
          </button>
          <button type="button" role="tab" data-testid="surface-xml" aria-selected={surface === "xml"} onClick={() => setSurface("xml")}>
            XML
          </button>
          <button type="button" role="tab" data-testid="surface-flow" aria-selected={surface === "flow"} onClick={() => setSurface("flow")}>
            Flow
          </button>
          <button type="button" role="tab" data-testid="surface-glossary" aria-selected={surface === "glossary"} onClick={() => setSurface("glossary")}>
            Glossary
          </button>
        </nav>
      </header>
      <main>
        <section className="pane editor-pane" aria-label="XML editor">
          <div className="pane-bar">
            <h2>XML</h2>
            {activeModule ? (
              <button type="button" className="text-link dmc-link" data-testid="explain-dmc" onClick={() => openGlossary("dmc")}>
                {activeModule.dmc}
              </button>
            ) : null}
            {docs.length > 1 ? (
              <div className="tabs" role="tablist" aria-label="Data modules">
                {docs.map((doc, index) => (
                  <button
                    key={doc.filename}
                    type="button"
                    role="tab"
                    data-testid="module-tab"
                    data-module-name={doc.name}
                    aria-selected={index === active}
                    onClick={() => setActive(index)}
                  >
                    {doc.name}
                  </button>
                ))}
              </div>
            ) : (
              <p>{activeDoc?.name}</p>
            )}
          </div>
          {activeDoc ? (
            <XmlEditor
              key={`${sampleId}:${activeDoc.filename}`}
              xmlText={activeDoc.xml}
              range={range}
              scrollToken={scrollToken}
              onChange={(xmlText) => {
                typing.current = true;
                setDocs((currentDocs) =>
                  currentDocs.map((doc, index) => (index === active ? { ...doc, xml: xmlText } : doc)),
                );
              }}
              onCursor={(offset) => {
                if (!activeModule) return;
                const stepId = innermostAt(activeModule.anchors, offset);
                if (!stepId) return;
                setFocus({ dmc: activeModule.dmc, stepId });
              }}
            />
          ) : null}
        </section>
        <section className="pane result-pane" aria-label="Runner and flow">
          <div className="pane-bar">
            <div className="tabs" role="tablist" aria-label="Runner views">
              <button type="button" role="tab" data-testid="view-runner" aria-selected={surface === "runner"} onClick={() => setSurface("runner")}>
                Runner
              </button>
              <button type="button" role="tab" data-testid="view-flow" aria-selected={surface === "flow"} onClick={() => setSurface("flow")}>
                Flow
              </button>
              <button type="button" role="tab" data-testid="view-glossary" aria-selected={surface === "glossary"} onClick={() => setSurface("glossary")}>
                Glossary
              </button>
            </div>
          </div>
          {surface === "flow" ? (
            <FlowView
              modules={library.modules}
              currentDmc={current?.dmc}
              currentStepId={current?.stepId}
              focusedDmc={focus?.dmc}
              focusedStepId={focus?.stepId}
              onSelect={focusStep}
            />
          ) : surface === "glossary" ? (
            <GlossaryPanel focusId={glossaryId} sampleDmc={activeModule?.dmc} onOpen={openGlossary} />
          ) : (
            <RunnerPanel
              state={current}
              outline={runnerModule ? outlineOf(runnerModule) : []}
              focusedStepId={focus && current && focus.dmc === current.dmc ? focus.stepId : undefined}
              onAct={(choiceId) => session && follow(act(session, choiceId))}
              onBack={() => session && follow(back(session))}
              onRestart={() => session && follow(restart(session))}
              onFocusStep={(stepId) => {
                if (!current) return;
                focusStep(current.dmc, stepId as StepId);
              }}
              onExplain={openGlossary}
            />
          )}
        </section>
      </main>
      <ValidationBar
        diagnostics={library.diagnostics}
        onJump={(diagnostic) => {
          if (!diagnostic.dmc || !diagnostic.stepId) return;
          focusStep(diagnostic.dmc, diagnostic.stepId);
        }}
      />
    </div>
  );
}

function ValidationBar({
  diagnostics,
  onJump,
}: {
  diagnostics: Diagnostic[];
  onJump: (diagnostic: Diagnostic) => void;
}) {
  return (
    <section className="validation" data-testid="validation" aria-live="polite">
      {diagnostics.length === 0 ? (
        <p data-testid="validation-ok">No well-formedness errors, broken references, or unreachable steps.</p>
      ) : (
        <ul>
          {diagnostics.map((diagnostic, index) => (
            <li key={`${diagnostic.code}-${diagnostic.stepId ?? ""}-${index}`}>
              <button type="button" data-testid="diagnostic" onClick={() => onJump(diagnostic)}>
                <span>{diagnostic.code}</span>
                {diagnostic.message}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function copyModule(module: { name: string; filename: string; xml: string }): DocTab {
  return { name: module.name, filename: module.filename, xml: module.xml };
}
