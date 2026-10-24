import { xml } from "@codemirror/lang-xml";
import { Compartment } from "@codemirror/state";
import { Decoration, EditorView, type ViewUpdate } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SourceRange } from "../domain/types";

interface XmlEditorProps {
  xmlText: string;
  range: SourceRange | null;
  scrollToken: number;
  onChange: (value: string) => void;
  onCursor: (offset: number) => void;
}

const highlightCompartment = new Compartment();

export function XmlEditor({ xmlText, range, scrollToken, onChange, onCursor }: XmlEditorProps) {
  const viewRef = useRef<EditorView | null>(null);
  const rangeRef = useRef(range);
  const programmatic = useRef(false);
  const [viewEpoch, setViewEpoch] = useState(0);
  const onChangeRef = useRef(onChange);
  const onCursorRef = useRef(onCursor);
  rangeRef.current = range;
  onChangeRef.current = onChange;
  onCursorRef.current = onCursor;

  const handleChange = useCallback((value: string) => {
    onChangeRef.current(value);
  }, []);

  const handleUpdate = useCallback((update: ViewUpdate) => {
    if (programmatic.current) return;
    if (!update.selectionSet && !update.docChanged) return;
    onCursorRef.current(update.state.selection.main.head);
  }, []);

  const basicSetup = useMemo(() => ({ lineNumbers: true, foldGutter: false }), []);
  const extensions = useMemo(
    () => [
      xml(),
      EditorView.lineWrapping,
      highlightCompartment.of([]),
      EditorView.theme({
        "&": { height: "100%", backgroundColor: "#fffaf3" },
        ".cm-scroller": { fontFamily: '"IBM Plex Mono", ui-monospace, monospace', fontSize: "13px" },
        ".cm-gutters": { backgroundColor: "#f6f0e6", color: "#8a7d6b", border: "none" },
        ".cm-activeLine": { backgroundColor: "transparent" },
        ".cm-step": { backgroundColor: "#f6d98a" },
      }),
    ],
    [],
  );

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const docLength = view.state.doc.length;
    const start = range ? Math.max(0, Math.min(range.start, docLength)) : 0;
    const end = range ? Math.max(start, Math.min(range.end, docLength)) : 0;
    const mark =
      range && end > start ? Decoration.mark({ class: "cm-step" }).range(start, end) : null;
    view.dispatch({
      effects: highlightCompartment.reconfigure(
        EditorView.decorations.of(Decoration.set(mark ? [mark] : [], true)),
      ),
    });
  }, [range, viewEpoch]);

  useEffect(() => {
    const view = viewRef.current;
    const current = rangeRef.current;
    if (!view || scrollToken === 0 || !current) return;
    const anchor = Math.min(current.start, view.state.doc.length);
    programmatic.current = true;
    view.dispatch({
      selection: { anchor },
      scrollIntoView: true,
      effects: EditorView.scrollIntoView(anchor, { y: "center" }),
    });
    programmatic.current = false;
  }, [scrollToken, viewEpoch]);

  return (
    <div className="editor-frame" data-testid="xml-editor">
      <CodeMirror
        value={xmlText}
        height="100%"
        extensions={extensions}
        basicSetup={basicSetup}
        onCreateEditor={(view) => {
          viewRef.current = view;
          setViewEpoch((epoch) => epoch + 1);
        }}
        onChange={handleChange}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
