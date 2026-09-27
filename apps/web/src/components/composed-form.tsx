"use client";
import { useState, useRef, type FormEvent } from "react";
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
  return (
    <label htmlFor={name}>
      {label}
      <input
        id={name}
        name={name}
        required={required}
        placeholder={placeholder}
      />
    </label>
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
  return (
    <div>
      <label htmlFor={name}>{label}</label>
      <select id={name} name={name} defaultValue="" required={required}>
        <option value="">Choose explicitly</option>
        {options.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
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
            throw new Error(
              `Bucket ${index + 1}: confirmed reset/post-reset fields require CONFIRMED evidence; no entered evidence was silently discarded.`,
            );
          if (
            (resetKind === "NONE" || resetKind === "CONFIRMED") &&
            get(`${prefix}.reset.notes`)
          )
            throw new Error(
              `Bucket ${index + 1}: notes belong to UNCERTAIN/ROLLING reset evidence. Clear them or select the matching evidence kind.`,
            );
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
        knownCapacityActivities: JSON.parse(get("activities")),
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
    <form onSubmit={submit} className="preflight-form" noValidate>
      <CsrfField />
      <h1>Complete capacity preflight</h1>
      <PlanningDisclosure />
      <p>
        Legacy draft values below are manual structural evidence. Confirm them
        explicitly in review. No legacy amount, unit, reset or reserve is
        converted into bucket evidence.
      </p>
      <div
        ref={errorSummary}
        tabIndex={-1}
        role={errors.length ? "alert" : undefined}
      >
        {errors.length ? (
          <>
            <h2>Check the submitted fields</h2>
            <ul>
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
      <TextField
        name="repositoryReference"
        label="Repository / scope reference"
      />
      <label htmlFor="composed-title">
        Reviewed tranche title
        <input
          id="composed-title"
          name="title"
          defaultValue={draft.tranche.title}
          required
        />
      </label>
      <label htmlFor="composed-brief">
        Reviewed brief
        <textarea
          id="composed-brief"
          name="brief"
          defaultValue={draft.tranche.brief}
          required
        />
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
          defaultValue={draft.tranche.acceptanceCriteria.join("\n")}
          required
        />
      </label>
      <section aria-labelledby="items-heading">
        <h2 id="items-heading">Reviewed work items</h2>
        {items.map((index, position) => (
          <fieldset key={index}>
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
        <h2 id="buckets-heading">Independent required capacity buckets</h2>
        {buckets.map((index, position) => {
          const prefix = `bucket.${index}`;
          return (
            <fieldset key={index}>
              <legend>Required bucket {position + 1}</legend>
              {[
                ["bucketId", "Bucket ID"],
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
                Post-reset capacity is optional and is never assumed full. Other
                kinds use only optional notes.
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
              {["correction", "validation"].map((kind) => (
                <div key={kind}>
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
              {buckets.length > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setBuckets(buckets.filter((value) => value !== index))
                  }
                >
                  Remove required bucket {position + 1}
                </button>
              ) : null}
            </fieldset>
          );
        })}
        <button
          type="button"
          onClick={() => setBuckets([...buckets, nextBucket.current++])}
        >
          Add required bucket
        </button>
      </section>
      <label htmlFor="composed-activities">
        Known capacity activities (JSON array)
        <textarea
          id="composed-activities"
          name="activities"
          defaultValue="[]"
        />
        <small>
          [] means no known records, not proof that no external activity
          occurred. Each event needs eventId, occurredAt, affectedBucketIds and
          factual source.
        </small>
      </label>
      <label htmlFor="composed-stops">
        Active mandatory stop IDs (one per line)
        <textarea id="composed-stops" name="stops" />
      </label>
      <fieldset>
        <legend>Is this explicitly the minimum coherent scope?</legend>
        <label>
          <input type="radio" name="minimum" value="yes" />
          Yes
        </label>
        <label>
          <input type="radio" name="minimum" value="no" />
          No
        </label>
        <p>
          No answer is preselected. This attestation is separate from confirming
          required bucket membership.
        </p>
      </fieldset>
      <button disabled={pending} type="submit">
        {pending ? "Preparing review…" : "Review frozen inputs"}
      </button>
    </form>
  );
}
