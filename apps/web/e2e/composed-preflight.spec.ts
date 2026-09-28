import { test, expect } from "./local-session";
import { test as unpairedTest } from "@playwright/test";
import type { Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";
const evidenceDirectory = path.resolve(".data/t005-usability-evidence");
const screenshot = async (page: Page, name: string) => {
  expect(
    await page
      .locator(".brand strong")
      .evaluate((element) => getComputedStyle(element).fontFamily),
  ).toBe('Inter, "Segoe UI", Arial, sans-serif');
  mkdirSync(evidenceDirectory, { recursive: true });
  await expect(
    page.getByRole("img", { name: "Neverlost Systems" }),
  ).toBeVisible();
  await expect
    .poll(
      async () =>
        await page
          .getByRole("img", { name: "Neverlost Systems" })
          .evaluate(
            (element: HTMLImageElement) =>
              element.complete && element.naturalWidth > 0,
          ),
    )
    .toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: path.join(
      evidenceDirectory,
      `${process.env.CAPACITY_GOVERNOR_E2E_BUILT === "1" ? "built" : "dev"}-${page.viewportSize()!.width < 600 ? "mobile" : "desktop"}-${name}.png`,
    ),
    fullPage: true,
    caret: "initial", // Never inject transient input styles before React hydration.
  });
  await page.screenshot({
    path: path.join(
      evidenceDirectory,
      `${process.env.CAPACITY_GOVERNOR_E2E_BUILT === "1" ? "built" : "dev"}-${page.viewportSize()!.width < 600 ? "mobile" : "desktop"}-${name}-viewport.png`,
    ),
    caret: "initial",
  });
};
const createDraft = async (page: Page) => {
  const name = `Complete preflight ${Date.now()}`;
  await page.goto("/");
  await page.getByRole("link", { name: "Create project" }).click();
  await page.getByLabel("Project name").fill(name);
  await page
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await page.getByLabel("Tranche title").fill("Reviewed capacity scope");
  await page
    .getByLabel("Tranche brief")
    .fill("A bounded application logic change");
  await page
    .getByLabel(/Acceptance criteria/)
    .fill("Retain independently reviewed evidence");
  await page.getByLabel("Available amount").fill("58");
  await page.getByLabel("Capacity unit").fill("legacy manual units");
  await page.getByLabel("IANA timezone").fill("America/Denver");
  await page.getByRole("button", { name: "Save preflight draft" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Manual preflight draft saved.",
  );
  const projectUrl = page.url();
  await page
    .getByRole("link", { name: "Create reviewed capacity preflight" })
    .click();
  return { projectUrl, name };
};
const fillItem = async (page: Page, index: number) => {
  await page
    .getByLabel(`Work item ${index} ID`, { exact: true })
    .fill(`work-${index}`);
  await page
    .getByLabel(`Work item ${index} label`, { exact: true })
    .fill(`Application item ${index}`);
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
    await page
      .getByLabel(`${label} ${index}`, { exact: true })
      .selectOption(value);
};
const fillBucket = async (
  page: Page,
  index: number,
  amount: string,
  observedAt = new Date().toISOString(),
) => {
  for (const [label, value] of [
    ["Window evidence ID", index === 1 ? "short" : "weekly"],
    ["Provider ID", "manual-codex"],
    ["Capacity window ID", index === 1 ? "5-hour" : "weekly"],
    ["Reset cycle ID", `cycle-${index}`],
    ["Observation time (explicit offset)", observedAt],
    ["Available exact decimal amount", amount],
    [
      "Forecast profile evidence reference",
      "accepted gate-b-v1 profile manually reviewed",
    ],
  ])
    await page.getByLabel(`${label} ${index}`, { exact: true }).fill(value);
  await page
    .getByLabel(`Available unit ${index}`, { exact: true })
    .selectOption("BASIS_POINTS");
  await page
    .getByLabel(`Forecast profile evidence status ${index}`, { exact: true })
    .selectOption("COMPLETE");
  await page
    .getByLabel(`Reset evidence kind ${index}`, { exact: true })
    .selectOption("NONE");
};
const fill = async (page: Page, amount = "7800", observedAt?: string) => {
  await page.getByLabel("Repository / scope reference").fill("repo/manual");
  await fillItem(page, 1);
  await fillBucket(page, 1, amount, observedAt);
  await page.getByRole("radio", { name: "No", exact: true }).check();
};
const confirm = async (page: Page) => {
  await page.getByRole("button", { name: "Review frozen inputs" }).click();
  await expect(
    page.getByRole("heading", { name: "Review exact frozen inputs" }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(/uncalibrated planning estimates/)).toBeVisible();
  await expect(
    page.getByText(/not demonstrated prediction accuracy/),
  ).toBeVisible();
  await expect(
    page.getByText(/not purchased-credit cost estimates/),
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
};
unpairedTest(
  "pairing screenshot and public raw boundary deny unexpected Host/Origin/forwarding/marker",
  async ({ page, request }) => {
    await page.goto("/pair");
    await expect(page.getByLabel("Local pairing secret")).toHaveAttribute(
      "type",
      "password",
    );
    await screenshot(page, "pairing");
    await page.setViewportSize({ width: 390, height: 844 });
    await screenshot(page, "pairing");
    await page.setViewportSize({ width: 1280, height: 900 });
    for (const headers of [
      { Host: "localhost:3100" },
      { "x-forwarded-host": "127.0.0.1:3100" },
      { "x-forwarded-for": "127.0.0.1" },
      { forwarded: "host=127.0.0.1" },
      { "x-cg-ingress-proof": "forged" },
    ] as Record<string, string>[])
      expect((await request.get("/", { headers })).status()).toBe(403);
    expect(
      (
        await request.post("/access/pair", {
          form: { secret: "not-real", bootstrap: "forged" },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await request.post("/access/pair", {
          headers: { Origin: "http://attacker.invalid" },
          form: { secret: "not-real", bootstrap: "forged" },
        })
      ).status(),
    ).toBe(403);
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Pair this local browser" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Create project" }),
    ).toHaveCount(0);
  },
);
for (const viewport of [
  { width: 1280, height: 900 },
  { width: 390, height: 844 },
])
  test(`manual multiple-item/bucket review/evaluate/save/reopen ${viewport.width < 600 ? "mobile" : "desktop"} critical path and actual screenshots`, async ({
    page,
    browser,
  }) => {
    test.setTimeout(180000);
    await page.setViewportSize(viewport);
    const { projectUrl, name } = await createDraft(page);
    await fill(page);
    await page.getByRole("button", { name: "Add work item" }).click();
    await fillItem(page, 2);
    await page.getByRole("button", { name: "Add capacity window" }).click();
    await fillBucket(page, 2, "7800");
    await page.evaluate(() => window.scrollTo(0, 0));
    await screenshot(page, "form-top");
    await page.getByRole("button", { name: "Add capacity activity" }).click();
    await page
      .getByLabel("Activity identity 1", { exact: true })
      .fill("before-observation");
    await page
      .getByLabel("Activity time (explicit offset) 1", { exact: true })
      .fill(new Date(Date.now() - 60000).toISOString());
    await page
      .getByLabel("Activity factual source 1", { exact: true })
      .fill("Manual factual activity record");
    await page
      .getByLabel("Affected window evidence IDs (one per line) 1", {
        exact: true,
      })
      .fill("unknown-window");
    await page.getByRole("button", { name: "Review frozen inputs" }).click();
    await expect(
      page.getByRole("alert").filter({
        has: page.getByRole("heading", {
          name: "Check the submitted fields",
        }),
      }),
    ).toBeFocused();
    await expect(
      page.getByLabel("Activity identity 1", { exact: true }),
    ).toHaveValue("before-observation");
    await page
      .getByLabel("Affected window evidence IDs (one per line) 1", {
        exact: true,
      })
      .fill("short");
    await screenshot(page, "form");
    await page.getByRole("button", { name: "Review frozen inputs" }).click();
    await expect(
      page.getByRole("heading", { name: "Review exact frozen inputs" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "weekly · weekly", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Manual factual activity record", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: /confirm all reviewed work/ }),
    ).not.toBeChecked();
    await expect(
      page.getByRole("checkbox", {
        name: /confirm this exact required capacity window set/,
      }),
    ).not.toBeChecked();
    await screenshot(page, "review");
    await page.locator(".confirmation-form").scrollIntoViewIfNeeded();
    await screenshot(page, "review-confirmations");
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
      page.getByRole("heading", { name: "PROCEED", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "short allocations" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "weekly allocations" }),
    ).toBeVisible();
    await expect(page.getByText(/Historical saved evaluation/)).toBeVisible();
    // Non-secret browser probe: the launcher fails if Next forwards it to terminal.
    await page.evaluate(() =>
      console.warn("T005_BROWSER_LOG_HYGIENE_PROBE_NON_SECRET"),
    );
    await expect(
      page.getByRole("button", { name: "Automatic execution unavailable" }),
    ).toBeDisabled();
    await screenshot(page, "result");
    const resultUrl = page.url();
    await page.getByRole("link", { name: "Back to project" }).click();
    await expect(page.getByRole("heading", { name })).toBeVisible();
    await expect(page.getByLabel("Capacity unit", { exact: true })).toHaveValue(
      "legacy manual units",
    );
    await page
      .getByRole("link", { name: /Reviewed capacity scope ·.*PROCEED/ })
      .click();
    await expect(page).toHaveURL(resultUrl);
    await expect(page.getByText(/Historical saved evaluation/)).toBeVisible();
    await expect(
      page.getByText(/uncalibrated planning estimates/),
    ).toBeVisible();
    await expect(
      page.getByText(/not demonstrated prediction accuracy/),
    ).toBeVisible();
    await expect(
      page.getByText(/not purchased-credit cost estimates/),
    ).toBeVisible();
    await screenshot(page, "historical-reopen");
    const unpaired = await browser.newContext();
    const outsider = await unpaired.newPage();
    await outsider.goto(projectUrl);
    await expect(
      outsider.getByRole("heading", { name: "Pair this local browser" }),
    ).toBeVisible();
    await outsider.goto(resultUrl);
    await expect(
      outsider.getByRole("heading", { name: "Pair this local browser" }),
    ).toBeVisible();
    await unpaired.close();
  });
for (const family of [
  "NARROW",
  "DEFER",
  "STOP / PRESERVE",
  "STALE",
  "NOT_COMPOSABLE",
] as const)
  test(`conservative real UI family ${family}`, async ({ page }) => {
    test.setTimeout(180000);
    await createDraft(page);
    await fill(
      page,
      family === "NARROW" || family === "DEFER" ? "2000" : "7800",
      family === "STALE"
        ? new Date(Date.now() - 1800001).toISOString()
        : undefined,
    );
    if (family === "STOP / PRESERVE") {
      await page.getByRole("button", { name: "Add capacity window" }).click();
      await fillBucket(page, 2, "1300");
    }
    if (family === "DEFER") {
      const reset = new Date(Date.now() + 3600000).toISOString();
      await page
        .getByLabel("Reset evidence kind 1", { exact: true })
        .selectOption("CONFIRMED");
      await page
        .getByLabel("Reset time (explicit offset) 1", { exact: true })
        .fill(reset);
      await page
        .getByLabel("Reset source timezone text 1", { exact: true })
        .fill("literal UTC display");
      await page
        .getByLabel("Normalized UTC reset time 1", { exact: true })
        .fill(reset);
      await page
        .getByLabel("Post-reset exact decimal amount 1", { exact: true })
        .fill("10000");
      await page
        .getByLabel("Post-reset unit 1", { exact: true })
        .selectOption("BASIS_POINTS");
    }
    if (family === "NOT_COMPOSABLE")
      for (let index = 2; index <= 9; index++) {
        await page.getByRole("button", { name: "Add work item" }).click();
        await fillItem(page, index);
      }
    await confirm(page);
    await screenshot(page, `conservative-${family.replaceAll(" / ", "-")}`);
    await page.setViewportSize({ width: 390, height: 844 });
    await screenshot(page, `conservative-${family.replaceAll(" / ", "-")}`);
    await expect(
      page.getByRole("heading", {
        name:
          family === "STALE"
            ? "STOP / PRESERVE"
            : family === "NOT_COMPOSABLE"
              ? "Forecast cannot be used for a policy decision"
              : family,
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Automatic execution unavailable" }),
    ).toBeDisabled();
    if (family === "NOT_COMPOSABLE") {
      await expect(page.getByText(/Operating mode:/)).toHaveCount(0);
      await expect(
        page.getByText(/Expected implementation usage 108%/),
      ).toBeVisible();
      await expect(
        page.getByText(/cannot establish a governed run/),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Review exact saved attempt" }),
      ).toHaveCount(0);
    }
    if (family === "STALE") {
      const aggregateRules = page
        .getByText(/The capacity observation is older/)
        .first();
      await expect(aggregateRules).toBeVisible();
      await expect(aggregateRules).toContainText(
        "permitted freshness interval",
      );
      await expect(
        page.getByRole("link", { name: "Create a new reviewed evaluation" }),
      ).toBeVisible();
    }
  });
test("legacy action rejects session-CSRF tamper without saving browser-authorized data", async ({
  page,
}) => {
  const name = `Denied legacy project ${Date.now()}`;
  await page.goto("/projects/new");
  await page.getByLabel("Project name").fill(name);
  await page
    .locator('form.form-card input[name="csrf"]')
    .evaluate((element) => {
      (element as HTMLInputElement).value = "forged";
    });
  await page
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Something interrupted this draft." }),
  ).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("link", { name: new RegExp(name) })).toHaveCount(
    0,
  );
});
test("confirmation endpoint rejects missing CSRF/browser authority and other-session review", async ({
  page,
  browser,
}) => {
  test.setTimeout(180000);
  await createDraft(page);
  await fill(page);
  await page.getByRole("button", { name: "Review frozen inputs" }).click();
  await expect(
    page.getByRole("heading", { name: "Review exact frozen inputs" }),
  ).toBeVisible();
  const reviewUrl = page.url();
  const revisionId = reviewUrl.split("/").at(-1)!;
  for (const data of [
    {
      revisionId,
      challenge: "forged",
      confirmedWorkInputs: true,
      confirmedRequiredBuckets: true,
    },
    {
      csrf: "forged",
      revisionId,
      challenge: "forged",
      confirmedWorkInputs: true,
      confirmedRequiredBuckets: true,
      actorReference: "browser-trusted",
      recordedAt: new Date().toISOString(),
    },
  ])
    expect(
      (
        await page.request.post("/preflight/confirm", {
          headers: { Origin: "http://127.0.0.1:3100" },
          data,
        })
      ).status(),
    ).toBe(400);
  const context = await browser.newContext();
  const other = await context.newPage();
  await other.goto("/pair");
  await other
    .getByLabel("Local pairing secret")
    .fill(process.env.CAPACITY_GOVERNOR_E2E_PAIRING_SECRET!);
  await other.getByRole("button", { name: "Pair browser" }).click();
  await other.goto(reviewUrl);
  await expect(
    other.getByRole("heading", { name: "Review unavailable" }),
  ).toBeVisible();
  await context.close();
  await page.getByRole("button", { name: "End local session" }).click();
  await page.goto(reviewUrl);
  await expect(
    page.getByRole("heading", { name: "Pair this local browser" }),
  ).toBeVisible();
});
