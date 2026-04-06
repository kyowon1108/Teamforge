# ADR-001: Repo Structure and Documentation Governance

- Status: accepted
- Date: 2026-04-06

## Context

The repository contains valuable product research and Claude orchestration rules, but no stable workspace layout or canonical documentation map yet. Without structure, implementation and documentation can drift immediately.

## Decision

Adopt a collaboration-first monorepo with these top-level boundaries:

- `apps/` for runtime applications
- `packages/` for shared contracts and shared configuration
- `tooling/` for scripts and prompt assets
- `infra/` for deployment scaffolding
- `tests/` for cross-app verification
- `docs/` for source-of-truth documentation and history

Inside `docs/`, separate product intent, API constraints, architecture, ADRs, runbooks, review queues, progress logs, and research archives.

## Consequences

- Humans and Claude Code have a predictable place for each class of change
- Research can stay preserved without silently overriding implementation decisions
- Progress and decisions become traceable over time
- New top-level folders now require a documentation update, not just a code change
