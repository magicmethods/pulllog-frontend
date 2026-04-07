---
name: run-e2e-with-report
description: Run manifest-driven Playwright E2E tests and generate a Markdown report with snapshot references
---

# Purpose
Use this skill when you need to execute Playwright E2E tests based on one or more case manifests and produce a Markdown report.

# When to use
- running a new or existing E2E case
- validating implementation changes
- reproducing a reported case
- generating pass/fail reports for review

# Inputs
This skill expects:
- one or more case manifest files under `e2e/cases/`
- Playwright configuration already present in the repository
- report output path convention defined by `docs/architecture/e2e-test.md`
- shared report templates under `e2e/templates/`
- optional global template defaults from `.env.e2e`

# Required references
Read before execution:
- `docs/architecture/e2e-test.md`
- `e2e/cases/case.schema.json`
- target case manifest file(s)
- `e2e/templates/report-template.md`
- `e2e/templates/index-template.md`
- `e2e/templates/pulllog/report-template.md` and `e2e/templates/pulllog/index-template.md` when using the repository default Pulllog set
- `.env.e2e`

# Execution rules
1. Resolve the target case ids and manifests.
2. Resolve environment and baseURL from the manifest or repository config.
3. Resolve account references through secure configuration, never from raw credentials in the manifest.
4. Use the repository runner scripts where possible and default to the standard project matrix: `chromium`, `ipad-pro-11`, `iphone-14`, unless the manifest or human request overrides it. When selecting projects explicitly, prefer a comma-separated `--project=` value.
5. Run the minimum relevant Playwright scope first.
6. Collect execution metadata:
   - timestamp
   - environment
   - case id
   - target page
   - command or scope executed
   - project/device coverage
   - pass/fail result
7. Collect artifact references when present:
   - screenshots
   - trace
   - video
   - logs
8. Generate a Markdown report and daily index under the repository report path convention using the active shared templates when available.
9. When more than one project runs for the same case, ensure the case report aggregates all executed project results into a single `report.md` with a per-project summary and per-project artifact sections.

# Markdown report minimum contents
The report must include:
- title
- execution summary
- case metadata
- prerequisites
- included coverage
- excluded coverage
- executed steps summary
- key assertions
- result
- artifact references
- failure summary when failed
- next action recommendation when failed

# Constraints
- Do not silently skip missing prerequisites.
- Do not claim success without a real test result.
- Do not generate final PDF evidence in this skill.
- Evidence archival is handled by the separate archival skill.

# Expected output
- updated or newly created Markdown report
- clear statement of pass/fail
- artifact references usable by other agents
