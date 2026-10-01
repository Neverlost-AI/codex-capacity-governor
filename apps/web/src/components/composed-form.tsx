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
} from "@capacity-governor/contracts";
import { CsrfField } from "./local-session";
import { PlanningDisclosure } from "./planning-disclosure";
import { readableValue } from "./preflight-presentation";

const FieldErrors = createContext<Record<string, string>>({});
const fieldMessage = (message: string) =>
  message.startsWith("Invalid option") ||
  message.startsWith("Invalid discriminator")
    ? "Choose a value explicitly."
    : message.startsWith("Too small")
      ? "Enter a value."
      : message.includes("expected boolean")
        ? "Explicitly answer Yes or No."
      : message.startsWith("Invalid input: expected")
        ? "Enter a valid value."
        : message === "Duplicate identity"
          ? "Use a different reference for each item or window."
          : message === "Unknown affected bucket"
            ? "This activity names a window that is not listed above."
            : message === "Invalid ISO datetime"
              ? "Enter an ISO date and time with an explicit offset, for example 2026-09-27T12:00:00Z."
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
  ["category", "Type of work", forecastWorkCategorySchema.options],
  ["complexity", "How difficult is it?", forecastComplexitySchema.options],
  ["contextLoad", "How much existing context is needed?", forecastContextSchema.options],
  [
    "repositoryCondition",
    "State of the codebase",
    forecastRepositorySchema.options,
  ],
  ["dependencyChange", "Package changes", forecastDependencySchema.options],
  ["validationBurden", "How much checking is needed?", forecastValidationSchema.options],
  ["novelty", "How unfamiliar is the approach?", forecastNoveltySchema.options],
  [
    "correctionExposure",
    "How likely are later fixes?",
    forecastCorrectionSchema.options,
  ],
] as const;
const lines = (value: string) =>
  value.split(/\r?\n/).filter((line) => line.trim().length > 0);
const workError = (name: string) =>
  ["repositoryReference", "title", "brief", "acceptanceCriteria", "minimum", "workItems", "activeMandatoryStopIds"].includes(name) ||
  name.startsWith("item.");
const errorLabel = (name: string) => {
  if (name === "workItems") return "Work item references";
  if (name === "buckets") return "Required window references";
  if (name === "knownCapacityActivities") return "Known capacity activity";
  if (name === "activeMandatoryStopIds") return "Required stop references";
  if (name === "minimum") return "Smallest complete scope";
  if (name === "acceptanceCriteria") return "What must be true when the work is done";
  const parts = name.split(".");
  if (parts[0] === "item")
    return `Work item ${Number(parts[1]) + 1}: ${parts.slice(2).join(" ").replace(/([A-Z])/g, " $1")}`;
  if (parts[0] === "bucket")
    return `Window ${Number(parts[1]) + 1}: ${parts.slice(2).join(" ").replace(/([A-Z])/g, " $1")}`;
  if (parts[0] === "activity")
    return `Activity ${Number(parts[1]) + 1}: ${parts.slice(2).join(" ").replace(/([A-Z])/g, " $1")}`;
  return name.replace(/([A-Z])/g, " $1");
};
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
export function ComposedForm({ projectId }: { projectId: string }) {
  const [step, setStep] = useState<"work" | "capacity">("work");
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
      if (Object.keys(mapped).some(workError)) setStep("work");
      else setStep("capacity");
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
        <h1>New capacity preflight</h1>
        <nav aria-label="Preflight steps">
          <ol className="preflight-steps">
            <li aria-current={step === "work" ? "step" : undefined}>1. Work</li>
            <li aria-current={step === "capacity" ? "step" : undefined}>
              2. Capacity
            </li>
            <li>3. Review</li>
          </ol>
        </nav>
        <PlanningDisclosure />
        <p>
          Describe the work once, enter each required capacity window, then
          confirm the exact snapshot on Review.
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
                        href={`#${name === "minimum" ? "minimum-yes" : name === "title" ? "composed-title" : name === "brief" ? "composed-brief" : name === "acceptanceCriteria" ? "composed-criteria" : name === "activeMandatoryStopIds" ? "composed-stops" : name}`}
                        onClick={() => setStep(workError(name) ? "work" : "capacity")}
                      >
                        {errorLabel(name)}
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
        <div hidden={step !== "work"}>
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
            label="Repository or scope reference"
          />
          <label htmlFor="composed-title">
            Work title
            <input
              id="composed-title"
              name="title"
              aria-invalid={Boolean(fieldErrors.title)}
              aria-describedby={fieldErrors.title ? "title-error" : undefined}

              required
            />
            <FieldError name="title" />
          </label>
          <label htmlFor="composed-brief">
            What work will be done?
            <textarea
              id="composed-brief"
              name="brief"
              aria-invalid={Boolean(fieldErrors.brief)}
              aria-describedby={fieldErrors.brief ? "brief-error" : undefined}

              required
            />
            <FieldError name="brief" />
          </label>
          <label htmlFor="composed-exclusions">
            What is out of scope? (one per line)
            <textarea
              id="composed-exclusions"
              name="exclusions"

            />
          </label>
          <label htmlFor="composed-criteria">
            What must be true when the work is done? (one per line)
            <textarea
              id="composed-criteria"
              name="criteria"
              aria-invalid={Boolean(fieldErrors.acceptanceCriteria)}
              aria-describedby={
                fieldErrors.acceptanceCriteria ? "criteria-error" : undefined
              }

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
          <h2 id="items-heading">Work to estimate</h2>
          <p>Describe each distinct part of the work. Open the details to choose every planning factor, including Unknown where you cannot confirm it.</p>
          {items.map((index, position) => (
            <fieldset key={index} className="input-grid">
              <legend>Work item {position + 1}</legend>
              <TextField
                name={`item.${index}.workItemId`}
                label={`Work item ${position + 1} reference`}
              />
              <TextField
                name={`item.${index}.label`}
                label={`Work item ${position + 1} description`}
              />
              <details className="full-width" open={errors.length > 0 && step === "work" ? true : undefined}><summary>Planning details for work item {position + 1} — choose each value</summary><div className="input-grid">
              {factors.map(([key, label, options]) => (
                <SelectField
                  key={key}
                  name={`item.${index}.${key}`}
                  label={`${label} ${position + 1}`}
                  options={options}
                />
              ))}
              </div></details>
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
        <section className="form-section" aria-labelledby="scope-heading"><h2 id="scope-heading">Scope and stops</h2><label htmlFor="composed-stops">Active mandatory stop IDs, if any (one per line)<textarea id="composed-stops" name="stops" aria-invalid={Boolean(fieldErrors.activeMandatoryStopIds)} aria-describedby={fieldErrors.activeMandatoryStopIds ? "activeMandatoryStopIds-error" : undefined} /></label><FieldError name="activeMandatoryStopIds" /><fieldset><legend>Is this the smallest complete scope for this work?</legend><label><input type="radio" id="minimum-yes" name="minimum" value="yes" />Yes</label><label><input type="radio" name="minimum" value="no" />No</label><p>Choose explicitly. This is separate from confirming the required windows.</p></fieldset><FieldError name="minimum" /></section>
        <button type="button" onClick={() => setStep("capacity")}>Continue to Capacity</button>
        </div>
        <div hidden={step !== "capacity"}>
        <section aria-labelledby="buckets-heading">
          <h2 id="buckets-heading">Required capacity windows</h2>
          <p className="field-hint">
            Enter every window that must govern this work. Copy each reading and its source exactly. Windows are independent; we never infer which ones are required.
          </p>
          {buckets.map((index, position) => {
            const prefix = `bucket.${index}`;
            return (
              <fieldset key={index} className="input-grid">
                <legend>Required window {position + 1}</legend>
                {[
                  ["bucketId", "Reading reference"],
                  ["providerId", "Provider"],
                  ["capacityWindowId", "Window"],
                  ["resetCycleId", "Reset cycle reference"],
                  ["observedAt", "When you saw this reading (with time offset)"],
                ].map(([key, label]) => (
                  <TextField
                    key={key}
                    name={`${prefix}.${key}`}
                    label={`${label} ${position + 1}`}
                  />
                ))}
                <TextField
                  name={`${prefix}.available.amount`}
                  label={`Available amount as shown ${position + 1}`}
                />
                <SelectField
                  name={`${prefix}.available.unit`}
                  label={`Unit shown ${position + 1}`}
                  options={policyCapacityUnitSchema.options}
                />
                <SelectField
                  name={`${prefix}.profile.status`}
                  label={`Planning profile evidence ${position + 1}`}
                  options={["COMPLETE", "ACCEPTED_INCOMPLETE"]}
                />
                <TextField
                  name={`${prefix}.profile.evidenceReference`}
                  label={`Planning profile source ${position + 1}`}
                />
                <details className="full-width" open={errors.length > 0 && step === "capacity" ? true : undefined}><summary>Reset and other evidence for window {position + 1}</summary><div className="input-grid">
                <SelectField
                  name={`${prefix}.reset.kind`}
                  label={`Reset information shown ${position + 1}`}
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
                </div></details>
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
        <details open={errors.length > 0 && step === "capacity" ? true : undefined}><summary>Known capacity activity (advanced)</summary>
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
        </details>
        <button type="button" onClick={() => setStep("work")}>Back to Work</button>
        <button disabled={pending} type="submit">
          {pending ? "Preparing review…" : "Continue to Review"}
        </button>
        </div>
      </form>
    </FieldErrors.Provider>
  );
}
