"use client";
import { CsrfField } from "./local-session";

import type { OutcomeObservationWithConsumption } from "@capacity-governor/contracts";
import { useActionState } from "react";
import { amendRunOutcomeAction, recordRunOutcomeAction } from "../app/actions";
import { initialFormState, type FormActionState } from "../app/form-state";
import { FieldError, SubmitButton } from "./form-controls";

const valueFor = (
  state: FormActionState,
  key: string,
  fallback?: string,
): string => state.values?.[key] ?? fallback ?? "";

const consumptionValue = (
  current: OutcomeObservationWithConsumption | null,
  category: "IMPLEMENTATION" | "CORRECTION" | "VALIDATION" | "OTHER",
  field: "amount" | "unit",
): string => {
  const entry = current?.actualConsumption.find(
    (consumption) => consumption.category === category,
  );
  return entry ? String(entry[field]) : "";
};

const errorProps = (state: FormActionState, field: string) => ({
  "aria-describedby": state.fieldErrors?.[field] ? `${field}-error` : undefined,
  "aria-invalid": state.fieldErrors?.[field] ? (true as const) : undefined,
});

const CapacityFields = ({
  category,
  current,
  label,
  prefix,
  state,
}: {
  category: "IMPLEMENTATION" | "CORRECTION" | "VALIDATION" | "OTHER";
  current: OutcomeObservationWithConsumption | null;
  label: string;
  prefix: "implementation" | "correction" | "validation" | "other";
  state: FormActionState;
}) => {
  const amountName = `${prefix}Amount`;
  const unitName = `${prefix}Unit`;
  return (
    <fieldset className="capacity-entry">
      <legend>{label}</legend>
      <label htmlFor={amountName}>Amount</label>
      <input
        {...errorProps(state, amountName)}
        defaultValue={valueFor(
          state,
          amountName,
          consumptionValue(current, category, "amount"),
        )}
        id={amountName}
        min="0"
        name={amountName}
        step="any"
        type="number"
      />
      <FieldError
        errors={state.fieldErrors?.[amountName]}
        id={`${amountName}-error`}
      />
      <label htmlFor={unitName}>Source unit</label>
      <input
        {...errorProps(state, unitName)}
        defaultValue={valueFor(
          state,
          unitName,
          consumptionValue(current, category, "unit"),
        )}
        id={unitName}
        name={unitName}
        type="text"
      />
      <FieldError
        errors={state.fieldErrors?.[unitName]}
        id={`${unitName}-error`}
      />
    </fieldset>
  );
};

export const RunOutcomeFormFields = ({
  current,
  projectId,
  runId,
  state,
}: {
  current: OutcomeObservationWithConsumption | null;
  projectId: string;
  runId: string;
  state: FormActionState;
}) => {
  const observation = current?.observation;
  const remaining = observation?.remainingCapacity;
  return (
    <>
      <input name="projectId" type="hidden" value={projectId} />
      <input name="runId" type="hidden" value={runId} />
      {current ? (
        <input
          name="expectedCurrentObservationId"
          type="hidden"
          value={current.observation.id}
        />
      ) : null}

      {state.message ? (
        <p
          className={`notice ${state.status === "success" ? "success" : "error"}`}
          role={state.status === "success" ? "status" : "alert"}
        >
          {state.message}
        </p>
      ) : null}

      {current ? (
        <div className="field-group">
          <label htmlFor="amendmentReason">Amendment reason</label>
          <p className="field-hint" id="amendmentReason-hint">
            Required. This appends a new observation and preserves every earlier
            version.
          </p>
          <textarea
            {...errorProps(state, "amendmentReason")}
            aria-describedby={
              state.fieldErrors?.amendmentReason
                ? "amendmentReason-hint amendmentReason-error"
                : "amendmentReason-hint"
            }
            defaultValue={valueFor(state, "amendmentReason")}
            id="amendmentReason"
            name="amendmentReason"
            rows={2}
          />
          <FieldError
            errors={state.fieldErrors?.amendmentReason}
            id="amendmentReason-error"
          />
        </div>
      ) : null}

      <div className="two-column-fields">
        <div className="field-group">
          <label htmlFor="runOutcome">Run outcome</label>
          <p className="field-hint" id="runOutcome-hint">
            Select one factual result. The system does not derive or override
            it.
          </p>
          <select
            {...errorProps(state, "runOutcome")}
            aria-describedby={
              state.fieldErrors?.runOutcome
                ? "runOutcome-hint runOutcome-error"
                : "runOutcome-hint"
            }
            defaultValue={valueFor(
              state,
              "runOutcome",
              observation?.runOutcome ?? "COMPLETED",
            )}
            id="runOutcome"
            name="runOutcome"
          >
            <option value="COMPLETED">COMPLETED</option>
            <option value="PARTIAL">PARTIAL</option>
            <option value="FAILED">FAILED</option>
          </select>
          <FieldError
            errors={state.fieldErrors?.runOutcome}
            id="runOutcome-error"
          />
        </div>
        <div className="field-group">
          <label htmlFor="validationResult">Validation result</label>
          <p className="field-hint" id="validationResult-hint">
            Recorded independently from run outcome.
          </p>
          <select
            {...errorProps(state, "validationResult")}
            aria-describedby={
              state.fieldErrors?.validationResult
                ? "validationResult-hint validationResult-error"
                : "validationResult-hint"
            }
            defaultValue={valueFor(
              state,
              "validationResult",
              observation?.validationResult ?? "NOT_RUN",
            )}
            id="validationResult"
            name="validationResult"
          >
            <option value="NOT_RUN">NOT_RUN</option>
            <option value="PASSED">PASSED</option>
            <option value="PARTIAL">PARTIAL</option>
            <option value="FAILED">FAILED</option>
            <option value="INCONCLUSIVE">INCONCLUSIVE</option>
          </select>
          <FieldError
            errors={state.fieldErrors?.validationResult}
            id="validationResult-error"
          />
        </div>
      </div>

      <section aria-labelledby="consumption-heading" className="form-section">
        <div className="section-heading">
          <h3 id="consumption-heading">Manual actual consumption</h3>
          <p>
            Each category is optional and independent. Omitted values stay
            unknown; units are stored without conversion, totals, or policy
            math.
          </p>
        </div>
        <div className="capacity-grid">
          <CapacityFields
            category="IMPLEMENTATION"
            current={current}
            label="Implementation"
            prefix="implementation"
            state={state}
          />
          <CapacityFields
            category="CORRECTION"
            current={current}
            label="Correction"
            prefix="correction"
            state={state}
          />
          <CapacityFields
            category="VALIDATION"
            current={current}
            label="Validation"
            prefix="validation"
            state={state}
          />
          <CapacityFields
            category="OTHER"
            current={current}
            label="Other"
            prefix="other"
            state={state}
          />
        </div>
      </section>

      <section aria-labelledby="remaining-heading" className="form-section">
        <div className="section-heading">
          <h3 id="remaining-heading">Optional remaining-capacity snapshot</h3>
          <p>
            Manually observed evidence only. It is not derived from consumption
            or treated as a canonical Governor unit.
          </p>
        </div>
        <div className="three-column-fields">
          <div className="field-group">
            <label htmlFor="remainingAmount">Observed amount</label>
            <input
              {...errorProps(state, "remainingAmount")}
              defaultValue={valueFor(
                state,
                "remainingAmount",
                remaining ? String(remaining.amount) : "",
              )}
              id="remainingAmount"
              min="0"
              name="remainingAmount"
              step="any"
              type="number"
            />
            <FieldError
              errors={state.fieldErrors?.remainingAmount}
              id="remainingAmount-error"
            />
          </div>
          <div className="field-group">
            <label htmlFor="remainingUnit">Source unit</label>
            <input
              {...errorProps(state, "remainingUnit")}
              defaultValue={valueFor(state, "remainingUnit", remaining?.unit)}
              id="remainingUnit"
              name="remainingUnit"
              type="text"
            />
            <FieldError
              errors={state.fieldErrors?.remainingUnit}
              id="remainingUnit-error"
            />
          </div>
          <div className="field-group">
            <label htmlFor="remainingObservedAt">Observation time</label>
            <p className="field-hint" id="remainingObservedAt-hint">
              ISO date-time with offset, for example 2026-08-24T12:00:00-06:00.
            </p>
            <input
              {...errorProps(state, "remainingObservedAt")}
              aria-describedby={
                state.fieldErrors?.remainingObservedAt
                  ? "remainingObservedAt-hint remainingObservedAt-error"
                  : "remainingObservedAt-hint"
              }
              defaultValue={valueFor(
                state,
                "remainingObservedAt",
                remaining?.observedAt,
              )}
              id="remainingObservedAt"
              name="remainingObservedAt"
              type="text"
            />
            <FieldError
              errors={state.fieldErrors?.remainingObservedAt}
              id="remainingObservedAt-error"
            />
          </div>
        </div>
      </section>

      <div className="two-column-fields">
        <div className="field-group">
          <label htmlFor="unexpectedFailures">Unexpected failures</label>
          <p className="field-hint" id="unexpectedFailures-hint">
            One factual entry per line. Kept separate from deferred work.
          </p>
          <textarea
            aria-describedby="unexpectedFailures-hint"
            defaultValue={valueFor(
              state,
              "unexpectedFailures",
              observation?.unexpectedFailures.join("\n"),
            )}
            id="unexpectedFailures"
            name="unexpectedFailures"
            rows={4}
          />
        </div>
        <div className="field-group">
          <label htmlFor="deferredWork">Deferred work</label>
          <p className="field-hint" id="deferredWork-hint">
            One factual entry per line. A deferred item is not a failure.
          </p>
          <textarea
            aria-describedby="deferredWork-hint"
            defaultValue={valueFor(
              state,
              "deferredWork",
              observation?.deferredWork.join("\n"),
            )}
            id="deferredWork"
            name="deferredWork"
            rows={4}
          />
        </div>
      </div>

      <div className="field-group">
        <label htmlFor="notes">Factual notes</label>
        <p className="field-hint" id="notes-hint">
          Notes preserve evidence only and generate no policy semantics.
        </p>
        <textarea
          aria-describedby="notes-hint"
          defaultValue={valueFor(state, "notes", observation?.notes)}
          id="notes"
          name="notes"
          rows={4}
        />
      </div>
    </>
  );
};

export const RunOutcomeForm = ({
  current,
  projectId,
  runId,
}: {
  current: OutcomeObservationWithConsumption | null;
  projectId: string;
  runId: string;
}) => {
  const [state, action] = useActionState(
    current ? amendRunOutcomeAction : recordRunOutcomeAction,
    initialFormState,
  );
  return (
    <form action={action} className="preflight-form outcome-form">
      <CsrfField />
      <div className="section-heading">
        <p className="eyebrow">
          {current ? "Append-only correction" : "Initial factual observation"}
        </p>
        <h2>
          {current ? "Amend the recorded outcome" : "Record the run outcome"}
        </h2>
        <p>
          {current
            ? "Submitting creates a new full observation. It never replaces or deletes earlier evidence."
            : "Record only observed facts. No forecast or Governor decision is inferred."}
        </p>
      </div>
      <RunOutcomeFormFields
        current={current}
        projectId={projectId}
        runId={runId}
        state={state}
      />
      <SubmitButton>
        {current ? "Append amendment" : "Record outcome"}
      </SubmitButton>
    </form>
  );
};
