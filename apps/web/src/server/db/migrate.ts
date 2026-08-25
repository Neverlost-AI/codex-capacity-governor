import path from "node:path";
import { createDatabaseConnection } from "./database";

try {
  process.loadEnvFile(path.resolve(process.cwd(), "../../.env"));
} catch {
  // Environment variables may already be supplied by the caller.
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const connection = await createDatabaseConnection(databaseUrl);
await connection.close();
console.log("Database migrations applied.");
