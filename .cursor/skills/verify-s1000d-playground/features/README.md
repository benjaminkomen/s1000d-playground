# S1000D playground verification map

This directory is the maintained source for verifying the playground. Read this index, then use the feature file for the journey under test.

## Baseline preconditions

- Launch the app with `npm run dev -- --host 127.0.0.1 --port 4173` and record the PID.
- Doctor must show that PID listening, and `curl -sf http://127.0.0.1:4173/` must contain `S1000D Playground`.
- The battery sample is selected on a fresh load. No account and no saved edits exist.
- Drive with `npx playwright test` while that server is up. Outside CI the config reuses port 4173.
- Do not drive a server this run did not start.

## Driving conventions

- Start from a fresh load of `/` unless the feature file says otherwise.
- Use the `data-testid` values in the feature files. Do not click by pixel.
- The answer label is the `span` inside `[data-testid="choice"]`. Match that span exactly.
- `data-current` on an outline step is the runner position. `data-focused` is the XML selection.
- Screenshots go to `artifacts/verify/`. Cleanup must not remove them.

## Proof and skip reporting

- Capture the click and the step that follows it. A final end screen alone does not prove the branch.
- UI proof is the Playwright assertion plus the PNG for that journey, opened and looked at.
- Record which sample id was used.
- If a sample button is missing, report that feature as failed and name the missing `data-testid`. Do not verify it through a different sample.

## Feature entry contract

Each feature file starts with an H1 and one paragraph. Then it uses these H2 sections in order.

1. `Sub-features`
2. `How to get to it (user POV)`
3. `Driving it with Playwright`
4. `Gotchas`

## Features

- [Sample picker](./sample-picker.md) loads each of the five samples and shows a clear validation bar.
- [Fault runner](./fault-runner.md) walks the battery, engine call and return, and fan retry.
- [Process runner](./process-runner.md) walks the coolant sequence and the lamp loop.
- [XML highlight](./xml-highlight.md) syncs the outline, the editor cursor, and the yellow mark.
- [Flow and validation](./flow-and-validation.md) selects a flow node and reports XML that is not well-formed.
