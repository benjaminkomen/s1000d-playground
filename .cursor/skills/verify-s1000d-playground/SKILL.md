---
name: verify-s1000d-playground
description: Drive the S1000D playground in a headless browser. Use when a change touches the sample runner, XML highlight, flow, or validation, and before calling that UI done.
---

# Verify the S1000D playground

The surface is the Vite React app. A user picks a sample, reads XML on the left, and clicks answers on the right. There is no login and no database. Samples are compiled into the page.

Read `.cursor/skills/verify-s1000d-playground/features/README.md` before driving. Use the feature file for the journey you are proving. A green unit test is not a substitute for this skill.

## Launch

From the repository root, install once, then start a server this run owns.

```bash
npm install
npm run dev -- --host 127.0.0.1 --port 4173
```

Record the PID. Ready means both of these are true.

- `curl -sf http://127.0.0.1:4173/` returns HTML that contains `S1000D Playground`.
- A browser opened to that URL shows the heading `S1000D Playground`, the battery step `bat-ocv`, and `validation-ok`.

Vite answering on the port is not enough if the heading never renders. Do not start a second server on 4173. If something else already owns the port, stop and report the PID. Two runs must not share one server.

## Doctor

Run this before clicking when the page looks wrong.

```bash
curl -sf http://127.0.0.1:4173/ | grep -F 'S1000D Playground'
lsof -nP -iTCP:4173 -sTCP:LISTEN
```

The listener must be the PID you recorded, and the command must be `node` running this repo's `vite`. If the port belongs to another command, do not drive it. `lsof` is the check because this environment does not provide `ss`.

## Drive

With the server from Launch still running, run the Playwright suite from the repository root. `reuseExistingServer` is on outside CI, so the suite uses port 4173 instead of starting another Vite.

```bash
npx playwright test
```

The suite is `e2e/walk.spec.ts` plus `e2e/mobile.spec.ts`. It is the harness. It loads every sample, clicks every answer including call and return, checks the highlight, walks the phone tabs at 390 by 844 and 360 by 800, and writes the screenshots named in Evidence.

Drive the feature you changed even when the suite is broader. The selectors below are the ones the suite uses.

- Sample buttons are `sample-battery`, `sample-engine`, `sample-retry`, `sample-linear`, and `sample-lamp`.
- Answers are `[data-testid="choice"]`. The visible label is the inner `span`. Choice ids include `yes`, `no`, `choice:N`, `call:0`, `menu:N`, `continue`, and `return`.
- The current step is `[data-testid="step-card"]` and its `data-step-id`.
- The outline button is `[data-testid="outline-step"][data-step-id="..."]`. `data-focused` is the XML selection. `data-current` is the runner step. Those two differ when the user clicks the outline or the XML without answering.
- The highlight is `.cm-step`. Clicking a `.cm-line` that contains an `id` attribute focuses that step.
- Flow is `[data-testid="view-flow"]` and `[data-testid="flow-node"][data-step-id="..."]`.
- Below 980px the phone switcher is `[data-testid="surface-runner"]`, `[data-testid="surface-xml"]`, `[data-testid="surface-flow"]`, and `[data-testid="surface-glossary"]`. The runner tab is selected on load. At 1600px the right pane tabs are `[data-testid="view-runner"]`, `[data-testid="view-flow"]`, and `[data-testid="view-glossary"]`.
- The data module code is `[data-testid="dmc"]` in the runner and `[data-testid="explain-dmc"]` in the XML bar. Both open the glossary. `[data-testid="explain-isolation-step"]` opens the `isolationStep` entry.
- A clear sample shows `[data-testid="validation-ok"]`. A broken document shows `[data-testid="diagnostic"]`.

Cover every feature file that the change can affect. Do not mark a sample verified because a different sample passed.

## Evidence

`npx playwright test` writes these files under `artifacts/verify/`. That directory is gitignored. Cleanup must leave it in place.

- `battery-side-by-side.png` shows the battery XML and the open-circuit step together.
- `battery-load-test.png` shows step `bat-load` after the choice `12.4 V or more`, with the XML highlight on `bat-load`.
- `battery-highlight.png` shows the outline focus on `bat-load` and the yellow XML highlight.
- `battery-flow.png` shows the flow graph with `end-pass` selected and the XML highlight on that id.
- `engine-called-procedure.png` shows the starter-supply module, step `sup-measure`, and the referenced-module banner.
- `fan-retry.png` shows the fuse choices, including the choice that measures again.
- `linear-mid.png` shows `cool-wipe` between the first and last coolant steps.
- `lamp-dialog.png` shows the question `Did the lamp light?`.
- `broken-xml.png` shows a well-formedness diagnostic and the empty runner.
- `mobile-iphone-runner.png`, `mobile-iphone-xml.png`, and `mobile-iphone-flow.png` are the 390 by 844 iPhone views. The runner shot is on `bat-load`. XML and Flow are the other two tabs.
- `mobile-android-runner.png`, `mobile-android-xml.png`, and `mobile-android-flow.png` are the same three tabs at 360 by 800.
- `mobile-iphone-glossary.png` and `mobile-android-glossary.png` show the glossary as the only pane. The entries are the Issue 7 schema readings.

Open every PNG and look at it. A passing Playwright process is not a visual pass. Confirm the sample title, the step title, the answer buttons, and the yellow highlight are actually visible. Confirm the two panes are side by side at the 1600 by 1000 viewport, not stacked. On the mobile shots, confirm one tab fills the width, the answer buttons are tall enough to tap, and the page does not scroll sideways. Reject a shot that is blank, clipped through the step card, or highlighting a different id than the one the spec named.

The proof has to be the running app. Do not call the runner functions from a unit test and treat that as this skill.

## Cleanup

Stop the PID recorded in Launch. Do not kill a process by name.

```bash
kill <recorded-pid>
```

Wait until `lsof -nP -iTCP:4173 -sTCP:LISTEN` prints nothing. Do not delete `artifacts/verify/`. After cleanup, list that directory and confirm the PNGs are still there.

## Maintenance

When the samples or the test ids change, update the feature files in `features/` with `/maintain-verification-skill`.
