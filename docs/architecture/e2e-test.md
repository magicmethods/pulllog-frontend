# E2E Test Architecture

## 1. Purpose
This document defines the repository-wide architecture for Playwright E2E testing.

The goals are:
- validate critical end-to-end business behavior
- keep E2E scope intentional and limited
- support repeatable, manifest-driven execution
- use a standard default device matrix for PC, tablet, and smartphone coverage
- produce Markdown reports for every run from shared report templates
- archive successful evidence as PDF when required

## 2. Scope of E2E
E2E tests exist to verify user-observable business flows across integrated layers.

Examples of behavior appropriate for E2E:
- authentication entry to a protected page
- completing a critical user workflow
- persisting and reloading user-visible state
- verifying route protection and role-based access at user level
- confirming that core pages render and function under realistic conditions

Examples of behavior that should usually stay out of E2E:
- pure utility functions
- local formatting logic
- narrow component rendering details
- complex edge-case matrixes better covered by unit/integration tests

## 3. Principles
- manifest-driven execution
- one case id per intentional scenario
- explicit included and excluded coverage
- deterministic reporting and evidence paths
- stable locators over brittle selectors
- state-based waiting over arbitrary sleeping
- account references instead of raw credentials
- minimal duplication across specs

## 4. Repository structure
Recommended structure:

- `docs/architecture/e2e-test.md`
- `e2e/cases/` for case manifests
- `e2e/manifests/` for optional grouped execution manifests or indexes
- `e2e/reports/` for Markdown execution reports
- `e2e/evidence/` for archived PDF evidence
- `e2e/templates/` for Markdown/PDF layout templates
- `e2e/templates/pulllog/` for the repository-provided Pulllog default template set
- `tests/e2e/core-flows.spec.ts` as the current core manifest-driven scenario entrypoint
- `tests/e2e/pages/` and `tests/e2e/support/` for page objects and shared helpers
- `tests/playwright/` for Playwright config and reporter integration

## 5. Case manifest model
Each E2E case is defined by a JSON manifest.

A case manifest describes:
- case id
- enable/disable state
- environment name
- baseURL or baseURL reference
- account reference key
- target page or route
- navigation assumptions
- included and excluded coverage
- prerequisite state
- report generation behavior
- tags
- notes

Manifests are validated against `e2e/cases/case.schema.json`.

## 6. Environment strategy
Environment-specific values should not be scattered through specs.

Preferred order:
1. repository config or Playwright config
2. environment variables or secure secrets
3. manifest references
4. direct literals only when they are truly stable and non-sensitive

Each run should record:
- environment name
- resolved baseURL
- case id
- execution timestamp

### Runtime lanes
This repository keeps two runtime lanes for frontend E2E execution:
- `local-e2e` as the standard default lane
- `local-dev` as the exception lane for cases that must target an already running local frontend/backend pair

Runtime lane resolution is performed in this order:
1. `manifest.execution.runtimeLane`
2. inference from manifest base URL shape
3. fallback to `local-e2e`

Inference rules:
- prefer `baseURLKey` for `local-e2e` manifests
- prefer an explicit `baseURL` for `local-dev` manifests

Manifest authoring rules:
- `local-e2e` should normally be expressed with `baseURLKey`, typically `local_e2e`
- `local-dev` should normally be expressed with an explicit `baseURL`, typically `https://pull.log:4649`
- `execution.runtimeLane` may be added when the lane must be explicit in the manifest metadata

Execution constraints:
- mixed runtime lanes cannot be executed together in the same `run-e2e` invocation
- `local-dev` runs must complete a frontend/backend health check before Playwright starts
- `local-e2e` runs remain Playwright-managed and should not depend on an already running local dev server pair

## 7. Account strategy
Never store raw credentials in case manifests.

Instead:
- store an `accountKey`
- resolve the real credentials through secure configuration or a credential provider
- document account roles and intended use outside of raw test files when needed

Possible account categories:
- anonymous
- standard user
- admin user
- read-only user
- expired or blocked user
- seed-data-specific account

## 8. Coverage boundary controls
A case may intentionally exclude some flows from its coverage.

Typical exclusions:
- login flow
- full navigation path to target page
- onboarding flow
- upstream data creation flow

Why this exists:
- some cases target a specific page state, not the route journey
- some coverage belongs to separate dedicated cases
- splitting responsibility reduces flakiness and improves diagnostics

Exclusions must be explicit in the manifest.

## 9. Reporting policy
Every E2E run must generate a Markdown report.

The report must contain:
- execution summary
- case metadata
- prerequisites
- included coverage
- excluded coverage
- key assertions
- result
- artifact references
- failure summary when applicable

Suggested report path:
- `e2e/reports/YYYY-MM-DD/<case-id>/report.md`

When multiple Playwright projects run for the same case, the generated `report.md` should aggregate all executed project results into a single case report, include a project summary table, and preserve per-project artifact and failure sections.

### Report template policy
The canonical template files for report generation are:
- `e2e/templates/report-template.md` for per-case Markdown reports
- `e2e/templates/index-template.md` for daily summary indexes
- `e2e/templates/evidence-template.html` for optional PDF evidence layout

The repository also ships a Pulllog-specific default set under:
- `e2e/templates/pulllog/report-template.md`
- `e2e/templates/pulllog/index-template.md`
- `e2e/templates/pulllog/evidence-template.html`

When these template files exist, report generation should render them with runtime metadata instead of hardcoding the layout in reporter code.

### Template override strategy
The default templates above should remain committed as the repository baseline.

Override behavior is layered as follows:
1. default repository templates in `e2e/templates/`
2. optional global overrides from `.env.e2e`
3. optional per-case overrides from the manifest `report.templates` block

Supported global environment variables:
- `PLAYWRIGHT_E2E_TEMPLATE_DIR` to switch all templates at once using a subdirectory under `e2e/templates/`
- `PLAYWRIGHT_E2E_REPORT_TEMPLATE` to override only the per-case Markdown template
- `PLAYWRIGHT_E2E_INDEX_TEMPLATE` to override only the daily summary template
- `PLAYWRIGHT_E2E_EVIDENCE_TEMPLATE` to override only the PDF evidence HTML template

The current Pulllog repository default may set `PLAYWRIGHT_E2E_TEMPLATE_DIR=pulllog` in `.env.e2e` so the Japanese Pulllog-branded template set is active without changing the baseline templates.

Per-case manifest overrides may define:
- `report.templates.markdown`
- `report.templates.evidence`

Relative override values are resolved from `e2e/templates/` first, while explicit relative or absolute paths are also supported when needed.
Manifest filenames should also remain deterministic and normally match the `case id` they define.

## 10. Evidence archival policy
When a run succeeds and the manifest allows archival, convert the Markdown report to PDF and store it as evidence.

Suggested evidence path:
- `e2e/evidence/YYYY-MM-DD/<case-id>/report.pdf`

Failed runs should keep Markdown plus technical artifacts, but should not produce final PDF evidence by default.

When multiple standard-matrix projects exist for the same case, the PDF evidence should render a fixed PC / Tablet / Smartphone comparison table in addition to the detailed per-project sections.

## 11. Artifact policy
Artifacts may include:
- screenshots
- trace files
- videos
- console logs
- network summaries

Artifacts should be referenced from the Markdown report, not buried without traceability.

## 12. Execution modes

### Default project matrix
Unless a case or command explicitly overrides the project selection, the standard E2E run should cover:
- PC: `chromium`
- Tablet: `ipad-pro-11`
- Smartphone: `iphone-14`

Additional projects such as `firefox`, `webkit`, or `android-pixel-7` remain available for opt-in compatibility verification, but they are not the default architecture baseline.

Supported execution modes may include:
- single-case execution
- tag-based execution
- batch execution by manifest list
- CI execution

When explicitly narrowing the project set via CLI, use the repository runner with a comma-separated selector such as `--project=chromium,ipad-pro-11,iphone-14` (or a justified subset) instead of inventing custom filter logic.

Batch execution should resolve cases from manifest files or a grouped manifest index, not from hardcoded lists in spec code.

### Local-dev preflight
The `local-dev` lane is intended only for exceptional cases that cannot yet run on the standard `local-e2e` lane.

Before a `local-dev` run starts, the runner must verify:
- frontend health on `https://pull.log:4649`
- backend health on `http://127.0.0.1:3030/api/v1/dummy`

If either endpoint is unavailable, the run must fail before Playwright starts so that local environment problems are reported clearly.

## 13. Review criteria
A healthy E2E case should satisfy all of the following:
- belongs in E2E
- has a clear objective
- has explicit preconditions
- has explicit included and excluded coverage
- uses stable locator strategy
- produces useful reports
- can be diagnosed from its artifacts
- does not require unexplained sleeps or brittle ordering assumptions

## 14. Change management
When adding or changing E2E behavior:
1. update or create the case manifest
2. update or add the spec
3. run the relevant case
4. generate the Markdown report
5. archive evidence if successful and allowed
6. review for stability and scope

## 15. Agent-driven workflow
This repository uses `frontend-orch-e2e` as the default entry point for E2E work under `.github/agents/`.

- `frontend-orch-e2e` for stage routing and consolidated status
- `frontend-design-e2e-scenario` for scenario and manifest design
- `frontend-impl-e2e-playwright` for spec implementation and verification
- `frontend-debug-e2e` for failure reproduction and minimal fixes
- `frontend-review-e2e` for maintainability and evidence review

The recommended hands-on flow is:
1. open Copilot Chat and start with `frontend-orch-e2e` or the `Start Frontend E2E Workflow` prompt
2. ask `frontend-orch-e2e` to define or refine the case scope and route work to `frontend-design-e2e-scenario`
3. review and approve the proposed `case id`, tags, included coverage, excluded coverage, and prerequisites
4. ask `frontend-orch-e2e` to route approved implementation work to `frontend-impl-e2e-playwright`
5. verify the case first with the minimum relevant scope, usually:
   - `pnpm run test:e2e:case -- <case-id> --project=chromium`
6. then verify the standard matrix when appropriate:
   - `pnpm run test:e2e:case -- <case-id> --project=chromium,ipad-pro-11,iphone-14`
7. if the run fails, switch to `frontend-debug-e2e` with the report path, artifacts, and failure scope
8. once the run is stable, ask `frontend-review-e2e` to review the manifest/spec/report/evidence quality
9. if the case succeeds and archival is allowed, export PDF evidence from the generated Markdown report
10. commit only the intended source/doc changes, not transient Playwright artifacts

### Recommended prompt templates
Use prompts like the following.

For `frontend-orch-e2e`:
> Orchestrate E2E work for `<target behavior>` and decide whether this needs scenario design, implementation, debugging, or review. Keep the default matrix (`chromium`, `ipad-pro-11`, `iphone-14`) unless the case clearly justifies another scope.

For `frontend-design-e2e-scenario`:
> Design a manifest-driven E2E case for `<target behavior>`. Keep the default matrix (`chromium`, `ipad-pro-11`, `iphone-14`), define included/excluded coverage, prerequisites, tags, and propose `e2e/cases/<case-id>.json`.

For `frontend-impl-e2e-playwright`:
> Implement the approved `<case-id>` using the current manifest-driven structure (`e2e/cases/`, `tests/e2e/core-flows.spec.ts`, page objects, and support helpers). Reuse existing helpers where possible and verify with `pnpm run test:e2e:case -- <case-id> --project=chromium` first.

For `frontend-debug-e2e`:
> Reproduce the `<case-id>` failure on `<project>` using the latest `e2e/reports/.../report.md` and Playwright artifacts. Classify the root cause and apply the smallest justified fix, then rerun the relevant scope.

For `frontend-review-e2e`:
> Review `<case-id>` for scope, stability, manifest consistency, Markdown/PDF report quality, and long-term maintainability. Return `Must fix`, `Should fix`, `Nice to have`, and `Final verdict`.

### Commit scope guidance
When the workflow is complete, a normal commit may include:
- `docs/architecture/e2e-test.md`
- `.github/agents/` and `.github/skills/` changes
- `e2e/cases/*.json`
- `tests/e2e/` and `tests/playwright/` source changes
- related README or architecture notes

Do not include `tests/test-results/` or other transient artifacts unless there is an explicit reason to version them.

## 16. Open design notes
This document is the architectural source of truth for E2E process decisions.
Implementation details may evolve, but the separation of concerns should remain:

- architecture here
- case-by-case behavior in manifests
- implementation in specs and fixtures
- execution/reporting in skills
- role-specific reasoning in agents
