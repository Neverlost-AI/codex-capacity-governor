import path from "node:path";
import { createDatabaseConnection } from "./database";

try {
  process.loadEnvFile(path.resolve(process.cwd(), "../../.env"));
} catch {
  // Environment variables may already be supplied by the caller.
}

const hosted = process.env.CAPACITY_GOVERNOR_MODE === "hosted";
const databaseUrl = hosted
  ? process.env.MIGRATION_DATABASE_URL
  : process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    hosted
      ? "MIGRATION_DATABASE_URL is required for hosted migrations"
      : "DATABASE_URL is required",
  );
}

const connection = await createDatabaseConnection(databaseUrl, {
  migrate: true,
  hostedPool: false,
});
await connection.close();
console.log("Database migrations applied.");
