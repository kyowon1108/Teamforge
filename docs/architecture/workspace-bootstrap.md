# Workspace Bootstrap

This document describes the minimum local starting point for Claude Code and human contributors.

## Ready State

The repository is considered bootstrap-ready when all of the following exist:

- root `package.json`
- `pnpm-workspace.yaml`
- `turbo.json`
- `apps/web` minimal Next.js app
- `apps/api` minimal NestJS app
- `packages/contracts` shared Zod contract package

## First Commands

```bash
pnpm install
pnpm typecheck
pnpm --filter @teamforge/web dev
pnpm --filter @teamforge/api dev
```

## Notes

- `pnpm install` has been validated once in this repository.
- `pnpm typecheck` passes.
- `pnpm --filter @teamforge/web build` passes.
- `pnpm --filter @teamforge/api build` passes.
- Prisma-related build scripts may be blocked by pnpm until explicitly approved. If database work starts and Prisma client generation is needed, run `pnpm approve-builds` and then the appropriate Prisma generate or migration command.

## Claude Code Starting Assumptions

- frontend work starts in `apps/web`
- backend work starts in `apps/api`
- shared schema work starts in `packages/contracts`
- product truth comes from `docs/product`
- implementation rules come from `docs/api` and `docs/architecture`
