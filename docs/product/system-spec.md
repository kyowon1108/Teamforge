# TeamForge System Spec

> Status: canonical bootstrap spec
> Derived from: `docs/research/2026-04-06-teamforge-final-research.md` and `docs/architecture/ai-agent-design.md`

This file is the concise implementation-facing summary of the product. The research archive keeps the deeper narrative and rationale.

## Product Goal

Help students or project teams form a team, understand member strengths, align on a kickoff direction, and leave a documented collaboration trail that can be reviewed by leaders and observers.

## Core Roles

- `leader`: creates the team, drives kickoff, finalizes decisions
- `member`: contributes profile data, reacts to recommendations, participates in kickoff
- `observer`: read-only coaching role with visibility into team progress

## Screen Inventory

| Screen | Route | Name | Primary Actor | Core Output | Product Status |
| --- | --- | --- | --- | --- | --- |
| 1 | `/` | Login | all | authenticated session | defined |
| 2 | `/role-select` | Role Select | all | role context | defined |
| 3 | `/team/create`, `/team/join` | Team Create / Join | leader, member, observer | team membership | defined |
| 4 | `/team/[teamId]/survey` | Skill Assessment | leader, member | profile and skill input | defined |
| 5 | `/team/[teamId]/result` | Personal Result | leader, member | role understanding and reaction | defined |
| 6 | `/team/[teamId]/dashboard` | Team Dashboard | all | readiness and next actions | defined |
| 7 | `/team/[teamId]/topic` | Topic Decision | leader, member | topic shortlist and reactions | defined |
| 8-A | `/team/[teamId]/structure` | System Framing | leader, member | architecture block decisions | defined |
| 8-B | `/team/[teamId]/stack` | Technical Narrowing | leader, member | stack decisions | defined |
| 9 | `/team/[teamId]/handoff` | Handoff Layer | leader, member | collaboration artifacts | defined |
| 10 | `/team/[teamId]/contract` | Kickoff Summary / Contract Gate | leader, member, observer(read) | accepted kickoff contract | defined |
| 11 | `/team/[teamId]/meeting` | First Meeting / Meeting Hub | all | agenda, summary, next actions | defined |
| 12 | tbd | Direction Tracker | all | execution direction snapshots | backlog |
| 13 | tbd | Change Management | all | change requests and approval trail | backlog |
| 14 | tbd | Observer Dashboard / Health View | observer | coaching and review visibility | backlog |

## Cross-Cutting Product Rules

- Every major step should leave a visible artifact or state change.
- Observer access is read-only unless explicitly documented otherwise.
- AI suggestions are assistive, not authoritative.
- Human approval is required for AI-generated collaboration artifacts before external write-back or publishing.
- Team state should remain legible from the dashboard without requiring synchronous presence from every member.

## Current Repo Reality

This repository currently contains planning and collaboration scaffolding, not working app code. Treat every screen as `not started in repo` until code lands, even if prior-project documents describe a more advanced implementation state.
