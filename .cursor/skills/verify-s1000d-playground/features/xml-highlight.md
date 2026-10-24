# XML highlight

Clicking a step in the outline scrolls the editor and paints that element's XML yellow. Clicking in the XML focuses the outline step under the cursor and does not answer the runner.

## Sub-features

- `highlight-outline` focuses `bat-load` from the outline and highlights `id="bat-load"`.
- `highlight-cursor` focuses `end-fail` when the user clicks the line that contains `id="end-fail"`.
- `highlight-answer` moves the highlight when an answer changes the current step, as in the load-test shot.

## How to get to it (user POV)

- Load the battery sample.
- Click `Load test` in the step outline.
- Click the XML line for an `isolationProcedureEnd` or another step id.
- Answer `12.4 V or more` and watch the highlight move to `bat-load`.

## Driving it with Playwright

Preconditions:

- The server from Launch is healthy at `http://127.0.0.1:4173`.
- The battery sample is loaded and `[data-testid="view-runner"]` is selected.

- **Outline click.** Click `[data-testid="outline-step"][data-step-id="bat-load"]`. That button's `data-focused` is `true`. `.cm-step` contains `id="bat-load"`. `[data-testid="step-card"]` stays on `bat-ocv` because the outline does not answer the question. The shot is `artifacts/verify/battery-highlight.png`.
- **Cursor click.** Click the `.cm-line` whose text contains `<isolationProcedureEnd id="end-fail">`. The outline button for `end-fail` has `data-focused` `true`. The step card remains `bat-ocv`.
- **Answer click.** Click the choice `12.4 V or more`. `.cm-step` contains `bat-load` and the step card is `bat-load`. That shot is `artifacts/verify/battery-load-test.png`.

## Gotchas

- `.cm-step` is one mark split per line. Assert that one of those pieces contains the id. Playwright's text assertion is strict when the locator matches several nodes, so filter to the piece that contains the id.
- `id="end-fail"` is also a case-insensitive match inside `nextActionRefId="end-fail"`. Click the `isolationProcedureEnd` line, not every line that contains that id.
- `data-focused` and `data-current` diverge on purpose for outline and cursor clicks. Failing the test because the runner did not jump is a wrong assertion.
- Typing in the XML restarts the runner from the entry step and must not move the cursor to the highlight. The scroll effect runs only when the app asks to scroll.
