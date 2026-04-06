# Screen Flow

This file tracks the canonical flow, dependencies, and readiness level of each screen.

Status vocabulary:

- `defined`: the product behavior is documented
- `ready-for-build`: enough clarity exists to start implementation
- `needs-adr`: blocked by an unresolved architecture decision
- `backlog`: intentionally not ready yet
- `implemented`: code is live and matches this spec

Implementation markers:
- `✅` — implemented and verified against code
- `⚠️` — partially implemented or behaviour differs from spec
- `⬜` — not yet implemented

---

## Primary Flow

```text
Login (OAuth)
  -> Dashboard                  ← direct post-auth redirect
      -> Team Create            ← CTA: "새 팀 만들기"
          -> Dashboard
      -> Team Join              ← CTA: "초대코드로 참가하기" (역할: member | observer 선택)
          -> Dashboard
  -> (팀 선택) Team Detail / Kickoff
      -> Skill Assessment
      -> Personal Result
      -> Team Dashboard (팀별)
      -> Topic Decision
      -> System Framing
      -> Technical Narrowing
      -> Handoff Layer
      -> Kickoff Summary / Contract Gate
      -> First Meeting / Meeting Hub
```

> Note: `/role-select` is deprecated. Role selection was moved into the Team Join screen.
> The path `/role-select` now redirects unconditionally to `/dashboard`.

---

## Flow Table

| Screen | Path (canonical) | Entry Condition | Exit Condition | Impl | Readiness |
| --- | --- | --- | --- | --- | --- |
| 1 Login | `/login` | no active session | valid OAuth session | ✅ | implemented |
| 2 Role Select | `/role-select` | — **deprecated** — | redirects to `/dashboard` | ⚠️ | deprecated |
| 3a Team Create | `/team/create` | authenticated, dashboard CTA clicked | team created, invite code shown, then → `/team/[teamId]` | ✅ | implemented |
| 3b Team Join | `/team/join` | authenticated, dashboard CTA clicked | team joined (role: member\|observer), then → `/team/[teamId]` | ✅ | implemented |
| 4 Skill Assessment | `/team/[teamId]/survey` | team membership exists, role is leader or member | survey submitted or saved | ⬜ | ready-for-build |
| 5 Personal Result | `/team/[teamId]/result` | assessment complete | role reaction saved or skipped | ⬜ | ready-for-build |
| 6 Team Dashboard | `/dashboard` (global) + `/team/[teamId]` (per-team) | authenticated | kickoff entry selected | ✅ (global) ⬜ (per-team) | implemented (partial) |
| 7 Topic Decision | `/team/[teamId]/kickoff/topic` | dashboard phase unlocked | topic confirmed | ⬜ | ready-for-build |
| 8 Architecture Builder | `/team/[teamId]/kickoff/architecture` | topic confirmed | structure blocks accepted | ⬜ | ready-for-build |
| 9 Handoff Layer | `/team/[teamId]/kickoff/handoff` | structure accepted | artifact previews accepted | ⬜ | needs-adr |
| 10 Contract Gate | `/team/[teamId]/kickoff/summary` | handoff artifacts accepted | kickoff contract finalized | ⬜ | needs-adr |
| 11 Meeting Hub | `/team/[teamId]/meetings` | kickoff contract finalized | first-week actions recorded | ⬜ | ready-for-build |
| 12 Direction Tracker | `/team/[teamId]/tracker` | execution started | snapshot recorded | ⬜ | backlog |
| 13 Change Management | `/team/[teamId]/changes` | execution started | change request resolved | ⬜ | backlog |
| 14 Observer Dashboard | `/team/[teamId]/overview` | observer joined | coaching review saved | ⬜ | backlog |

---

## Role Branches

- `leader`: created via Team Create only. Full flow including kickoff finalization and approval actions.
- `member`: joins via Team Join, selects member role. Full contribution flow except leader-only final approval actions.
- `observer`: joins via Team Join, selects observer role. Reads progress; cannot edit survey, personal result, or kickoff artifacts.

> Role is no longer a separate setup screen. It is set at the moment of joining a team (`/team/join`).
> Team creators are always assigned the `leader` role automatically by the API.

---

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
| 2 Role Select | `/role-select` | — | — | — | **Deprecated.** Redirects to `/dashboard`. Role is set during team join. |
| 3a Team Create | `/team/create` | rw | rw | rw | Any authenticated user can create a team; creator becomes leader |
| 3b Team Join | `/team/join` | rw | rw | rw | member or observer role chosen here; leader role not available via join |
| 4 Skill Assessment | `/team/[teamId]/survey` | rw | rw | - | Observer redirects to `/dashboard` |
| 5 Personal Result | `/team/[teamId]/result` | rw | rw | - | Observer redirects to `/dashboard` |
| 6 Team Dashboard (global) | `/dashboard` | rw | rw | r | Shows all teams user belongs to; CTA buttons for create/join |
| 6 Team Dashboard (per-team) | `/team/[teamId]` | rw | rw | r | Observer sees aggregated view, no edit actions |
| 7 Topic Decision | `/team/[teamId]/kickoff/topic` | rw | rw | r | Observer cannot submit or react |
| 8 Architecture Builder | `/team/[teamId]/kickoff/architecture` | rw | rw | r | Observer cannot select options |
| 9 Handoff Layer | `/team/[teamId]/kickoff/handoff` | rw | r | r | Member views generated artifacts, cannot regenerate |
| 10 Contract Gate | `/team/[teamId]/kickoff/summary` | rw + sign | r + react | r | Leader signs; member acknowledges; observer reads |
| 11 Meeting Hub | `/team/[teamId]/meetings` | rw | rw | r | Observer cannot create or edit meeting records |
| 12 Direction Tracker | `/team/[teamId]/tracker` | rw | r | r | Only leader can record snapshots |
| 13 Change Management | `/team/[teamId]/changes` | rw | rw | r | Both leader and member can open change requests |
| 14 Observer Dashboard | `/team/[teamId]/overview` | r | r | r | Aggregate read for all roles; no mutations |

---

## Guard / Redirect Table

These rules apply in order. The first matching condition wins.

| Priority | Condition | Redirect destination | Status | Notes |
|----------|-----------|---------------------|--------|-------|
| 1 | Unauthenticated user hits any PROTECTED_PATH | `/login` (Screen 1) | ✅ | `middleware.ts` enforces PROTECTED_PATHS list (KF-005) |
| 2 | Authenticated + role not set → `/role-select` | `/dashboard` | ⚠️ deprecated | `/role-select` no longer a setup gate; redirects straight to `/dashboard` |
| 3 | Authenticated + no team → CTA prompt | `/dashboard` (empty state CTA) | ✅ | No hard redirect; dashboard shows empty state with create/join buttons |
| 4 | `observer` role + `/team/[teamId]/survey` | `/dashboard` | ⬜ | Survey is not applicable to observers |
| 5 | `observer` role + `/team/[teamId]/result` | `/dashboard` | ⬜ | Personal result is not applicable to observers |
| 6 | `member` or `observer` + leader-only write action (sign, regenerate) | Same screen, read-only variant rendered | ⬜ | No redirect; UI suppresses action controls |
| 7 | Authenticated + team exists + hits `/login`, `/team/create`, or `/team/join` after setup | `/dashboard` | ⬜ | Prevent backward navigation to completed setup steps |

### PROTECTED_PATHS (middleware.ts, as implemented)

```
/dashboard
/team
/survey
/kickoff
/meeting
/changes
/settings
```

---

## Post-Auth Redirect Logic

```
OAuth callback (NextAuth)
  -> session created
  -> redirect('/dashboard')          ← always, regardless of role or team state
     -> DashboardPage (server component)
        -> listTeamsAction()
        -> if teams.length === 0:    DashboardClient shows empty state + create/join CTA
        -> if teams.length > 0:      DashboardClient shows team cards with "계속하기" button
```

The old pattern of redirecting to `/role-select` after OAuth is removed. Role assignment is deferred to the point of team creation or team join.

---

## Team Create Flow Detail

```
/dashboard → "새 팀 만들기" button
  -> /team/create
     -> user enters team name (2–50 chars)
     -> createTeamAction() called (Server Action)
        -> API: POST /teams
        -> creator assigned leader role automatically
        -> invite code generated
     -> success: invite code shown with copy button
     -> "팀 페이지로 이동" → /team/[teamId]

Error states:
  - team name < 2 or > 50 chars: inline validation (client-side)
  - API error: inline error message
  - network error: "네트워크 오류가 발생했습니다. 다시 시도해 주세요."

Back navigation:
  - "대시보드로 돌아가기" → /dashboard
```

---

## Team Join Flow Detail

```
/dashboard → "초대코드로 참가하기" button
  -> /team/join
     -> user enters 6-char invite code (uppercase, auto-formatted)
     -> user selects role: member | observer
        (leader role not available here; only via team create)
     -> joinTeamAction(code, role) called (Server Action)
        -> API: POST /teams/join
     -> success: → /team/[teamId]

Error states:
  - code length < 6: submit button disabled
  - invalid/expired code: inline error from API
  - network error: "네트워크 오류가 발생했습니다. 다시 시도해 주세요."

Back navigation:
  - "대시보드로 돌아가기" → /dashboard
```

---

## Open Structural Notes

- `/role-select` remains in the codebase as a redirect-only page for bookmark/link compatibility. It should not be removed until confirmed no external links point to it.
- `/team/join-or-create` exists as a legacy page (`app/team/join-or-create/`). Its Server Actions (`createTeamAction`, `joinTeamAction`) are currently imported by `/team/create` and `/team/join`. This shared actions file is a temporary coupling; actions should be migrated to their respective route directories when the legacy page is removed.
- Screen 9 and 10 should stay separated in docs even if the UI later compresses them into a single journey.
- Screens 12 to 14 need dedicated product docs before implementation begins.
- If AI-generated outputs can be written back to GitHub, Slack, or Notion, the approval checkpoint must remain explicit in both UI and runbook documentation.
- The Role Access Matrix above is the single source of truth for all guard logic. Any deviation in middleware.ts, NestJS guards, or frontend conditional rendering must be reconciled here first (KF-004).
