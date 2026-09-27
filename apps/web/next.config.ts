import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Browser hydration/error diagnostics can stringify session-bound props.
  // Keep those diagnostics in the trusted browser, never in launch logs.
  logging: { browserToTerminal: false, serverFunctions: false },
  output: "standalone",
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  transpilePackages: [
    "@capacity-governor/application",
    "@capacity-governor/contracts",
  ],
};

export default nextConfig;
