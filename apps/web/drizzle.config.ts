import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  out: "./drizzle",
  schema: "./src/server/db/schema.ts",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://capacity_governor:capacity_governor@localhost:5432/capacity_governor",
  },
  strict: true,
  verbose: true,
});
