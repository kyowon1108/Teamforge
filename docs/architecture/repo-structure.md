# Repository Structure

This document defines the working repository layout for TeamForge so humans and Claude Code can operate against the same boundaries.

## Principles

- Keep runtime apps inside `apps/`.
- Keep shared contracts and shared config inside `packages/`.
- Keep automation and prompts separate from application code.
- Keep decision records and operating history in `docs/`.
- Treat research as input, not as implementation truth.

## Canonical Tree

```text
Teamforge2/
  .claude/
    agents/
    commands/
    settings.json
  apps/
    web/
      app/
      components/
      hooks/
      lib/
      public/
      types/
    api/
      prisma/
      src/
      test/
  packages/
    contracts/
      src/
        ai/
        common/
        jsonb/
    config/
      eslint/
      typescript/
  tooling/
    prompts/
    scripts/
  infra/
    deploy/
    docker/
  tests/
    e2e/
  docs/
    _templates/
    adr/
    api/
    architecture/
    product/
    progress/
    research/
    reviews/
      ai-artifacts/
    runbooks/
```

## Ownership Guidance

- `apps/web/`: user-facing UI and route-level composition
- `apps/api/`: main API surface, auth/session exchange, realtime, persistence orchestration
- `packages/contracts/`: shared schemas and type-safe payload contracts
- `packages/config/`: repo-wide lint, tsconfig, and shared build presets
- `tooling/`: repeatable scripts and reviewed prompt assets
- `infra/`: environment and deploy scaffolding
- `tests/`: end-to-end and cross-app verification
- `docs/`: source-of-truth decision trail

## Backend Boundary Clarification

There is a real document mismatch in the imported materials:

- research documents describe a `Next.js + FastAPI + PostgreSQL` direction
- Claude orchestration docs describe `Next.js + NestJS + Prisma + PostgreSQL`

For this repository, the implementation baseline is:

1. `apps/web` is the Next.js application
2. `apps/api` is the primary backend boundary
3. Prisma and shared contracts are first-class from day one
4. Python-based AI execution may be extracted later only if the workload clearly outgrows the main API boundary

If that extraction happens, the reserved future location is `apps/ai/`, and it should be introduced by ADR first so ownership and orchestration rules can be updated together.

## Documentation Coupling

Whenever a new major folder is introduced, update all of the following together:

- this document
- `docs/progress/decisions.md`
- `CLAUDE.md` if developer instructions depend on the new path
- `.claude/agents/*.md` if ownership boundaries change
