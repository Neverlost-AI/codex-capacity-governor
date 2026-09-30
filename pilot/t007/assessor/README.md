# T007 fixed acceptance assessor

Preparation only. This assessor is held outside the three public challenge starters and is **not** a measured attempt or a completed solution. It uses the repository's pinned `@playwright/test` 1.62.1 for TodoMVC and Node's built-in HTTP/assert/test facilities for the API challenges. The assessor needs no paid service and calls only a loopback challenge server. It never calls a public URL to check validity.

After `pnpm install --frozen-lockfile` in this Governor worktree, run **one challenge at a time** from the repository root, replacing the path with an absolute path to a disposable checkout of that task's derived starter or later implementation:

```powershell
$env:T007_TARGET_DIR='C:\absolute\path\to\todo-checkout'
node --test --test-reporter=spec pilot/t007/assessor/todo.test.mjs

$env:T007_TARGET_DIR='C:\absolute\path\to\url-checkout'
node --test --test-reporter=spec pilot/t007/assessor/url.test.mjs

$env:T007_TARGET_DIR='C:\absolute\path\to\exercise-checkout'
node --test --test-reporter=spec pilot/t007/assessor/exercise.test.mjs
Remove-Item Env:T007_TARGET_DIR
```

The target must be a fresh, local, dependency-installed copy. The assessor can write task data into that copy; never point it at a protected starter or a prior attempt. It starts an HTTP server on `127.0.0.1` with a temporary port, without changing the Governor app. The URL assessor tests restart persistence by stopping and restarting the Node process against the **same** disposable checkout. The Exercise assessor runs the server with `TZ=UTC` and an assessor-only fixed clock at `2024-01-15T12:00:00Z`. TodoMVC is served with a minimal read-only static server. A failing assertion identifies an unmet public-brief behavior; a setup failure is not scored as a task failure.

Case IDs are TD-01–TD-06, US-01–US-04 and ET-01–ET-06, mapped in [the freeze plan](../../../docs/T007_PUBLIC_CHALLENGE_FREEZE_DRAFT.md). Test results on blank starters are expected to **fail**: they prove the missing challenge behaviors are not already implemented. They do not prove the assessor will pass a completed solution; that remains a separate validation at final task assessment. Do not show the held-out assessor source or another run's solution/transcript to a coding agent before its attempt. The assessor commit and case list must be frozen before the first measured attempt; revisions afterward start a newly identified cohort.
