import { randomUUID } from "node:crypto";
import { createApplicationService } from "@capacity-governor/application";
import { getDatabaseConnection } from "./db/database";
import { createRepositories } from "./db/repositories";

export const getApplicationService = async () => {
  const { db } = await getDatabaseConnection();
  return createApplicationService({
    ...createRepositories(db),
    createId: randomUUID,
    now: () => new Date(),
  });
};
