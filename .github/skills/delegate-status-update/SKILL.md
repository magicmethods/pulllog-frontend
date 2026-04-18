---
name: delegate-status-update
description: Standardize how specialist agents report task progress back to an orchestrator
---

# Purpose
Use this skill when a specialist agent is working under an orchestrator and must return progress in a way that is easy to aggregate.

# When to use
- the task was delegated by an orchestrator
- the specialist agent is returning an interim update
- the specialist agent is returning a final result
- the specialist agent encountered a blocker or needs clarification

# Core rule
Return status in a form the orchestrator can copy into a task board with minimal rewriting.

# Required output fields
Every progress or completion update should include:
- task name
- owner agent
- status
- latest concrete progress
- remaining work
- blocker
- next action
- user input needed

# Status vocabulary
Use only these labels unless the human explicitly asks for another format:
- `in progress`
- `blocked`
- `completed`
- `unverified`

# Update rules
1. Prefer concrete, observable progress over vague statements.
2. If blocked, state the exact blocker and what is needed.
3. If complete, state the delivered outcome and any important residual risk.
4. If the user or orchestrator added new instructions, state whether they changed scope.
5. Keep updates concise enough for orchestration use.

# Recommended output format
- task name: ...
- owner agent: ...
- status: ...
- latest concrete progress: ...
- remaining work: ...
- blocker: ...
- next action: ...
- user input needed: ...

# Constraints
- do not claim completion without a real outcome
- do not hide uncertainty; mark it clearly
- do not return a free-form narrative when a structured update is possible

# Expected output
- a structured update the orchestrator can aggregate immediately
- explicit blocker or completion state
- minimal ambiguity about next action