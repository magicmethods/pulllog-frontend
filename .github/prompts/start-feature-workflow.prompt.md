---
description: Start the 5-role frontend feature development workflow from an issue, requirement, or specification
name: Start Feature Workflow
argument-hint: Issue, requirement, or feature specification to orchestrate
agent: Feature Orchestrator
---

Start the frontend feature development workflow for the provided request.

Use the repository's 5-role workflow and coordinate the work through the Feature Orchestrator first.

Required references:
- [Feature workflow](../../docs/architecture/feature-development-workflow.md)
- [Architecture overview](../../docs/architecture/overview.md)
- [Frontend rules](../../AGENTS.md)
- [Feature Orchestrator](../agents/feature-orchestrator.agent.md)
- [System Architect](../agents/system-architect.agent.md)
- [UI/UX Designer](../agents/ui-ux-designer.agent.md)
- [Frontend Implementer](../agents/frontend-implementer.agent.md)
- [Feature Reviewer](../agents/feature-reviewer.agent.md)

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