// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, it, expect, vi } from "vitest";
import { ComposedForm } from "./composed-form";
import { ComposedResult } from "./composed-result";
import { ComposedReview } from "./composed-review";
import { ReviewConfirmation } from "./review-confirmation";
import { LocalSessionProvider } from "./local-session";
import {
  harness,
  inputFixture,
  digest,
  PROJECT,
} from "../../../../packages/application/test/composed-fixture";
import { canonicalizeComposed } from "@capacity-governor/contracts";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const saved = async (input = inputFixture()) => {
  const h = harness();
  const revision = await h.service.prepare(input);
  return h.service.confirm(
    revision,
    "local-session:test",
    digest(canonicalizeComposed(revision)),
  );
};
describe("focused complete-preflight accessible UI", () => {
  it("review renders all material server-held values with collapsed technical evidence", async () => {
    const input = inputFixture();
    input.buckets[0].correctionReserve = {
      manualMinimum: { amount: "0", unit: "PERCENT" },
      targetShareBasisPoints: 0,
    };
    input.knownCapacityActivities = [
      {
        eventId: "event-factual",
        occurredAt: "2026-09-26T11:59:00.000Z",
        affectedBucketIds: ["short"],
        source: "Manually observed run",
      },
    ];
    const h = harness();
    const revision = await h.service.prepare(input);
    render(<ComposedReview revision={revision} digest="exact-test-digest" />);
    expect(screen.getByText(input.repositoryReference)).toBeVisible();
    expect(screen.getByText("Manually observed run")).toBeVisible();
    expect(screen.getByText("event-factual")).toBeVisible();
    expect(screen.getByText(/Smallest complete scope: No/)).toBeVisible();
    expect(screen.getByText(/Minimum 0.*target share 0%/)).toBeVisible();
    expect(screen.getByText("Some new pattern")).toBeVisible();
    expect(screen.getByText("Work item reference")).toBeVisible();
    expect(screen.getByText(input.workItems[0].workItemId)).toBeVisible();
    expect(
      screen.getByLabelText("Complete reviewed evidence").closest("details"),
    ).not.toHaveAttribute("open");
    expect(
      JSON.parse(
        screen.getByLabelText("Complete reviewed evidence").textContent!,
      ),
    ).toEqual(revision);
  });
  it("activity rows preserve explicit references after window edits and map errors to retained fields", async () => {
    const user = userEvent.setup();
    render(<ComposedForm projectId={PROJECT} />);
    await user.click(screen.getByRole("button", { name: "Continue to Capacity" }));
    await user.click(screen.getByText("Known capacity activity (advanced)"));
    await user.click(screen.getByRole("button", { name: "Add capacity activity" }));
    await user.type(screen.getByLabelText("Activity identity 1"), "keep-event");
    await user.type(
      screen.getByLabelText("Affected window evidence IDs (one per line) 1"),
      "removed-window",
    );
    await user.type(
      screen.getByLabelText("Reading reference 1"),
      "renamed-window",
    );
    await user.click(screen.getByRole("button", { name: "Continue to Review" }));
    expect(screen.getByLabelText("Activity identity 1")).toHaveValue(
      "keep-event",
    );
    expect(
      screen.getByLabelText("Affected window evidence IDs (one per line) 1"),
    ).toHaveValue("removed-window");
    await user.click(screen.getByRole("button", { name: "Continue to Capacity" }));
    expect(
      screen.getByLabelText("Activity time (explicit offset) 1"),
    ).toHaveAttribute("aria-invalid", "true");
    const field = screen.getByLabelText("Activity time (explicit offset) 1");
    expect(
      document.getElementById(field.getAttribute("aria-describedby")!),
    ).toBeVisible();
    screen.getByRole("button", { name: "Remove activity 1" }).focus();
    await user.keyboard(" ");
    expect(
      screen.queryByLabelText("Activity identity 1"),
    ).not.toBeInTheDocument();
  });
  it("keyboard entry, explicit taxonomy/UNKNOWN, multiple items/buckets and no legacy conversion", async () => {
    const user = userEvent.setup();
    render(<ComposedForm projectId={PROJECT} />);
    await user.tab();
    expect(screen.getByText("Technical scope and calibration limitations")).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText("Repository or scope reference")).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Continue to Capacity" }));
    expect(screen.getByLabelText("Available amount as shown 1")).toHaveValue("");
    expect(
      screen.getByLabelText("When you saw this reading (with time offset) 1"),
    ).toHaveValue("");
    expect(screen.getByLabelText("Unit shown 1")).toHaveValue("");
    await user.click(screen.getByRole("button", { name: "Back to Work" }));
    await user.click(screen.getByText(/Planning details for work item 1/));
    expect(screen.getByLabelText("How unfamiliar is the approach? 1")).toHaveValue("");
    expect(
      screen.getByRole("combobox", { name: "Type of work 1" }),
    ).toHaveValue("");
    expect(screen.getByRole("radio", { name: "Yes" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "No" })).not.toBeChecked();
    await user.selectOptions(screen.getByLabelText("How unfamiliar is the approach? 1"), "UNKNOWN");
    expect(screen.getByLabelText("How unfamiliar is the approach? 1")).toHaveValue("UNKNOWN");
    await user.click(screen.getByRole("button", { name: "Add work item" }));
    await user.click(screen.getByRole("button", { name: "Continue to Capacity" }));
    await user.click(screen.getByRole("button", { name: "Add capacity window" }));
    expect(screen.getByLabelText("Work item 2 reference")).toBeInTheDocument();
    expect(screen.getByLabelText("Reading reference 2")).toBeVisible();
    expect(screen.getByText(/we never infer which ones are required/)).toBeVisible();
  });
  it("field error summary focuses and entered evidence remains", async () => {
    vi.stubGlobal("requestAnimationFrame", (callback: () => void) =>
      setTimeout(callback, 0),
    );
    const user = userEvent.setup();
    render(<ComposedForm projectId={PROJECT} />);
    await user.type(
      screen.getByLabelText("Repository or scope reference"),
      "repo/keep",
    );
    await user.click(screen.getByRole("button", { name: "Continue to Capacity" }));
    await user.click(screen.getByRole("button", { name: "Continue to Review" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveFocus());
    expect(screen.getByLabelText("Repository or scope reference")).toHaveValue(
      "repo/keep",
    );
    expect(document.getElementById("minimum-error")).toBeVisible();
    expect(document.getElementById("minimum-error")).toHaveTextContent(
      "Explicitly answer Yes or No",
    );
    expect(screen.getByRole("radio", { name: "Yes" })).not.toBeChecked();
  });
  it("keeps invalid stop references on Work with a reachable error link", async () => {
    const user = userEvent.setup();
    render(<ComposedForm projectId={PROJECT} />);
    await user.type(
      screen.getByLabelText(/Active mandatory stop IDs/),
      " stop-with-spaces ",
    );
    await user.click(screen.getByRole("button", { name: "Continue to Capacity" }));
    await user.click(screen.getByRole("button", { name: "Continue to Review" }));
    const stop = screen.getByLabelText(/Active mandatory stop IDs/);
    expect(stop).toHaveAttribute("aria-invalid", "true");
    expect(stop).toBeVisible();
    expect(screen.getByText("1. Work")).toHaveAttribute("aria-current", "step");
    const link = screen.getByRole("link", { name: /Required stop references/ });
    expect(link).toHaveAttribute("href", "#composed-stops");
    await user.click(link);
    expect(stop).toBeVisible();
  });
  it("explicit confirmation stays checked on save failure and never reports a saved plan", async () => {
    vi.stubGlobal("requestAnimationFrame", (callback: () => void) =>
      setTimeout(callback, 0),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error:
            "No saved result. Database unavailable; retry same confirmation.",
        }),
      }),
    );
    const user = userEvent.setup();
    render(
      <LocalSessionProvider csrf="test-csrf">
        <ReviewConfirmation
          revisionId="00000000-0000-4000-8000-000000000010"
          challenge="test-challenge"
        />
      </LocalSessionProvider>,
    );
    await user.click(
      screen.getByRole("checkbox", { name: /confirm the work description/ }),
    );
    await user.click(
      screen.getByRole("checkbox", {
        name: /confirm these are all required capacity windows/,
      }),
    );
    await user.click(
      screen.getByRole("button", { name: "Confirm, evaluate and save" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("No saved result"),
    );
    expect(
      screen.getByRole("checkbox", { name: /confirm the work description/ }),
    ).toBeChecked();
    expect(
      screen.getByRole("checkbox", {
        name: /confirm these are all required capacity windows/,
      }),
    ).toBeChecked();
    expect(
      screen.queryByText("Saved capacity preflight"),
    ).not.toBeInTheDocument();
  });
  it.each(["PROCEED", "NARROW", "DEFER", "STOP / PRESERVE"])(
    "%s result exposes independent evidence/disclosures and no enabled execution",
    async (decision) => {
      const input = inputFixture();
      if (decision === "NARROW")
        input.buckets[0].availableCapacity.amount = "2000";
      if (decision === "DEFER") {
        input.buckets[0].availableCapacity.amount = "2000";
        input.buckets[0].reset = {
          kind: "CONFIRMED",
          resetsAt: "2026-09-26T13:00:00.000Z",
          normalizedUtc: "2026-09-26T13:00:00.000Z",
          sourceTimezone: "literal source timezone",
          expectedPostResetAvailability: {
            amount: "10000",
            unit: "BASIS_POINTS",
          },
        };
      }
      if (decision === "STOP / PRESERVE")
        input.workItems[0].novelty = "UNKNOWN";
      render(<ComposedResult attempt={await saved(input)} />);
      expect(screen.getByRole("heading", { name: decision })).toBeVisible();
      expect(screen.getByText(/Historical saved evaluation/)).toBeVisible();
      expect(screen.getByText(/uncalibrated planning estimates/)).toBeVisible();
      expect(
        screen.getByText(/not demonstrated prediction accuracy/),
      ).toBeVisible();
      expect(
        screen.getByText(/not purchased-credit cost estimates/),
      ).toBeVisible();
      expect(
        screen.getByRole("button", { name: "Automatic execution unavailable" }),
      ).toBeDisabled();
      expect(
        screen.getByRole("heading", { name: "short allocations" }),
      ).toBeVisible();
    },
  );
  it("NOT_COMPOSABLE and INPUT_REJECTION have no fabricated mode or decision", async () => {
    const input = inputFixture();
    input.workItems = Array.from({ length: 9 }, (_, index) => ({
      ...input.workItems[0],
      workItemId: `work-${index}`,
    }));
    const { unmount } = render(<ComposedResult attempt={await saved(input)} />);
    expect(
      screen.getByRole("heading", {
        name: "Forecast cannot be used for a policy decision",
      }),
    ).toBeVisible();
    expect(screen.queryByText(/Operating mode:/)).not.toBeInTheDocument();
    unmount();
    const rejected = inputFixture();
    rejected.buckets[0].availableCapacity.amount = "10001";
    render(<ComposedResult attempt={await saved(rejected)} />);
    expect(
      screen.getByRole("heading", { name: "Policy inputs rejected" }),
    ).toBeVisible();
    expect(screen.queryByText(/Operating mode:/)).not.toBeInTheDocument();
  });
});
