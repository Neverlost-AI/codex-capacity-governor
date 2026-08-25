import {
  policyEvaluationInputSchema,
  type KnownCapacityActivity,
  type PolicyBucketResult,
  type PolicyDecision,
  type PolicyEvaluation,
  type PolicyEvaluationInput,
  type PolicyEvaluationOutcome,
  type PolicyInputIssue,
  type PolicyOperatingMode,
  type PolicyPostResetResult,
  type PolicyRoundingEvidence,
  type PolicyRuleId,
  type PolicyStopId,
  type PolicyValidationId,
  type RequiredCapacityBucket,
} from "@capacity-governor/contracts";
import {
  ceilRatio,
  normalizeQuantity,
  PolicyNormalizationError,
} from "./exact";

interface ValidationIssueLike {
  code: string;
  message: string;
  path: PropertyKey[];
}

const uniqueSorted = <T extends string>(values: T[]): T[] =>
  [...new Set(values)].sort((left, right) => left.localeCompare(right));

const deepFreeze = <T>(value: T): T => {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }
  Object.freeze(value);
  for (const nested of Object.values(value)) {
    deepFreeze(nested);
  }
  return value;
};

const asPath = (path: PropertyKey[]): Array<string | number> =>
  path.map((part) => (typeof part === "symbol" ? part.toString() : part));

const validationIdFor = (issue: ValidationIssueLike): PolicyValidationId => {
  if (issue.code === "custom" && issue.message.startsWith("INPUT_")) {
    return issue.message as PolicyValidationId;
  }
  if (issue.code === "invalid_type") {
    return "INPUT_INVALID_TYPE";
  }
  if (issue.code === "invalid_format") {
    return "INPUT_INVALID_FORMAT";
  }
  if (issue.code === "unrecognized_keys") {
    return "INPUT_UNRECOGNIZED_KEY";
  }
  if (issue.code === "invalid_value" && issue.path.length === 0) {
    return "INPUT_REQUIRED";
  }
  return "INPUT_INVALID_VALUE";
};

const valueAtPath = (input: unknown, path: Array<string | number>): unknown => {
  let value = input;
  for (const part of path) {
    if (typeof value !== "object" || value === null) {
      return undefined;
    }
    value = (value as Record<string | number, unknown>)[part];
  }
  return value;
};

const scalarEvidence = (
  value: unknown,
): string | number | boolean | null | undefined => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  return undefined;
};

const bucketIdForPath = (
  input: unknown,
  path: Array<string | number>,
): string | undefined => {
  const bucketIndex =
    path[0] === "requiredCapacityBuckets" && typeof path[1] === "number"
      ? path[1]
      : undefined;
  if (
    bucketIndex === undefined ||
    typeof input !== "object" ||
    input === null
  ) {
    return undefined;
  }
  const buckets = (input as { requiredCapacityBuckets?: unknown })
    .requiredCapacityBuckets;
  if (!Array.isArray(buckets)) {
    return undefined;
  }
  const bucket = buckets[bucketIndex];
  if (typeof bucket !== "object" || bucket === null) {
    return undefined;
  }
  const bucketId = (bucket as { bucketId?: unknown }).bucketId;
  return typeof bucketId === "string" ? bucketId : undefined;
};

const rejectInput = (issues: PolicyInputIssue[]): PolicyEvaluationOutcome =>
  deepFreeze({
    kind: "INPUT_REJECTION",
    authorizesWork: false,
    issues: issues
      .map((issue) => ({ ...issue, path: [...issue.path] }))
      .sort((left, right) =>
        JSON.stringify(left.path).localeCompare(JSON.stringify(right.path)),
      ),
  });

const rejectZodIssues = (
  input: unknown,
  issues: ValidationIssueLike[],
): PolicyEvaluationOutcome =>
  rejectInput(
    issues.map((issue) => {
      const path = asPath(issue.path);
      const received = scalarEvidence(valueAtPath(input, path));
      return {
        validationId: validationIdFor(issue),
        path,
        bucketId: bucketIdForPath(input, path),
        ...(received === undefined ? {} : { received }),
      };
    }),
  );

interface NormalizedBucket {
  bucket: RequiredCapacityBucket;
  availableBasisPoints: number;
  demandBasisPoints: number;
  correctionMinimumBasisPoints: number;
  validationMinimumBasisPoints: number;
  postResetAvailableBasisPoints?: number;
  claimMismatch: boolean;
  roundingEvidence: PolicyRoundingEvidence[];
}

const normalizeBucket = (
  bucket: RequiredCapacityBucket,
  maximumBasisPoints: number,
): NormalizedBucket => {
  const available = normalizeQuantity(
    bucket.availableCapacity,
    "DOWN",
    `${bucket.bucketId}:available`,
    maximumBasisPoints,
  );
  const demand = normalizeQuantity(
    bucket.implementationDemand,
    "UP",
    `${bucket.bucketId}:demand`,
    maximumBasisPoints,
  );
  const correctionMinimum = bucket.correctionReserve?.manualMinimum
    ? normalizeQuantity(
        bucket.correctionReserve.manualMinimum,
        "UP",
        `${bucket.bucketId}:correction-minimum`,
        maximumBasisPoints,
      )
    : undefined;
  const validationMinimum = bucket.validationReserve?.manualMinimum
    ? normalizeQuantity(
        bucket.validationReserve.manualMinimum,
        "UP",
        `${bucket.bucketId}:validation-minimum`,
        maximumBasisPoints,
      )
    : undefined;
  const postReset =
    bucket.reset.kind === "CONFIRMED" &&
    bucket.reset.expectedPostResetAvailability
      ? normalizeQuantity(
          bucket.reset.expectedPostResetAvailability,
          "DOWN",
          `${bucket.bucketId}:post-reset-availability`,
          maximumBasisPoints,
        )
      : undefined;

  const quantities = [
    available,
    demand,
    correctionMinimum,
    validationMinimum,
    postReset,
  ].filter((quantity) => quantity !== undefined);

  return {
    bucket,
    availableBasisPoints: available.basisPoints,
    demandBasisPoints: demand.basisPoints,
    correctionMinimumBasisPoints: correctionMinimum?.basisPoints ?? 0,
    validationMinimumBasisPoints: validationMinimum?.basisPoints ?? 0,
    postResetAvailableBasisPoints: postReset?.basisPoints,
    claimMismatch: quantities.some((quantity) => !quantity.claimMatches),
    roundingEvidence: quantities.map((quantity) => quantity.evidence),
  };
};

const normalizedPathFor = (
  input: PolicyEvaluationInput,
  operation: string,
): Array<string | number> => {
  const [bucketId, field] = operation.split(":");
  const index = input.requiredCapacityBuckets.findIndex(
    (bucket) => bucket.bucketId === bucketId,
  );
  const fieldPath: Record<string, Array<string | number>> = {
    available: ["availableCapacity", "amount"],
    demand: ["implementationDemand", "amount"],
    "correction-minimum": ["correctionReserve", "manualMinimum", "amount"],
    "validation-minimum": ["validationReserve", "manualMinimum", "amount"],
    "post-reset-availability": [
      "reset",
      "expectedPostResetAvailability",
      "amount",
    ],
  };
  return ["requiredCapacityBuckets", index, ...(fieldPath[field] ?? [])];
};

const calculateReserve = (
  availableBasisPoints: number,
  minimumBasisPoints: number,
  targetShareBasisPoints: number | undefined,
  floorShareBasisPoints: number,
  denominator: number,
  operation: string,
): { amount: number; evidence: PolicyRoundingEvidence } => {
  const effectiveShare = Math.max(
    floorShareBasisPoints,
    targetShareBasisPoints ?? 0,
  );
  const share = ceilRatio(
    availableBasisPoints,
    effectiveShare,
    denominator,
    operation,
  );
  return {
    amount: Math.max(minimumBasisPoints, share.result),
    evidence: share.evidence,
  };
};

const modeFor = (
  availableBasisPoints: number,
  input: PolicyEvaluationInput,
): PolicyOperatingMode => {
  const configuration = input.configuration;
  if (availableBasisPoints >= configuration.fullModeMinimumBasisPoints) {
    return "FULL";
  }
  if (
    availableBasisPoints >= configuration.conservationModeMinimumBasisPoints
  ) {
    return "CONSERVATION";
  }
  if (availableBasisPoints >= configuration.lowModeMinimumBasisPoints) {
    return "LOW";
  }
  return "CRITICAL";
};

const modeRule = (mode: PolicyOperatingMode): PolicyRuleId =>
  ({
    FULL: "RULE_MODE_FULL",
    CONSERVATION: "RULE_MODE_CONSERVATION",
    LOW: "RULE_MODE_LOW",
    CRITICAL: "RULE_MODE_CRITICAL",
  })[mode] as PolicyRuleId;

const mostRestrictiveMode = (
  modes: PolicyOperatingMode[],
  order: readonly PolicyOperatingMode[],
): PolicyOperatingMode =>
  modes.reduce((left, right) =>
    order.indexOf(right) > order.indexOf(left) ? right : left,
  );

const mostRestrictiveDecision = (
  decisions: PolicyDecision[],
  order: readonly PolicyDecision[],
): PolicyDecision =>
  decisions.reduce((left, right) =>
    order.indexOf(right) > order.indexOf(left) ? right : left,
  );

const sortedActivities = (
  activities: KnownCapacityActivity[],
): KnownCapacityActivity[] =>
  activities
    .map((activity) => ({
      ...activity,
      affectedBucketIds: uniqueSorted(activity.affectedBucketIds),
    }))
    .sort((left, right) => left.eventId.localeCompare(right.eventId));

const copyReset = (
  reset: RequiredCapacityBucket["reset"],
): RequiredCapacityBucket["reset"] => {
  if (reset.kind !== "CONFIRMED") {
    return { ...reset };
  }
  return {
    ...reset,
    ...(reset.expectedPostResetAvailability
      ? {
          expectedPostResetAvailability: {
            ...reset.expectedPostResetAvailability,
          },
        }
      : {}),
  };
};

const computePostReset = (
  normalized: NormalizedBucket,
  adjustedDemandBasisPoints: number,
  input: PolicyEvaluationInput,
): PolicyPostResetResult | undefined => {
  if (normalized.postResetAvailableBasisPoints === undefined) {
    return undefined;
  }
  const bucket = normalized.bucket;
  const correction = calculateReserve(
    normalized.postResetAvailableBasisPoints,
    normalized.correctionMinimumBasisPoints,
    bucket.correctionReserve?.targetShareBasisPoints,
    input.configuration.correctionFloorShareBasisPoints,
    input.configuration.capacityBasisPointsPerCycle,
    `${bucket.bucketId}:post-reset-correction-reserve`,
  );
  const validation = calculateReserve(
    normalized.postResetAvailableBasisPoints,
    normalized.validationMinimumBasisPoints,
    bucket.validationReserve?.targetShareBasisPoints,
    input.configuration.validationFloorShareBasisPoints,
    input.configuration.capacityBasisPointsPerCycle,
    `${bucket.bucketId}:post-reset-validation-reserve`,
  );
  const implementation =
    normalized.postResetAvailableBasisPoints -
    correction.amount -
    validation.amount;
  return {
    availableBasisPoints: normalized.postResetAvailableBasisPoints,
    correctionReserveBasisPoints: correction.amount,
    validationReserveBasisPoints: validation.amount,
    implementationAllocationBasisPoints: implementation,
    sufficient:
      correction.amount + validation.amount <
        normalized.postResetAvailableBasisPoints &&
      adjustedDemandBasisPoints <= implementation,
    roundingEvidence: [correction.evidence, validation.evidence],
  };
};

const evaluateBucket = (
  normalized: NormalizedBucket,
  input: PolicyEvaluationInput,
  activities: KnownCapacityActivity[],
): PolicyBucketResult => {
  const { bucket } = normalized;
  const rules: PolicyRuleId[] = [
    "RULE_NORMALIZATION_EXACT_WHITELIST",
    "RULE_CORRECTION_RESERVE_PROTECTED",
    "RULE_VALIDATION_RESERVE_PROTECTED",
  ];
  const stops: PolicyStopId[] = [];
  const evaluationMilliseconds = Date.parse(input.evaluationTime);
  const observationMilliseconds = Date.parse(bucket.observedAt);

  if (normalized.claimMismatch) {
    stops.push("STOP_NORMALIZATION_CLAIM_MISMATCH");
  }
  if (observationMilliseconds > evaluationMilliseconds) {
    stops.push("STOP_POLICY_INVARIANT");
  }
  if (
    evaluationMilliseconds - observationMilliseconds >
    input.configuration.maximumObservationAgeSeconds * 1_000
  ) {
    stops.push("STOP_STALE_OBSERVATION_AGE");
  }

  const affectingActivities = sortedActivities(
    activities.filter((activity) =>
      activity.affectedBucketIds.includes(bucket.bucketId),
    ),
  );
  for (const activity of affectingActivities) {
    const activityMilliseconds = Date.parse(activity.occurredAt);
    if (activityMilliseconds > evaluationMilliseconds) {
      stops.push("STOP_POLICY_INVARIANT");
    } else if (activityMilliseconds > observationMilliseconds) {
      stops.push("STOP_KNOWN_ACTIVITY_AFTER_OBSERVATION");
    }
  }

  let resetQualifiesByTime = false;
  if (bucket.reset.kind === "CONFIRMED") {
    const resetMilliseconds = Date.parse(bucket.reset.resetsAt);
    const normalizedUtcMilliseconds = Date.parse(bucket.reset.normalizedUtc);
    if (resetMilliseconds !== normalizedUtcMilliseconds) {
      stops.push("STOP_INVALID_RESET_EVIDENCE");
    }
    if (
      resetMilliseconds <= evaluationMilliseconds &&
      observationMilliseconds < resetMilliseconds
    ) {
      stops.push("STOP_RESET_PASSED_WITHOUT_FRESH_OBSERVATION");
    }
    const untilResetMilliseconds = resetMilliseconds - evaluationMilliseconds;
    resetQualifiesByTime =
      untilResetMilliseconds > 0 &&
      untilResetMilliseconds <= input.configuration.deferHorizonSeconds * 1_000;
  }

  const correction = calculateReserve(
    normalized.availableBasisPoints,
    normalized.correctionMinimumBasisPoints,
    bucket.correctionReserve?.targetShareBasisPoints,
    input.configuration.correctionFloorShareBasisPoints,
    input.configuration.capacityBasisPointsPerCycle,
    `${bucket.bucketId}:correction-reserve`,
  );
  const validation = calculateReserve(
    normalized.availableBasisPoints,
    normalized.validationMinimumBasisPoints,
    bucket.validationReserve?.targetShareBasisPoints,
    input.configuration.validationFloorShareBasisPoints,
    input.configuration.capacityBasisPointsPerCycle,
    `${bucket.bucketId}:validation-reserve`,
  );
  const implementation =
    normalized.availableBasisPoints - correction.amount - validation.amount;

  if (validation.amount > normalized.availableBasisPoints) {
    stops.push("STOP_VALIDATION_RESERVE_UNPROTECTED");
  }
  if (
    correction.amount + validation.amount >=
    normalized.availableBasisPoints
  ) {
    stops.push("STOP_RESERVES_EXHAUST_CAPACITY");
  }

  let adjustedDemand = normalized.demandBasisPoints;
  let uncertaintyEvidence: PolicyRoundingEvidence | undefined;
  if (bucket.uncertainty === "KNOWN") {
    rules.push("RULE_UNCERTAINTY_KNOWN");
  } else if (bucket.uncertainty === "UNCERTAIN_BUT_BOUNDED") {
    const adjustment = ceilRatio(
      normalized.demandBasisPoints,
      input.configuration.boundedUncertaintyNumerator,
      input.configuration.boundedUncertaintyDenominator,
      `${bucket.bucketId}:bounded-uncertainty-demand`,
    );
    adjustedDemand = adjustment.result;
    uncertaintyEvidence = adjustment.evidence;
    rules.push("RULE_UNCERTAINTY_BOUNDED_MARGIN", "RULE_UNCERTAINTY_MODE_CAP");
  } else {
    stops.push("STOP_UNKNOWN_OR_INVALID_UNCERTAINTY");
  }

  const rawMode = modeFor(normalized.availableBasisPoints, input);
  let mode = rawMode;
  if (
    bucket.uncertainty === "UNCERTAIN_BUT_BOUNDED" &&
    input.configuration.modeRestrictivenessOrder.indexOf(mode) <
      input.configuration.modeRestrictivenessOrder.indexOf("CONSERVATION")
  ) {
    mode = "CONSERVATION";
  }
  rules.push(modeRule(rawMode));
  if (mode === "CRITICAL") {
    stops.push("STOP_CRITICAL_MODE");
  }

  const currentAffordable = adjustedDemand <= implementation;
  rules.push(
    currentAffordable ? "RULE_CURRENT_AFFORDABLE" : "RULE_CURRENT_BLOCKED",
  );

  const postReset = computePostReset(normalized, adjustedDemand, input);
  const deferEligible =
    !currentAffordable &&
    stops.length === 0 &&
    resetQualifiesByTime &&
    postReset?.sufficient === true;
  if (!currentAffordable) {
    rules.push(
      deferEligible
        ? "RULE_DEFER_BUCKET_QUALIFIES"
        : "RULE_DEFER_BUCKET_DOES_NOT_QUALIFY",
    );
  }

  let candidateDecision: PolicyDecision;
  if (stops.length > 0) {
    candidateDecision = "STOP / PRESERVE";
  } else if (currentAffordable) {
    if (mode === "LOW" && !input.minimumCoherentScope.attestedValue) {
      candidateDecision = "NARROW";
      rules.push("RULE_LOW_SCOPE_NOT_ATTESTED");
    } else {
      candidateDecision = "PROCEED";
      if (mode === "LOW") {
        rules.push("RULE_LOW_MINIMUM_COHERENT_SCOPE");
      }
    }
  } else if (deferEligible) {
    candidateDecision = "DEFER";
  } else if (implementation > 0) {
    candidateDecision = "NARROW";
  } else {
    candidateDecision = "STOP / PRESERVE";
  }

  rules.push(
    {
      PROCEED: "RULE_DECISION_PROCEED",
      DEFER: "RULE_DECISION_DEFER",
      NARROW: "RULE_DECISION_NARROW",
      "STOP / PRESERVE": "RULE_DECISION_STOP_PRESERVE",
    }[candidateDecision] as PolicyRuleId,
  );

  return {
    bucketId: bucket.bucketId,
    providerId: bucket.providerId,
    capacityWindowId: bucket.capacityWindowId,
    resetCycleId: bucket.resetCycleId,
    availableCapacity: { ...bucket.availableCapacity },
    implementationDemand: { ...bucket.implementationDemand },
    ...(bucket.correctionReserve
      ? {
          correctionReserve: {
            ...bucket.correctionReserve,
            ...(bucket.correctionReserve.manualMinimum
              ? { manualMinimum: { ...bucket.correctionReserve.manualMinimum } }
              : {}),
          },
        }
      : {}),
    ...(bucket.validationReserve
      ? {
          validationReserve: {
            ...bucket.validationReserve,
            ...(bucket.validationReserve.manualMinimum
              ? { manualMinimum: { ...bucket.validationReserve.manualMinimum } }
              : {}),
          },
        }
      : {}),
    observedAt: bucket.observedAt,
    affectingKnownActivities: affectingActivities,
    reset: copyReset(bucket.reset),
    uncertainty: bucket.uncertainty,
    availableBasisPoints: normalized.availableBasisPoints,
    correctionReserveBasisPoints: correction.amount,
    validationReserveBasisPoints: validation.amount,
    implementationAllocationBasisPoints: implementation,
    suppliedDemandBasisPoints: normalized.demandBasisPoints,
    adjustedDemandBasisPoints: adjustedDemand,
    rawMode,
    mode,
    currentAffordable,
    blocking: !currentAffordable,
    deferEligible,
    candidateDecision,
    ...(postReset ? { postReset } : {}),
    ruleIds: uniqueSorted(rules),
    stopIds: uniqueSorted(stops),
    roundingEvidence: [
      ...normalized.roundingEvidence,
      correction.evidence,
      validation.evidence,
      ...(uncertaintyEvidence ? [uncertaintyEvidence] : []),
    ].sort((left, right) => left.operation.localeCompare(right.operation)),
  };
};

const evaluateParsedInput = (
  input: PolicyEvaluationInput,
  normalizedBuckets: NormalizedBucket[],
): PolicyEvaluation => {
  const activities = sortedActivities(input.knownCapacityActivities);
  const bucketResults = normalizedBuckets
    .sort((left, right) =>
      left.bucket.bucketId.localeCompare(right.bucket.bucketId),
    )
    .map((bucket) => evaluateBucket(bucket, input, activities));
  const aggregateMode = mostRestrictiveMode(
    bucketResults.map((bucket) => bucket.mode),
    input.configuration.modeRestrictivenessOrder,
  );
  const externalStop = input.activeMandatoryStopIds.length > 0;
  const aggregateDecision = externalStop
    ? "STOP / PRESERVE"
    : mostRestrictiveDecision(
        bucketResults.map((bucket) => bucket.candidateDecision),
        input.configuration.decisionRestrictivenessOrder,
      );
  const aggregateStopIds = uniqueSorted([
    ...bucketResults.flatMap((bucket) => bucket.stopIds),
    ...(externalStop
      ? (["STOP_EXTERNAL_MANDATORY_CONDITION"] as PolicyStopId[])
      : []),
  ]);
  const ruleIds: PolicyRuleId[] = [
    "RULE_AGGREGATE_MOST_RESTRICTIVE_MODE",
    "RULE_AGGREGATE_MOST_RESTRICTIVE_DECISION",
    {
      PROCEED: "RULE_DECISION_PROCEED",
      DEFER: "RULE_DECISION_DEFER",
      NARROW: "RULE_DECISION_NARROW",
      "STOP / PRESERVE": "RULE_DECISION_STOP_PRESERVE",
    }[aggregateDecision] as PolicyRuleId,
  ];
  const blockingBucketIds = bucketResults
    .filter((bucket) => bucket.blocking)
    .map((bucket) => bucket.bucketId);
  if (
    aggregateDecision === "DEFER" &&
    blockingBucketIds.length > 0 &&
    bucketResults
      .filter((bucket) => bucket.blocking)
      .every((bucket) => bucket.deferEligible)
  ) {
    ruleIds.push("RULE_DEFER_ALL_BLOCKERS_QUALIFY");
  }

  return deepFreeze({
    kind: "POLICY_EVALUATION",
    authorizesWork: aggregateDecision === "PROCEED",
    evaluationTime: input.evaluationTime,
    configuration: {
      ...input.configuration,
      modeRestrictivenessOrder: [
        ...input.configuration.modeRestrictivenessOrder,
      ],
      decisionRestrictivenessOrder: [
        ...input.configuration.decisionRestrictivenessOrder,
      ],
    },
    requiredBucketAuthority: { ...input.requiredBucketAuthority },
    minimumCoherentScope: { ...input.minimumCoherentScope },
    bucketResults,
    aggregateMode,
    aggregateDecision,
    limitingBucketIds: bucketResults
      .filter((bucket) => bucket.mode === aggregateMode)
      .map((bucket) => bucket.bucketId),
    blockingBucketIds,
    ruleIds: uniqueSorted(ruleIds),
    stopIds: aggregateStopIds,
    activeMandatoryStopIds: uniqueSorted(input.activeMandatoryStopIds),
  });
};

export const evaluatePolicyV1 = (input: unknown): PolicyEvaluationOutcome => {
  const parsed = policyEvaluationInputSchema.safeParse(input);
  if (!parsed.success) {
    return rejectZodIssues(input, parsed.error.issues);
  }

  const normalizedBuckets: NormalizedBucket[] = [];
  const issues: PolicyInputIssue[] = [];
  for (const bucket of parsed.data.requiredCapacityBuckets) {
    try {
      normalizedBuckets.push(
        normalizeBucket(
          bucket,
          parsed.data.configuration.capacityBasisPointsPerCycle,
        ),
      );
    } catch (error) {
      if (!(error instanceof PolicyNormalizationError)) {
        throw error;
      }
      issues.push({
        validationId: "INPUT_INVALID_VALUE",
        path: normalizedPathFor(parsed.data, error.operation),
        bucketId: bucket.bucketId,
      });
    }
  }

  if (issues.length > 0) {
    return rejectInput(issues);
  }

  return evaluateParsedInput(parsed.data, normalizedBuckets);
};
