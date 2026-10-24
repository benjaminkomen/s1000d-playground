import { mkdir } from "node:fs/promises";
import { expect, test, type Locator, type Page } from "@playwright/test";

const shotDir = "artifacts/verify";

const expectedSteps: Record<string, string[]> = {
  battery: ["bat-ocv", "bat-load", "end-low", "end-pass", "end-fail"],
  engine: [
    "eng-crank",
    "eng-supply",
    "eng-control",
    "eng-fuel",
    "end-supply",
    "end-drive",
    "end-control",
    "end-ignition",
    "end-fuel",
    "sup-measure",
    "end-sup-ok",
    "end-sup-low",
  ],
  retry: ["fan-voltage", "fan-fuse", "fan-spin", "end-ok", "end-short", "end-fan"],
  linear: ["cool-look", "cool-wipe", "cool-record"],
  lamp: ["node-prepare", "lamp-loop", "node-observe", "if-dark", "node-reseat", "node-good", "node-record"],
};

test.beforeAll(async () => {
  await mkdir(shotDir, { recursive: true });
});

test("walks every sample branch and keeps validation clear", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "S1000D Playground" })).toBeVisible();

  for (const [id, steps] of Object.entries(expectedSteps)) {
    await page.getByTestId(`sample-${id}`).click();
    await expect(page.getByTestId(`sample-${id}`)).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("validation-ok")).toBeVisible();
    await expect(page.getByTestId("runner")).toBeVisible();
    const visited = await walkBranches(page);
    for (const stepId of steps) expect(visited, `${id} missed ${stepId}`).toContain(stepId);
  }
});

test("battery load test is the branch after the passing open-circuit choice", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("dmc")).toHaveText("S1000D-A-24-31-00-00A-420A-A");
  await expect(page.getByTestId("step-card")).toHaveAttribute("data-step-id", "bat-ocv");
  await page.screenshot({ path: `${shotDir}/battery-side-by-side.png` });

  await choice(page, "12.4 V or more").click();
  await expect(page.getByTestId("step-card")).toHaveAttribute("data-step-id", "bat-load");
  await expect(page.getByTestId("prompt")).toContainText("9.6 V");
  await expectHighlighted(page, "bat-load");
  await page.screenshot({ path: `${shotDir}/battery-load-test.png` });

  await page.getByTestId("back").click();
  await expect(page.getByTestId("step-card")).toHaveAttribute("data-step-id", "bat-ocv");
  await choice(page, "12.4 V or more").click();
  await choice(page, "Yes").click();
  await expect(page.getByTestId("step-card")).toHaveAttribute("data-step-id", "end-pass");
  await expect(page.getByTestId("runner-ended")).toBeVisible();
  await page.getByTestId("restart").click();
  await expect(page.getByTestId("step-card")).toHaveAttribute("data-step-id", "bat-ocv");
  await expect(page.getByTestId("back")).toBeDisabled();
});

test("engine call returns to the supply question", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("sample-engine").click();
  await choice(page, "No").click();
  await expect(page.getByTestId("step-card")).toHaveAttribute("data-step-id", "eng-supply");
  await choice(page, "Run Starter supply / Fault isolation").click();
  await expect(page.getByTestId("step-card")).toHaveAttribute("data-step-id", "sup-measure");
  await expect(page.getByTestId("call-banner")).toContainText("Referenced data module");
  await expect(page.getByTestId("module-tab").filter({ hasText: "Starter supply" })).toHaveAttribute("aria-selected", "true");
  await page.screenshot({ path: `${shotDir}/engine-called-procedure.png` });
  await choice(page, "Yes").click();
  await expect(page.getByTestId("step-card")).toHaveAttribute("data-step-id", "end-sup-ok");
  await choice(page, "Return to caller").click();
  await expect(page.getByTestId("step-card")).toHaveAttribute("data-step-id", "eng-supply");
  await expect(page.getByTestId("note")).toContainText("Returned from Starter supply");
  await choice(page, "Yes").click();
  await expect(page.getByTestId("step-card")).toHaveAttribute("data-step-id", "eng-control");
});

test("fan retry can measure again and can end", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("sample-retry").click();
  await choice(page, "No").click();
  await expect(page.getByTestId("step-card")).toHaveAttribute("data-step-id", "fan-fuse");
  await page.screenshot({ path: `${shotDir}/fan-retry.png` });
  await choice(page, "Still no 12 V, measure again").click();
  await expect(page.getByTestId("step-card")).toHaveAttribute("data-step-id", "fan-voltage");
  await choice(page, "No").click();
  await choice(page, "The new fuse opens").click();
  await expect(page.getByTestId("step-card")).toHaveAttribute("data-step-id", "end-short");
});

test("linear process continues in document order", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("sample-linear").click();
  await expect(page.getByTestId("dmc")).toHaveText("S1000D-A-75-00-00-00A-310A-A");
  await choice(page, "Continue").click();
  await expect(page.getByTestId("step-card")).toHaveAttribute("data-step-id", "cool-wipe");
  await page.screenshot({ path: `${shotDir}/linear-mid.png` });
  await choice(page, "Continue").click();
  await choice(page, "Continue").click();
  await expect(page.getByTestId("step-card")).toHaveAttribute("data-ended", "true");
  await expect(page.getByTestId("step-card").locator("h3")).toHaveText("Procedure complete");
});

test("lamp loop records a lit answer and leaves when attempt reaches 3", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("sample-lamp").click();
  await expect(page.getByTestId("dmc")).toHaveText("S1000D-A-33-10-00-00A-340A-A");
  await choice(page, "Continue").click();
  await expect(page.getByTestId("step-card")).toHaveAttribute("data-step-id", "lamp-loop");
  await choice(page, "Enter dmSeq").click();
  await expect(page.getByTestId("prompt")).toHaveText("Did the lamp light?");
  await page.screenshot({ path: `${shotDir}/lamp-dialog.png` });
  await choice(page, "Yes").click();
  await expect(page.getByTestId("step-card")).toHaveAttribute("data-step-id", "if-dark");
  await expect(page.getByTestId("note")).toContainText("false");
  await choice(page, "Follow dmElseSeq").click();
  await expect(page.getByTestId("step-card")).toHaveAttribute("data-step-id", "node-good");

  await page.getByTestId("restart").click();
  await choice(page, "Continue").click();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await choice(page, "Enter dmSeq").click();
    await choice(page, "No").click();
    await choice(page, "Follow dmThenSeq").click();
    await expect(page.getByTestId("step-card")).toHaveAttribute("data-step-id", "node-reseat");
    await choice(page, "Continue").click();
  }
  await expect(page.getByTestId("step-card")).toHaveAttribute("data-step-id", "lamp-loop");
  await expect(page.getByTestId("note")).toContainText("condition is false");
  await choice(page, "Leave dmLoop").click();
  await expect(page.getByTestId("step-card")).toHaveAttribute("data-step-id", "node-record");
});

test("outline and cursor keep the XML highlight on the same step", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-testid="outline-step"][data-step-id="bat-load"]').click();
  await expect(page.locator('[data-testid="outline-step"][data-step-id="bat-load"]')).toHaveAttribute("data-focused", "true");
  await expectHighlighted(page, 'id="bat-load"');
  await page.screenshot({ path: `${shotDir}/battery-highlight.png` });

  await page.locator(".cm-line", { hasText: '<isolationProcedureEnd id="end-fail">' }).click();
  await expect(page.locator('[data-testid="outline-step"][data-step-id="end-fail"]')).toHaveAttribute("data-focused", "true");
  await expect(page.getByTestId("step-card")).toHaveAttribute("data-step-id", "bat-ocv");
});

test("flow selection highlights the matching XML", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("view-flow").click();
  const node = page.locator('[data-testid="flow-node"][data-step-id="end-pass"]');
  await expect(node).toBeVisible();
  await node.click();
  await expectHighlighted(page, "end-pass");
  await page.screenshot({ path: `${shotDir}/battery-flow.png` });
});

test("broken XML reports a well-formedness diagnostic", async ({ page }) => {
  await page.goto("/");
  const content = page.locator(".cm-content");
  await content.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Backspace");
  await expect(content).not.toContainText("isolationStep");
  await page.keyboard.insertText("<dmodule>");
  await expect(page.getByTestId("diagnostic")).toContainText("well-formed");
  await expect(page.getByTestId("runner")).toContainText("nothing to step through");
  await page.screenshot({ path: `${shotDir}/broken-xml.png` });
});

async function expectHighlighted(page: Page, text: string) {
  await expect(page.locator(".cm-step").filter({ hasText: text }).first()).toBeVisible();
}

function choice(page: Page, label: string): Locator {
  const exact = new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
  return page.getByTestId("choice").filter({ has: page.locator("span", { hasText: exact }) });
}

async function walkBranches(page: Page): Promise<Set<string>> {
  const seen = new Set<string>();
  const visited = new Set<string>();

  const walk = async (depth: number) => {
    const snap = await snapshot(page);
    if (snap.stepId) visited.add(snap.stepId);
    if (seen.has(snap.key) || depth > 40) return;
    seen.add(snap.key);
    for (let index = 0; index < snap.count; index += 1) {
      await page.getByTestId("choice").nth(index).click();
      await walk(depth + 1);
      await page.getByTestId("back").click();
      await expect.poll(async () => (await snapshot(page)).key).toBe(snap.key);
    }
  };

  await walk(0);
  return visited;
}

async function snapshot(page: Page) {
  const card = page.getByTestId("step-card");
  const stepId = (await card.getAttribute("data-step-id")) ?? "";
  const ended = (await card.getAttribute("data-ended")) ?? "";
  const note = (await page.getByTestId("note").count()) > 0 ? await page.getByTestId("note").innerText() : "";
  const choices = page.getByTestId("choice");
  const count = await choices.count();
  const labels: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const id = (await choices.nth(index).getAttribute("data-choice-id")) ?? "";
    const label = await choices.nth(index).locator("span").first().innerText();
    labels.push(`${id}:${label}`);
  }
  return { stepId, count, key: [stepId, ended, note, labels.join("|")].join("~") };
}
