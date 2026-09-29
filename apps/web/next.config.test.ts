import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("Next output for local and Vercel builds", () => {
  it("keeps standalone output when Vercel is absent", async () => {
    vi.stubEnv("VERCEL", undefined);
    vi.resetModules();
    const { default: config } = await import("./next.config");
    expect(config.output).toBe("standalone");
  });

  it("lets the Vercel adapter own deployment output", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.resetModules();
    const { default: config } = await import("./next.config");
    expect(config.output).toBeUndefined();
  });
});
