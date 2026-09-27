"use client";
import { CsrfField } from "./local-session";

import type { PreflightDraft } from "@capacity-governor/contracts";
import { DateTime } from "luxon";
import { useActionState } from "react";
import { savePreflightAction } from "../app/actions";
import { initialFormState, type FormActionState } from "../app/form-state";
import { FieldError, SubmitButton } from "./form-controls";

const lines = (values: string[] | undefined) => values?.join("\n") ?? "";

const localReset = (draft: PreflightDraft | null): string => {
  if (!draft?.reset.resetsAt) return "";
  return DateTime.fromISO(draft.reset.resetsAt)
    .setZone(draft.reset.timezone)
    .toFormat("yyyy-LL-dd'T'HH:mm");
};

export interface PreflightFormProps {
  projectId: string;
  draft: PreflightDraft | null;
  initialState?: FormActionState;
}

export const PreflightFormFields = ({
  projectId,
  draft,
  state,
}: PreflightFormProps & { state: FormActionState }) => {
  const value = (name: string, fallback = "") =>
    state.values?.[name] ?? fallback;
  const errors = state.fieldErrors ?? {};
  const describedBy = (name: string) =>
    errors[name] ? `${name}-error` : undefined;

  return (
    <>
      <input name="projectId" type="hidden" value={projectId} />
      {state.message ? (
        <div
          className={`notice ${state.status}`}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </div>
      ) : null}

      <section aria-labelledby="scope-heading" className="form-section">
        <div className="section-heading">
          <p className="eyebrow">Step 1</p>
          <h2 id="scope-heading">Bound the work</h2>
          <p>
            Describe one coherent development tranche. This draft does not
            generate a forecast.
          </p>
        </div>

        <div className="field">
          <label htmlFor="title">Tranche title</label>
          <input
            aria-describedby={describedBy("title")}
            aria-invalid={Boolean(errors.title)}
            defaultValue={value("title", draft?.tranche.title)}
            id="title"
            name="title"
            required
          />
          <FieldError errors={errors.title} id="title-error" />
        </div>
        <div className="field">
          <label htmlFor="brief">Tranche brief</label>
          <textarea
            aria-describedby={describedBy("brief")}
            aria-invalid={Boolean(errors.brief)}
            defaultValue={value("brief", draft?.tranche.brief)}
            id="brief"
            name="brief"
            required
            rows={7}
          />
          <FieldError errors={errors.brief} id="brief-error" />
        </div>
        <div className="two-column">
          <div className="field">
            <label htmlFor="explicitExclusions">
              Explicit exclusions <span>(one per line)</span>
            </label>
            <textarea
              defaultValue={value(
                "explicitExclusions",
                lines(draft?.tranche.explicitExclusions),
              )}
              id="explicitExclusions"
              name="explicitExclusions"
              rows={5}
            />
          </div>
          <div className="field">
            <label htmlFor="acceptanceCriteria">
              Acceptance criteria <span>(one per line)</span>
            </label>
            <textarea
              defaultValue={value(
                "acceptanceCriteria",
                lines(draft?.tranche.acceptanceCriteria),
              )}
              id="acceptanceCriteria"
              name="acceptanceCriteria"
              rows={5}
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="capacity-heading" className="form-section">
        <div className="section-heading">
          <p className="eyebrow">Step 2</p>
          <h2 id="capacity-heading">Record manual capacity</h2>
          <p>
            Store the amount and source unit exactly as entered. No conversion
            or affordability decision occurs.
          </p>
        </div>
        <div className="two-column compact">
          <div className="field">
            <label htmlFor="budgetAmount">Available amount</label>
            <input
              aria-describedby={describedBy("budgetAmount")}
              aria-invalid={Boolean(errors.budgetAmount)}
              defaultValue={value(
                "budgetAmount",
                draft?.availableBudget.amount.toString(),
              )}
              id="budgetAmount"
              inputMode="decimal"
              min="0"
              name="budgetAmount"
              required
              step="any"
              type="number"
            />
            <FieldError errors={errors.budgetAmount} id="budgetAmount-error" />
          </div>
          <div className="field">
            <label htmlFor="budgetUnit">Capacity unit</label>
            <input
              aria-describedby={describedBy("budgetUnit")}
              aria-invalid={Boolean(errors.budgetUnit)}
              defaultValue={value("budgetUnit", draft?.availableBudget.unit)}
              id="budgetUnit"
              name="budgetUnit"
              placeholder="e.g. credits or manual units"
              required
            />
            <FieldError errors={errors.budgetUnit} id="budgetUnit-error" />
          </div>
        </div>
      </section>

      <section aria-labelledby="reset-heading" className="form-section">
        <div className="section-heading">
          <p className="eyebrow">Step 3</p>
          <h2 id="reset-heading">Record reset context</h2>
          <p>
            Reset context is stored for later review; this tranche does not
            interpret defer behavior.
          </p>
        </div>
        <div className="two-column compact">
          <div className="field">
            <label htmlFor="resetAtLocal">
              Reset date and time <span>(optional)</span>
            </label>
            <input
              aria-describedby={describedBy("resetAtLocal")}
              aria-invalid={Boolean(errors.resetAtLocal)}
              defaultValue={value("resetAtLocal", localReset(draft))}
              id="resetAtLocal"
              name="resetAtLocal"
              type="datetime-local"
            />
            <FieldError errors={errors.resetAtLocal} id="resetAtLocal-error" />
          </div>
          <div className="field">
            <label htmlFor="resetTimezone">IANA timezone</label>
            <input
              aria-describedby={describedBy("resetTimezone")}
              aria-invalid={Boolean(errors.resetTimezone)}
              defaultValue={value(
                "resetTimezone",
                draft?.reset.timezone ?? "America/Denver",
              )}
              id="resetTimezone"
              name="resetTimezone"
              placeholder="America/Denver"
              required
            />
            <FieldError
              errors={errors.resetTimezone}
              id="resetTimezone-error"
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="resetNotes">
            Reset notes <span>(optional)</span>
          </label>
          <textarea
            defaultValue={value("resetNotes", draft?.reset.notes)}
            id="resetNotes"
            name="resetNotes"
            rows={3}
          />
        </div>
      </section>

      <section aria-labelledby="reserve-heading" className="form-section">
        <div className="section-heading">
          <p className="eyebrow">Step 4</p>
          <h2 id="reserve-heading">Record optional reserve preferences</h2>
          <p>
            Preferences are stored as input only. No reserve is calculated or
            recommended.
          </p>
        </div>
        <div className="reserve-grid">
          <fieldset>
            <legend>Correction / recovery preference</legend>
            <div className="field">
              <label htmlFor="correctionMinimumAmount">
                Minimum amount <span>(optional)</span>
              </label>
              <input
                aria-describedby={describedBy("correctionMinimumAmount")}
                aria-invalid={Boolean(errors.correctionMinimumAmount)}
                defaultValue={value(
                  "correctionMinimumAmount",
                  draft?.correctionReserve?.minimum?.amount.toString(),
                )}
                id="correctionMinimumAmount"
                min="0"
                name="correctionMinimumAmount"
                step="any"
                type="number"
              />
              <FieldError
                errors={errors.correctionMinimumAmount}
                id="correctionMinimumAmount-error"
              />
            </div>
            <div className="field">
              <label htmlFor="correctionMinimumUnit">
                Minimum unit <span>(optional)</span>
              </label>
              <input
                aria-describedby={describedBy("correctionMinimumUnit")}
                aria-invalid={Boolean(errors.correctionMinimumUnit)}
                defaultValue={value(
                  "correctionMinimumUnit",
                  draft?.correctionReserve?.minimum?.unit,
                )}
                id="correctionMinimumUnit"
                name="correctionMinimumUnit"
              />
              <FieldError
                errors={errors.correctionMinimumUnit}
                id="correctionMinimumUnit-error"
              />
            </div>
            <div className="field">
              <label htmlFor="correctionTargetShare">
                Target share, 0–1 <span>(optional)</span>
              </label>
              <input
                aria-describedby={describedBy("correctionTargetShare")}
                aria-invalid={Boolean(errors.correctionTargetShare)}
                defaultValue={value(
                  "correctionTargetShare",
                  draft?.correctionReserve?.targetShare?.toString(),
                )}
                id="correctionTargetShare"
                max="1"
                min="0"
                name="correctionTargetShare"
                step="0.01"
                type="number"
              />
              <FieldError
                errors={errors.correctionTargetShare}
                id="correctionTargetShare-error"
              />
            </div>
          </fieldset>
          <fieldset>
            <legend>Validation preference</legend>
            <div className="field">
              <label htmlFor="validationMinimumAmount">
                Minimum amount <span>(optional)</span>
              </label>
              <input
                aria-describedby={describedBy("validationMinimumAmount")}
                aria-invalid={Boolean(errors.validationMinimumAmount)}
                defaultValue={value(
                  "validationMinimumAmount",
                  draft?.validationReserve?.minimum?.amount.toString(),
                )}
                id="validationMinimumAmount"
                min="0"
                name="validationMinimumAmount"
                step="any"
                type="number"
              />
              <FieldError
                errors={errors.validationMinimumAmount}
                id="validationMinimumAmount-error"
              />
            </div>
            <div className="field">
              <label htmlFor="validationMinimumUnit">
                Minimum unit <span>(optional)</span>
              </label>
              <input
                aria-describedby={describedBy("validationMinimumUnit")}
                aria-invalid={Boolean(errors.validationMinimumUnit)}
                defaultValue={value(
                  "validationMinimumUnit",
                  draft?.validationReserve?.minimum?.unit,
                )}
                id="validationMinimumUnit"
                name="validationMinimumUnit"
              />
              <FieldError
                errors={errors.validationMinimumUnit}
                id="validationMinimumUnit-error"
              />
            </div>
            <div className="field">
              <label htmlFor="validationTargetShare">
                Target share, 0–1 <span>(optional)</span>
              </label>
              <input
                aria-describedby={describedBy("validationTargetShare")}
                aria-invalid={Boolean(errors.validationTargetShare)}
                defaultValue={value(
                  "validationTargetShare",
                  draft?.validationReserve?.targetShare?.toString(),
                )}
                id="validationTargetShare"
                max="1"
                min="0"
                name="validationTargetShare"
                step="0.01"
                type="number"
              />
              <FieldError
                errors={errors.validationTargetShare}
                id="validationTargetShare-error"
              />
            </div>
          </fieldset>
        </div>
      </section>

      <section aria-labelledby="notes-heading" className="form-section">
        <div className="section-heading">
          <p className="eyebrow">Step 5</p>
          <h2 id="notes-heading">Document context</h2>
        </div>
        <div className="two-column">
          <div className="field">
            <label htmlFor="assumptions">
              Assumptions <span>(one per line)</span>
            </label>
            <textarea
              defaultValue={value("assumptions", lines(draft?.assumptions))}
              id="assumptions"
              name="assumptions"
              rows={5}
            />
          </div>
          <div className="field">
            <label htmlFor="openQuestions">
              Open questions <span>(one per line)</span>
            </label>
            <textarea
              defaultValue={value("openQuestions", lines(draft?.openQuestions))}
              id="openQuestions"
              name="openQuestions"
              rows={5}
            />
          </div>
        </div>
      </section>
    </>
  );
};

export const PreflightForm = ({
  projectId,
  draft,
  initialState,
}: PreflightFormProps) => {
  const [state, action] = useActionState(
    savePreflightAction,
    initialState ?? initialFormState,
  );
  return (
    <form action={action} className="preflight-form" noValidate>
      <CsrfField />
      <PreflightFormFields draft={draft} projectId={projectId} state={state} />
      <div className="sticky-actions">
        <p>Draft only · no forecast or Governor decision</p>
        <SubmitButton>
          {draft ? "Save changes" : "Save preflight draft"}
        </SubmitButton>
      </div>
    </form>
  );
};
