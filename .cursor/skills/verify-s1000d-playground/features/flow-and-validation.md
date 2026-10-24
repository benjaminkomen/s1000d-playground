# Flow and validation

The Flow tab draws one node per step. Clicking a node highlights that step in the XML. The validation bar reports a document that is not well-formed, and the runner stops until the XML parses again.

## Sub-features

- `flow-select` selects `end-pass` on the battery graph and highlights that id.
- `validate-clear` shows the clear message on an unmodified sample.
- `validate-broken` replaces the document with `<dmodule>` and shows a `well-formed` diagnostic.

## How to get to it (user POV)

- Choose `Flow` next to `Runner`.
- Click the node titled for the serviceable battery end.
- Return to `Runner` and edit the XML into a broken tag.
- Read the bar under the two panes.

## Driving it with Playwright

Preconditions:

- The server from Launch is healthy at `http://127.0.0.1:4173`.
- Start from the battery sample so the flow has `bat-ocv`, `bat-load`, `end-low`, `end-pass`, and `end-fail`.

- **Clear bar.** On a fresh load, `[data-testid="validation-ok"]` reads `No well-formedness errors, broken references, or unreachable steps.`
- **Select a node.** Click `[data-testid="view-flow"]`. Click `[data-testid="flow-node"][data-step-id="end-pass"]`. `.cm-step` contains `end-pass`. The shot is `artifacts/verify/battery-flow.png`.
- **Break the XML.** Click `.cm-content`, press `Control+A`, and insert `<dmodule>`. `[data-testid="diagnostic"]` contains `well-formed`. `[data-testid="runner"]` contains `nothing to step through`. The shot is `artifacts/verify/broken-xml.png`.

## Gotchas

- The flow pane needs a real height. A graph that never appears is a layout failure, not a missing sample.
- Below 980px, open Flow with `[data-testid="surface-flow"]`. The graph is the only pane, and it still has to have a real height.
- React Flow's attribution stays visible. Hiding it is a license problem, not a verification step.
- The broken-document check deletes the sample text in that browser session only. Reload `/` before the next feature. Do not treat the broken buffer as a failed sample picker.
