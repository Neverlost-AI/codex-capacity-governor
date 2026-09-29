export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    (process.env.CAPACITY_GOVERNOR_MODE ?? "local") === "local"
  ) {
    const { getLocalBoundary, configuredOrigin } =
      await import("./server/local-boundary");
    configuredOrigin();
    getLocalBoundary().presentPairingSecret((secret) =>
      console.log(`Local pairing secret (terminal only): ${secret}`),
    );
  }
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.CAPACITY_GOVERNOR_MODE === "hosted"
  ) {
    const { hostedConfiguration } = await import("./server/hosted-config");
    hostedConfiguration();
  }
}
