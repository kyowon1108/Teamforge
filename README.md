# TeamForge

TeamForge is being organized as a collaboration-first monorepo for a team formation, kickoff, and execution support product.

The repository is intentionally split into product specs, implementation-facing docs, and execution history so Claude Code and humans can work from the same source of truth.

## Canonical Workspace Layout

```text
Teamforge2/
  .claude/              Claude Code orchestrator, agents, commands
  apps/                 Runtime applications
    web/                Next.js app
    api/                NestJS BFF + auth + realtime + domain API
  packages/             Shared contracts and repo-wide config
    contracts/          Zod schemas, shared types, AI payload contracts
    config/             Shared tsconfig/eslint/etc.
  tooling/              Prompts, scripts, local automation helpers
  infra/                Deployment and container scaffolding
  tests/                Cross-app test suites
  docs/                 Canonical specs, ADRs, runbooks, progress logs
```

## Document Order

Use these documents in this order when making decisions:

1. `docs/product/system-spec.md`
2. `docs/product/screen-flow.md`
3. `docs/api/implementation-supplement-v1.0.md`
4. `docs/architecture/repo-structure.md`
5. `docs/progress/decisions.md`
6. `docs/progress/*.md`

`docs/research/` is preserved as background material, not the implementation source of truth.

## Collaboration Rules

- Product intent lives in `docs/product/`.
- Architecture and repo-boundary decisions live in `docs/architecture/` and `docs/adr/`.
- Session-by-session history lives in `docs/progress/`.
- Human approval checkpoints for AI-generated artifacts live in `docs/reviews/ai-artifacts/`.
- Operational steps that can damage data or environments live in `docs/runbooks/`.

## Bootstrap Commands

```bash
pnpm install
pnpm typecheck
pnpm --filter @teamforge/web dev
pnpm --filter @teamforge/api dev
```
