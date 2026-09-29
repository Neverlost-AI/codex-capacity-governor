import { describe, expect, it } from "vitest";
import { hostedPostgresConnectionString } from "./database";

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
});
