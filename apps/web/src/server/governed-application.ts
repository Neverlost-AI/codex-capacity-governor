import { randomUUID } from "node:crypto";
import { createGovernedService } from "@capacity-governor/application";
import { requireLocalAccess } from "./access";
import { getDatabaseConnection } from "./db/database";
import { createRepositories } from "./db/repositories";
import { createComposedRepository } from "./db/composed-repository";
import { createGovernedRepository } from "./db/governed-repository";
import { localDigest } from "./local-boundary";
import type { AppDatabase } from "./db/database";

export const createGovernedServiceForDatabase = (
  db: AppDatabase,
  ownerKey: string,
) =>
  createGovernedService({
    ...createRepositories(db, ownerKey),
    composed: createComposedRepository(db, ownerKey),
    governed: createGovernedRepository(db, ownerKey),
    createId: randomUUID,
    now: () => new Date(),
    digest: localDigest,
  });

export const getGovernedService = async () => {
  const { session } = await requireLocalAccess();
  const { db } = await getDatabaseConnection();
  return createGovernedServiceForDatabase(db, session.ownerKey);
};
