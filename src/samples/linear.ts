import { processModule, dmCode } from "./shell";

export const linearCode = dmCode({
  systemCode: "75",
  subSystemCode: "0",
  subSubSystemCode: "0",
  infoCode: "310",
});

export const linearXml = processModule({
  code: linearCode,
  techName: "Coolant reservoir",
  infoName: "Visual examination",
  sequence: `        <dmNode id="cool-look">
          <title>Look at the reservoir</title>
          <proceduralStep>
            <para>With the equipment cold, read the coolant level against the marks on the reservoir.</para>
          </proceduralStep>
        </dmNode>
        <dmNode id="cool-wipe">
          <title>Wipe the sight glass</title>
          <proceduralStep>
            <para>Wipe the cap and the sight glass so the next reading is not hidden by dirt.</para>
          </proceduralStep>
        </dmNode>
        <dmNode id="cool-record">
          <title>Record the level</title>
          <proceduralStep>
            <para>Write the level in the service log. Add coolant only if the level is below the lower mark.</para>
          </proceduralStep>
        </dmNode>`,
});
