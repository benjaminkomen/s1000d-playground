# s1000d-playground

This is a public learning tool for S1000D Issue 7. An editable data module sits beside a runner that steps through the same XML. The samples are generic training modules. They are not taken from a product manual.

## Run the playground

Install dependencies, then start the dev server.

```bash
npm install
npm run dev
```

Open the URL Vite prints. The battery sample is selected. Click an answer on the right. The highlight on the left moves to that step.

`npm run build` writes `dist/`. The site uses a relative base, so the same build works for local preview and for GitHub Pages. Pushing `main` runs `.github/workflows/pages.yml`, which publishes `dist/`.

## What a data module is

A data module is one S1000D XML document. The root element is `dmodule`. Identity and status come first, then `content`. The playground reads two content types from the Issue 7 schemas published by the [S1000D](https://www.s1000d.org/) council. Those schemas have no target namespace.

- Fault isolation uses `faultIsolation`, `isolationProcedure`, `isolationStep`, `isolationStepQuestion`, `yesNoAnswer` or `listOfChoices`, `isolationStepAnswer`, and `isolationProcedureEnd`. Each answer carries `nextActionRefId`. That attribute is an `IDREF` to the next step. The runner follows those references. It does not walk the steps in document order. A retry is a `nextActionRefId` that points back at an earlier `id`. An `isolationProcedureEnd` has actions and no answer.
- A called procedure is a `dmRef` inside an `action`. `behavior linkShow="replaceAndReturnToSource"` is the Issue 7 value for opening that module and coming back. The engine sample does this. `linkActuate` on that reference is `onRequest`, so the runner waits for the Run button.
- A process module uses `variableDeclarations` and `dmSeq`. A `dmSeq` contains `dmNode`, `dmIf`, and `dmLoop`. A `dmNode` can hold procedural steps or a `dialog` `menu`. A `dmIf` has an `expression`, a `dmThenSeq`, and an optional `dmElseSeq`. A `dmLoop` tests an expression, runs its `dmSeq` while the expression is true, and can assign variables with `assertion`.

The schema files are [fault.xsd](http://www.s1000d.org/S1000D_7/xml_schema_flat/fault.xsd) and [process.xsd](http://www.s1000d.org/S1000D_7/xml_schema_flat/process.xsd). Both annotations say Issue 7, dated 2026-07-16. The step names above are the names in those files. `dmTitle` may also contain `infoNameVariant`. The samples use that element for the words "Training example". `dmStatus` may contain `controlAuthorityGroup`. The samples leave that group out.

A data module code, the DMC, is the hyphenated form of the `dmCode` attributes.

`modelIdentCode-systemDiffCode-systemCode-subsystem-assembly-disassembly-infoCode-itemLocationCode`

The battery sample is `S1000D-A-24-31-00-00A-420A-A`. The info-code numbers in the samples are 420 for a general fault isolation procedure, 310 for a visual examination, 340 for a function test, and 022 for the business rules exchange referenced from `brexDmRef`. Those numbers and short names come from the default business rules in S1000D chapter 8.4. This repository does not include that BREX. The standard numbering system codes in the samples are illustrative.

## Samples

- **12 V battery test.** `listOfChoices` on the open-circuit reading, then a `yesNoAnswer` load test.
- **Engine will not start.** A fault tree that runs the starter-supply module and returns.
- **Cooling fan retry.** One choice points `nextActionRefId` back at the voltage measurement.
- **Coolant inspection.** A process `dmSeq` of three `dmNode` steps.
- **Lamp check loop.** A process `dmLoop`, a `menu`, and a `dmIf`. The loop condition is true while `attempt` is below 3 and `lit` is false. The preset adds 1 to `attempt` before the test, so two dark answers run the body and the third arrival leaves the loop.

## Validation and the schema license

The runner checks three things. The XML must be well-formed. Every `nextActionRefId`, procedure `dmRef`, and `variableRef` must resolve. Every step must be reachable from the first module, counting both process branches and a loop body once. A cycle is reachable. It is not an error.

The playground does not validate against the XSD. The Issue 7 schema header is copyright 2026 by the Aerospace, Security and Defence Industries Association of Europe (ASD). It names ASD, the Aerospace Industries Association of America, and the ATA e-Business Program as publishers. The files are provided "as is", and the header says the copyright details are in the S1000D specification. That notice does not grant redistribution under this project's MIT license. The [download list](https://users.s1000d.org/ProductList.aspx) says use of the downloads is subject to the S1000D terms and conditions. Copying `fault.xsd` or `process.xsd` into the repository would ignore that notice. Download the schemas from the URLs above if you want to check a module with your own tools. The samples point `xsi:noNamespaceSchemaLocation` at those public URLs. The files are not stored here.

## Checks

```bash
npm run typecheck
npm run lint
npm test
npx playwright install chromium
npm run e2e
```

Pull requests run those four checks in `.github/workflows/ci.yml`. `npm test` walks each sample in the runner. `npm run e2e` clicks the same branches in Chromium and checks that the XML highlight follows the outline and the cursor.

The browser procedure for a later change lives in `.cursor/skills/verify-s1000d-playground/SKILL.md`.
