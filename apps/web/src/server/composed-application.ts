import { randomUUID } from "node:crypto";
import { createComposedService } from "@capacity-governor/application";
import { GATE_B_V1_CONFIGURATION } from "@capacity-governor/forecast-engine";
import { GATE_A_V1_CONFIGURATION } from "@capacity-governor/policy-engine";
import { getDatabaseConnection } from "./db/database";
import { createRepositories } from "./db/repositories";
import { createComposedRepository } from "./db/composed-repository";
import { requireLocalAccess } from "./access";
import { localDigest } from "./local-boundary";
export const getComposedService = async () => {
  await requireLocalAccess();
  const { db } = await getDatabaseConnection();
  return createComposedService({
    ...createRepositories(db),
    composed: createComposedRepository(db),
    createId: randomUUID,
    now: () => new Date(),
    digest: localDigest,
    forecastConfiguration: GATE_B_V1_CONFIGURATION,
    policyConfiguration: GATE_A_V1_CONFIGURATION,
  });
};
