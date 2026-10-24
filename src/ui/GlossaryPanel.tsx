import { useEffect, useRef } from "react";
import { glossary, glossaryEntry, type GlossaryId } from "../domain/glossary";

interface GlossaryPanelProps {
  focusId: string;
  sampleDmc?: string;
  onOpen: (id: GlossaryId) => void;
}

export function GlossaryPanel({ focusId, sampleDmc, onOpen }: GlossaryPanelProps) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = root.current?.querySelector(`[data-term-id="${focusId}"]`);
    if (node instanceof HTMLElement) node.scrollIntoView({ block: "nearest" });
  }, [focusId]);

  return (
    <section className="glossary" ref={root} data-testid="glossary" aria-label="Glossary">
      <header className="runner-head">
        <h2>Glossary</h2>
        <p>Short readings of the Issue 7 schema names. Where a file does not give a meaning, the entry says so.</p>
      </header>
      {glossary.map((entry) => (
        <article key={entry.id} id={`glossary-${entry.id}`} data-testid="glossary-entry" data-term-id={entry.id} data-current={String(entry.id === focusId)}>
          <h3>{entry.term}</h3>
          <p>{entry.definition}</p>
          {entry.id === "dmc" && sampleDmc ? (
            <p data-testid="glossary-sample-dmc">This module's code is {sampleDmc}.</p>
          ) : null}
          {entry.see.length > 0 ? (
            <p className="glossary-see">
              {entry.see.map((id) => {
                const related = glossaryEntry(id);
                if (!related) return null;
                return (
                  <button key={id} type="button" onClick={() => onOpen(id as GlossaryId)}>
                    {related.term}
                  </button>
                );
              })}
            </p>
          ) : null}
          <p className="glossary-source">{entry.source}</p>
        </article>
      ))}
    </section>
  );
}
