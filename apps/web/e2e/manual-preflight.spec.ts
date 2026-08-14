import { expect, test } from "@playwright/test";

test("create project, save a manual preflight draft, and reopen it", async ({
  page,
}) => {
  const projectName = `Shadow project ${Date.now()}`;

  await page.goto("/");
  await page.getByRole("link", { name: "Create project" }).click();
  await page.getByRole("textbox", { name: "Project name" }).fill(projectName);
  await page
    .getByRole("textbox", { name: /Project description/ })
    .fill("Independent Tranche 001 verification");
  await page.getByRole("button", { name: "Create project" }).click();

  await expect(page.getByRole("heading", { name: projectName })).toBeVisible();
  await page
    .getByRole("textbox", { name: "Tranche title" })
    .fill("Manual preflight draft");
  await page
    .getByRole("textbox", { name: "Tranche brief" })
    .fill("Prove create, save, and reopen behavior.");
  await page
    .getByRole("textbox", { name: /Explicit exclusions/ })
    .fill("Forecasting\nGovernor policy");
  await page
    .getByRole("textbox", { name: /Acceptance criteria/ })
    .fill("Draft values survive reopen");
  await page
    .getByRole("spinbutton", { name: "Available amount" })
    .fill("125.5");
  await page
    .getByRole("textbox", { name: "Capacity unit" })
    .fill("manual units");
  await page.getByLabel(/Reset date and time/).fill("2026-08-15T09:00");
  await page
    .getByRole("textbox", { name: "IANA timezone" })
    .fill("America/Denver");
  await page
    .getByRole("textbox", { name: /Assumptions/ })
    .fill("Budget was entered manually");
  await page.getByRole("button", { name: "Save preflight draft" }).click();

  await expect(page.getByRole("status")).toHaveText(
    "Manual preflight draft saved.",
  );
  await page.getByRole("link", { name: "Projects" }).click();
  await page.getByRole("link", { name: new RegExp(projectName) }).click();

  await expect(page.getByText("Saved draft")).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Tranche title" }),
  ).toHaveValue("Manual preflight draft");
  await expect(
    page.getByRole("spinbutton", { name: "Available amount" }),
  ).toHaveValue("125.5");
  await expect(
    page.getByRole("textbox", { name: "Capacity unit" }),
  ).toHaveValue("manual units");
  await expect(page.getByRole("textbox", { name: /Assumptions/ })).toHaveValue(
    "Budget was entered manually",
  );
});
