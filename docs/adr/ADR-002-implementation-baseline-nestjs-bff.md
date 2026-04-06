# ADR-002: Implementation Baseline Uses NestJS BFF First

- Status: accepted
- Date: 2026-04-06

## Context

Imported research documents describe a `Next.js + FastAPI + PostgreSQL` topology, while the active Claude orchestration and agent ownership rules assume `Next.js + NestJS + Prisma + PostgreSQL`.

That mismatch would create confusion during implementation, code review, and documentation updates.

## Decision

Use the following implementation baseline for this repository:

- `apps/web` is the Next.js frontend
- `apps/api` is the primary backend boundary
- Prisma and shared contract schemas are part of the starting architecture
- Python-based AI execution is not the default starting boundary

If Python extraction becomes necessary later, introduce it intentionally through a new ADR and a dedicated path such as `apps/ai/`.

## Consequences

- Current Claude orchestration can be used without immediate redesign
- Research documents remain useful as conceptual input, not direct implementation law
- AI-heavy workflows should still be designed so they can be extracted later without breaking contracts
