---
name: archive-e2e-evidence
description: Convert a successful E2E Markdown report into PDF evidence and store it in the repository evidence structure
---

# Purpose
Use this skill after a successful E2E execution when the case manifest allows final evidence archival.

# When to use
- the Markdown report already exists
- the Playwright run passed
- the case manifest allows PDF archival on success

# Required references
Read before archival:
- `docs/architecture/e2e-test.md`
- target case manifest
- generated Markdown report
- `e2e/templates/evidence-template.html`
- `e2e/templates/pulllog/evidence-template.html` when the Pulllog default set is active
- `.env.e2e` when global template overrides may affect PDF rendering

# Preconditions
Only proceed when all are true:
- the relevant test result is successful
- the report file exists
- the manifest has PDF archival enabled for successful runs
- the destination evidence path can be resolved

# Archival rules
1. Verify the report corresponds to a successful run.
2. Resolve the deterministic evidence destination path.
3. Convert the Markdown report to PDF using the active evidence template (`e2e/templates/evidence-template.html`, the Pulllog default, or another approved override) when available.
4. When multiple standard-matrix project results exist for the same case, include the fixed PC / Tablet / SP comparison table while preserving the original per-project detail sections.
5. Store the PDF under the evidence path convention.
6. Preserve links or references to snapshots and artifacts in the Markdown source.
7. Update any execution summary index if the repository architecture requires one.

# Constraints
- Do not generate archival PDF for failed runs unless explicitly requested by a human.
- Do not overwrite unrelated evidence silently.
- Do not fabricate missing report content.
- If the report is incomplete, stop and state what is missing.

# Expected output
- path to the generated PDF evidence
- confirmation of the source Markdown report
- confirmation that archival policy was satisfied
