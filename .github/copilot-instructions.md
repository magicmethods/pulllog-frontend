# Copilot Instructions — Pulllog Frontend

## API Schema (Canonical Source)

The authoritative OpenAPI schema for the Pulllog API is maintained in the **contract** workspace:

- Canonical file: `contract/api-schema.yaml`
- Relative path from this workspace root: `../contract/api-schema.yaml`
- When working in the multi-root workspace (`pulllog.code-workspace` or `frontend.code-workspace`), the file is accessible as `${workspaceFolder:contract}/api-schema.yaml`.

> **Important:** `frontend/api-schema.yaml` is a local copy for reference only.  
> Always treat `contract/api-schema.yaml` as the source of truth.  
> When adding or modifying API endpoints, consult the contract schema first.

## API Endpoints

- Client-side endpoint definitions are centralized in `api/endpoints.ts`.
- All HTTP requests use `fetch` (not `useFetch`).
- When implementing a new endpoint, verify the request/response schema against `contract/api-schema.yaml`.

## General Guidelines

See `AGENTS.md` in this workspace root for full coding conventions, build commands, and PR guidelines.
