import { expect, test } from "@playwright/test";

test("create an unguided run, record its outcome, reopen it, and append an amendment", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const projectName = `Run history project ${Date.now()}`;

  await page.goto("/");
  await page.getByRole("link", { name: "Create project" }).click();
  await page.getByRole("textbox", { name: "Project name" }).fill(projectName);
  await page.getByRole("button", { name: "Create project" }).click();

  await page
    .getByRole("textbox", { name: "Tranche title" })
    .fill("Run history preflight");
  await page
    .getByRole("textbox", { name: "Tranche brief" })
    .fill("Capture one factual development run.");
  await page
    .getByRole("textbox", { name: /Acceptance criteria/ })
    .fill("Outcome remains visible after reopen");
  await page.getByRole("spinbutton", { name: "Available amount" }).fill("58");
  await page
    .getByRole("textbox", { name: "Capacity unit" })
    .fill("manual units");
  await page.getByRole("textbox", { name: "IANA timezone" }).fill("UTC");
  await page.getByRole("button", { name: "Save preflight draft" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Manual preflight draft saved.",
  );

  await page.getByRole("button", { name: "Create unguided run" }).click();
  await expect(
    page.getByRole("heading", { name: "Unguided development run" }),
  ).toBeVisible();
  await expect(page.getByText("UNGUIDED", { exact: true })).toBeVisible();

  await page
    .getByRole("combobox", { name: "Run outcome" })
    .selectOption("PARTIAL");
  await page
    .getByRole("combobox", { name: "Validation result" })
    .selectOption("INCONCLUSIVE");
  await page.locator("#implementationAmount").fill("10");
  await page.locator("#implementationUnit").fill("manual units");
  await page.locator("#remainingAmount").fill("48");
  await page.locator("#remainingUnit").fill("observed units");
  await page
    .getByRole("textbox", { name: "Observation time" })
    .fill("2026-08-24T12:00:00-06:00");
  await page
    .getByRole("textbox", { name: "Unexpected failures" })
    .fill("Network interruption");
  await page
    .getByRole("textbox", { name: "Deferred work" })
    .fill("Nonessential polish");
  await page
    .getByRole("textbox", { name: "Factual notes" })
    .fill("Manual evidence only");
  await page.getByRole("button", { name: "Record outcome" }).click();

  await expect(
    page.getByRole("heading", { name: "PARTIAL · INCONCLUSIVE" }),
  ).toBeVisible();
  await expect(
    page.getByText("IMPLEMENTATION: 10 manual units · manual"),
  ).toBeVisible();
  const auditHistory = page.getByRole("region", {
    name: "Outcome audit history",
  });
  await expect(auditHistory.getByText("Network interruption")).toBeVisible();
  await expect(auditHistory.getByText("Nonessential polish")).toBeVisible();

  await page.getByRole("link", { name: "← Project" }).click();
  await expect(
    page.getByRole("link", { name: /PARTIAL · INCONCLUSIVE/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: /PARTIAL · INCONCLUSIVE/ }).click();
  await expect(
    page
      .getByRole("region", { name: "Outcome audit history" })
      .getByText("Manual evidence only"),
  ).toBeVisible();

  await page
    .getByRole("textbox", { name: "Amendment reason" })
    .fill("Corrected from the run log");
  await page
    .getByRole("combobox", { name: "Run outcome" })
    .selectOption("COMPLETED");
  await page
    .getByRole("combobox", { name: "Validation result" })
    .selectOption("PASSED");
  await page.locator("#implementationAmount").fill("12");
  await page.getByRole("textbox", { name: "Unexpected failures" }).fill("");
  await page
    .getByRole("textbox", { name: "Deferred work" })
    .fill("Documentation follow-up");
  await page.getByRole("button", { name: "Append amendment" }).click();

  await expect(
    page.getByRole("heading", { name: "COMPLETED · PASSED" }),
  ).toBeVisible();
  await expect(page.getByText("Corrected from the run log")).toBeVisible();
  await expect(page.getByText("Preserved history")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "PARTIAL · INCONCLUSIVE" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Outcome audit history" })
      .getByText("Network interruption"),
  ).toBeVisible();
});
