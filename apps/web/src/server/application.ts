import { randomUUID } from "node:crypto";
import { createApplicationService } from "@capacity-governor/application";
import { getDatabaseConnection } from "./db/database";
import { createRepositories } from "./db/repositories";
import { requireLocalAccess } from "./access";

export const getApplicationService = async () => {
  await requireLocalAccess();
  const { db } = await getDatabaseConnection();
  return createApplicationService({
    ...createRepositories(db),
    createId: randomUUID,
    now: () => new Date(),
  });
};
