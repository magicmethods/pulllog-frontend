---
description: Start the frontend Playwright E2E workflow from a behavior request, case id, or failing report
name: Start Frontend E2E Workflow
argument-hint: Target behavior, case id, manifest request, or failing E2E report to orchestrate
agent: frontend-orch-e2e
---

Start the frontend manifest-driven Playwright E2E workflow for the provided request.

Use `frontend-orch-e2e` as the single entry point and let it route the work through scenario design, implementation, debugging, and review as needed.

Required references:
- [E2E architecture](../../docs/architecture/e2e-test.md)
- [Case schema](../../e2e/cases/case.schema.json)
- [frontend-orch-e2e](../agents/frontend-orch-e2e.agent.md)
- [frontend-design-e2e-scenario](../agents/frontend-design-e2e-scenario.agent.md)
- [frontend-impl-e2e-playwright](../agents/frontend-impl-e2e-playwright.agent.md)
- [frontend-debug-e2e](../agents/frontend-debug-e2e.agent.md)
- [frontend-review-e2e](../agents/frontend-review-e2e.agent.md)

Instructions:
- Treat the user input as the primary request source unless it explicitly references a stricter source of truth
- Restate the target behavior, case scope, and non-goals first
- Decide whether the request belongs in E2E before handing work to a specialist
- Start with scenario design when a new or changed manifest is needed
- Route failure reproduction and stabilization to the debugger when the request is about a failing run
- Keep the default matrix `chromium`, `ipad-pro-11`, `iphone-14` unless the manifest or request justifies another scope
- Keep the plan grounded in the current manifest-driven structure and shared reporting flow

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