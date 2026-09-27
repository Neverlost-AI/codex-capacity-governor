---
name: governor-build-review
description: Coordinate a founder-approved Capacity Governor tranche with a builder and a separate exact-commit reviewer, routing bounded fixes through at most three review attempts. Also supports workflow dry runs without starting implementation.
---

# Capacity Governor builder and reviewer

The main agent is the coordinator. Use project agents `governor_builder` and
`governor_reviewer` from `.codex/agents/`. Keep their sessions separate; never
relabel a builder or coordinator self-review as independent review. Inherit
current model/effort defaults unless the user explicitly chooses others.

## Establish authority and hand off

1. Read applicable AGENTS.md, DEVELOPMENT_WORKFLOW, the exact approved assignment,
   and its governing decisions. Record authorized repository/worktree, branch,
   baseline SHA, allowed surfaces, exclusions, required checks, implementation
   authority, and permitted Git mutations. Inspect status and preserve unrelated
   work. A roadmap, previous tranche approval, or this skill does not authorize
   new implementation. If authority is missing, report it before delegating.
2. Delegate to a builder subagent with this authority packet. Require a candidate
   SHA, changed paths, requirements-to-test mapping, checks/results, limitations,
   and unresolved questions. The coordinator does not implement concurrently.
3. Obtain a clean committed candidate within authorized Git scope before calling
   the result an exact-commit review. If a commit is not authorized, preserve the
   patch and report the missing authority; do not claim a commit review. Never
   stage unrelated work. If unrelated user changes exist, preserve them and use
   a separate clean review worktree at the candidate SHA within Git authority.
   The task's existing authorization persists.

## Review and fix loop

Use at most **three review attempts total**: initial review, then at most two
builder-fix/re-review cycles. No unreviewed final fix follows attempt three.
Keep a ledger in the coordinator task: attempt, candidate SHA, distinct builder
and reviewer agent identities, outcome, finding IDs, and verification evidence.

For each attempt:

- Pause builder writes and verify the candidate SHA and clean review target.
  Spawn a fresh reviewer with minimal context: authoritative requirements,
  baseline/candidate SHAs, worktree, exclusions, changed paths, check evidence,
  and prior findings for re-review. Do not supply builder private reasoning or
  prescribe a verdict. Prefer a fresh-context spawn; disclose if the client
  requires inherited conversation context.
- The reviewer independently inspects the full baseline-to-candidate result and
  changes since the prior attempt. It reports actual verification separately
  from builder evidence and authors no implementation. Use sequential agents
  in a shared worktree, or a coordinator-prepared isolated checkout at the exact
  SHA when authorized checks need generated files. Preserve all sandbox and
  approval rules; report unavailable checks without bypassing them.
- On PASS, confirm HEAD still matches the reviewed SHA and no relevant worktree
  changes appeared. Stop with READY_FOR_FOUNDER_REVIEW. Subsequent code changes
  invalidate the pass. Merge, deployment, and another tranche each require the
  applicable separate authority.
- On CHANGES_REQUIRED before attempt three, send findings unchanged to the
  builder with the current attempt number and remaining review budget. Triage
  within approved scope and require fixes, meaningful regression
  tests, applicable verification, and a new candidate SHA; then re-review.
- On CHANGES_REQUIRED at attempt three, stop with REVIEW_LIMIT_REACHED and list
  unresolved findings. Do not start a fourth attempt or make unreviewed fixes.
- On FOUNDER_DECISION_REQUIRED, pause affected work immediately and report the
  smallest needed decision. Preserve work without inventing semantics. On
  REVIEW_BLOCKED, report missing evidence/environment conditions; infer no pass.

The coordinator reports baseline and reviewed SHA, agent separation, attempts,
resolved/outstanding findings, actual checks, limitations, git status, and
remaining approval gates. Push/PR/merge authority comes from the task, not a
review verdict. A reviewer read-only default can be superseded by live parent
overrides; enforce no authoring in its instructions and verify status afterward.

## Client compatibility and setup verification

Codex supports standalone `.codex/agents/*.toml` roles. If the current spawn tool
cannot select a custom role, create two distinct subagents and explicitly pass
each its role-file instructions. Disclose that the TOML layer (including its
sandbox default) was not applied. Never substitute coordinator self-review or
silently alter permissions. If separate agents are unavailable, report
WORKFLOW_UNAVAILABLE.

Setup-only/dry-run invocation authorizes no product implementation, commits,
pushes, merges, or new tranche. Verify config/skill discovery and use separate
agents on read-only hypothetical handoffs to exercise pass, fix/re-review,
three-attempt limit, and founder-decision stops. Do not edit product files or
create a fake product review/approval record.

Invoke in a new repository task, for example:

> Use $governor-build-review for the founder-approved assignment at <path>,
> baseline <SHA>, branch <authorized branch>. Implementation and local commits
> are authorized within that assignment; do not push or merge.

Or, for setup verification only:

> Use $governor-build-review in dry-run mode. Verify roles and stop conditions;
> do not implement a tranche or make Git mutations.

Configuration references:
[Codex subagents](https://developers.openai.com/codex/subagents),
[Codex skills](https://developers.openai.com/codex/skills).
