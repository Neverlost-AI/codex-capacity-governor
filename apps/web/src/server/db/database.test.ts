import { X509Certificate } from "node:crypto";
import { rootCertificates } from "node:tls";
import { describe, expect, it } from "vitest";
import {
  createDatabaseConnection,
  hostedPostgresConnectionString,
  hostedPostgresTlsOptions,
} from "./database";

const testCa = rootCertificates.find((pem) => new X509Certificate(pem).ca);
if (!testCa) throw new Error("Node test runtime has no CA certificate");
const encodedTestCa = Buffer.from(testCa, "utf8").toString("base64");

describe("hosted PostgreSQL pool configuration", () => {
  it("retains pooler identity while keeping explicit verified TLS authoritative", () => {
    const parsed = new URL(
      hostedPostgresConnectionString(
        "postgresql://operator:password@pooler.example.test:6543/governor?sslmode=require&application_name=capacity-governor",
      ),
    );
    expect(parsed.hostname).toBe("pooler.example.test");
    expect(parsed.port).toBe("6543");
    expect(parsed.searchParams.get("application_name")).toBe(
      "capacity-governor",
    );
    expect(parsed.searchParams.has("sslmode")).toBe(false);
  });

  it.each(["disable", "prefer", "no-verify", "verify-ca"])(
    "rejects URL sslmode=%s rather than letting it override verified TLS",
    (mode) => {
      expect(() =>
        hostedPostgresConnectionString(
          `postgresql://operator:password@pooler.example.test/governor?sslmode=${mode}`,
        ),
      ).toThrow("TLS options");
    },
  );
  it("rejects other URL SSL knobs and non-PostgreSQL URLs", () => {
    expect(() =>
      hostedPostgresConnectionString(
        "postgresql://operator:password@pooler.example.test/governor?ssl=no-verify",
      ),
    ).toThrow("TLS options");
    expect(() =>
      hostedPostgresConnectionString(
        "postgresql://operator:password@pooler.example.test/governor?sslmode=require&ssl=no-verify",
      ),
    ).toThrow("TLS options");
    expect(() => hostedPostgresConnectionString("pglite://memory")).toThrow(
      "PostgreSQL connection URL",
    );
  });

  it("uses an explicit trusted CA with certificate and hostname verification intact", () => {
    const options = hostedPostgresTlsOptions(encodedTestCa);
    expect(options).toEqual({ rejectUnauthorized: true, ca: testCa });
    expect(options).not.toHaveProperty("checkServerIdentity");
    expect(options).not.toHaveProperty("servername");
  });

  it.each([undefined, "", "not-base64", "YWJj", "a"])(
    "rejects missing or malformed hosted CA evidence (%s)",
    (value) => {
      expect(() => hostedPostgresTlsOptions(value)).toThrow(
        "Hosted PostgreSQL CA certificate",
      );
    },
  );

  it("fails before creating a hosted pool when the CA is absent", async () => {
    const original = process.env.CAPACITY_GOVERNOR_POSTGRES_CA_BASE64;
    delete process.env.CAPACITY_GOVERNOR_POSTGRES_CA_BASE64;
    try {
      await expect(
        createDatabaseConnection(
          "postgresql://operator:password@pooler.example.test:6543/governor",
          { migrate: false, hostedPool: true },
        ),
      ).rejects.toThrow("Hosted PostgreSQL CA certificate");
    } finally {
      if (original === undefined)
        delete process.env.CAPACITY_GOVERNOR_POSTGRES_CA_BASE64;
      else process.env.CAPACITY_GOVERNOR_POSTGRES_CA_BASE64 = original;
    }
  });
});
