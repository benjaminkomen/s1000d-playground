import { batteryXml } from "./battery";
import { engineXml, supplyXml } from "./engine";
import { linearXml } from "./linear";
import { processLoopXml } from "./processLoop";
import { retryXml } from "./retry";

export interface SampleModule {
  name: string;
  filename: string;
  xml: string;
}

export interface Sample {
  id: string;
  title: string;
  blurb: string;
  modules: SampleModule[];
}

export const samples: Sample[] = [
  {
    id: "battery",
    title: "12 V battery test",
    blurb: "Fault isolation with listOfChoices and a yesNoAnswer load test.",
    modules: [{ name: "12 V battery", filename: "battery.xml", xml: batteryXml }],
  },
  {
    id: "engine",
    title: "Engine will not start",
    blurb: "Fault isolation that runs a starter-supply procedure and returns.",
    modules: [
      { name: "Engine", filename: "engine.xml", xml: engineXml },
      { name: "Starter supply", filename: "supply.xml", xml: supplyXml },
    ],
  },
  {
    id: "retry",
    title: "Cooling fan retry",
    blurb: "A no-voltage answer points nextActionRefId back at the measurement.",
    modules: [{ name: "Cooling fan", filename: "retry.xml", xml: retryXml }],
  },
  {
    id: "linear",
    title: "Coolant inspection",
    blurb: "A process data module whose dmSeq is three dmNode steps in order.",
    modules: [{ name: "Coolant reservoir", filename: "linear.xml", xml: linearXml }],
  },
  {
    id: "lamp",
    title: "Lamp check loop",
    blurb: "A process dmLoop with a variable, a dialog menu, and a dmIf.",
    modules: [{ name: "Lamp", filename: "lamp.xml", xml: processLoopXml }],
  },
];

export function sampleById(id: string): Sample {
  const sample = samples.find((item) => item.id === id);
  if (!sample) throw new Error(`Unknown sample ${id}.`);
  return sample;
}
