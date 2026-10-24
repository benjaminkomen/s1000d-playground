import { processModule, dmCode } from "./shell";

export const loopCode = dmCode({
  systemCode: "33",
  subSystemCode: "1",
  subSubSystemCode: "0",
  infoCode: "340",
});

export const processLoopXml = processModule({
  code: loopCode,
  techName: "Lamp",
  infoName: "Function test",
  variables: `        <variable variableName="attempt" variableDescr="How many times the lamp has been checked" valueType="integer">
          <initialize>
            <expression>
              <integerValue>0</integerValue>
            </expression>
          </initialize>
        </variable>
        <variable variableName="lit" variableDescr="Whether the lamp is lit" valueType="boolean">
          <initialize>
            <expression>
              <booleanValue>
                <falseValue/>
              </booleanValue>
            </expression>
          </initialize>
        </variable>`,
  sequence: `        <dmNode id="node-prepare">
          <title>Fit the lamp</title>
          <proceduralStep>
            <para>Fit a lamp of the stated rating and switch the circuit on.</para>
          </proceduralStep>
        </dmNode>
        <dmLoop id="lamp-loop">
          <variablePreSet>
            <assertion>
              <variableRef variableName="attempt"/>
              <expression>
                <expression>
                  <variableRef variableName="attempt"/>
                </expression>
                <numberOperator numberOperation="plus"/>
                <expression>
                  <integerValue>1</integerValue>
                </expression>
              </expression>
            </assertion>
          </variablePreSet>
          <expression humanReadableForm="attempt is below 3 and the lamp is not lit">
            <expression>
              <expression>
                <variableRef variableName="attempt"/>
              </expression>
              <numberOperator numberOperation="lessThan"/>
              <expression>
                <integerValue>3</integerValue>
              </expression>
            </expression>
            <booleanOperator booleanOperation="and"/>
            <expression>
              <expression>
                <variableRef variableName="lit"/>
              </expression>
              <booleanOperator booleanOperation="equal"/>
              <expression>
                <booleanValue>
                  <falseValue/>
                </booleanValue>
              </expression>
            </expression>
          </expression>
          <dmSeq>
            <dmNode id="node-observe">
              <title>Observe the lamp</title>
              <proceduralStep>
                <para>Look at the filament.</para>
              </proceduralStep>
              <dialog>
                <menu choiceType="select">
                  <prompt>
                    <paraBasic>Did the lamp light?</paraBasic>
                  </prompt>
                  <menuChoice>
                    <prompt>
                      <paraBasic>Yes</paraBasic>
                    </prompt>
                    <assertion>
                      <variableRef variableName="lit"/>
                      <expression>
                        <booleanValue>
                          <trueValue/>
                        </booleanValue>
                      </expression>
                    </assertion>
                  </menuChoice>
                  <menuChoice>
                    <prompt>
                      <paraBasic>No</paraBasic>
                    </prompt>
                    <assertion>
                      <variableRef variableName="lit"/>
                      <expression>
                        <booleanValue>
                          <falseValue/>
                        </booleanValue>
                      </expression>
                    </assertion>
                  </menuChoice>
                </menu>
              </dialog>
            </dmNode>
            <dmIf id="if-dark">
              <expression humanReadableForm="the lamp is not lit">
                <expression>
                  <variableRef variableName="lit"/>
                </expression>
                <booleanOperator booleanOperation="equal"/>
                <expression>
                  <booleanValue>
                    <falseValue/>
                  </booleanValue>
                </expression>
              </expression>
              <dmThenSeq>
                <dmNode id="node-reseat">
                  <title>Reseat the lamp</title>
                  <proceduralStep>
                    <para>Turn the lamp in its holder, then let the loop check it again.</para>
                  </proceduralStep>
                </dmNode>
              </dmThenSeq>
              <dmElseSeq>
                <dmNode id="node-good">
                  <title>The lamp is lit</title>
                  <proceduralStep>
                    <para>Leave the lamp fitted. The loop condition will now fail.</para>
                  </proceduralStep>
                </dmNode>
              </dmElseSeq>
            </dmIf>
          </dmSeq>
        </dmLoop>
        <dmNode id="node-record">
          <title>Record the result</title>
          <proceduralStep>
            <para>Write down whether the lamp lit and how many attempts were used.</para>
          </proceduralStep>
        </dmNode>`,
});
