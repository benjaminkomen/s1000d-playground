import type { DataModule, Instruction, OutlineItem } from "../domain/types";

export function outlineOf(module: DataModule): OutlineItem[] {
  if (module.kind === "fault") {
    return module.steps.map((step) => ({
      stepId: step.id,
      title: step.title,
      element: step.role,
    }));
  }
  const items: OutlineItem[] = [];
  const walk = (list: readonly Instruction[]) => {
    for (const item of list) {
      items.push({
        stepId: item.id,
        title: item.type === "node" ? item.title : item.human,
        element: item.type === "node" ? "dmNode" : item.type === "if" ? "dmIf" : "dmLoop",
      });
      if (item.type === "if") {
        walk(item.then);
        walk(item.else);
      } else if (item.type === "loop") {
        walk(item.body);
      }
    }
  };
  walk(module.root);
  return items;
}
