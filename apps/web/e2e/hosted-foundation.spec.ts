import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const statePath = process.env.CAPACITY_GOVERNOR_HOSTED_E2E_STATE;
if (!statePath) throw new Error("Hosted E2E state path is required");
const testSecret = process.env.CAPACITY_GOVERNOR_HOSTED_TEST_SECRET;
if (!testSecret) throw new Error("Hosted E2E access secret is required");

const signIn = async (
  page: Page,
  identity: "founder" | "secondary" = "founder",
) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Private Capacity Governor" }),
  ).toBeVisible();
  await page.getByLabel("Local test identity").selectOption(identity);
  await page.getByLabel("Local test access secret").fill(testSecret);
  await page.getByRole("button", { name: "Enter local test session" }).click();
  await expect(
    page.getByRole("heading", { name: "Projects", exact: true }),
  ).toBeVisible();
};

test("hosted phase one: sign-in to immutable outcome amendment with isolation and replay denial", async ({
  page,
  browser,
}) => {
  test.skip(process.env.CAPACITY_GOVERNOR_HOSTED_E2E_PHASE === "two");
  test.setTimeout(180_000);
  await signIn(page);
  await page.getByRole("link", { name: "Create project" }).click();
  const name = `Hosted founder project ${Date.now()}`;
  await page.getByLabel("Project name").fill(name);
  await page
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}$/);
  const projectUrl = page.url();
  await page
    .getByLabel("Tranche title")
    .fill("Hosted bounded development attempt");
  await page
    .getByLabel("Tranche brief")
    .fill("Private hosted evidence workflow");
  await page
    .getByLabel(/Acceptance criteria/)
    .fill("Reopen original and amended evidence");
  await page.getByLabel("Available amount").fill("58");
  await page.getByLabel("Capacity unit").fill("legacy raw units");
  await page.getByLabel("IANA timezone").fill("America/Denver");
  await page.getByRole("button", { name: "Save preflight draft" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Manual preflight draft saved.",
  );

  // A second authenticated test principal cannot enumerate, read or edit this
  // project by guessing its URL. It is not part of the deployed allowlist.
  const foreignContext = await browser.newContext({
    baseURL: "http://127.0.0.1:3101",
  });
  const foreign = await foreignContext.newPage();
  await signIn(foreign, "secondary");
  await expect(foreign.getByText(name)).toHaveCount(0);
  await foreign.goto(projectUrl);
  await expect(foreign.getByText(name)).toHaveCount(0);
  await expect(
    foreign.getByRole("heading", { name: "That project is not available." }),
  ).toBeVisible();
  await foreignContext.close();

  await page
    .getByRole("link", { name: "Create reviewed capacity preflight" })
    .click();
  await page.getByLabel("Repository / scope reference").fill("repo/hosted-e2e");
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
    ["Available exact decimal amount", "7800"],
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
  await expect(
    page.getByRole("heading", { name: "Review exact frozen inputs" }),
  ).toBeVisible();
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
  const resultUrl = page.url();
  await page.waitForLoadState("networkidle");
  const governedReviewResponse = page.waitForResponse("**/governed/review");
  await page
    .getByRole("button", { name: "Review exact saved attempt" })
    .click();
  expect((await governedReviewResponse).status()).toBe(200);
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
  expect(
    await page.evaluate(async (body) => {
      const response = await fetch("/governed/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return response.status;
    }, submitted),
  ).toBe(400);
  await page.getByLabel("Operator-reported adherence").selectOption("FOLLOWED");
  await page
    .getByRole("combobox", { name: "Run outcome", exact: true })
    .selectOption("COMPLETED");
  await page
    .getByRole("combobox", {
      name: "Independent validation result",
      exact: true,
    })
    .selectOption("PASSED");
  await page.getByLabel(/IMPLEMENTATION actual/).fill("14");
  await page
    .getByLabel("Factual source reference")
    .first()
    .fill("manual reviewed observation");
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
  const firstOutcomeRequest = page.waitForRequest("**/governed/outcome");
  const firstOutcomeReload = page.waitForEvent("load");
  await page.getByRole("button", { name: "Save outcome" }).click();
  const firstOutcomeBody = (await firstOutcomeRequest).postDataJSON();
  await firstOutcomeReload;
  await expect(
    page.getByRole("form", { name: "Append governed outcome amendment" }),
  ).toBeVisible();
  await expect(
    page.getByText(/issued-expected calibration ratio/i),
  ).toBeVisible();
  await page
    .getByLabel("Amendment reason")
    .fill("Corrected reviewed manual usage");
  await page
    .getByRole("checkbox", {
      name: /Confirm this run outcome for the new amendment version/,
    })
    .check();
  await page
    .getByRole("checkbox", {
      name: /Confirm this independent validation result for the new amendment version/,
    })
    .check();
  await page.getByLabel("Operator-reported adherence").selectOption("FOLLOWED");
  await page.getByLabel(/IMPLEMENTATION actual/).fill("13");
  await page
    .getByLabel(/I reviewed this exact manual value/)
    .first()
    .check();
  await expect(page.getByLabel("Amendment reason")).toHaveValue(
    "Corrected reviewed manual usage",
  );
  const amendmentRequest = page.waitForRequest("**/governed/outcome");
  const amendmentReload = page.waitForEvent("load");
  await page.getByRole("button", { name: "Append amendment" }).click();
  const amendmentBody = (await amendmentRequest).postDataJSON();
  await amendmentReload;
  await expect(page.getByText(/Superseded version 1/)).toBeVisible();
  await expect(page.getByText(/Current version 2/)).toBeVisible();

  // A valid session for another owner cannot mutate the founder's evaluation
  // or run, even when it reuses otherwise valid recorded request evidence.
  const foreignMutationContext = await browser.newContext({
    baseURL: "http://127.0.0.1:3101",
  });
  const foreignMutator = await foreignMutationContext.newPage();
  await signIn(foreignMutator, "secondary");
  await foreignMutator.goto("/projects/new");
  const foreignCsrf = await foreignMutator
    .locator('input[name="csrf"]')
    .first()
    .inputValue();
  const projectId = new URL(projectUrl).pathname.split("/")[2];
  const attemptId = new URL(resultUrl).pathname.split("/").at(-1);
  const runId = new URL(runUrl).pathname.split("/").at(-1);
  expect(projectId).toBeTruthy();
  expect(attemptId).toBeTruthy();
  expect(runId).toBeTruthy();
  for (const [route, body] of [
    ["/governed/review", { csrf: foreignCsrf, projectId, attemptId }],
    ["/governed/outcome", { ...firstOutcomeBody, csrf: foreignCsrf, runId }],
    ["/governed/outcome", { ...amendmentBody, csrf: foreignCsrf, runId }],
  ] as const) {
    const status = await foreignMutator.evaluate(
      async ({ route, body }) =>
        (
          await fetch(route, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        ).status,
      { route, body },
    );
    expect(status).toBe(400);
  }
  await foreignMutationContext.close();
  await page.reload();
  await expect(page.getByText(/Superseded version 1/)).toBeVisible();
  await expect(page.getByText(/Current version 2/)).toBeVisible();
  await expect(page.getByText(/Current version 3/)).toHaveCount(0);
  mkdirSync(path.dirname(statePath), { recursive: true });
  writeFileSync(
    statePath,
    JSON.stringify({ projectUrl, resultUrl, runUrl, name }),
  );
});

test("hosted phase two: new process/session reopens preserved evidence and denies foreign owner", async ({
  page,
  browser,
}) => {
  test.skip(process.env.CAPACITY_GOVERNOR_HOSTED_E2E_PHASE === "one");
  const state = JSON.parse(readFileSync(statePath, "utf8")) as {
    projectUrl: string;
    resultUrl: string;
    runUrl: string;
    name: string;
  };
  await signIn(page);
  await page.goto(state.projectUrl);
  await expect(page.getByRole("heading", { name: state.name })).toBeVisible();
  await page.goto(state.resultUrl);
  await expect(
    page.getByText(/decision at evaluation time/i).first(),
  ).toBeVisible();
  await page.goto(state.runUrl);
  await expect(page.getByText(/Superseded version 1/)).toBeVisible();
  await expect(page.getByText(/Current version 2/)).toBeVisible();
  await expect(
    page.getByText(/^Amendment reason: Corrected reviewed manual usage$/),
  ).toBeVisible();
  const foreignContext = await browser.newContext({
    baseURL: "http://127.0.0.1:3101",
  });
  const foreign = await foreignContext.newPage();
  await signIn(foreign, "secondary");
  await foreign.goto(state.runUrl);
  await expect(
    foreign.getByRole("heading", { name: "Governed evidence unavailable" }),
  ).toBeVisible();
  await foreign.goto(state.resultUrl);
  await expect(
    foreign.getByRole("heading", { name: "Saved capacity preflight" }),
  ).toHaveCount(0);
  await foreignContext.close();
});
