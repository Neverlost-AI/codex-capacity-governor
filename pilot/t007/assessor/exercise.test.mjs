import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { startNodeApp, stopNodeApp, targetDirectory } from "./common.mjs";

let app;

before(async () => {
  app = await startNodeApp(targetDirectory(), { fixedClock: true });
});

after(async () => {
  await stopNodeApp(app);
});

async function postForm(pathname, fields) {
  const response = await fetch(`${app.url}${pathname}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields),
  });
  assert.equal(
    response.ok,
    true,
    `POST ${pathname} returned ${response.status}`,
  );
  return response.json();
}

async function getJson(pathname) {
  const response = await fetch(`${app.url}${pathname}`);
  assert.equal(
    response.ok,
    true,
    `GET ${pathname} returned ${response.status}`,
  );
  return response.json();
}

async function user(name) {
  const result = await postForm("/api/users", { username: name });
  assert.equal(result.username, name);
  assert.equal(typeof result._id, "string");
  assert.ok(result._id.length > 0);
  return result;
}

async function exercise(person, fields) {
  return postForm(
    `/api/users/${encodeURIComponent(person._id)}/exercises`,
    fields,
  );
}

test("ET-01: create user and list typed user records", async () => {
  const person = await user("t007-user-list");
  const users = await getJson("/api/users");
  assert.ok(Array.isArray(users));
  assert.ok(
    users.some(
      (entry) => entry._id === person._id && entry.username === person.username,
    ),
  );
});

test("ET-02: supplied date returns user and typed exercise fields", async () => {
  const person = await user("t007-supplied-date");
  const result = await exercise(person, {
    description: "Run",
    duration: "60",
    date: "1990-01-01",
  });
  assert.equal(result._id, person._id);
  assert.equal(result.username, person.username);
  assert.equal(result.description, "Run");
  assert.equal(result.duration, 60);
  assert.equal(result.date, "Mon Jan 01 1990");
});

test("ET-03: omitted date uses the assessor's fixed UTC current date", async () => {
  const person = await user("t007-default-date");
  const result = await exercise(person, {
    description: "Walk",
    duration: "15",
  });
  assert.equal(result.date, "Mon Jan 15 2024");
});

test("ET-04: full log returns count and typed exercise entries", async () => {
  const person = await user("t007-full-log");
  await exercise(person, {
    description: "Swim",
    duration: "30",
    date: "1990-01-01",
  });
  const result = await getJson(
    `/api/users/${encodeURIComponent(person._id)}/logs`,
  );
  assert.equal(result._id, person._id);
  assert.equal(result.username, person.username);
  assert.equal(result.count, 1);
  assert.ok(Array.isArray(result.log));
  assert.equal(result.log.length, 1);
  assert.equal(result.log[0].description, "Swim");
  assert.equal(result.log[0].duration, 30);
  assert.equal(result.log[0].date, "Mon Jan 01 1990");
});

test("ET-05: from/to and integer limit filter before limiting", async () => {
  const person = await user("t007-filter-log");
  await exercise(person, {
    description: "Early",
    duration: "10",
    date: "1990-01-01",
  });
  await exercise(person, {
    description: "Middle",
    duration: "20",
    date: "1990-01-03",
  });
  await exercise(person, {
    description: "Late",
    duration: "30",
    date: "1990-01-05",
  });
  const pathname = `/api/users/${encodeURIComponent(person._id)}/logs`;
  const filtered = await getJson(
    `${pathname}?from=1990-01-02&to=1990-01-04&limit=1`,
  );
  assert.equal(filtered.log.length, 1);
  assert.equal(filtered.log[0].description, "Middle");
  assert.equal(filtered.log[0].duration, 20);
  assert.equal(filtered.log[0].date, "Wed Jan 03 1990");
  const limited = await getJson(`${pathname}?limit=1`);
  assert.equal(limited.log.length, 1);
  const bounded = await getJson(`${pathname}?from=1990-01-03&to=1990-01-05`);
  assert.equal(bounded.log.length, 2);
  assert.ok(
    bounded.log.every((entry) =>
      ["Middle", "Late"].includes(entry.description),
    ),
  );
});

test("ET-06: distinct users' exercise records remain separate", async () => {
  const first = await user("t007-user-a");
  const second = await user("t007-user-b");
  await exercise(first, {
    description: "First only",
    duration: "11",
    date: "1990-01-01",
  });
  await exercise(second, {
    description: "Second only",
    duration: "22",
    date: "1990-01-02",
  });
  const firstLog = await getJson(
    `/api/users/${encodeURIComponent(first._id)}/logs`,
  );
  const secondLog = await getJson(
    `/api/users/${encodeURIComponent(second._id)}/logs`,
  );
  assert.deepEqual(
    firstLog.log.map((entry) => entry.description),
    ["First only"],
  );
  assert.deepEqual(
    secondLog.log.map((entry) => entry.description),
    ["Second only"],
  );
});
