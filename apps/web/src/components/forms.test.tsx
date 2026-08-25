// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import type { FormActionState } from "../app/form-state";
import { PreflightFormFields } from "./preflight-form";
import { ProjectFormFields } from "./project-form";
import { RunOutcomeFormFields } from "./run-outcome-form";

const projectId = "d1b5eaa4-d266-4dd8-b9ab-17e195dccbd2";

describe("accessible form states", () => {
  it("associates project validation errors and preserves entered text", () => {
    const state: FormActionState = {
      status: "error",
      message: "Check the highlighted fields and try again.",
      fieldErrors: { name: ["Required"] },
      values: { name: "", description: "My description" },
    };
    render(createElement(ProjectFormFields, { state }));
    const name = screen.getByRole("textbox", { name: "Project name" });
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAccessibleDescription("Required");
    expect(
      screen.getByRole("textbox", { name: /Project description/ }),
    ).toHaveValue("My description");
    expect(
      screen.getByText("Check the highlighted fields and try again."),
    ).toHaveAttribute("role", "alert");
  });

  it("renders the complete manual preflight surface without Governor output", () => {
    render(
      createElement(PreflightFormFields, {
        draft: null,
        projectId,
        state: {
          status: "error",
          message: "Check the highlighted fields and try again.",
          fieldErrors: { budgetAmount: ["Must be zero or greater"] },
          values: { budgetAmount: "-1", title: "Saved input" },
        },
      }),
    );
    expect(screen.getByRole("textbox", { name: "Tranche title" })).toHaveValue(
      "Saved input",
    );
    expect(
      screen.getByRole("spinbutton", { name: "Available amount" }),
    ).toHaveAccessibleDescription("Must be zero or greater");
    expect(
      screen.getByRole("heading", {
        name: "Record optional reserve preferences",
      }),
    ).toBeVisible();
    expect(
      screen.queryByText(/PROCEED|NARROW|DEFER|STOP \/ PRESERVE/),
    ).not.toBeInTheDocument();
  });

  it("keeps factual run evidence accessible and policy-neutral", () => {
    render(
      createElement(RunOutcomeFormFields, {
        current: null,
        projectId,
        runId: "04877823-b6d4-4b1d-bde2-91bd4f18f3dc",
        state: {
          status: "error",
          message: "Check the highlighted fields and try again.",
          fieldErrors: {
            implementationUnit: ["Add a unit for this amount"],
            remainingObservedAt: ["Add the observation time"],
          },
          values: {
            runOutcome: "PARTIAL",
            validationResult: "INCONCLUSIVE",
            implementationAmount: "12.5",
            remainingAmount: "48",
          },
        },
      }),
    );

    expect(screen.getByRole("combobox", { name: "Run outcome" })).toHaveValue(
      "PARTIAL",
    );
    expect(
      screen.getByRole("combobox", { name: "Validation result" }),
    ).toHaveValue("INCONCLUSIVE");
    expect(
      document.getElementById("implementationUnit"),
    ).toHaveAccessibleDescription("Add a unit for this amount");
    expect(
      screen.getByRole("textbox", { name: "Observation time" }),
    ).toHaveAccessibleDescription(
      /ISO date-time with offset.*Add the observation time/,
    );
    expect(
      screen.getByRole("textbox", { name: "Deferred work" }),
    ).toBeVisible();
    expect(
      screen.getByRole("textbox", { name: "Unexpected failures" }),
    ).toBeVisible();
    expect(
      screen.queryByText(/PROCEED|NARROW|STOP \/ PRESERVE/),
    ).not.toBeInTheDocument();
  });
});
