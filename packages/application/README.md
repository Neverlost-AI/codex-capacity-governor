# Application layer

Future home of framework-independent use cases that coordinate contracts, forecast and policy engines, and persistence ports. Expected use cases include project creation, preflight drafting, plan generation, outcome recording, and history queries.

This package should own orchestration and transaction boundaries, not React rendering, SQL/ORM implementations, provider SDKs, or policy formulas. The first collaborator tranche may add only the project and manual-preflight-draft use cases required by its acceptance criteria.
