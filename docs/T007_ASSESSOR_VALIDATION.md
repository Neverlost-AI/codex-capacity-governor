# T007 assessor validation — preparation evidence

**No measured attempt was run.** The final held-out assessor is frozen at local commit `82687befe471caaa9ccee5317285f9e28d7e4e4c`. This validation checks the assessor itself before the founder decides whether to accept the starter/assessor identities and authorize any capacity use. It does not validate forecast accuracy.

## Independent controls

Three small correct-behavior reference fixtures were constructed separately from the solution-free derived starters. The fixtures and a local mutation runner are under ignored `.data/t007-preparation/assessor-validation/` in the Capacity Governor workspace. They are **not in the assessor commit or the starter repositories**. A measured builder must be given only the fresh challenge checkout, without access to this Governor preparation workspace. Do not copy or show the fixtures to that builder. The primary behavior-source hashes, for local audit only (not a complete folder snapshot), are:

| Fixture source | SHA-256 |
| --- | --- |
| TodoMVC `todo-reference/app.js` | `DD28251E9B5EB2A61AFEF4BE2B2A3471122886DBF8F624540FF9BD1728D611C4` |
| URL Shortener `url-reference/index.js` | `6B76D4ECCFF4A4E47530E067ECD36B009FB156CF786F285AF75AC6C2D0442426` |
| Exercise Tracker `exercise-reference/index.js` | `953E13519EA708533431C5D84EE285C5080D64F7A4BB5F23F9C2CCDBE30CFD37` |

The correct controls run the entire task assessor against each fixture. For the broken controls, one fault is enabled at a time in an isolated disposable copy/data directory, and the matching named test is run. A mutant is counted as detected only when the targeted case fails as a behavioral assertion; startup, hook or server-readiness errors do not count. The URL fixture uses a local file for restart persistence; the Exercise fixture uses the assessor's fixed UTC clock; the Todo fixture uses browser local storage. No network service, imported completed solution or paid resource is used.

| Task | Correct fixture | Targeted broken cases detected | Blank starter |
| --- | --- | --- | --- |
| TodoMVC | TD-01–TD-06 **6/6 pass** | TD-01 no trim; TD-02 no edit; TD-03 broken toggle-all; TD-04 wrong active count; TD-05 ignored filter; TD-06 no persistence — **6/6 assertion failures** | **0/6 pass** |
| URL Shortener | US-01–US-04 **4/4 pass** | US-01 wrong original URL; US-02 broken redirect; US-03 invalid URL accepted; US-04 mapping lost on restart — **4/4 assertion failures** | **0/4 pass** |
| Exercise Tracker | ET-01–ET-06 **6/6 pass** | ET-01 malformed user listing; ET-02 wrong supplied date; ET-03 wrong default date; ET-04 malformed log entry; ET-05 limit before date filter; ET-06 cross-user records — **6/6 assertion failures** | **0/6 pass** |

The first correct Todo run exposed two assessor timing defects in TD-05/TD-06: a checkbox was removed after a valid re-render, and hash-route selection was read before the route update. The assessor was corrected with a click and bounded selected-route assertions, then the entire correct/mutant/blank matrix above was rerun. The final correct result is **16/16**, targeted mutant result **16/16 detected**, and blank-starter result **0/16**, with no control setup failure counted as a detection.

## Limits and execution gate

These independent synthetic controls demonstrate that the frozen assessor recognizes the tested correct behaviors and rejects the tested defects. They do **not** establish that every compliant solution will pass, that every defect will be found, that the public challenge grading services agree, or that any measured build succeeded. The exact assessor revision and case list must be retained for each attempt; a later behavioral change starts a separately reviewed cohort.

Still pending before attempt 1: founder acceptance of the three starter SHAs, this assessor revision and worksheet; encrypted offsite backup; confirmation of the actual Codex client/model/settings and live bucket evidence; and a separate measured-build authorization. The founder removed the proposed fixed 1,500 bp consumption cap and retained a **180 active-minute limit per attempt**. This does not change Governor policy or waive required per-bucket observation and attribution.
