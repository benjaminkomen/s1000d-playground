# Glossary

The glossary is a list of Issue 7 names. Each entry is a short reading of a schema rule, or a statement that the schema does not define the term. The open module's data module code is repeated on the DMC entry.

## Sub-features

- `glossary-terms` shows one entry for each required id, with a definition and an Issue 7 source.
- `glossary-dmc-link` opens the DMC entry from the runner code and from the code in the XML bar.
- `glossary-isolation-step` opens the `isolationStep` entry from the step card.
- `glossary-mobile` shows the list as the only pane below 980px.

## How to get to it (user POV)

- On a wide window, choose `Glossary` on the right pane. The XML stays on the left.
- On a phone, choose `Glossary` in the switcher under the header. The runner and the editor are hidden.
- In the runner, choose the data module code, `Fault isolation`, or `isolationStep`.
- In the XML bar, choose the same data module code.

## Driving it with Playwright

Preconditions:

- The server from Launch is healthy at `http://127.0.0.1:4173`.
- The battery sample is loaded, so the code is `S1000D-A-24-31-00-00A-420A-A` and the step is `isolationStep`.

- **Desktop.** At 1600 by 1000, click `[data-testid="dmc"]`. `[data-testid="view-glossary"]` has `aria-selected` `true`. `[data-testid="glossary-sample-dmc"]` contains that code. `[data-testid="glossary-entry"][data-current="true"]` has `data-term-id` `dmc`. There are 17 entries. Click `[data-testid="view-runner"]`, then `[data-testid="explain-isolation-step"]`. The current entry is `isolation-step`. `[data-testid="explain-dmc"]` in the XML bar returns to the DMC entry.
- **Phone.** In `e2e/mobile.spec.ts`, click `[data-testid="surface-glossary"]`. `[data-testid="glossary"]` is visible, the editor is hidden, and the entry count is 17.
- **Unit.** `src/domain/glossary.test.ts` checks that every required id has a definition longer than 40 characters and a source that names Issue 7.
- **Proof.** `artifacts/verify/mobile-iphone-glossary.png` and `artifacts/verify/mobile-android-glossary.png`.

## Gotchas

- IETP and the letters of item location code are not given meanings in the Issue 7 schemas. An entry that says so is the definition. Do not treat that as a missing paragraph.
- Related-term buttons move inside the glossary. They do not change the sample.
- The desktop `view-glossary` tab is hidden below 980px. Use `surface-glossary` there.
