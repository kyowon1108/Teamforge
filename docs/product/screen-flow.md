# Screen Flow

This file tracks the canonical flow, dependencies, and readiness level of each screen.

Status vocabulary:

- `defined`: the product behavior is documented
- `ready-for-build`: enough clarity exists to start implementation
- `needs-adr`: blocked by an unresolved architecture decision
- `backlog`: intentionally not ready yet

## Primary Flow

```text
Login
  -> Role Select
  -> Team Create / Join
  -> Skill Assessment
  -> Personal Result
  -> Team Dashboard
  -> Topic Decision
  -> System Framing
  -> Technical Narrowing
  -> Handoff Layer
  -> Kickoff Summary / Contract Gate
  -> First Meeting / Meeting Hub
```

## Flow Table

| Screen | Entry Condition | Exit Condition | Depends On | Readiness |
| --- | --- | --- | --- | --- |
| Login | no active session | valid OAuth session | auth provider config | ready-for-build |
| Role Select | authenticated session | role chosen | none | ready-for-build |
| Team Create / Join | role chosen | team membership exists | invite flow, team model | ready-for-build |
| Skill Assessment | member or leader joined | survey submitted or saved | survey contracts, autosave pattern | ready-for-build |
| Personal Result | assessment complete | role reaction saved or skipped | analysis output contracts | ready-for-build |
| Team Dashboard | team exists | kickoff entry selected | team aggregate state | ready-for-build |
| Topic Decision | dashboard phase unlocked | topic confirmed | topic reaction model, AI suggestion contract | ready-for-build |
| System Framing | topic confirmed | structure blocks accepted | structure block model | ready-for-build |
| Technical Narrowing | structure accepted | stack accepted | stack recommendation contract | ready-for-build |
| Handoff Layer | stack accepted | artifact previews accepted | artifact generation flow | needs-adr |
| Kickoff Summary / Contract Gate | handoff artifacts accepted | kickoff contract finalized | role acceptance, summary schema | needs-adr |
| First Meeting / Meeting Hub | kickoff contract finalized | first-week actions recorded | agenda, summary, meeting schema | ready-for-build |
| Direction Tracker | execution started | snapshot recorded | execution model | backlog |
| Change Management | execution started | change request resolved | approval and change ledger | backlog |
| Observer Dashboard / Health View | observer joined | coaching review saved | aggregated read model | backlog |

## Role Branches

- `leader`: full flow, including kickoff finalization and approval actions
- `member`: full contribution flow except leader-only final approval actions
- `observer`: joins at team view, reads progress, does not edit survey or personal-result content

## Role Access Matrix

Access levels per screen and role. These levels are the authoritative source for middleware guards, NestJS role decorators, and frontend conditional rendering (KF-004).

Legend:
- `rw` — read and write (full interaction)
- `r` — read-only (no mutations)
- `sign` — signature authority (leader only, additive to rw)
- `react` — can react or acknowledge but cannot initiate changes
- `-` — no access; redirect applies (see Guard/Redirect table below)
- `n/a` — screen is pre-authentication; role has not been assigned yet

| Screen | Path (canonical) | leader | member | observer | Notes |
|--------|-----------------|--------|--------|----------|-------|
| 1 Login | `/login` | n/a | n/a | n/a | Pre-auth; all users access unconditionally |
| 2 Role Select | `/role-select` | n/a | n/a | n/a | Post-auth, pre-role; redirect out once role is set |
| 3a Team Create | `/team/new` | rw | rw | rw | Pre-team; redirect out once team membership exists |
| 3b Team Join | `/team/join` | rw | rw | rw | Pre-team; redirect out once team membership exists |
| 4 Skill Assessment | `/team/[id]/survey` | rw | rw | - | Observer redirects to Screen 6 |
| 5 Personal Result | `/team/[id]/result` | rw | rw | - | Observer redirects to Screen 6 |
| 6 Team Dashboard | `/team/[id]/dashboard` | rw | rw | r | Observer sees aggregated view, no edit actions |
| 7 Topic Decision | `/team/[id]/kickoff/topic` | rw | rw | r | Observer cannot submit or react |
| 8 Architecture Builder | `/team/[id]/kickoff/architecture` | rw | rw | r | Observer cannot select options |
| 9 Handoff Layer | `/team/[id]/kickoff/handoff` | rw | r | r | Member views generated artifacts, cannot regenerate |
| 10 Contract Gate | `/team/[id]/kickoff/summary` | rw + sign | r + react | r | Leader signs; member acknowledges; observer reads |
| 11 Meeting Hub | `/team/[id]/meetings` | rw | rw | r | Observer cannot create or edit meeting records |
| 12 Direction Tracker | `/team/[id]/tracker` | rw | r | r | Only leader can record snapshots |
| 13 Change Management | `/team/[id]/changes` | rw | rw | r | Both leader and member can open change requests |
| 14 Dashboard | `/team/[id]/overview` | r | r | r | Aggregate read for all roles; no mutations |

## Guard / Redirect Table

These rules apply in order. The first matching condition wins.

| Priority | Condition | Redirect destination | Notes |
|----------|-----------|---------------------|-------|
| 1 | Unauthenticated user hits any protected route | `/login` (Screen 1) | middleware.ts must list all non-public paths (KF-005) |
| 2 | Authenticated + role not set | `/role-select` (Screen 2) | Checked after session is confirmed |
| 3 | Authenticated + role set + no team membership | `/team/join-or-create` (Screen 3) | Covers both create and join entry points |
| 4 | `observer` role + Screen 4 (`/survey`) | `/team/[id]/dashboard` (Screen 6) | Survey is not applicable to observers |
| 5 | `observer` role + Screen 5 (`/result`) | `/team/[id]/dashboard` (Screen 6) | Personal result is not applicable to observers |
| 6 | `member` or `observer` + leader-only write action (sign, regenerate) | Same screen, read-only variant rendered | No redirect; UI suppresses action controls |
| 7 | Authenticated + role set + team exists + hits `/login`, `/role-select`, or `/team/join-or-create` | `/team/[id]/dashboard` (Screen 6) | Prevent backward navigation to completed setup steps |

## Open Structural Notes

- Screen 9 and 10 should stay separated in docs even if the UI later compresses them into a single journey.
- Screens 12 to 14 need dedicated product docs before implementation begins.
- If AI-generated outputs can be written back to GitHub, Slack, or Notion, the approval checkpoint must remain explicit in both UI and runbook documentation.
- The Role Access Matrix above is the single source of truth for all guard logic. Any deviation in middleware.ts, NestJS guards, or frontend conditional rendering must be reconciled here first (KF-004).
