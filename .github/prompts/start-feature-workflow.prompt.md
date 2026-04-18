---
description: Start the 5-role frontend feature development workflow from an issue, requirement, or specification
name: Start Frontend Feature Workflow
argument-hint: Issue, requirement, or feature specification to orchestrate
agent: frontend-orch-feature
---

Start the frontend feature development workflow for the provided request.

Use the repository's 5-role workflow and coordinate the work through `frontend-orch-feature` first.

Required references:
- [Feature workflow](../../docs/architecture/feature-development-workflow.md)
- [Architecture overview](../../docs/architecture/overview.md)
- [Frontend rules](../../AGENTS.md)
- [frontend-orch-feature](../agents/frontend-orch-feature.agent.md)
- [frontend-arch-system](../agents/frontend-arch-system.agent.md)
- [frontend-design-uiux](../agents/frontend-design-uiux.agent.md)
- [frontend-impl-feature](../agents/frontend-impl-feature.agent.md)
- [frontend-review-feature](../agents/frontend-review-feature.agent.md)

Instructions:
- Treat the user input as the primary request source unless it explicitly references a stricter source of truth
- Restate the request and identify explicit non-goals first
- Decide whether the work is frontend-only or requires backend and API contract alignment
- Use the standard stage order from the workflow document
- Do not skip architecture for non-trivial work
- Only include the UI/UX stage when the feature changes screen structure, interaction, wording, accessibility, or responsive behavior
- If backend or API contract changes are required, say so clearly and do not pretend the frontend can complete the feature alone
- Keep the plan minimal and grounded in the existing codebase

Return the result using this structure:

```text
Request summary
-

Scope and non-goals
-

Required stages
-

Current stage status
-

Blockers or open questions
-

Recommended next action
-
```

User input:

{{input}}