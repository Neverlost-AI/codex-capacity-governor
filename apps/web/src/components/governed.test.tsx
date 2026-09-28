// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
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
});
