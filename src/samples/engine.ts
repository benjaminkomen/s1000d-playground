import { dmRef, faultModule, dmCode } from "./shell";

export const supplyCode = dmCode({
  systemCode: "80",
  subSystemCode: "1",
  subSubSystemCode: "0",
  infoCode: "420",
});

export const engineCode = dmCode({
  systemCode: "80",
  subSystemCode: "0",
  subSubSystemCode: "0",
  infoCode: "420",
});

export const supplyXml = faultModule({
  code: supplyCode,
  techName: "Starter supply",
  infoName: "Fault isolation",
  faultCode: "LOW-CRANK-VOLTAGE",
  faultDescr: "Voltage at the starter may collapse while the engine is cranking.",
  steps: `            <isolationStep id="sup-measure">
              <title>Measure voltage while cranking</title>
              <action>Measure DC voltage at the starter terminal while a second person cranks for a few seconds.</action>
              <isolationStepQuestion>Does the voltage stay at or above 9.6 V while cranking?</isolationStepQuestion>
              <isolationStepAnswer>
                <yesNoAnswer>
                  <yesAnswer nextActionRefId="end-sup-ok"/>
                  <noAnswer nextActionRefId="end-sup-low"/>
                </yesNoAnswer>
              </isolationStepAnswer>
            </isolationStep>
            <isolationProcedureEnd id="end-sup-ok">
              <title>Supply at the starter is sufficient</title>
              <action>The supply check passed. Return to the calling procedure and answer yes.</action>
            </isolationProcedureEnd>
            <isolationProcedureEnd id="end-sup-low">
              <title>Supply at the starter is low</title>
              <action>Check the battery cables and the battery itself before trying to start again.</action>
            </isolationProcedureEnd>`,
});

export const engineXml = faultModule({
  code: engineCode,
  techName: "Engine",
  infoName: "Will not start",
  faultCode: "NO-START",
  faultDescr: "The engine does not start when the operator selects start.",
  steps: `            <isolationStep id="eng-crank">
              <title>Does the engine crank?</title>
              <action>Select start and try to crank for up to five seconds.</action>
              <isolationStepQuestion>Does the engine crank?</isolationStepQuestion>
              <isolationStepAnswer>
                <yesNoAnswer>
                  <yesAnswer nextActionRefId="eng-fuel"/>
                  <noAnswer nextActionRefId="eng-supply"/>
                </yesNoAnswer>
              </isolationStepAnswer>
            </isolationStep>
            <isolationStep id="eng-supply">
              <title>Check the supply at the starter</title>
              <action>The cranking circuit depends on the supply at the starter. Run that procedure, then return here and answer. ${dmRef(supplyCode, "Starter supply", "Fault isolation")}</action>
              <isolationStepQuestion>Did the supply check pass?</isolationStepQuestion>
              <isolationStepAnswer>
                <yesNoAnswer>
                  <yesAnswer nextActionRefId="eng-control"/>
                  <noAnswer nextActionRefId="end-supply"/>
                </yesNoAnswer>
              </isolationStepAnswer>
            </isolationStep>
            <isolationStep id="eng-control">
              <title>Starter control circuit</title>
              <action>Listen at the starter while a second person selects start.</action>
              <isolationStepQuestion>Does the starter control circuit click?</isolationStepQuestion>
              <isolationStepAnswer>
                <yesNoAnswer>
                  <yesAnswer nextActionRefId="end-drive"/>
                  <noAnswer nextActionRefId="end-control"/>
                </yesNoAnswer>
              </isolationStepAnswer>
            </isolationStep>
            <isolationStep id="eng-fuel">
              <title>Fuel at the engine</title>
              <action>Check whether fuel is present at the engine inlet.</action>
              <isolationStepQuestion>Is fuel present at the engine?</isolationStepQuestion>
              <isolationStepAnswer>
                <yesNoAnswer>
                  <yesAnswer nextActionRefId="end-ignition"/>
                  <noAnswer nextActionRefId="end-fuel"/>
                </yesNoAnswer>
              </isolationStepAnswer>
            </isolationStep>
            <isolationProcedureEnd id="end-supply">
              <title>Correct the supply fault</title>
              <action>The called procedure found a supply fault. Correct that fault before trying to start again.</action>
            </isolationProcedureEnd>
            <isolationProcedureEnd id="end-drive">
              <title>Check the starter drive</title>
              <action>The control circuit clicks, so inspect the starter drive.</action>
            </isolationProcedureEnd>
            <isolationProcedureEnd id="end-control">
              <title>Starter control circuit is open</title>
              <action>The control circuit does not click. Trace the control wire and its switch.</action>
            </isolationProcedureEnd>
            <isolationProcedureEnd id="end-ignition">
              <title>Check ignition</title>
              <action>Fuel is present and the engine cranks. Check the ignition circuit next.</action>
            </isolationProcedureEnd>
            <isolationProcedureEnd id="end-fuel">
              <title>Restore the fuel supply</title>
              <action>No fuel is reaching the engine. Restore the fuel supply, then try to start again.</action>
            </isolationProcedureEnd>`,
});
