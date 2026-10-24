export interface GlossaryEntry {
  id: string;
  term: string;
  definition: string;
  source: string;
  see: readonly string[];
}

const issue = "S1000D Issue 7 schemas dated 2026-07-16";

export const glossary = [
  {
    id: "dm",
    term: "Data module (DM)",
    definition:
      "A data module is an XML document. In the fault, process, and BREX schemas the root element is dmodule. It contains identAndStatusSection and content. identAndStatusSection contains dmAddress and dmStatus.",
    source: `${issue}. fault.xsd, process.xsd, and brex.xsd, element dmodule.`,
    see: ["dmc", "fault-isolation", "process-module", "brex"],
  },
  {
    id: "dmc",
    term: "Data module code (DMC)",
    definition:
      "The data module code is the hyphenated form of the dmCode attributes. dmCode requires modelIdentCode, systemDiffCode, systemCode, subSystemCode, subSubSystemCode, assyCode, disassyCode, disassyCodeVariant, infoCode, infoCodeVariant, and itemLocationCode. learnCode and learnEventCode are optional. dmIdent places dmCode before language and issueInfo.",
    source: `${issue}. fault.xsd, type dmCodeElemType and dmIdentElemType.`,
    see: ["model-ident-code", "sns", "information-code", "item-location-code", "disassembly-code", "issue-inwork"],
  },
  {
    id: "sns",
    term: "Standard numbering system (SNS)",
    definition:
      "The BREX schema names this breakdown with snsRules. snsDescr contains snsSystem. snsSystem has snsCode, snsTitle, and any number of snsSubSystem. snsSubSystem has snsCode, snsTitle, and any number of snsSubSubSystem. snsSubSubSystem has snsCode, snsTitle, and any number of snsAssy. snsAssy has snsCode and snsTitle. dmCode carries the same levels as systemCode, subSystemCode, subSubSystemCode, and assyCode. The schema does not spell out the words in the abbreviation SNS.",
    source: `${issue}. brex.xsd elements snsRules, snsDescr, snsSystem, snsSubSystem, snsSubSubSystem, and snsAssy.`,
    see: ["dmc", "brex"],
  },
  {
    id: "model-ident-code",
    term: "Model identification code",
    definition:
      "modelIdentCode is a required dmCode attribute. The schema restricts it to 2 to 14 characters from A to Z and 0 to 9. The schema does not define a list of models.",
    source: `${issue}. fault.xsd, type modelIdentCodeAttType.`,
    see: ["dmc"],
  },
  {
    id: "information-code",
    term: "Information code",
    definition:
      "infoCode is a required dmCode attribute of 3 characters from A to Z and 0 to 9. infoCodeVariant is a required companion of 1 such character. The schema does not list what each code means.",
    source: `${issue}. fault.xsd, types infoCodeAttType and infoCodeVariantAttType.`,
    see: ["dmc"],
  },
  {
    id: "item-location-code",
    term: "Item location code",
    definition:
      "itemLocationCode is a required dmCode attribute. The only values in the schema are A, B, C, D, and T. The schema does not say what each letter means.",
    source: `${issue}. fault.xsd, type itemLocationCodeAttType.`,
    see: ["dmc"],
  },
  {
    id: "disassembly-code",
    term: "Disassembly code and variant",
    definition:
      "disassyCode and disassyCodeVariant are both required on dmCode. disassyCode is 2 characters from A to Z and 0 to 9. disassyCodeVariant is 1 to 3 such characters. In the hyphenated data module code the two values are written as one group.",
    source: `${issue}. fault.xsd, types disassyCodeAttType and disassyCodeVariantAttType.`,
    see: ["dmc"],
  },
  {
    id: "issue-inwork",
    term: "Issue and inwork",
    definition:
      "issueInfo requires issueNumber and inWork. issueNumber is a number of 3 to 5 digits. inWork is a number of 2 digits. dmIdent includes issueInfo after dmCode and language.",
    source: `${issue}. fault.xsd, type issueInfoGenericElemType, issueNumberAttType, and inWorkAttType.`,
    see: ["dm", "dmc"],
  },
  {
    id: "csdb",
    term: "CSDB (common source database)",
    definition:
      "The Issue 7 data dictionary front page titles the specification as technical publications using a common source database. The fault, process, publication module, and BREX schemas do not define a CSDB element. The specification document itself is behind the download terms page, so this entry does not add a database design.",
    source: "Issue 7 data dictionary, https://users.s1000d.org/S1000D_DD_7/, issue 7, date 2026-07-16. Checked fault.xsd, process.xsd, pm.xsd, and brex.xsd.",
    see: ["dm", "publication-module"],
  },
  {
    id: "publication-module",
    term: "Publication module",
    definition:
      "A publication module is an XML document whose root element is pm. It contains identAndStatusSection and content. pmIdent contains pmCode, language, and issueInfo. A pmEntry has an optional title and then one or more of dmRef, pmRef, externalPubRef, or a nested pmEntry.",
    source: `${issue}. pm.xsd, elements pm, pmIdent, and pmEntry.`,
    see: ["dm-ref", "dm"],
  },
  {
    id: "brex",
    term: "BREX (business rules exchange)",
    definition:
      "brex.xsd is a data module schema. Its content element requires brex. brex can contain snsRules, contextRules, and nonContextRules. Another data module points at that module with brexDmRef, and brexDmRef contains one dmRef. The schema does not spell out the words in the abbreviation BREX.",
    source: `${issue}. brex.xsd elements brex and brexDmRef. fault.xsd element brexDmRef.`,
    see: ["sns", "dm-ref", "dm"],
  },
  {
    id: "applicability",
    term: "Applicability",
    definition:
      "The applic element is either displayText with an optional assert or evaluate, or an assert or evaluate on its own. applicRef requires applicIdentValue and may contain a dmRef.",
    source: `${issue}. fault.xsd, types applicElemType and applicRefElemType.`,
    see: ["dm", "dm-ref"],
  },
  {
    id: "fault-isolation",
    term: "Fault isolation data module",
    definition:
      "In fault.xsd the content choice is faultReporting or faultIsolation. faultIsolation contains any number of faultIsolationProcedure elements, with optional commonInfo and preliminaryRqmts before them.",
    source: `${issue}. fault.xsd, elements content and faultIsolation.`,
    see: ["isolation-step", "dm"],
  },
  {
    id: "process-module",
    term: "Process data module",
    definition:
      "In process.xsd the content element requires process, after optional refs, applicability, and warnings. A process module is a dmodule that uses that content.",
    source: `${issue}. process.xsd, element content.`,
    see: ["dm"],
  },
  {
    id: "isolation-step",
    term: "isolationStep",
    definition:
      "isolationStep requires id. Its content starts with an optional title and the warning and caution group. It can then repeat actions, and it ends that part with isolationStepQuestion and isolationStepAnswer.",
    source: `${issue}. fault.xsd, type isolationStepElemType.`,
    see: ["fault-isolation", "dm-ref"],
  },
  {
    id: "dm-ref",
    term: "dmRef",
    definition:
      "dmRef contains dmRefIdent, and it may contain dmRefAddressItems and behavior. It can carry referredFragment. behavior uses linkShow, whose schema values are newPane, embedInContext, replaceAndReturnToSource, and replaceAndNoReturn. pmEntry and brexDmRef both use dmRef.",
    source: `${issue}. fault.xsd, type dmRefElemType and linkShowAttType.`,
    see: ["dmc", "publication-module", "brex"],
  },
  {
    id: "ietp",
    term: "IETP",
    definition:
      "IETP is not an element or an attribute in the Issue 7 data dictionary indexes, and it is not a name in the fault, process, publication module, or BREX schemas. The specification download is the remaining source, and that page requires accepting terms. This entry does not guess a meaning.",
    source: "Issue 7 data dictionary element and attribute indexes at https://users.s1000d.org/S1000D_DD_7/. Schemas fault.xsd, process.xsd, pm.xsd, and brex.xsd.",
    see: ["publication-module", "csdb"],
  },
] as const satisfies readonly GlossaryEntry[];

export type GlossaryId = (typeof glossary)[number]["id"];

const byId = new Map<string, GlossaryEntry>(glossary.map((entry) => [entry.id, entry]));

export function glossaryEntry(id: string): GlossaryEntry | undefined {
  return byId.get(id);
}
