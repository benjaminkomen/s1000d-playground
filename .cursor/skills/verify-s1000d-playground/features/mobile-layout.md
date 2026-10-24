# Mobile layout

Below 980px the playground shows one surface at a time. The phone switcher offers Runner, XML, Flow, and Glossary, and Runner is selected on a fresh load. At 1600px the XML pane and the runner pane stay side by side, and Glossary is a tab on the right pane.

## Sub-features

- `mobile-default-runner` opens on the runner with the XML and the flow hidden.
- `mobile-answers` gives each answer a tap target at least 44px tall and 44px wide.
- `mobile-samples` wraps the sample buttons inside the viewport and keeps each one at least 44px tall.
- `mobile-xml` shows the editor across the width and hides the runner.
- `mobile-flow` shows the flow diagram across the width with a real height.
- `mobile-no-scroll` keeps `documentElement.scrollWidth` within `clientWidth` on each tab.

## How to get to it (user POV)

- Open `/` in a window narrower than 980px. An iPhone-sized window is 390 by 844. A small Android window is 360 by 800.
- The header shows the title and the sample names on more than one row. The blurbs are hidden.
- `Runner` is the selected tab. The open-circuit step and its answers fill the page under the header.
- Choose `XML` to read the module. Choose `Flow` to see the diagram. Choose `Runner` to go back to the step.

## Driving it with Playwright

Preconditions:

- The server from Launch is healthy at `http://127.0.0.1:4173`.
- `e2e/mobile.spec.ts` sets the viewport. Do not resize the desktop tests.

- **iPhone.** The describe block `iphone 390x844` loads `/`. `[data-testid="surface-runner"]` has `aria-selected` `true`. `[data-testid="runner"]` is visible. `[data-testid="xml-editor"]` and `[data-testid="flow-view"]` are hidden. `[data-testid="step-card"]` has `data-step-id` `bat-ocv`.
- **Answers and samples.** Every sample button is at least 44px tall and stays inside the viewport. The last sample sits below the first. The choice `12.4 V or more` is at least 44px by 44px. After the click, `data-step-id` is `bat-load`.
- **XML and Flow.** Click `[data-testid="surface-xml"]`. The editor is visible, the runner is hidden, and `.cm-editor` is no wider than the viewport. Click `[data-testid="surface-flow"]`. `[data-testid="flow-view"]` is visible and taller than 100px.
- **Android.** The describe block `android 360x800` repeats that path.
- **Proof.** `artifacts/verify/mobile-iphone-runner.png`, `mobile-iphone-xml.png`, `mobile-iphone-flow.png`, `mobile-android-runner.png`, `mobile-android-xml.png`, and `mobile-android-flow.png`.

## Gotchas

- The desktop Runner and Flow controls are `[data-testid="view-runner"]` and `[data-testid="view-flow"]`. They are hidden below 980px. Use the `surface-*` buttons there.
- A passing width check with `overflow: hidden` still fails this feature if the step card or the editor is clipped off the side. Look at the PNG.
- The editor may scroll its own long lines. The page itself must not scroll sideways.
- Sample blurbs are hidden below 980px. Their absence on a phone shot is the layout, not a missing sample.
