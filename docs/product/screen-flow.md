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
| 5 Personal Result | `/team/[teamId]/result` | survey submitted (leader/member only) | role reaction saved or skipped | ⬜ | ready-for-build |
| 6 Team Dashboard | `/dashboard` (global) + `/team/[teamId]/dashboard` (per-team) | authenticated | kickoff CTA clicked (all surveys submitted) | ✅ (global) ⬜ (per-team) | implemented (partial) |
| 7 Topic Decision | `/team/[teamId]/topic` | all surveys submitted (phase: survey_complete) | topic confirmed by leader | ⬜ | ready-for-build |
| 8a System Framing | `/team/[teamId]/structure` | topic confirmed (phase: topic_confirmed) | structure blocks accepted by leader | ⬜ | ready-for-build |
| 8b Technical Narrowing | `/team/[teamId]/stack` | structure accepted (phase: structure_accepted) | stack confirmed by leader | ⬜ | ready-for-build |
| 9 Handoff Layer | `/team/[teamId]/handoff` | stack confirmed (phase: stack_confirmed) | all artifacts accepted by leader | ⬜ | needs-adr (KF-015) |
| 10 Contract Gate | `/team/[teamId]/contract` | handoff accepted (phase: handoff_accepted) | kickoff contract signed by leader | ⬜ | needs-adr (KF-015) |
| 11 Meeting Hub | `/team/[teamId]/meeting` | contract signed (phase: contract_signed) | first meeting closed | ⬜ | ready-for-build |
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

---

## Screen 5~11 Flow Design

> Added: 2026-04-06
> Covers routes: `/team/[teamId]/result`, `/team/[teamId]/dashboard`, `/team/[teamId]/topic`, `/team/[teamId]/structure`, `/team/[teamId]/stack`, `/team/[teamId]/handoff`, `/team/[teamId]/contract`, `/team/[teamId]/meeting`

---

### Full Flow Diagram (Screen 4 onwards)

```text
Screen 4 — Skill Assessment (/team/[teamId]/survey)
  [leader, member: submit]
  -> Screen 5 — Personal Result (/team/[teamId]/result)
      [leader, member: view radar chart + save reaction]
      -> Screen 6 — Team Dashboard (/team/[teamId]/dashboard)
          [all roles: see aggregate survey status]
          [gate: ALL members submitted survey]
          -> Screen 7 — Topic Decision (/team/[teamId]/topic)
              [leader: confirm topic]
              [member: react]
              -> Screen 8a — System Framing (/team/[teamId]/structure)
                  [leader: accept architecture blocks]
                  [member: react]
                  -> Screen 8b — Technical Narrowing (/team/[teamId]/stack)
                      [leader: accept stack decisions]
                      [member: react]
                      -> Screen 9 — Handoff Layer (/team/[teamId]/handoff)
                          [leader: accept or regenerate artifacts]
                          [member: view artifacts]
                          -> Screen 10 — Contract Gate (/team/[teamId]/contract)
                              [leader: sign kickoff contract]
                              [member: acknowledge]
                              [observer: read]
                              -> Screen 11 — Meeting Hub (/team/[teamId]/meeting)
                                  [all: agenda, summary, next actions]

observer: can enter Screen 6, 7, 8a, 8b, 10, 11 in read-only mode
          blocked from Screen 5 (no personal result) → redirects to /team/[teamId]/dashboard
```

---

### Route Table (Canonical — Screen 5~11)

| Screen | Canonical Path | Notes |
|--------|---------------|-------|
| 5 Personal Result | `/team/[teamId]/result` | Individual; no shared state |
| 6 Team Dashboard (per-team) | `/team/[teamId]/dashboard` | Replaces current `/team/[teamId]` fallback |
| 7 Topic Decision | `/team/[teamId]/topic` | Was `/team/[teamId]/kickoff/topic` in old table; simplified |
| 8a System Framing | `/team/[teamId]/structure` | Was `/team/[teamId]/kickoff/architecture` |
| 8b Technical Narrowing | `/team/[teamId]/stack` | New dedicated route |
| 9 Handoff Layer | `/team/[teamId]/handoff` | needs-adr (see KF-015) |
| 10 Contract Gate | `/team/[teamId]/contract` | needs-adr (see KF-015) |
| 11 Meeting Hub | `/team/[teamId]/meeting` | Plural path optional; keep singular for consistency |

> Route simplification rationale: `/kickoff/` prefix is dropped. Each screen is a direct child of `/team/[teamId]/`. This flattens the URL hierarchy, makes breadcrumb construction trivial, and avoids a layout boundary at `/kickoff/`.

---

### Screen 5 — Personal Result

**Route:** `/team/[teamId]/result`

**Entry condition:**
- authenticated, team member (leader or member role)
- `SurveyResponse.submitted === true` for this user in this team
- If not submitted: redirect to `/team/[teamId]/survey`
- observer: redirect to `/team/[teamId]/dashboard`

**Core UI:**
- Radar chart with 6 axes (see scoring below)
- Top 2 strength labels (highest scoring axes)
- Bottom 1 gap label (lowest scoring axis)
- Role suggestion card: AI-generated suggested role based on profile
- Reaction prompt: "이 결과가 나를 잘 표현하나요?" (yes/somewhat/no — saved to DB)
- CTA: "팀 현황 보기" → `/team/[teamId]/dashboard`

**Radar Chart — 6 Axes and Scoring Source**

The axes map directly to the 6 survey sections in `SurveyAnswersSchema`:

| Axis Label | Survey Section | Score Calculation |
|-----------|---------------|-------------------|
| 기획력 (Planning) | Section 1 — Role & Contribution | average of s1 question scores |
| 기술력 (Technical) | Section 2 — Tech Stack | average of s2 question scores |
| 소통력 (Communication) | Section 3 — Collaboration Style | average of s3 question scores |
| 추진력 (Drive) | Section 4 — Work Preference | average of s4 question scores |
| 창의력 (Creativity) | Section 5 — Conflict & Decision | average of s5 question scores |
| 성장력 (Growth) | Section 6 — Portfolio & Background | selfIntro richness + GitHub presence |

Scoring rules:
- Each multiple-choice question maps to 1–5 scale (defined in `SurveyAnswersSchema`)
- Section average = sum of question scores / question count in section
- Section 6 score: `githubUrl` present = +2, `selfIntro` length > 100 chars = +2, else = 1 (floor)
- All axes normalized to 0–100 for chart display

**Strength / Gap Labeling:**
- Strength: top 2 axes with score >= 60
- Gap: lowest axis with score < 50
- If all axes >= 60: show "전반적으로 균형잡힌 프로필" message, no gap label

**API dependencies:**
- `GET /api/teams/:teamId/survey/result` — returns computed axis scores + AI role suggestion
- `POST /api/teams/:teamId/survey/reaction` — saves yes/somewhat/no reaction

**Role differences:**

| | leader | member | observer |
|-|--------|--------|----------|
| View result | rw | rw | redirect to dashboard |
| Save reaction | yes | yes | n/a |
| CTA to dashboard | yes | yes | n/a |

**Error states:**
- Survey not submitted → redirect to survey page with banner: "설문을 먼저 완료해야 결과를 볼 수 있어요"
- API score fetch fails → skeleton error state + "다시 시도" button
- AI role suggestion timeout (>10s) → show placeholder "분석 중..." spinner, poll every 3s up to 3 attempts

---

### Screen 6 — Team Dashboard (per-team)

**Route:** `/team/[teamId]/dashboard`

**Entry condition:**
- authenticated, any role, team membership exists
- This is the per-team dashboard, distinct from the global `/dashboard` (multi-team list)

**Core UI:**
- Team name header + invite code copy button
- Member list with per-member survey status badge:
  - "제출 완료" (green) — submitted
  - "작성 중" (yellow) — draft saved, not submitted
  - "미시작" (grey) — no response yet
- Aggregate progress bar: `submitted_count / total_member_count`
- Kickoff readiness block:
  - Locked state (not all submitted): "팀원 모두가 설문을 완료하면 킥오프를 시작할 수 있어요"
  - Unlocked state: "킥오프 시작하기" CTA → `/team/[teamId]/topic`
- Phase indicator: which kickoff phase the team is currently in (topic / structure / stack / handoff / contract / meeting)
- "내 결과 보기" shortcut → `/team/[teamId]/result` (leader/member only)

**Kickoff entry condition (gate):**
- ALL members with role `leader` or `member` must have `SurveyResponse.submitted === true`
- observer responses are not counted toward the gate
- Gate is re-evaluated on page load (server component) — no polling required

**Realtime events (Socket.io):**
- `survey:submitted` event → refreshes member status list without full page reload
- Room: `team:{teamId}`

**API dependencies:**
- `GET /api/teams/:teamId/members` — member list with survey status
- `GET /api/teams/:teamId/kickoff/phase` — current kickoff phase
- Socket.io room: `team:{teamId}`, event: `survey:submitted`

**Role differences:**

| | leader | member | observer |
|-|--------|--------|----------|
| View member list | rw | rw | r |
| View survey statuses | yes | yes | yes |
| "내 결과 보기" shortcut | yes | yes | no |
| "킥오프 시작하기" CTA | yes (initiates) | yes (follows leader) | no CTA shown |
| Invite code copy | yes | no | no |

**Error states:**
- API fetch failure → skeleton error + retry
- Team not found (deleted or left) → redirect to `/dashboard` with toast: "팀을 찾을 수 없어요"
- Empty team (only observer, no members) → show message: "팀원이 없어 킥오프를 진행할 수 없어요"

---

### Screen 7 — Topic Decision

**Route:** `/team/[teamId]/topic`

**Entry condition:**
- all members submitted survey (same gate as kickoff unlock in Screen 6)
- authenticated, team membership exists
- observer: allowed in read-only mode

**Core UI:**
- AI-generated topic shortlist (3–5 suggestions) based on team's combined survey profiles
- Each topic card shows: title, brief rationale, tag cloud (tech keywords)
- Leader action: select one topic, or enter a custom topic
- Member action: "좋아요" / "고민돼요" reaction per topic card
- Reaction tally visible to all
- Confirm button (leader only): locks the topic and advances phase
- Phase lock indicator: once confirmed, topic cannot be changed without leader re-edit

**Realtime events:**
- `topic:reaction` → updates reaction counts live
- `topic:confirmed` → all clients see topic locked state and CTA to next screen

**API dependencies:**
- `GET /api/teams/:teamId/topic/suggestions` — AI-generated topic list (async job, poll if pending)
- `POST /api/teams/:teamId/topic/react` — save member reaction
- `POST /api/teams/:teamId/topic/confirm` — leader confirms topic (advances phase)

**Role differences:**

| | leader | member | observer |
|-|--------|--------|----------|
| View topic suggestions | rw | rw | r |
| React to topics | yes | yes | no |
| Confirm topic | yes | no | no |
| Enter custom topic | yes | no | no |

**Error states:**
- AI topic generation pending (>15s) → show "AI가 팀 프로필을 분석하고 있어요" loading screen, poll every 5s up to 5 attempts
- AI generation failure → show manual topic entry form fallback
- Leader confirms before all members reacted → allowed; show "아직 반응하지 않은 팀원이 있어요" warning, not a blocker

---

### Screen 8a — System Framing

**Route:** `/team/[teamId]/structure`

**Entry condition:**
- topic confirmed (kickoff phase >= `topic_confirmed`)
- authenticated, team membership exists

**Core UI:**
- AI-generated system architecture block diagram (component list, not a diagram image)
- Block cards: Frontend, Backend, Database, Infra, AI/ML (shown if relevant), External APIs
- Each block has: suggested technology family, rationale, alternatives (collapsible)
- Leader action: accept each block individually, or override with dropdown selection
- Member action: react to each block ("좋아요" / "다른 의견")
- "다음: 기술 스택 선택" CTA (leader only, after all blocks accepted)

**API dependencies:**
- `GET /api/teams/:teamId/structure/suggestions` — AI-generated architecture blocks
- `POST /api/teams/:teamId/structure/accept` — leader accepts block set
- `POST /api/teams/:teamId/structure/react` — member reaction

**Role differences:**

| | leader | member | observer |
|-|--------|--------|----------|
| View blocks | rw | rw | r |
| React to blocks | yes | yes | no |
| Accept / override blocks | yes | no | no |
| Advance to stack screen | yes | no | no |

**Error states:**
- AI block generation pending → same polling pattern as Screen 7
- AI generation failure → show a preset default block set with a banner: "AI 분석 실패. 기본 구조를 표시합니다"

---

### Screen 8b — Technical Narrowing

**Route:** `/team/[teamId]/stack`

**Entry condition:**
- structure blocks accepted (kickoff phase >= `structure_accepted`)
- authenticated, team membership exists

**Core UI:**
- Per-block tech stack picker: dropdown or card selection per accepted architecture block
- "팀원 선호도" section: aggregated survey tech preferences shown as reference badges
- Leader action: confirm stack per block
- Member action: "이 기술 써봤어요" badge toggle (informational only)
- "다음: 협업 아티팩트 생성" CTA (leader only)

**API dependencies:**
- `GET /api/teams/:teamId/stack/options` — options per architecture block + team preference aggregation
- `POST /api/teams/:teamId/stack/confirm` — leader confirms stack choices

**Role differences:**

| | leader | member | observer |
|-|--------|--------|----------|
| View stack options | rw | rw | r |
| Mark experience badges | no | yes | no |
| Confirm stack | yes | no | no |

**Error states:**
- Conflicting stack choice (e.g., two incompatible frameworks flagged) → inline warning badge, not a blocker

---

### Screen 9 — Handoff Layer

**Route:** `/team/[teamId]/handoff`

**Entry condition:**
- stack confirmed (kickoff phase >= `stack_confirmed`)
- authenticated, team membership exists
- needs-adr: AI write-back to external tools (GitHub, Notion, Slack) requires ADR before implementation (KF-015 placeholder)

**Core UI:**
- AI-generated artifact previews:
  - README.md draft
  - CONTRIBUTING.md draft
  - GitHub Project board structure (column names, label list)
  - Team roles and responsibilities summary
- Each artifact shown in a preview panel (read-only markdown render)
- Leader action: "이 아티팩트 사용하기" to accept each artifact
- Leader action: "다시 생성" to regenerate individual artifact (max 3 regenerates per artifact)
- Member action: view only
- Human approval checkpoint: leader must explicitly accept all artifacts before write-back is enabled
- Write-back toggle (disabled until ADR resolved): "GitHub에 내보내기", "Notion에 내보내기"

**API dependencies:**
- `GET /api/teams/:teamId/handoff/artifacts` — AI-generated artifact list (job-based, poll)
- `POST /api/teams/:teamId/handoff/accept` — leader accepts artifact set
- `POST /api/teams/:teamId/handoff/regenerate/:artifactId` — regenerate single artifact

**Review checkpoint:**
- Accepted artifacts are indexed in `docs/reviews/ai-artifacts/` before any external write-back
- Write-back actions remain blocked in UI until this index entry exists

**Role differences:**

| | leader | member | observer |
|-|--------|--------|----------|
| View artifacts | rw | r | r |
| Accept artifacts | yes | no | no |
| Regenerate artifact | yes | no | no |
| Trigger write-back | yes (when unblocked) | no | no |

**Error states:**
- AI artifact generation failure → show manual editor fallback per artifact
- Regenerate limit reached (3/3) → "재생성 횟수를 초과했어요. 직접 편집해 주세요"
- Write-back API failure → show error toast, keep artifact accepted state

---

### Screen 10 — Contract Gate

**Route:** `/team/[teamId]/contract`

**Entry condition:**
- handoff artifacts accepted (kickoff phase >= `handoff_accepted`)
- authenticated, team membership exists
- needs-adr: finalized contract format and storage (KF-015 placeholder)

**Core UI:**
- Kickoff summary card:
  - Team name, topic, architecture summary, stack summary
  - Member roster with roles
  - Agreed collaboration artifacts list
- Signature section:
  - Leader: "킥오프 계약 서명하기" button → confirms and locks the kickoff
  - Member: "확인했습니다" acknowledgement button
  - Observer: read-only view
- Phase locked: once leader signs, all screens 7–10 become read-only
- "첫 번째 미팅 시작하기" CTA (all roles, post-signature) → `/team/[teamId]/meeting`

**API dependencies:**
- `GET /api/teams/:teamId/contract` — assembled kickoff contract data
- `POST /api/teams/:teamId/contract/sign` — leader signs (locks kickoff phase)
- `POST /api/teams/:teamId/contract/acknowledge` — member acknowledges

**Role differences:**

| | leader | member | observer |
|-|--------|--------|----------|
| View contract | rw | r + react | r |
| Sign contract | yes | no | no |
| Acknowledge | n/a | yes | no |
| Advance to Meeting Hub | yes (after sign) | yes (after ack) | yes (after leader signs) |

**Error states:**
- Leader tries to sign without all members acknowledging → allowed with warning: "아직 확인하지 않은 팀원이 있어요"
- API sign failure → toast error, do not advance phase

---

### Screen 11 — Meeting Hub

**Route:** `/team/[teamId]/meeting`

**Entry condition:**
- kickoff contract signed (kickoff phase === `contract_signed`)
- authenticated, team membership exists

**Core UI:**
- "첫 번째 미팅" pre-set agenda (generated from kickoff contract)
- Agenda editor: add/remove/reorder agenda items (leader and member)
- Meeting record section: notes, decisions, action items
- Action item list: assignee, due date, status toggle
- "미팅 완료" CTA: archives the record, creates a new empty meeting slot
- Meeting history list: previous meeting records (title, date, status)
- Observer: full read access to all meeting records and action items

**Realtime events:**
- `meeting:update` → live sync of agenda and notes while meeting is in progress

**API dependencies:**
- `GET /api/teams/:teamId/meetings` — meeting list
- `POST /api/teams/:teamId/meetings` — create new meeting record
- `PATCH /api/teams/:teamId/meetings/:meetingId` — update agenda/notes/action items
- `POST /api/teams/:teamId/meetings/:meetingId/close` — close meeting, archive record

**Role differences:**

| | leader | member | observer |
|-|--------|--------|----------|
| View meeting records | rw | rw | r |
| Edit agenda / notes | yes | yes | no |
| Assign action items | yes | yes | no |
| Close meeting | yes | no | no |
| Create new meeting slot | yes | yes | no |

**Error states:**
- No meetings exist (entry via direct URL before contract signed) → redirect to `/team/[teamId]/contract`
- Concurrent edit conflict (realtime) → last-write-wins; show a "다른 팀원이 수정했어요" toast

---

### Kickoff Phase State Machine

The `kickoff_phase` field on the `Team` record tracks progression. Each transition requires the stated actor.

```text
idle
  -> survey_complete       (auto: when all leader/member responses submitted)
  -> topic_confirmed       (leader: POST /topic/confirm)
  -> structure_accepted    (leader: POST /structure/accept)
  -> stack_confirmed       (leader: POST /stack/confirm)
  -> handoff_accepted      (leader: POST /handoff/accept)
  -> contract_signed       (leader: POST /contract/sign)
  -> meeting_active        (auto: on first meeting creation)
```

- Phase is stored server-side. Client reads it from `GET /api/teams/:teamId/kickoff/phase`.
- Advancing the phase requires leader role. Phases cannot be skipped.
- Backward navigation to a completed phase is allowed in read-only mode (UI shows lock icon).
- Phase `idle` covers the period before all surveys are submitted.

---

### Guard / Redirect Additions (Screen 5~11)

These rows extend the Guard / Redirect Table above. Same priority ordering applies.

| Priority | Condition | Redirect destination | Notes |
|----------|-----------|---------------------|-------|
| 8 | `leader` or `member` hits `/result` without submitted survey | `/team/[teamId]/survey` | Survey gate |
| 9 | `observer` hits `/result` | `/team/[teamId]/dashboard` | No personal result for observer |
| 10 | Any role hits topic/structure/stack/handoff/contract without required phase | `/team/[teamId]/dashboard` | Phase gate; show which phase is required |
| 11 | Any role hits `/meeting` without `contract_signed` phase | `/team/[teamId]/contract` | |
| 12 | Any role hits per-team `/dashboard` without team membership | `/dashboard` | Global dashboard fallback |

---

### PROTECTED_PATHS additions

The following paths should be added to `middleware.ts` `PROTECTED_PATHS`:

```
/team/[teamId]/result
/team/[teamId]/dashboard
/team/[teamId]/topic
/team/[teamId]/structure
/team/[teamId]/stack
/team/[teamId]/handoff
/team/[teamId]/contract
/team/[teamId]/meeting
```

The existing `/team` entry in `PROTECTED_PATHS` already catches these as prefix matches if middleware is configured with `startsWith`. Confirm implementation matches before adding explicit entries.

---

### KF-015 — Screen 9/10 write-back and contract format need ADR before implementation

**Status:** placeholder (not yet resolved)

**Scope:** Screen 9 artifact write-back to GitHub/Notion/Slack, and Screen 10 kickoff contract storage format.

**Blocked items:**
- Handoff external write-back integration (Screen 9 write-back buttons remain disabled)
- Contract PDF/export format (Screen 10)

**Required before:** `needs-adr` screens can move to `ready-for-build`
