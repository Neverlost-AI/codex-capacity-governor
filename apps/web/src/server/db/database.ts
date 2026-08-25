import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import {
  drizzle as drizzleNodePg,
  type NodePgDatabase,
} from "drizzle-orm/node-postgres";
import { migrate as migrateNodePg } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import * as schema from "./schema";

export type AppDatabase = NodePgDatabase<typeof schema>;

export interface DatabaseConnection {
  db: AppDatabase;
  close: () => Promise<void>;
}

const findMigrationsFolder = (): string => {
  const candidates = [
    path.resolve(process.cwd(), "drizzle"),
    path.resolve(process.cwd(), "apps/web/drizzle"),
  ];
  const folder = candidates.find(existsSync);
  if (!folder) {
    throw new Error("Drizzle migrations are missing. Run pnpm db:generate.");
  }
  return folder;
};

const pgliteLocation = (databaseUrl: string): string | undefined => {
  const location = databaseUrl.slice("pglite://".length);
  if (!location || location === "memory") {
    return undefined;
  }
  const dataDirectory = path.join(process.cwd(), ".data");
  mkdirSync(dataDirectory, { recursive: true });
  return path.join(dataDirectory, path.basename(location));
};

export const createDatabaseConnection = async (
  databaseUrl: string,
): Promise<DatabaseConnection> => {
  const migrationsFolder = findMigrationsFolder();

  if (databaseUrl.startsWith("pglite://")) {
    const client = new PGlite(pgliteLocation(databaseUrl));
    const pgliteDb = drizzlePglite(client, { schema });
    await migratePglite(pgliteDb, { migrationsFolder });
    return {
      db: pgliteDb as unknown as AppDatabase,
      close: () => client.close(),
    };
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzleNodePg(pool, { schema });
  await migrateNodePg(db, { migrationsFolder });
  return {
    db,
    close: () => pool.end(),
  };
};

const globalDatabase = globalThis as typeof globalThis & {
  capacityGovernorDatabase?: Promise<DatabaseConnection>;
};

export const getDatabaseConnection = (): Promise<DatabaseConnection> => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  globalDatabase.capacityGovernorDatabase ??= createDatabaseConnection(
    databaseUrl,
  ).catch((error: unknown) => {
    globalDatabase.capacityGovernorDatabase = undefined;
    throw error;
  });
  return globalDatabase.capacityGovernorDatabase;
};
