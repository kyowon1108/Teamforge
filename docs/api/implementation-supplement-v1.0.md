# Implementation Supplement v1.0

This document turns the higher-level product and research documents into implementation-facing rules for contracts, ownership, and safety.

## API Boundary

Current repository baseline:

- `apps/web`: Next.js frontend
- `apps/api`: primary backend boundary
- `packages/contracts`: shared validation layer

The main API owns:

- team lifecycle
- survey persistence
- analysis orchestration
- realtime events
- kickoff decisions
- review-state metadata

## Route Conventions

- Public auth entry stays under frontend auth routing
- Domain routes use `/api/teams/:teamId/...`
- Resource creation returns the normalized resource or accepted job token
- Long-running AI work must expose job state or websocket events, not silent fire-and-forget behavior

## Auth and Role Rules

- Session identity is established by NextAuth-compatible login flow
- Web to API session exchange must use `SESSION_EXCHANGE_SECRET`
- All team-scoped reads and writes require a team membership check
- Observer role is read-only unless a later ADR explicitly expands permissions

## Contract Rules

- JSONB payloads are validated through `packages/contracts/src/jsonb/`
- AI request and response payloads are validated through `packages/contracts/src/ai/`
- Shared enums and cross-app primitives belong in `packages/contracts/src/common/`
- Never persist opaque AI JSON without schema validation and a version field where evolution is likely

## AI Execution Rules

- User input included in prompts must be boundary-wrapped and sanitized
- Prompt assets that become stable belong in `tooling/prompts/`
- AI-generated artifacts that need human review must carry review metadata and be indexed in `docs/reviews/ai-artifacts/`
- Retries, model fallback, and failure logging should be explicit per workflow, not hidden in ad hoc helpers

## Realtime Rules

Realtime should be used for:

- team join notifications
- survey completion status
- async AI job completion
- kickoff reaction updates where multi-user visibility matters

Every realtime event should also have a recoverable server state so the UI can rebuild after refresh.

## File Upload Rules

- Use allowlists and magic-byte validation
- Store upload metadata separately from generated analysis
- Keep raw files and derived analysis distinguishable
- Add a runbook before enabling destructive cleanup or retention policies

## Review-Required Artifacts

The following outputs require explicit human checkpointing before external write-back or irreversible actions:

- collaboration file bundles
- contract or kickoff artifacts shared outside the app
- repository write-back plans
- workspace provisioning plans

Index these review checkpoints in `docs/reviews/ai-artifacts/`.
