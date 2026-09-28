// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canonicalizeComposed,
  type GovernedHistory,
} from "@capacity-governor/contracts";
import {
  harness,
  inputFixture,
  digest,
  PROJECT,
} from "../../../../packages/application/test/composed-fixture";
import { GovernedLinkReview } from "./governed-link-review";
import { GovernedOutcomeForm } from "./governed-outcome-form";
import GovernedRunPage from "../app/projects/[projectId]/governed/[runId]/page";

const reopenMock = vi.hoisted(() => vi.fn());
vi.mock("../server/access", () => ({
  requireLocalAccess: async () => ({ session: { csrf: "csrf" } }),
}));
vi.mock("../server/governed-application", () => ({
  getGovernedService: async () => ({ reopen: reopenMock }),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const attempt = async () => {
  const h = harness();
  const revision = await h.service.prepare(inputFixture());
  return h.service.confirm(
    revision,
    "local-session:test",
    digest(canonicalizeComposed(revision)),
  );
};
const history = async (): Promise<GovernedHistory> => {
  const saved = await attempt();
  if (saved.policy?.kind !== "POLICY_EVALUATION") throw new Error();
  return {
    attempt: saved,
    link: {
      id: "00000000-0000-4000-8000-000000000055",
      projectId: PROJECT,
      preflightDraftId: saved.revision.input.preflightDraftId,
      attemptId: saved.id,
      revisionId: saved.revision.id,
      receiptId: saved.receipt.id,
      receiptDigest: saved.receipt.canonicalDigest,
      resultFamily: "POLICY_EVALUATION",
      bucketIdentities: saved.receipt.buckets,
      decision: saved.policy.aggregateDecision,
      authorizesWork: saved.policy.authorizesWork,
      actorReference: "local-session:test",
      confirmedAt: saved.recordedAt,
      confirmationReference: "reviewed-link-reference",
    },
    observations: [],
  };
};
const mismatchedHistory = async (): Promise<GovernedHistory> => {
  const data = await history();
  if (data.attempt.forecast.kind !== "FORECAST_EVALUATION")
    throw new Error("Expected eligible attempt");
  const bucket = data.attempt.forecast.bucketResults[0].bucket;
  const recordedAt = data.attempt.recordedAt;
  data.observations = [
    {
      id: "00000000-0000-4000-8000-000000000056",
      runId: data.link.id,
      runOutcome: "COMPLETED",
      validationResult: "PASSED",
      adherence: "FOLLOWED",
      unexpectedFailures: [],
      deferredWork: [],
      recordedAt,
      reviewerActorReference: "local-session:test",
      usage: [
        {
          bucketId: bucket.bucketId,
          providerId: bucket.providerId,
          capacityWindowId: bucket.capacityWindowId,
          resetCycleId: "later-cycle",
          bucketProfileVersion: "older-profile",
          category: "IMPLEMENTATION",
          rawValue: "1",
          rawUnit: "PERCENT",
          normalizedBasisPoints: "100",
          sourceReference: "manual later-cycle reading",
          observedAt: recordedAt,
          exactCycleOnly: "YES",
          reviewedBy: "local-session:test",
          reviewedAt: recordedAt,
          normalizationVersion: "manual-percent-bp-v1",
        },
      ],
      comparisons: [
        {
          bucketId: bucket.bucketId,
          unavailableDetail: "BUCKET_OR_PROFILE_MISMATCH",
          comparison: {
            kind: "UNAVAILABLE",
            candidateId: "00000000-0000-4000-8000-000000000057",
            bucketId: bucket.bucketId,
            reasonId: "COMPARISON_ACTUAL_UNAVAILABLE_OR_INCOMPATIBLE",
          },
        },
      ],
    },
  ];
  return data;
};
describe("governed local operator UI", () => {
  it("shows exact saved link evidence and an explicit confirmation checkbox", async () => {
    const saved = await attempt();
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ challenge: "one-use" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<GovernedLinkReview attempt={saved} csrf="csrf" />);
    expect(
      screen.getByText(saved.receipt.canonicalDigest, { exact: false }),
    ).toBeVisible();
    expect(
      screen.getByText(/does not refresh capacity or authorize work now/i),
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Review exact saved attempt" }),
    );
    expect(
      await screen.findByRole("checkbox", {
        name: /confirm this exact saved evaluation/i,
      }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("button", { name: "Create one governed run" }),
    ).toBeDisabled();
  });
  it("requires explicit adherence and distinguishes blank unknown usage from entered zero", async () => {
    const user = userEvent.setup();
    const data = await history();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Injected save failure" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<GovernedOutcomeForm history={data} csrf="csrf" />);
    expect(screen.getByLabelText("Operator-reported adherence")).toHaveValue(
      "",
    );
    expect(
      screen.getByText(
        /Omitted usage is unknown; enter 0 only when explicitly observed/,
      ),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Save outcome" }));
    expect(screen.getByLabelText("Operator-reported adherence")).toBeInvalid();
    await user.selectOptions(
      screen.getByLabelText("Operator-reported adherence"),
      "UNKNOWN",
    );
    await user.type(screen.getByLabelText(/IMPLEMENTATION actual/), "0");
    await user.click(screen.getByRole("button", { name: "Save outcome" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Review every entered bucket usage",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("shows a changed-reset actual under its recorded identity, not the issued identity", async () => {
    const data = await mismatchedHistory();
    reopenMock.mockResolvedValue(data);
    render(
      await GovernedRunPage({
        params: Promise.resolve({ projectId: PROJECT, runId: data.link.id }),
      }),
    );
    expect(
      screen.getByRole("heading", { name: /Issued forecast identity/ }),
    ).toHaveTextContent("reset cycle-1");
    const recorded = screen
      .getByText(/Recorded identity differs from issued forecast identity/)
      .closest("li");
    expect(recorded).toHaveTextContent("Recorded identity: bucket short");
    expect(recorded).toHaveTextContent("reset later-cycle");
    expect(recorded).toHaveTextContent("this actual is not comparable");
    expect(
      screen
        .getAllByText(/BUCKET_OR_PROFILE_MISMATCH/)
        .find((element) => element.tagName === "P"),
    ).toBeVisible();
  });
  it("requires re-review of copied identity and allows an explicit cycle/profile correction", async () => {
    const user = userEvent.setup();
    const data = await mismatchedHistory();
    const original = JSON.stringify(data.observations[0]);
    if (data.attempt.forecast.kind !== "FORECAST_EVALUATION")
      throw new Error("Expected eligible attempt");
    const issuedProfile =
      data.attempt.forecast.bucketResults[0].bucket.bucketProfileVersion;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Injected save failure" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<GovernedOutcomeForm history={data} csrf="csrf" />);
    const row = screen.getByRole("group", {
      name: "short IMPLEMENTATION usage",
    });
    const reset = within(row).getByLabelText("Recorded reset cycle ID");
    const profile = within(row).getByLabelText(
      "Recorded bucket profile version",
    );
    const reviewed = within(row).getByRole("checkbox", {
      name: /I reviewed this exact manual value/,
    });
    expect(reset).toHaveValue("later-cycle");
    expect(profile).toHaveValue("older-profile");
    expect(reviewed).not.toBeChecked();
    expect(
      within(row).getByText(/Recorded identity differs from the issued/),
    ).toBeVisible();
    await user.type(
      screen.getByLabelText("Amendment reason"),
      "Reviewed cycle",
    );
    await user.selectOptions(
      screen.getByLabelText("Operator-reported adherence"),
      "UNKNOWN",
    );
    await user.click(screen.getByRole("button", { name: "Append amendment" }));
    expect(fetchMock).not.toHaveBeenCalled();
    await user.click(reviewed);
    await user.click(screen.getByRole("button", { name: "Append amendment" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Injected save failure",
    );
    const retained = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(retained.input.usage[0]).toMatchObject({
      resetCycleId: "later-cycle",
      bucketProfileVersion: "older-profile",
      reviewed: true,
    });
    expect(retained.predecessorId).toBe(data.observations[0].id);

    await user.clear(reset);
    await user.type(reset, "cycle-1");
    await user.clear(profile);
    await user.type(profile, issuedProfile);
    expect(reviewed).not.toBeChecked();
    await user.click(reviewed);
    await user.click(screen.getByRole("button", { name: "Append amendment" }));
    const corrected = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(corrected.input.usage[0]).toMatchObject({
      resetCycleId: "cycle-1",
      bucketProfileVersion: issuedProfile,
      reviewed: true,
    });
    expect(JSON.stringify(data.observations[0])).toBe(original);
  });
});
