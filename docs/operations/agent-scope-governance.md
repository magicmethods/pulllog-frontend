# Agent Scope Governance

## Purpose

- Prevent unauthorized cross-team edits from frontend agents.
- Standardize escalation and handoff when backend/contract changes are needed.
- Keep incident accountability clear in dirty or mixed worktrees.

## Default Scope

- Frontend agents operate in `frontend/` only.
- `backend/` and `contract/` are read-only unless explicitly authorized by the user in the current request.

## Mandatory Gate

Before any edit or command that changes `backend/` or `contract/`, all of the following are required:

1. The need for cross-team change is stated explicitly.
2. The user gives explicit authorization in the same request thread.
3. The agent confirms which files and commands are in scope.

If any item is missing, implementation must stop.

## Required Handoff Packet (when not authorized)

When cross-team work is needed but not authorized, return a handoff packet containing:

- required backend/contract changes
- impacted endpoints, runtime behavior, and affected frontend cases
- validation expectations (tests, smoke checks, E2E cases)
- rollback considerations and risk notes

## Required Record (when authorized)

If cross-team edits are explicitly authorized and executed, the same turn must include:

- file-level change summary
- intent and behavior delta
- verification performed and gaps
- known residual risks

## Dirty Worktree Handling

- Do not assume all modified files are authored in the current task.
- Distinguish high-confidence task edits from pre-existing changes.
- If attribution is uncertain, state uncertainty explicitly in the report.

## Incident Response Minimum

For any scope breach or suspected breach:

1. Stop further cross-team edits.
2. Produce a file-by-file incident handoff report.
3. Add or update governance rules in:
   - `AGENTS.md`
   - `.github/copilot-instructions.md`
   - relevant `.github/agents/*.agent.md`
4. Resume implementation only after user direction.