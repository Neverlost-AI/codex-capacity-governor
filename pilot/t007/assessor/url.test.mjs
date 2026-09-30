import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { startNodeApp, stopNodeApp, targetDirectory } from "./common.mjs";

const target = targetDirectory();
let app;

before(async () => {
  app = await startNodeApp(target);
});

after(async () => {
  await stopNodeApp(app);
});

async function shorten(originalUrl) {
  const response = await fetch(`${app.url}/api/shorturl`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ url: originalUrl }),
  });
  assert.equal(
    response.ok,
    true,
    `POST /api/shorturl returned ${response.status}`,
  );
  return response.json();
}

test("US-01: valid form POST returns matching original URL and nonempty identifier", async () => {
  const originalUrl = "https://example.org/t007?case=one";
  const result = await shorten(originalUrl);
  assert.equal(result.original_url, originalUrl);
  assert.ok(
    result.short_url !== undefined && String(result.short_url).length > 0,
  );
});

test("US-02: GET short identifier redirects to the original URL", async () => {
  const originalUrl = "https://example.org/t007?case=redirect";
  const result = await shorten(originalUrl);
  const response = await fetch(
    `${app.url}/api/shorturl/${encodeURIComponent(result.short_url)}`,
    {
      redirect: "manual",
    },
  );
  assert.ok([301, 302, 303, 307, 308].includes(response.status));
  assert.equal(response.headers.get("location"), originalUrl);
});

test("US-03: invalid URL returns the specified error", async () => {
  const result = await shorten("ftp:/john-doe.invalidTLD");
  assert.equal(result.error?.toLowerCase(), "invalid url");
});

test("US-04: distinct mappings survive a controlled server-process restart", async () => {
  const urls = [
    "https://example.org/t007?case=first",
    "http://example.net/t007?case=second",
  ];
  const mappings = [];
  for (const originalUrl of urls) {
    const result = await shorten(originalUrl);
    assert.equal(result.original_url, originalUrl);
    assert.ok(
      result.short_url !== undefined && String(result.short_url).length > 0,
    );
    mappings.push(result);
  }
  await stopNodeApp(app);
  app = await startNodeApp(target);
  for (const mapping of mappings) {
    const response = await fetch(
      `${app.url}/api/shorturl/${encodeURIComponent(mapping.short_url)}`,
      {
        redirect: "manual",
      },
    );
    assert.ok([301, 302, 303, 307, 308].includes(response.status));
    assert.equal(response.headers.get("location"), mapping.original_url);
  }
});
