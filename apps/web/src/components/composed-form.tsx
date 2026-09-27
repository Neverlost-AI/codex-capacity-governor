"use client";
import {
  createContext,
  useContext,
  useState,
  useRef,
  type FormEvent,
} from "react";
import {
  forecastWorkCategorySchema,
  forecastComplexitySchema,
  forecastContextSchema,
  forecastRepositorySchema,
  forecastDependencySchema,
  forecastValidationSchema,
  forecastNoveltySchema,
  forecastCorrectionSchema,
  policyCapacityUnitSchema,
  composedInputSchema,
  type PreflightDraft,
} from "@capacity-governor/contracts";
import { CsrfField } from "./local-session";
import { PlanningDisclosure } from "./planning-disclosure";
import { readableValue } from "./preflight-presentation";

const FieldErrors = createContext<Record<string, string>>({});
const fieldMessage = (message: string) =>
  message.startsWith("Invalid option") ||
  message.startsWith("Invalid discriminator")
    ? "Choose a value explicitly."
    : message === "Invalid ISO datetime"
      ? "Enter an ISO date and time with an explicit offset, for example 2026-09-27T12:00:00Z."
      : message.includes("expected boolean")
        ? "Explicitly answer Yes or No."
        : message.startsWith("INPUT_")
          ? readableValue(message)
          : message;
function FieldError({ name }: { name: string }) {
  const error = useContext(FieldErrors)[name];
  return error ? (
    <small id={`${name}-error`} className="field-error">
      {error}
    </small>
  ) : null;
}

const factors = [
  ["category", "Work category", forecastWorkCategorySchema.options],
  ["complexity", "Complexity", forecastComplexitySchema.options],
  ["contextLoad", "Context load", forecastContextSchema.options],
  [
    "repositoryCondition",
    "Repository condition",
    forecastRepositorySchema.options,
  ],
  ["dependencyChange", "Dependency change", forecastDependencySchema.options],
  ["validationBurden", "Validation burden", forecastValidationSchema.options],
  ["novelty", "Novelty", forecastNoveltySchema.options],
  [
    "correctionExposure",
    "Correction exposure",
    forecastCorrectionSchema.options,
  ],
] as const;
const lines = (value: string) =>
  value.split(/\r?\n/).filter((line) => line.trim().length > 0);
function TextField({
  name,
  label,
  required = true,
  placeholder,
}: {
  name: string;
  label: string;
  required?: boolean;
  placeholder?: string;
}) {
  const error = useContext(FieldErrors)[name];
  return (
    <div className="field-group">
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        required={required}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
      />
      <FieldError name={name} />
    </div>
  );
}
function SelectField({
  name,
  label,
  options,
  required = true,
}: {
  name: string;
  label: string;
  options: readonly string[];
  required?: boolean;
}) {
  const error = useContext(FieldErrors)[name];
  return (
    <div className="field-group">
      <label htmlFor={name}>{label}</label>
      <select
        id={name}
        name={name}
        defaultValue=""
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
      >
        <option value="">Choose explicitly</option>
        {options.map((value) => (
          <option key={value} value={value}>
            {readableValue(value)}
          </option>
        ))}
      </select>
      <FieldError name={name} />
    </div>
  );
}
export function ComposedForm({
  projectId,
  draft,
}: {
  projectId: string;
  draft: PreflightDraft;
}) {
  const [items, setItems] = useState([0]);
  const [buckets, setBuckets] = useState([0]);
  const nextItem = useRef(1);
  const nextBucket = useRef(1);
  const [activities, setActivities] = useState<number[]>([]);
  const nextActivity = useRef(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const errorSummary = useRef<HTMLDivElement>(null);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const get = (name: string) => String(data.get(name) ?? "");
    const raw = (prefix: string) => ({
      amount: get(`${prefix}.amount`),
      unit: get(`${prefix}.unit`),
    });
    const reserve = (prefix: string) =>
      get(`${prefix}.amount`) || get(`${prefix}.share`) || get(`${prefix}.unit`)
        ? {
            ...(get(`${prefix}.amount`) || get(`${prefix}.unit`)
              ? { manualMinimum: raw(prefix) }
              : {}),
            ...(get(`${prefix}.share`)
              ? { targetShareBasisPoints: Number(get(`${prefix}.share`)) }
              : {}),
          }
        : undefined;
    setPending(true);
    try {
      const input = composedInputSchema.parse({
        projectId,
        preflightDraftId: draft.id,
        repositoryReference: get("repositoryReference"),
        title: get("title"),
        brief: get("brief"),
        explicitExclusions: lines(get("exclusions")),
        acceptanceCriteria: lines(get("criteria")),
        workItems: items.map((index) => ({
          workItemId: get(`item.${index}.workItemId`),
          label: get(`item.${index}.label`),
          ...Object.fromEntries(
            factors.map(([key]) => [key, get(`item.${index}.${key}`)]),
          ),
        })),
        buckets: buckets.map((index) => {
          const prefix = `bucket.${index}`;
          const resetKind = get(`${prefix}.reset.kind`);
          if (
            resetKind !== "CONFIRMED" &&
            [
              "reset.resetsAt",
              "reset.sourceTimezone",
              "reset.normalizedUtc",
              "post.amount",
              "post.unit",
            ].some((field) => get(`${prefix}.${field}`))
          )
            throw {
              issues: [
                {
                  path: ["buckets", buckets.indexOf(index), "reset", "kind"],
                  message:
                    "Entered reset/post-reset fields require confirmed reset evidence. Nothing entered was discarded.",
                },
              ],
            };
          if (
            (resetKind === "NONE" || resetKind === "CONFIRMED") &&
            get(`${prefix}.reset.notes`)
          )
            throw {
              issues: [
                {
                  path: ["buckets", buckets.indexOf(index), "reset", "notes"],
                  message:
                    "Notes belong to uncertain or rolling reset evidence. Clear them or select the matching kind.",
                },
              ],
            };
          return {
            bucketId: get(`${prefix}.bucketId`),
            providerId: get(`${prefix}.providerId`),
            capacityWindowId: get(`${prefix}.capacityWindowId`),
            resetCycleId: get(`${prefix}.resetCycleId`),
            availableCapacity: raw(`${prefix}.available`),
            observedAt: get(`${prefix}.observedAt`),
            reset:
              resetKind === "CONFIRMED"
                ? {
                    kind: resetKind,
                    resetsAt: get(`${prefix}.reset.resetsAt`),
                    sourceTimezone: get(`${prefix}.reset.sourceTimezone`),
                    normalizedUtc: get(`${prefix}.reset.normalizedUtc`),
                    ...(get(`${prefix}.post.amount`) ||
                    get(`${prefix}.post.unit`)
                      ? { expectedPostResetAvailability: raw(`${prefix}.post`) }
                      : {}),
                  }
                : {
                    kind: resetKind,
                    ...(get(`${prefix}.reset.notes`) && resetKind !== "NONE"
                      ? { notes: get(`${prefix}.reset.notes`) }
                      : {}),
                  },
            correctionReserve: reserve(`${prefix}.correction`),
            validationReserve: reserve(`${prefix}.validation`),
            profile: {
              status: get(`${prefix}.profile.status`),
              evidenceReference: get(`${prefix}.profile.evidenceReference`),
            },
          };
        }),
        minimumCoherentScope:
          get("minimum") === "yes"
            ? true
            : get("minimum") === "no"
              ? false
              : undefined,
        knownCapacityActivities: activities.map((index) => ({
          eventId: get(`activity.${index}.eventId`),
          occurredAt: get(`activity.${index}.occurredAt`),
          affectedBucketIds: lines(get(`activity.${index}.affectedBucketIds`)),
          source: get(`activity.${index}.source`),
        })),
        activeMandatoryStopIds: lines(get("stops")),
      });
      const response = await fetch("/preflight/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, csrf: get("csrf") }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error ??
            "Review could not be prepared. Your entered inputs remain here.",
        );
      window.location.assign(result.reviewUrl);
    } catch (error) {
      const mapped: Record<string, string> = {};
      if (error && typeof error === "object" && "issues" in error) {
        for (const issue of error.issues as {
          path: PropertyKey[];
          message: string;
        }[]) {
          const [group, position, ...rest] = issue.path;
          if (
            position === undefined &&
            (group === "knownCapacityActivities" ||
              group === "workItems" ||
              group === "buckets")
          ) {
            const indices =
              group === "knownCapacityActivities"
                ? activities
                : group === "workItems"
                  ? items
                  : buckets;
            for (const index of indices)
              mapped[
                `${group === "knownCapacityActivities" ? "activity" : group === "workItems" ? "item" : "bucket"}.${index}.${group === "knownCapacityActivities" ? "affectedBucketIds" : group === "workItems" ? "workItemId" : "bucketId"}`
              ] = fieldMessage(issue.message);
            continue;
          }
          const name =
            group === "workItems"
              ? `item.${items[Number(position)]}.${rest.join(".")}`
              : group === "buckets"
                ? `bucket.${buckets[Number(position)]}.${rest.join(".").replace("availableCapacity", "available").replace("reset.expectedPostResetAvailability", "post").replace("correctionReserve.manualMinimum", "correction").replace("validationReserve.manualMinimum", "validation").replace("correctionReserve", "correction").replace("validationReserve", "validation").replace("targetShareBasisPoints", "share")}`
                : group === "knownCapacityActivities"
                  ? `activity.${activities[Number(position)]}.${String(rest[0])}`
                  : group === "minimumCoherentScope"
                    ? "minimum"
                    : String(group);
          mapped[name] = fieldMessage(issue.message);
        }
      }
      setFieldErrors(mapped);
      setErrors(
        error && typeof error === "object" && "issues" in error
          ? (error.issues as { path: PropertyKey[]; message: string }[]).map(
              (issue) => `${issue.path.join(".")}: ${issue.message}`,
            )
          : [error instanceof Error ? error.message : "Check inputs and retry"],
      );
      requestAnimationFrame(() => errorSummary.current?.focus());
      setPending(false);
    }
  };
  return (
    <FieldErrors.Provider value={fieldErrors}>
      <form
        onSubmit={submit}
        className="preflight-form composed-form"
        noValidate
      >
        <CsrfField />
        <h1>Complete capacity preflight</h1>
        <PlanningDisclosure />
        <p>
          Legacy draft values below are manual structural evidence. Confirm them
          explicitly in review. No legacy amount, unit, reset or reserve is
          converted into window evidence.
        </p>
        <div
          ref={errorSummary}
          tabIndex={-1}
          role={errors.length ? "alert" : undefined}
        >
          {errors.length ? (
            <>
              <h2>Check the submitted fields</h2>
              {Object.keys(fieldErrors).length ? (
                <ul>
                  {Object.entries(fieldErrors).map(([name, message]) => (
                    <li key={name}>
                      <a
                        href={`#${name === "minimum" ? "minimum-yes" : name === "title" ? "composed-title" : name === "brief" ? "composed-brief" : name === "acceptanceCriteria" ? "composed-criteria" : name}`}
                      >
                        {name.replaceAll(".", " · ").replace(/([A-Z])/g, " $1")}
                        : {message}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>{errors[0]}</p>
              )}
              <details>
                <summary>Technical validation details</summary>
                <ul>
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </details>
            </>
          ) : null}
        </div>
        <section
          className="form-section"
          aria-labelledby="work-description-heading"
        >
          <h2 id="work-description-heading">Work description</h2>
          <p className="field-hint">
            Describe the bounded work, what is excluded, and what completion
            requires.
          </p>
          <TextField
            name="repositoryReference"
            label="Repository / scope reference"
          />
          <label htmlFor="composed-title">
            Reviewed tranche title
            <input
              id="composed-title"
              name="title"
              aria-invalid={Boolean(fieldErrors.title)}
              aria-describedby={fieldErrors.title ? "title-error" : undefined}
              defaultValue={draft.tranche.title}
              required
            />
            <FieldError name="title" />
          </label>
          <label htmlFor="composed-brief">
            Reviewed brief
            <textarea
              id="composed-brief"
              name="brief"
              aria-invalid={Boolean(fieldErrors.brief)}
              aria-describedby={fieldErrors.brief ? "brief-error" : undefined}
              defaultValue={draft.tranche.brief}
              required
            />
            <FieldError name="brief" />
          </label>
          <label htmlFor="composed-exclusions">
            Reviewed exclusions (one per line)
            <textarea
              id="composed-exclusions"
              name="exclusions"
              defaultValue={draft.tranche.explicitExclusions.join("\n")}
            />
          </label>
          <label htmlFor="composed-criteria">
            Reviewed acceptance criteria (one per line)
            <textarea
              id="composed-criteria"
              name="criteria"
              aria-invalid={Boolean(fieldErrors.acceptanceCriteria)}
              aria-describedby={
                fieldErrors.acceptanceCriteria ? "criteria-error" : undefined
              }
              defaultValue={draft.tranche.acceptanceCriteria.join("\n")}
              required
            />
            {fieldErrors.acceptanceCriteria ? (
              <small className="field-error" id="criteria-error">
                {fieldErrors.acceptanceCriteria}
              </small>
            ) : null}
          </label>
        </section>
        <section aria-labelledby="items-heading">
          <h2 id="items-heading">Reviewed work items</h2>
          {items.map((index, position) => (
            <fieldset key={index} className="input-grid">
              <legend>Work item {position + 1}</legend>
              <TextField
                name={`item.${index}.workItemId`}
                label={`Work item ${position + 1} ID`}
              />
              <TextField
                name={`item.${index}.label`}
                label={`Work item ${position + 1} label`}
              />
              {factors.map(([key, label, options]) => (
                <SelectField
                  key={key}
                  name={`item.${index}.${key}`}
                  label={`${label} ${position + 1}`}
                  options={options}
                />
              ))}
              {items.length > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setItems(items.filter((value) => value !== index))
                  }
                >
                  Remove work item {position + 1}
                </button>
              ) : null}
            </fieldset>
          ))}
          <button
            type="button"
            onClick={() => setItems([...items, nextItem.current++])}
          >
            Add work item
          </button>
        </section>
        <section aria-labelledby="buckets-heading">
          <h2 id="buckets-heading">Independent required capacity windows</h2>
          <p className="field-hint">
            Enter each required window independently. Use a factual identity and
            profile reference; nothing is inferred. Observation and reset times
            need an explicit ISO offset. Keep your selected units unchanged.
          </p>
          {buckets.map((index, position) => {
            const prefix = `bucket.${index}`;
            return (
              <fieldset key={index} className="input-grid">
                <legend>Required window {position + 1}</legend>
                {[
                  ["bucketId", "Window evidence ID"],
                  ["providerId", "Provider ID"],
                  ["capacityWindowId", "Capacity window ID"],
                  ["resetCycleId", "Reset cycle ID"],
                  ["observedAt", "Observation time (explicit offset)"],
                ].map(([key, label]) => (
                  <TextField
                    key={key}
                    name={`${prefix}.${key}`}
                    label={`${label} ${position + 1}`}
                  />
                ))}
                <TextField
                  name={`${prefix}.available.amount`}
                  label={`Available exact decimal amount ${position + 1}`}
                />
                <SelectField
                  name={`${prefix}.available.unit`}
                  label={`Available unit ${position + 1}`}
                  options={policyCapacityUnitSchema.options}
                />
                <SelectField
                  name={`${prefix}.profile.status`}
                  label={`Forecast profile evidence status ${position + 1}`}
                  options={["COMPLETE", "ACCEPTED_INCOMPLETE"]}
                />
                <TextField
                  name={`${prefix}.profile.evidenceReference`}
                  label={`Forecast profile evidence reference ${position + 1}`}
                />
                <SelectField
                  name={`${prefix}.reset.kind`}
                  label={`Reset evidence kind ${position + 1}`}
                  options={["NONE", "UNCERTAIN", "ROLLING", "CONFIRMED"]}
                />
                <p>
                  For CONFIRMED reset, enter all three factual fields below.
                  Post-reset capacity is optional and is never assumed full.
                  Other kinds use only optional notes.
                </p>
                <TextField
                  name={`${prefix}.reset.resetsAt`}
                  label={`Reset time (explicit offset) ${position + 1}`}
                  required={false}
                />
                <TextField
                  name={`${prefix}.reset.sourceTimezone`}
                  label={`Reset source timezone text ${position + 1}`}
                  required={false}
                />
                <TextField
                  name={`${prefix}.reset.normalizedUtc`}
                  label={`Normalized UTC reset time ${position + 1}`}
                  required={false}
                />
                <TextField
                  name={`${prefix}.reset.notes`}
                  label={`Reset notes ${position + 1}`}
                  required={false}
                />
                <TextField
                  name={`${prefix}.post.amount`}
                  label={`Post-reset exact decimal amount ${position + 1}`}
                  required={false}
                />
                <SelectField
                  name={`${prefix}.post.unit`}
                  label={`Post-reset unit ${position + 1}`}
                  options={policyCapacityUnitSchema.options}
                  required={false}
                />
                <details className="full-width">
                  <summary>Optional reserves for window {position + 1}</summary>
                  <p>
                    Leave blank to retain the configured reserve floors. Manual
                    minimums and larger target shares never reduce protection.
                    Target shares use basis points of available capacity (1,500
                    bp = 15%).
                  </p>
                  <div className="input-grid">
                    {["correction", "validation"].map((kind) => (
                      <div key={kind} className="field-group">
                        <h3>
                          Optional {kind} reserve {position + 1}
                        </h3>
                        <TextField
                          name={`${prefix}.${kind}.amount`}
                          label={`${kind} minimum exact decimal ${position + 1}`}
                          required={false}
                        />
                        <SelectField
                          name={`${prefix}.${kind}.unit`}
                          label={`${kind} minimum unit ${position + 1}`}
                          options={policyCapacityUnitSchema.options}
                          required={false}
                        />
                        <TextField
                          name={`${prefix}.${kind}.share`}
                          label={`${kind} target share basis points ${position + 1}`}
                          required={false}
                        />
                      </div>
                    ))}
                  </div>
                </details>
                {buckets.length > 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setBuckets(buckets.filter((value) => value !== index))
                    }
                  >
                    Remove capacity window {position + 1}
                  </button>
                ) : null}
              </fieldset>
            );
          })}
          <button
            type="button"
            onClick={() => setBuckets([...buckets, nextBucket.current++])}
          >
            Add capacity window
          </button>
        </section>
        <section aria-labelledby="activity-heading">
          <h2 id="activity-heading">Known capacity activity</h2>
          <p>
            No rows means no known records, not proof that no external activity
            occurred. Enter affected window IDs exactly; changing or removing a
            window never changes these references.
          </p>
          {activities.map((index, position) => (
            <fieldset key={index} className="input-grid">
              <legend>Activity {position + 1}</legend>
              <TextField
                name={`activity.${index}.eventId`}
                label={`Activity identity ${position + 1}`}
              />
              <TextField
                name={`activity.${index}.occurredAt`}
                label={`Activity time (explicit offset) ${position + 1}`}
              />
              <TextField
                name={`activity.${index}.source`}
                label={`Activity factual source ${position + 1}`}
              />
              <div className="field-group">
                <label htmlFor={`activity.${index}.affectedBucketIds`}>
                  Affected window evidence IDs (one per line) {position + 1}
                </label>
                <textarea
                  id={`activity.${index}.affectedBucketIds`}
                  name={`activity.${index}.affectedBucketIds`}
                  aria-invalid={Boolean(
                    fieldErrors[`activity.${index}.affectedBucketIds`],
                  )}
                  aria-describedby={
                    fieldErrors[`activity.${index}.affectedBucketIds`]
                      ? `activity.${index}.affectedBucketIds-error`
                      : undefined
                  }
                />
                <FieldError name={`activity.${index}.affectedBucketIds`} />
              </div>
              <button
                type="button"
                onClick={() =>
                  setActivities((current) =>
                    current.filter((value) => value !== index),
                  )
                }
              >
                Remove activity {position + 1}
              </button>
            </fieldset>
          ))}
          <button
            type="button"
            onClick={() => {
              const index = nextActivity.current++;
              setActivities((current) => [...current, index]);
            }}
          >
            Add capacity activity
          </button>
        </section>
        <section
          aria-labelledby="confirmation-heading"
          className="form-section"
        >
          <h2 id="confirmation-heading">Scope confirmation and stops</h2>
          <label htmlFor="composed-stops">
            Active mandatory stop IDs (one per line)
            <textarea id="composed-stops" name="stops" />
          </label>
          <fieldset>
            <legend>Is this explicitly the minimum coherent scope?</legend>
            <label>
              <input
                type="radio"
                id="minimum-yes"
                name="minimum"
                value="yes"
                aria-describedby={
                  fieldErrors.minimum ? "minimum-error" : undefined
                }
              />
              Yes
            </label>
            <label>
              <input
                type="radio"
                name="minimum"
                value="no"
                aria-describedby={
                  fieldErrors.minimum ? "minimum-error" : undefined
                }
              />
              No
            </label>
            <p>
              No answer is preselected. This attestation is separate from
              confirming required window membership.
            </p>
          </fieldset>
          <FieldError name="minimum" />
        </section>
        <button disabled={pending} type="submit">
          {pending ? "Preparing review…" : "Review frozen inputs"}
        </button>
      </form>
    </FieldErrors.Provider>
  );
}
