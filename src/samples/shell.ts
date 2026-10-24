import { dmCodeAttributes } from "../domain/dmc";
import type { DmCode } from "../domain/types";

export function dmCode(partial: {
  systemCode: string;
  subSystemCode: string;
  subSubSystemCode: string;
  infoCode: string;
  infoCodeVariant?: string;
  itemLocationCode?: string;
}): DmCode {
  return {
    modelIdentCode: "S1000D",
    systemDiffCode: "A",
    assyCode: "00",
    disassyCode: "00",
    disassyCodeVariant: "A",
    infoCodeVariant: "A",
    itemLocationCode: "A",
    ...partial,
  };
}

const STATUS = `    <dmStatus issueType="new">
      <security securityClassification="01"/>
      <responsiblePartnerCompany enterpriseCode="GENERIC">
        <enterpriseName>Generic training set</enterpriseName>
      </responsiblePartnerCompany>
      <originator enterpriseCode="GENERIC">
        <enterpriseName>Generic training set</enterpriseName>
      </originator>
      <applicRef applicIdentValue="app-0001"/>
      <brexDmRef>
        <dmRef>
          <dmRefIdent>
            <dmCode modelIdentCode="S1000D" systemDiffCode="A" systemCode="00" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="022" infoCodeVariant="A" itemLocationCode="D"/>
          </dmRefIdent>
        </dmRef>
      </brexDmRef>
      <qualityAssurance>
        <unverified/>
      </qualityAssurance>
    </dmStatus>`;

const PRELIM = `        <preliminaryRqmts>
          <reqCondGroup>
            <noConds/>
          </reqCondGroup>
          <reqSupportEquips>
            <noSupportEquips/>
          </reqSupportEquips>
          <reqSupplies>
            <noSupplies/>
          </reqSupplies>
          <reqSpares>
            <noSpares/>
          </reqSpares>
          <reqSafety>
            <noSafety/>
          </reqSafety>
        </preliminaryRqmts>`;

const CLOSE = `        <closeRqmts>
          <reqCondGroup>
            <noConds/>
          </reqCondGroup>
        </closeRqmts>`;

function identity(code: DmCode, techName: string, infoName: string, schema: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generic training module. It is not taken from a product manual. -->
<dmodule xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="${schema}">
  <identAndStatusSection>
    <dmAddress>
      <dmIdent>
        <dmCode ${dmCodeAttributes(code)}/>
        <language languageIsoCode="en" countryIsoCode="US"/>
        <issueInfo issueNumber="001" inWork="01"/>
      </dmIdent>
      <dmAddressItems>
        <issueDate year="2026" month="01" day="15"/>
        <dmTitle>
          <techName>${techName}</techName>
          <infoName>${infoName}</infoName>
          <infoNameVariant>Training example</infoNameVariant>
        </dmTitle>
      </dmAddressItems>
    </dmAddress>
${STATUS}
  </identAndStatusSection>`;
}

export function faultModule(input: {
  code: DmCode;
  techName: string;
  infoName: string;
  faultCode: string;
  faultDescr: string;
  steps: string;
}): string {
  return `${identity(input.code, input.techName, input.infoName, "http://www.s1000d.org/S1000D_7/xml_schema_flat/fault.xsd")}
  <content>
    <faultIsolation>
      <faultIsolationProcedure>
        <fault faultCode="${input.faultCode}"/>
        <faultDescr>
          <descr>${input.faultDescr}</descr>
        </faultDescr>
        <isolationProcedure>
${PRELIM}
          <isolationMainProcedure>
${input.steps}
          </isolationMainProcedure>
${CLOSE}
        </isolationProcedure>
      </faultIsolationProcedure>
    </faultIsolation>
  </content>
</dmodule>
`;
}

export function processModule(input: {
  code: DmCode;
  techName: string;
  infoName: string;
  variables?: string;
  sequence: string;
}): string {
  const declarations = input.variables
    ? `      <variableDeclarations>
${input.variables}
      </variableDeclarations>
`
    : "";
  return `${identity(input.code, input.techName, input.infoName, "http://www.s1000d.org/S1000D_7/xml_schema_flat/process.xsd")}
  <content>
    <process>
${declarations}      <dmSeq>
${input.sequence}
      </dmSeq>
    </process>
  </content>
</dmodule>
`;
}

export function dmRef(code: DmCode, techName: string, infoName: string): string {
  return `<dmRef>
              <dmRefIdent>
                <dmCode ${dmCodeAttributes(code)}/>
              </dmRefIdent>
              <dmRefAddressItems>
                <dmTitle>
                  <techName>${techName}</techName>
                  <infoName>${infoName}</infoName>
                </dmTitle>
              </dmRefAddressItems>
              <behavior linkShow="replaceAndReturnToSource" linkActuate="onRequest"/>
            </dmRef>`;
}
