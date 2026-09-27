import { test as base, expect } from "@playwright/test";
export const test = base.extend({
  page: async ({ page }, providePage) => {
    const secret = process.env.CAPACITY_GOVERNOR_E2E_PAIRING_SECRET;
    if (!secret)
      throw new Error(
        "Run the supported test:e2e launch; no runtime pairing secret is available",
      );
    await page.goto("/pair");
    await page.getByLabel("Local pairing secret").fill(secret);
    await page.getByRole("button", { name: "Pair browser" }).click();
    await expect(
      page.getByRole("link", { name: "Create project" }),
    ).toBeVisible();
    await providePage(page);
  },
});
export { expect };
