import { faultModule, dmCode } from "./shell";

export const retryCode = dmCode({
  systemCode: "21",
  subSystemCode: "2",
  subSubSystemCode: "0",
  infoCode: "420",
});

export const retryXml = faultModule({
  code: retryCode,
  techName: "Cooling fan",
  infoName: "Fault isolation",
  faultCode: "FAN-STOPPED",
  faultDescr: "The cooling fan does not run when commanded on.",
  steps: `            <isolationStep id="fan-voltage">
              <title>Measure the supply</title>
              <action>Disconnect the fan and measure voltage on the supply pin with the fan commanded on.</action>
              <isolationStepQuestion>Is 12 V present?</isolationStepQuestion>
              <isolationStepAnswer>
                <yesNoAnswer>
                  <yesAnswer nextActionRefId="fan-spin"/>
                  <noAnswer nextActionRefId="fan-fuse"/>
                </yesNoAnswer>
              </isolationStepAnswer>
            </isolationStep>
            <isolationStep id="fan-fuse">
              <title>Replace the fuse</title>
              <action>Fit a fuse of the same rating and command the fan on again.</action>
              <isolationStepQuestion>What happens after the fuse is replaced?</isolationStepQuestion>
              <isolationStepAnswer>
                <listOfChoices>
                  <choice nextActionRefId="end-ok">The fan runs</choice>
                  <choice nextActionRefId="fan-voltage">Still no 12 V, measure again</choice>
                  <choice nextActionRefId="end-short">The new fuse opens</choice>
                </listOfChoices>
              </isolationStepAnswer>
            </isolationStep>
            <isolationStep id="fan-spin">
              <title>Check the fan itself</title>
              <action>Reconnect the fan and command it on.</action>
              <isolationStepQuestion>Does the fan turn?</isolationStepQuestion>
              <isolationStepAnswer>
                <yesNoAnswer>
                  <yesAnswer nextActionRefId="end-ok"/>
                  <noAnswer nextActionRefId="end-fan"/>
                </yesNoAnswer>
              </isolationStepAnswer>
            </isolationStep>
            <isolationProcedureEnd id="end-ok">
              <title>Fan circuit is serviceable</title>
              <action>The fan runs. No further isolation is required.</action>
            </isolationProcedureEnd>
            <isolationProcedureEnd id="end-short">
              <title>Wiring short</title>
              <action>The replacement fuse opens. Isolate the short in the fan wiring before fitting another fuse.</action>
            </isolationProcedureEnd>
            <isolationProcedureEnd id="end-fan">
              <title>Replace the fan</title>
              <action>Supply is present and the fan does not turn. Replace the fan.</action>
            </isolationProcedureEnd>`,
});
