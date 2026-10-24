import { faultModule, dmCode } from "./shell";

export const batteryCode = dmCode({
  systemCode: "24",
  subSystemCode: "3",
  subSubSystemCode: "1",
  infoCode: "420",
});

export const batteryXml = faultModule({
  code: batteryCode,
  techName: "12 V battery",
  infoName: "Fault isolation",
  faultCode: "LOW-VOLTAGE",
  faultDescr: "The 12 V battery may be discharged or unable to hold a load.",
  steps: `            <isolationStep id="bat-ocv">
              <title>Open-circuit voltage</title>
              <action>Rest the battery, then measure the voltage across the posts with a meter set to DC volts.</action>
              <isolationStepQuestion>Which open-circuit reading do you see?</isolationStepQuestion>
              <isolationStepAnswer>
                <listOfChoices>
                  <choice nextActionRefId="end-low">Less than 12.4 V</choice>
                  <choice nextActionRefId="bat-load">12.4 V or more</choice>
                </listOfChoices>
              </isolationStepAnswer>
            </isolationStep>
            <isolationStep id="bat-load">
              <title>Load test</title>
              <action>Apply a load equal to half the rated capacity for 15 seconds and watch the voltage.</action>
              <isolationStepQuestion>Does the voltage stay at or above 9.6 V for the whole test?</isolationStepQuestion>
              <isolationStepAnswer>
                <yesNoAnswer>
                  <yesAnswer nextActionRefId="end-pass"/>
                  <noAnswer nextActionRefId="end-fail"/>
                </yesNoAnswer>
              </isolationStepAnswer>
            </isolationStep>
            <isolationProcedureEnd id="end-low">
              <title>Battery is discharged</title>
              <action>Charge the battery, then repeat this isolation from the open-circuit measurement. Replace the battery if it will not take a charge.</action>
            </isolationProcedureEnd>
            <isolationProcedureEnd id="end-pass">
              <title>Battery is serviceable</title>
              <action>The battery held the load. No battery replacement is required.</action>
            </isolationProcedureEnd>
            <isolationProcedureEnd id="end-fail">
              <title>Battery failed the load test</title>
              <action>The battery did not hold 9.6 V under load. Replace it.</action>
            </isolationProcedureEnd>`,
});
