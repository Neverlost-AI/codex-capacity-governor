import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  transpilePackages: [
    "@capacity-governor/application",
    "@capacity-governor/contracts",
  ],
};

export default nextConfig;
