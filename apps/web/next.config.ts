import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Browser hydration/error diagnostics can stringify session-bound props.
  // Keep those diagnostics in the trusted browser, never in launch logs.
  logging: { browserToTerminal: false, serverFunctions: false },
  // Vercel's Next adapter produces its own deployment output. Next 16.3.0
  // cannot combine that adapter with standalone tracing; retain standalone
  // only for builds outside Vercel.
  output: process.env.VERCEL ? undefined : "standalone",
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  transpilePackages: [
    "@capacity-governor/application",
    "@capacity-governor/contracts",
  ],
};

export default nextConfig;
