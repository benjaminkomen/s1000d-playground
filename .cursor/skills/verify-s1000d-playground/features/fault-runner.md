# Fault runner

The fault runner shows the current `isolationStep` or `isolationProcedureEnd` and moves only when the user picks an answer, runs a referenced module, goes back, or restarts.

## Sub-features

- `fault-battery` reaches `bat-load`, `end-low`, `end-pass`, and `end-fail` from `bat-ocv`.
- `fault-engine-call` runs the starter-supply module from `eng-supply` and returns to that question.
- `fault-retry` follows `Still no 12 V, measure again` back to `fan-voltage`.
- `fault-back` returns to the previous step. `fault-restart` returns to the entry step with Back disabled.

## How to get to it (user POV)

- Choose `12 V battery test`, `Engine will not start`, or `Cooling fan retry`.
- Stay on the `Runner` tab. That tab is `[data-testid="view-runner"]`.
- Click an answer button, `Back`, or `Restart`.

## Driving it with Playwright

Preconditions:

- The server from Launch is healthy at `http://127.0.0.1:4173`.
- The sample under test has `[data-testid="validation-ok"]` visible before the first answer.

- **Battery branches.** Click the choice whose span is `Less than 12.4 V` and land on `end-low`. Restart. Click `12.4 V or more` and land on `bat-load`. Click `Yes` and land on `end-pass`. Restart. From `bat-load`, click `No` and land on `end-fail`. The walk in `e2e/walk.spec.ts` clicks every choice and then `back`, and it must record all five ids.
- **Load-test shot.** From `bat-ocv`, click `12.4 V or more`. `[data-testid="step-card"]` is `bat-load` and `[data-testid="prompt"]` contains `9.6 V`. The file is `artifacts/verify/battery-load-test.png`.
- **Back and restart.** From `bat-load`, click `[data-testid="back"]` and return to `bat-ocv`. Reach `end-pass`, click `[data-testid="restart"]`, and confirm `bat-ocv` with `[data-testid="back"]` disabled.
- **Engine call.** Click `sample-engine`, then `No`, and land on `eng-supply`. Click `Run Starter supply / Fault isolation` and land on `sup-measure`. `[data-testid="call-banner"]` contains `Referenced data module`. The `Starter supply` module tab is selected. Click `Yes`, land on `end-sup-ok`, click `Return to caller`, and land on `eng-supply` with a note that contains `Returned from Starter supply`. Click `Yes` and land on `eng-control`. The shot is `artifacts/verify/engine-called-procedure.png`.
- **Fan retry.** Click `sample-retry`, then `No`, and land on `fan-fuse`. Click `Still no 12 V, measure again` and land on `fan-voltage`. The shot is `artifacts/verify/fan-retry.png`. The walk must also reach `fan-spin`, `end-ok`, `end-short`, and `end-fan`.

## Gotchas

- `Yes` and `No` are the visible labels. The element name `yesAnswer` is the small caption. Match the span, or a loose text filter also matches the caption.
- On an end step, `Return to caller` is present only when a caller is on the stack. The battery ends do not show it.
- The walk compares the full choice key after `Back`, not only `data-step-id`. The completed process screen reuses the last step id, and so do `loop-enter` and `loop-exit`.
- A cycle is valid. The fan measurement choice points at `fan-voltage` again. The walk must stop when the same step, note, and choices repeat.
