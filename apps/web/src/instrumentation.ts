export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getLocalBoundary, configuredOrigin } =
      await import("./server/local-boundary");
    configuredOrigin();
    getLocalBoundary().presentPairingSecret((secret) =>
      console.log(`Local pairing secret (terminal only): ${secret}`),
    );
  }
}
