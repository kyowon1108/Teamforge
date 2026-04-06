# Docs Map

This folder is split so product intent, implementation constraints, and execution history do not get mixed together.

## Source-of-Truth Order

1. `product/` what we are building
2. `api/` how requests, events, and contracts behave
3. `architecture/` how the repository and systems are partitioned
4. `adr/` durable decisions and tradeoffs
5. `progress/` what actually happened over time
6. `runbooks/` how to perform sensitive operations
7. `reviews/ai-artifacts/` approval checkpoints for AI-generated deliverables
8. `research/` background and imported exploratory material

## Collaboration Loop

1. Research or import background into `research/`
2. Promote stable conclusions into `product/`, `api/`, or `architecture/`
3. Record important decisions in `adr/` and `progress/decisions.md`
4. Log each implementation session in `progress/`
5. Gate risky changes with `runbooks/` and `reviews/ai-artifacts/`

## Naming Conventions

- Progress logs: `YYMMDD_NN-brief-english-desc.md`
- ADRs: `ADR-NNN-slug.md`
- Runbooks: `runbook-{topic}.md` or `migration-{topic}.md`
- Review requests: `YYYYMMDD-{agent-or-area}.md`
