---
name: orchestrator-status-reporting
description: Standardize how an orchestrator tracks and reports delegated task status to the user
---

# Purpose
Use this skill when an orchestrator manages multiple delegated tasks and needs to provide consistent, decision-ready status updates.

# When to use
- the orchestrator has handed off work to one or more specialist agents
- the user asks for progress, blockers, or completion state
- priorities changed and the orchestrator needs to re-state the active board
- task visibility has become unclear and must be normalized

# Core rule
The orchestrator is the single status surface for the user. The user should not need to interrogate each delegated task separately unless the workflow explicitly requires it.

# Required task fields
Track these fields for every task under orchestration:
- task name
- owner agent
- status
- latest confirmed progress
- blocker or waiting condition
- next action
- whether user input is required

# Status vocabulary
Use only these status labels unless the human explicitly requests another format:
- `not started`
- `in progress`
- `awaiting agent result`
- `blocked`
- `completed`
- `unverified`

# Reporting rules
1. Report confirmed state only.
2. If a delegated agent has not returned a result yet, use `awaiting agent result`.
3. If the orchestrator has lost confidence in freshness or accuracy, use `unverified` or `needs refresh` instead of guessing.
4. Separate `blocked` from `awaiting agent result`.
5. Make user-action requests explicit and minimal.
6. Reflect added instructions by stating how they changed scope, order, or ownership.

# Recommended response sections
- overall status
- in progress
- completed
- blocked or waiting
- user attention
- instruction impact when relevant

# Constraints
- do not fabricate delegated-agent progress
- do not hide blockers behind optimistic wording
- do not force the user to infer ownership or next action
- do not output long narrative summaries when a task board is clearer

# Expected output
- a compact but concrete orchestration status report
- clear ownership and next action for each active concern
- explicit identification of anything that needs user input