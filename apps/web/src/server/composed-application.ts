import { randomUUID } from "node:crypto";
import { createComposedService } from "@capacity-governor/application";
import { GATE_B_V1_CONFIGURATION } from "@capacity-governor/forecast-engine";
import { GATE_A_V1_CONFIGURATION } from "@capacity-governor/policy-engine";
import { getDatabaseConnection } from "./db/database";
import { createRepositories } from "./db/repositories";
import { createComposedRepository } from "./db/composed-repository";
import { requireLocalAccess } from "./access";
import { localDigest } from "./local-boundary";
import type { AppDatabase } from "./db/database";
export const createComposedServiceForDatabase = (
  db: AppDatabase,
  ownerKey: string,
) =>
  createComposedService({
    ...createRepositories(db, ownerKey),
    composed: createComposedRepository(db, ownerKey),
    createId: randomUUID,
    now: () => new Date(),
    digest: localDigest,
    forecastConfiguration: GATE_B_V1_CONFIGURATION,
    policyConfiguration: GATE_A_V1_CONFIGURATION,
  });
export const getComposedService = async () => {
  const { session } = await requireLocalAccess();
  const { db } = await getDatabaseConnection();
  return createComposedServiceForDatabase(db, session.ownerKey);
};
