# Process runner

The process runner walks a `dmSeq`. `Continue` advances a `dmNode`. A `dmIf` shows one follow button for the branch the expression selected. A `dmLoop` shows `Enter dmSeq` while the condition is true and `Leave dmLoop` when it is false.

## Sub-features

- `process-linear` visits `cool-look`, `cool-wipe`, and `cool-record`, then shows `Procedure complete`.
- `process-lamp-yes` answers `Yes` at the lamp and follows `dmElseSeq` to `node-good`.
- `process-lamp-dark` answers `No` twice, reseats, and then leaves because `attempt` is no longer below 3.

## How to get to it (user POV)

- Choose `Coolant inspection` or `Lamp check loop`.
- Read the prompt and the variable list on the step card.
- Click `Continue`, `Enter dmSeq`, `Leave dmLoop`, `Follow dmThenSeq`, or `Follow dmElseSeq`.

## Driving it with Playwright

Preconditions:

- The server from Launch is healthy at `http://127.0.0.1:4173`.
- `[data-testid="view-runner"]` is selected.

- **Coolant order.** Click `sample-linear`. The DMC is `S1000D-A-75-00-00-00A-310A-A` and the step is `cool-look`. Click `Continue` and land on `cool-wipe`. The shot is `artifacts/verify/linear-mid.png`. Click `Continue` twice more. `[data-testid="step-card"]` has `data-ended` `true` and the heading is `Procedure complete`.
- **Lamp lit.** Click `sample-lamp`. The DMC is `S1000D-A-33-10-00-00A-340A-A`. Click `Continue` and land on `lamp-loop`. Click `Enter dmSeq`. The prompt is `Did the lamp light?`. The shot is `artifacts/verify/lamp-dialog.png`. Click `Yes`, land on `if-dark`, and read a note that contains `false`. Click `Follow dmElseSeq` and land on `node-good`.
- **Lamp dark.** Restart. Click `Continue`. Twice, click `Enter dmSeq`, `No`, `Follow dmThenSeq`, and `Continue` on `node-reseat`. The step returns to `lamp-loop` and the note contains `condition is false`. Click `Leave dmLoop` and land on `node-record`.
- **Full walk.** The sample walk must record `node-prepare`, `lamp-loop`, `node-observe`, `if-dark`, `node-reseat`, `node-good`, and `node-record`.

## Gotchas

- `Enter dmSeq` and `Leave dmLoop` share the choice id `continue`. Tell them apart by the span text and by the note. The true note contains `Iteration`. The false note contains `condition is false`.
- `attempt` starts at 0 and the loop adds 1 before the test. Two dark answers run the body. The next arrival leaves. A third `Enter dmSeq` on that screen is a failure, because the button is `Leave dmLoop`.
- The `Yes` menu choice sets `lit` true, so `the lamp is not lit` is false and the button is `Follow dmElseSeq`.
- `Procedure complete` keeps the last `dmNode` id on `data-step-id`. Use `data-ended` and the heading as the proof.
