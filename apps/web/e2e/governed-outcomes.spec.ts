import { test, expect } from "./local-session";
import type { Page } from "@playwright/test";

const createAttempt = async (page: Page, amount = "7800") => {
  await page.goto("/");
  await page.getByRole("link", { name: "Create project" }).click();
  await page.getByLabel("Project name").fill(`Governed outcome ${Date.now()}`);
  await page
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await page.getByLabel("Tranche title").fill("Bounded development attempt");
  await page.getByLabel("Tranche brief").fill("One reviewed local change");
  await page
    .getByLabel(/Acceptance criteria/)
    .fill("Retain audited comparison");
  await page.getByLabel("Available amount").fill("58");
  await page.getByLabel("Capacity unit").fill("legacy raw units");
  await page.getByLabel("IANA timezone").fill("America/Denver");
  await page.getByRole("button", { name: "Save preflight draft" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Manual preflight draft saved.",
  );
  const projectUrl = page.url();
  await page
    .getByRole("link", { name: "Create reviewed capacity preflight" })
    .click();
  await page
    .getByLabel("Repository / scope reference")
    .fill("repo/governed-e2e");
  await page.getByLabel("Work item 1 ID", { exact: true }).fill("work-1");
  await page
    .getByLabel("Work item 1 label", { exact: true })
    .fill("Application item");
  for (const [label, value] of [
    ["Work category", "APPLICATION_LOGIC"],
    ["Complexity", "MEDIUM"],
    ["Context load", "MEDIUM"],
    ["Repository condition", "STABLE"],
    ["Dependency change", "EXISTING_ONLY"],
    ["Validation burden", "STANDARD"],
    ["Novelty", "SOME_NEW_PATTERN"],
    ["Correction exposure", "MEDIUM"],
  ])
    await page.getByLabel(`${label} 1`, { exact: true }).selectOption(value);
  for (const [label, value] of [
    ["Window evidence ID", "short"],
    ["Provider ID", "manual-codex"],
    ["Capacity window ID", "5-hour"],
    ["Reset cycle ID", "cycle-1"],
    ["Observation time (explicit offset)", new Date().toISOString()],
    ["Available exact decimal amount", amount],
    ["Forecast profile evidence reference", "accepted profile"],
  ])
    await page.getByLabel(`${label} 1`, { exact: true }).fill(value);
  await page
    .getByLabel("Available unit 1", { exact: true })
    .selectOption("BASIS_POINTS");
  await page
    .getByLabel("Forecast profile evidence status 1", { exact: true })
    .selectOption("COMPLETE");
  await page
    .getByLabel("Reset evidence kind 1", { exact: true })
    .selectOption("NONE");
  await page.getByRole("radio", { name: "No", exact: true }).check();
  await page.getByRole("button", { name: "Review frozen inputs" }).click();
  await page
    .getByRole("checkbox", { name: /confirm all reviewed work/ })
    .check();
  await page
    .getByRole("checkbox", {
      name: /confirm this exact required capacity window set/,
    })
    .check();
  await page
    .getByRole("button", { name: "Confirm, evaluate and save" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Saved capacity preflight" }),
  ).toBeVisible();
  return projectUrl;
};

test("paired saved attempt → one-use link → completed exact actual → amendment → historical reopen", async ({
  page,
}) => {
  test.setTimeout(180000);
  const projectUrl = await createAttempt(page);
  await page
    .getByRole("button", { name: "Review exact saved attempt" })
    .click();
  await page
    .getByRole("checkbox", { name: /confirm this exact saved evaluation/ })
    .check();
  const confirmationRequest = page.waitForRequest("**/governed/confirm");
  await page.getByRole("button", { name: "Create one governed run" }).click();
  const submitted = (await confirmationRequest).postDataJSON();
  await expect(
    page.getByRole("heading", { name: "Governed bounded run" }),
  ).toBeVisible();
  const runUrl = page.url();
  const replay = await page.evaluate(async (body) => {
    const response = await fetch("/governed/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return response.status;
  }, submitted);
  expect(replay).toBe(400);
  await page.getByLabel("Operator-reported adherence").selectOption("FOLLOWED");
  await page.getByLabel(/IMPLEMENTATION actual/).fill("14");
  await page
    .getByLabel("Factual source reference")
    .first()
    .fill("reviewed usage observation");
  await page
    .getByRole("textbox", {
      name: "Observed at (ISO timestamp with offset)",
      exact: true,
    })
    .first()
    .fill(new Date(Date.now() - 1000).toISOString());
  await page
    .getByLabel(/Only this named window\/reset cycle/)
    .first()
    .selectOption("YES");
  await page
    .getByLabel(/I reviewed this exact manual value/)
    .first()
    .check();
  await page.getByRole("button", { name: "Save outcome" }).click();
  await expect(
    page.getByText(/issued-expected calibration ratio/i),
  ).toBeVisible();
  const implementation = page.getByRole("group", {
    name: "short IMPLEMENTATION usage",
  });
  await page
    .getByLabel("Amendment reason")
    .fill("Corrected manual reading and recorded later cycle");
  await page.getByLabel("Operator-reported adherence").selectOption("FOLLOWED");
  await page.getByLabel(/IMPLEMENTATION actual/).fill("13");
  await implementation
    .getByLabel("Recorded reset cycle ID")
    .fill("later-cycle");
  await implementation
    .getByLabel("Recorded bucket profile version")
    .fill("older-profile");
  await expect(
    implementation.getByText(/Recorded identity differs from the issued/),
  ).toBeVisible();
  await page
    .getByLabel(/I reviewed this exact manual value/)
    .first()
    .check();
  await page.getByRole("button", { name: "Append amendment" }).click();
  await expect(page.getByText(/Superseded version 1/)).toBeVisible();
  await expect(
    page.getByText(
      /^Amendment reason: Corrected manual reading and recorded later cycle$/,
    ),
  ).toBeVisible();
  await expect(
    page.getByText(/UNAVAILABLE: BUCKET_OR_PROFILE_MISMATCH/).first(),
  ).toBeVisible();
  await expect(
    implementation.getByLabel("Recorded reset cycle ID"),
  ).toHaveValue("later-cycle");
  await expect(
    implementation.getByLabel("Recorded bucket profile version"),
  ).toHaveValue("older-profile");
  await page
    .getByLabel("Amendment reason")
    .fill("Corrected reviewed cycle and profile evidence");
  await page.getByLabel("Operator-reported adherence").selectOption("FOLLOWED");
  await implementation.getByLabel("Recorded reset cycle ID").fill("cycle-1");
  await implementation
    .getByLabel("Recorded bucket profile version")
    .fill("gate-b-bucket-profile-v1");
  await page
    .getByLabel(/I reviewed this exact manual value/)
    .first()
    .check();
  await page.getByRole("button", { name: "Append amendment" }).click();
  await expect(page.getByText(/Current version 3/)).toBeVisible();
  await expect(
    page.getByText(/issued-expected calibration ratio/i).last(),
  ).toBeVisible();
  await expect(page.getByText(/Superseded version 2/)).toBeVisible();
  await page
    .getByLabel("Amendment reason")
    .fill("Incomplete after reassessment");
  await page.getByLabel("Run outcome").selectOption("PARTIAL");
  await page.getByLabel("Operator-reported adherence").selectOption("UNKNOWN");
  await page
    .getByLabel(/I reviewed this exact manual value/)
    .first()
    .check();
  await page.getByRole("button", { name: "Append amendment" }).click();
  await expect(page.getByText(/LOWER_BOUND_ONLY/).first()).toBeVisible();
  await page.goto(projectUrl);
  await expect(page.getByText("UNGUIDED run", { exact: true })).toHaveCount(0);
  await page
    .getByRole("link", { name: /Bounded development attempt.*PROCEED/ })
    .last()
    .click();
  await expect(page).toHaveURL(runUrl);
  await expect(page.getByText(/Current version 4/)).toBeVisible();
});

test("restrictive saved result is factual, never permission", async ({
  page,
}) => {
  test.setTimeout(180000);
  await createAttempt(page, "1300");
  await expect(
    page.getByText(/Work recorded despite a non-authorizing decision/),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Review exact saved attempt" })
    .click();
  await page
    .getByRole("checkbox", { name: /confirm this exact saved evaluation/ })
    .check();
  await page.getByRole("button", { name: "Create one governed run" }).click();
  await expect(page.getByText(/did not authorize work/)).toBeVisible();
  await page.getByLabel("Operator-reported adherence").selectOption("FOLLOWED");
  await page.getByRole("button", { name: "Save outcome" }).click();
  await expect(page.getByText(/Outcome could not be saved/)).toBeVisible();
});
