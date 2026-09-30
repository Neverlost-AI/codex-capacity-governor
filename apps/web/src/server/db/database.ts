import { existsSync, mkdirSync } from "node:fs";
import { X509Certificate } from "node:crypto";
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
import { accessMode, hostedTestMode } from "../hosted-config";
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

export const hostedPostgresConnectionString = (databaseUrl: string) => {
  const url = new URL(databaseUrl);
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname)
    throw new Error("Hosted PostgreSQL connection URL required");
  // node-postgres parses connection-string SSL options *after* the explicit
  // Pool options. Do not let a URL override certificate verification.
  for (const key of Array.from(url.searchParams.keys())) {
    if (!key.toLowerCase().startsWith("ssl")) continue;
    if (
      key !== "sslmode" ||
      url.searchParams.getAll(key).length !== 1 ||
      url.searchParams.get(key) !== "require"
    )
      throw new Error("Hosted PostgreSQL TLS options are not permitted");
    url.searchParams.delete(key);
  }
  return url.toString();
};

export const hostedPostgresTlsOptions = (encodedCa: string | undefined) => {
  // An explicit CA is required because Supabase's pooler chain is not
  // necessarily present in the host runtime's default trust store.
  if (
    !encodedCa ||
    encodedCa.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(encodedCa)
  )
    throw new Error("Hosted PostgreSQL CA certificate is missing or invalid");

  const pem = Buffer.from(encodedCa, "base64").toString("utf8");
  if (
    !/^-----BEGIN CERTIFICATE-----\r?\n[A-Za-z0-9+/=\r\n]+-----END CERTIFICATE-----\r?\n?$/.test(
      pem,
    )
  )
    throw new Error("Hosted PostgreSQL CA certificate is invalid");

  try {
    if (!new X509Certificate(pem).ca)
      throw new Error("Hosted PostgreSQL certificate is not a CA");
  } catch {
    throw new Error("Hosted PostgreSQL CA certificate is invalid");
  }

  // node-postgres supplies the URL hostname as TLS servername, retaining
  // Node's default hostname check. Never set checkServerIdentity or disable
  // certificate verification here.
  return { rejectUnauthorized: true as const, ca: pem };
};

export const createDatabaseConnection = async (
  databaseUrl: string,
  options: { migrate?: boolean; hostedPool?: boolean } = {},
): Promise<DatabaseConnection> => {
  const migrate = options.migrate ?? true;
  const migrationsFolder = migrate ? findMigrationsFolder() : undefined;

  if (databaseUrl.startsWith("pglite://")) {
    const client = new PGlite(pgliteLocation(databaseUrl));
    const pgliteDb = drizzlePglite(client, { schema });
    if (migrationsFolder) await migratePglite(pgliteDb, { migrationsFolder });
    return {
      db: pgliteDb as unknown as AppDatabase,
      close: () => client.close(),
    };
  }

  const connectionString = options.hostedPool
    ? hostedPostgresConnectionString(databaseUrl)
    : databaseUrl;
  const pool = new Pool({
    connectionString,
    ...(options.hostedPool
      ? {
          max: 1,
          idleTimeoutMillis: 30_000,
          connectionTimeoutMillis: 10_000,
          ssl: hostedPostgresTlsOptions(
            process.env.CAPACITY_GOVERNOR_POSTGRES_CA_BASE64,
          ),
        }
      : {}),
  });
  const db = drizzleNodePg(pool, { schema });
  if (migrationsFolder) await migrateNodePg(db, { migrationsFolder });
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

  const hosted = accessMode() === "hosted";
  const testMode = hosted && hostedTestMode();
  if (hosted && databaseUrl.startsWith("pglite://") && !testMode)
    throw new Error("Hosted records require PostgreSQL");
  globalDatabase.capacityGovernorDatabase ??= createDatabaseConnection(
    databaseUrl,
    { migrate: !hosted || testMode, hostedPool: hosted && !testMode },
  ).catch((error: unknown) => {
    globalDatabase.capacityGovernorDatabase = undefined;
    throw error;
  });
  return globalDatabase.capacityGovernorDatabase;
};
