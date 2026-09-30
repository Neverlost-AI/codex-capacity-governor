import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { chromium } from "@playwright/test";
import { startStaticApp, targetDirectory } from "./common.mjs";

let app;
let browser;

before(async () => {
  app = await startStaticApp(targetDirectory());
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser?.close();
  await app?.close();
});

async function freshPage(run) {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.goto(`${app.url}/#/`);
    await run(page);
  } finally {
    await context.close();
  }
}

async function add(page, title) {
  await page.locator(".new-todo").fill(title);
  await page.locator(".new-todo").press("Enter");
}

test("TD-01: trim/add/clear and ignore blank input", async () => {
  await freshPage(async (page) => {
    assert.equal(await page.locator(".todo-list li").count(), 0);
    assert.equal(
      await page
        .locator(".new-todo")
        .evaluate((node) => document.activeElement === node),
      true,
    );
    await add(page, "  Write tests  ");
    assert.deepEqual(
      await page.locator(".todo-list li label").allTextContents(),
      ["Write tests"],
    );
    assert.equal(await page.locator(".new-todo").inputValue(), "");
    await add(page, "   ");
    assert.equal(await page.locator(".todo-list li").count(), 1);
  });
});

test("TD-02: edit with Enter/blur, Escape discard and empty-edit removal", async () => {
  await freshPage(async (page) => {
    await add(page, "Before");
    const item = page.locator(".todo-list li").first();
    await item.locator("label").dblclick();
    assert.equal(
      await item.evaluate((node) => node.classList.contains("editing")),
      true,
    );
    await item.locator(".edit").fill("  After enter  ");
    await item.locator(".edit").press("Enter");
    assert.equal(await item.locator("label").textContent(), "After enter");
    await item.locator("label").dblclick();
    await item.locator(".edit").fill("After blur");
    await page.locator("h1").click();
    assert.equal(await item.locator("label").textContent(), "After blur");
    await item.locator("label").dblclick();
    await item.locator(".edit").fill("Discarded");
    await item.locator(".edit").press("Escape");
    assert.equal(await item.locator("label").textContent(), "After blur");
    await item.locator("label").dblclick();
    await item.locator(".edit").fill(" ");
    await item.locator(".edit").press("Enter");
    assert.equal(await page.locator(".todo-list li").count(), 0);
  });
});

test("TD-03: individual/all toggles, remove and clear completed", async () => {
  await freshPage(async (page) => {
    await add(page, "One");
    await add(page, "Two");
    await page.locator(".todo-list li").first().locator(".toggle").check();
    assert.equal(await page.locator(".todo-list li.completed").count(), 1);
    await page.locator("#toggle-all").check();
    assert.equal(await page.locator(".todo-list li.completed").count(), 2);
    await page.locator(".clear-completed").click();
    assert.equal(await page.locator(".todo-list li").count(), 0);
    assert.equal(await page.locator("#toggle-all").isChecked(), false);
    await add(page, "Removable");
    await page.locator(".todo-list li .destroy").click({ force: true });
    assert.equal(await page.locator(".todo-list li").count(), 0);
  });
});

test("TD-04: empty sections, active count and clear-button visibility", async () => {
  await freshPage(async (page) => {
    assert.equal(await page.locator(".main").isVisible(), false);
    assert.equal(await page.locator(".footer").first().isVisible(), false);
    await add(page, "One");
    assert.equal(await page.locator(".main").isVisible(), true);
    assert.match(await page.locator(".todo-count").innerText(), /1 item left/);
    assert.equal(await page.locator(".clear-completed").isVisible(), false);
    await add(page, "Two");
    assert.match(await page.locator(".todo-count").innerText(), /2 items left/);
    await page.locator(".todo-list li").first().locator(".toggle").check();
    assert.match(await page.locator(".todo-count").innerText(), /1 item left/);
    assert.equal(await page.locator(".clear-completed").isVisible(), true);
  });
});

test("TD-05: route filters, selected link and live filter update", async () => {
  await freshPage(async (page) => {
    await add(page, "Active item");
    await add(page, "Completed item");
    await page.locator(".todo-list li").nth(1).locator(".toggle").check();
    await page.locator('.filters a[href="#/active"]').click();
    assert.deepEqual(
      await page.locator(".todo-list li label").allTextContents(),
      ["Active item"],
    );
    assert.equal(
      await page
        .locator('.filters a[href="#/active"]')
        .evaluate((node) => node.classList.contains("selected")),
      true,
    );
    await page.locator(".todo-list li .toggle").check();
    assert.equal(await page.locator(".todo-list li").count(), 0);
    await page.locator('.filters a[href="#/completed"]').click();
    assert.equal(await page.locator(".todo-list li").count(), 2);
    await page.locator('.filters a[href="#/"]').click();
    assert.equal(await page.locator(".todo-list li").count(), 2);
  });
});

test("TD-06: content, completion and active filter survive reload; edit mode does not", async () => {
  await freshPage(async (page) => {
    await add(page, "Persist me");
    await add(page, "Completed");
    await page.locator(".todo-list li").nth(1).locator(".toggle").check();
    await page.locator('.filters a[href="#/active"]').click();
    await page.locator(".todo-list li label").first().dblclick();
    assert.equal(await page.locator(".todo-list li.editing").count(), 1);
    await page.reload();
    assert.deepEqual(
      await page.locator(".todo-list li label").allTextContents(),
      ["Persist me"],
    );
    assert.equal(
      await page
        .locator('.filters a[href="#/active"]')
        .evaluate((node) => node.classList.contains("selected")),
      true,
    );
    assert.equal(await page.locator(".todo-list li.editing").count(), 0);
    await page.locator('.filters a[href="#/completed"]').click();
    assert.deepEqual(
      await page.locator(".todo-list li label").allTextContents(),
      ["Completed"],
    );
    await page.reload();
    assert.deepEqual(
      await page.locator(".todo-list li label").allTextContents(),
      ["Completed"],
    );
  });
});
