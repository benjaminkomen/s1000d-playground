import { expect, test, type Page } from "@playwright/test";

const phones = [
  { name: "iphone", width: 390, height: 844 },
  { name: "android", width: 360, height: 800 },
] as const;

for (const phone of phones) {
  test.describe(`${phone.name} ${phone.width}x${phone.height}`, () => {
    test.use({ viewport: { width: phone.width, height: phone.height } });

    test("uses the runner tab, keeps answers tappable, and fits the width", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByTestId("surface-runner")).toHaveAttribute("aria-selected", "true");
      await expect(page.getByTestId("runner")).toBeVisible();
      await expect(page.getByTestId("xml-editor")).toBeHidden();
      await expect(page.getByTestId("flow-view")).toBeHidden();
      await expect(page.getByTestId("step-card")).toHaveAttribute("data-step-id", "bat-ocv");

      const samples = page.getByRole("navigation", { name: "Sample data modules" }).getByRole("button");
      const sampleCount = await samples.count();
      expect(sampleCount).toBe(5);
      const firstSample = await samples.nth(0).boundingBox();
      const lastSample = await samples.nth(sampleCount - 1).boundingBox();
      expect(firstSample).toBeTruthy();
      expect(lastSample).toBeTruthy();
      expect(lastSample!.y).toBeGreaterThan(firstSample!.y);
      for (let index = 0; index < sampleCount; index += 1) {
        const box = await samples.nth(index).boundingBox();
        expect(box!.x).toBeGreaterThanOrEqual(-1);
        expect(box!.x + box!.width).toBeLessThanOrEqual(phone.width + 1);
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }

      const answer = page.getByTestId("choice").filter({ has: page.locator("span", { hasText: /^12\.4 V or more$/ }) });
      const answerBox = await answer.boundingBox();
      expect(answerBox!.height).toBeGreaterThanOrEqual(44);
      expect(answerBox!.width).toBeGreaterThanOrEqual(44);
      await answer.click();
      await expect(page.getByTestId("step-card")).toHaveAttribute("data-step-id", "bat-load");
      await expectNoPageScroll(page, phone.width);
      await page.screenshot({ path: `artifacts/verify/mobile-${phone.name}-runner.png`, fullPage: false });

      await page.getByTestId("surface-xml").click();
      await expect(page.getByTestId("surface-xml")).toHaveAttribute("aria-selected", "true");
      await expect(page.getByTestId("xml-editor")).toBeVisible();
      await expect(page.getByTestId("runner")).toBeHidden();
      const editor = await page.locator(".cm-editor").boundingBox();
      expect(editor).toBeTruthy();
      expect(editor!.height).toBeGreaterThan(100);
      expect(editor!.width).toBeLessThanOrEqual(phone.width + 1);
      expect(editor!.x).toBeGreaterThanOrEqual(-1);
      await expectNoPageScroll(page, phone.width);
      await page.screenshot({ path: `artifacts/verify/mobile-${phone.name}-xml.png`, fullPage: false });

      await page.getByTestId("surface-flow").click();
      await expect(page.getByTestId("flow-view")).toBeVisible();
      await expect(page.getByTestId("xml-editor")).toBeHidden();
      const flow = await page.getByTestId("flow-view").boundingBox();
      expect(flow).toBeTruthy();
      expect(flow!.width).toBeLessThanOrEqual(phone.width + 1);
      expect(flow!.height).toBeGreaterThan(100);
      await expectNoPageScroll(page, phone.width);
      await page.screenshot({ path: `artifacts/verify/mobile-${phone.name}-flow.png`, fullPage: false });

      await page.getByTestId("surface-glossary").click();
      await expect(page.getByTestId("glossary")).toBeVisible();
      await expect(page.getByTestId("glossary-entry")).toHaveCount(17);
      await expect(page.getByTestId("xml-editor")).toBeHidden();
      await expectNoPageScroll(page, phone.width);
      await page.screenshot({ path: `artifacts/verify/mobile-${phone.name}-glossary.png`, fullPage: false });
    });
  });
}

async function expectNoPageScroll(page: Page, width: number) {
  const measured = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(measured.scrollWidth).toBeLessThanOrEqual(measured.clientWidth + 1);
  expect(measured.clientWidth).toBeLessThanOrEqual(width + 1);
}
