import { and, eq } from "drizzle-orm";
import type { AppDatabase } from "./database";
import { developmentRuns, governedRuns, projects } from "./schema";

export const localOwnerKey = "local:legacy";

export const hasProjectAccess = async (
  db: AppDatabase,
  ownerKey: string,
  projectId: string,
) => {
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerKey, ownerKey)));
  return !!row;
};

export const hasDevelopmentRunAccess = async (
  db: AppDatabase,
  ownerKey: string,
  runId: string,
) => {
  const [row] = await db
    .select({ id: developmentRuns.id })
    .from(developmentRuns)
    .innerJoin(projects, eq(developmentRuns.projectId, projects.id))
    .where(and(eq(developmentRuns.id, runId), eq(projects.ownerKey, ownerKey)));
  return !!row;
};

export const hasGovernedRunAccess = async (
  db: AppDatabase,
  ownerKey: string,
  runId: string,
) => {
  const [row] = await db
    .select({ id: governedRuns.id })
    .from(governedRuns)
    .innerJoin(projects, eq(governedRuns.projectId, projects.id))
    .where(and(eq(governedRuns.id, runId), eq(projects.ownerKey, ownerKey)));
  return !!row;
};
