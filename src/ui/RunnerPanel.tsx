import type { OutlineItem, RunnerView } from "../domain/types";

interface RunnerPanelProps {
  state: RunnerView | null;
  outline: OutlineItem[];
  focusedStepId?: string;
  onAct: (choiceId: string) => void;
  onBack: () => void;
  onRestart: () => void;
  onFocusStep: (stepId: string) => void;
}

export function RunnerPanel({
  state,
  outline,
  focusedStepId,
  onAct,
  onBack,
  onRestart,
  onFocusStep,
}: RunnerPanelProps) {
  if (!state) {
    return (
      <section className="runner" data-testid="runner" aria-label="Procedure runner">
        <p>The runner has nothing to step through until the XML parses.</p>
      </section>
    );
  }

  return (
    <section className="runner" data-testid="runner" aria-label="Procedure runner">
      <header className="runner-head">
        <p className="kicker">{state.element === "dmNode" || state.element === "dmSeq" || state.element === "dmIf" || state.element === "dmLoop" ? "Process data module" : "Fault isolation"}</p>
        <h2>{state.techName}</h2>
        <p>{state.infoName}</p>
        <p className="dmc" data-testid="dmc">{state.dmc}</p>
        {state.summary ? <p className="summary">{state.summary}</p> : null}
      </header>
      {state.banner ? <p className="banner" data-testid="call-banner">{state.banner}</p> : null}
      <ol className="crumbs" data-testid="breadcrumb">
        {state.path.map((crumb, index) => (
          <li key={`${crumb.stepId}-${index}`}>
            {crumb.via ? <span className="via">{crumb.via}</span> : null}
            <span>{crumb.label}</span>
          </li>
        ))}
      </ol>
      <div className="runner-body">
        <ol className="outline" data-testid="step-outline">
          {outline.map((item) => (
            <li key={item.stepId}>
              <button
                type="button"
                data-testid="outline-step"
                data-step-id={item.stepId}
                data-current={String(item.stepId === state.stepId)}
                data-focused={String(item.stepId === focusedStepId)}
                onClick={() => onFocusStep(item.stepId)}
              >
                <span>{item.element}</span>
                {item.title}
              </button>
            </li>
          ))}
        </ol>
        <article className="step-card" data-testid="step-card" data-step-id={state.stepId} data-ended={String(state.ended)}>
          <p className="element-name">{state.element}</p>
          <h3>{state.title}</h3>
          {state.body.map((paragraph, index) => (
            <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
          ))}
          {state.prompt ? <p className="prompt" data-testid="prompt">{state.prompt}</p> : null}
          {state.note ? <p className="note" data-testid="note">{state.note}</p> : null}
          {state.variables.length > 0 ? (
            <ul className="variables" data-testid="variables">
              {state.variables.map((variable) => (
                <li key={variable.name}>
                  {variable.name} = {variable.value}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="choices">
            {state.choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                data-testid="choice"
                data-choice-id={choice.id}
                onClick={() => onAct(choice.id)}
              >
                <span>{choice.label}</span>
                <small>{choice.element}</small>
              </button>
            ))}
          </div>
          {state.ended ? <p data-testid="runner-ended">This path has ended.</p> : null}
          <div className="runner-nav">
            <button type="button" data-testid="back" onClick={onBack} disabled={!state.canBack}>
              Back
            </button>
            <button type="button" data-testid="restart" onClick={onRestart}>
              Restart
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}
