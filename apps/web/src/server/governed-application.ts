import { randomUUID } from "node:crypto";
import { createGovernedService } from "@capacity-governor/application";
import { requireLocalAccess } from "./access";
import { getDatabaseConnection } from "./db/database";
import { createRepositories } from "./db/repositories";
import { createComposedRepository } from "./db/composed-repository";
import { createGovernedRepository } from "./db/governed-repository";
import { localDigest } from "./local-boundary";

export const getGovernedService = async () => {
  await requireLocalAccess();
  const { db } = await getDatabaseConnection();
  return createGovernedService({
    ...createRepositories(db),
    composed: createComposedRepository(db),
    governed: createGovernedRepository(db),
    createId: randomUUID,
    now: () => new Date(),
    digest: localDigest,
  });
};
