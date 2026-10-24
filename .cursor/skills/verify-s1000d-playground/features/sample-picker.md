# Sample picker

The sample picker loads one training module, or the engine pair, into the editor and restarts the runner at that module's first step.

## Sub-features

- `picker-battery` opens the 12 V battery fault module.
- `picker-engine` opens the engine module and shows a tab for the starter supply.
- `picker-retry` opens the cooling fan fault module.
- `picker-linear` opens the coolant process module.
- `picker-lamp` opens the lamp process module.
- `picker-clear` shows a clear validation bar for each unmodified sample.

## How to get to it (user POV)

- Load `/`. The battery sample is already pressed.
- Choose `12 V battery test`, `Engine will not start`, `Cooling fan retry`, `Coolant inspection`, or `Lamp check loop` in the header.

## Driving it with Playwright

Preconditions:

- The server from Launch is healthy at `http://127.0.0.1:4173`.
- `npx playwright test` is run from the repository root so it reuses that server.

- **Open battery.** Load `/`. Run the `walks every sample branch` test, or open `/` and read `[data-testid="sample-battery"]`. `aria-pressed` is `true`. `[data-testid="dmc"]` reads `S1000D-A-24-31-00-00A-420A-A`. `[data-testid="step-card"]` has `data-step-id` `bat-ocv`.
- **Open each other sample.** Click `[data-testid="sample-engine"]`, `sample-retry`, `sample-linear`, and `sample-lamp` in that order. The pressed sample matches the click. `[data-testid="validation-ok"]` is visible after every click.
- **Engine tabs.** After `sample-engine`, two `[data-testid="module-tab"]` buttons exist. Their `data-module-name` values are `Engine` and `Starter supply`.
- **Proof.** `artifacts/verify/battery-side-by-side.png` shows the battery name in the header and the open-circuit step on the right.

## Gotchas

- The engine sample is two data modules. A single editor buffer with both documents concatenated is a failure.
- Switching samples restarts the runner. An answer from the previous sample must not remain on screen.
- `validation-ok` must be the unmodified sample. An edited buffer is the flow-and-validation feature, not this one.
