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
| 4 Skill Assessment | `/team/[teamId]/survey` | team membership exists, role is leader or member | survey submitted or saved | ✅ | implemented |
| 5 Personal Result | `/team/[teamId]/result` | survey submitted (leader/member only) | role reaction saved or skipped | ✅ | implemented |
| 6 Team Dashboard | `/dashboard` (global) + `/team/[teamId]/dashboard` (per-team) | authenticated | kickoff CTA clicked (all surveys submitted) | ✅ | implemented |
| 7 Topic Decision | `/team/[teamId]/topic` | all surveys submitted (phase: survey_complete) | topic confirmed by leader | ✅ | implemented |
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
| 7 Topic Decision | `/team/[teamId]/topic` | rw | react | r | leader: 주제 선택+확정; member: 이모지 반응만; observer: 읽기 전용. topic_confirmed 이후 전체 read-only (KF-023) |
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
| 4 | `observer` role + `/team/[teamId]/survey` | `/dashboard` | ✅ | Survey is not applicable to observers |
| 5 | `observer` role + `/team/[teamId]/result` | `/dashboard` | ✅ | Personal result is not applicable to observers |
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
- ⚠️ Socket.io deferred to Screen 11 (ADR-004). Using polling fallback until then.

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
- ⚠️ Socket.io deferred to Screen 11 (ADR-004). Using 10-second polling fallback until then.

**API dependencies:**
- `GET /api/teams/:teamId/topic` — AI-generated topic list + job status (returns 202 if job pending, 200 if done/failed). Triggers job creation on first call if no cached result exists.
- `POST /api/teams/:teamId/topic/react` — save or update member reaction (upsert by topicId + userId)
- `POST /api/teams/:teamId/topic/confirm` — leader confirms topic, transitions phase to `topic_confirmed`. Body may include `customTopic` for leader-entered custom topic.

**Role differences:**

| | leader | member | observer |
|-|--------|--------|----------|
| View topic suggestions | rw | rw | r |
| React to topics | yes | yes | no |
| Confirm topic | yes | no | no |
| Enter custom topic | yes | no | no |

**Phase lock behavior (topic_confirmed):**
- Once confirmed, topic cards render read-only. Reaction buttons hidden. Confirmed badge shown.
- Re-editing after confirmation is not implemented in this phase (KF-023).
- CTA changes to "다음: 아키텍처 설계" → `/team/[teamId]/structure`.
- Non-leader clients detect phase change via 10-second polling (ADR-004).

**DB tables:** `KickoffTopicJob`, `KickoffTopic`, `KickoffReaction` (KF-019)

**Error states:**
- AI topic generation pending → show "AI가 팀 프로필을 분석하고 있어요" loading screen. Poll `GET /topic` every 5s, up to 5 attempts (ADR-003).
- AI generation failure (`status: 'failed'`) or 5 poll attempts exhausted → activate fallback: manual topic entry form (leader only). Members see "주제 분석에 실패했어요. 팀장이 직접 입력하고 있어요."
- Leader confirms before all members reacted → allowed; show "아직 반응하지 않은 팀원이 있어요" warning, not a blocker.
- React attempt after topic is confirmed → 409 from API; client shows "주제가 이미 확정되었습니다." and disables reaction buttons.
- New member joins after job completed → if phase still `survey_complete`, re-evaluate canProceed in Screen 6. Screen 7 access re-blocked until new member submits survey (KF-023 scope).

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

---

## Screen 7~8b 구현 설계 가이드

> Added: 2026-04-06
> Covers: Screen 7 Topic Decision, Screen 8a System Framing, Screen 8b Technical Narrowing
> Scope: 구현 순서, DB 스키마 확장, AI 호출 아키텍처, Phase transition 처리, Socket.io 도입 시점, ADR 필요 여부

---

### 구현 순서 결정 (KF-019)

**순서: Screen 7 → Screen 8a → Screen 8b (순차 구현)**

각 화면은 이전 phase를 게이트로 사용하며, 데이터 의존성이 단방향이다.

| 단계 | 화면 | 이유 |
|------|------|------|
| 1순위 | Screen 7 Topic Decision | `survey_complete` phase에서 직접 연결. DB 스키마가 가장 단순 (KickoffTopic 단일 테이블). Claude API 최초 호출 검증 지점이 됨. |
| 2순위 | Screen 8a System Framing | Topic 확정 결과를 프롬프트 컨텍스트로 사용. KickoffStructure 테이블이 필요하나 KickoffTopic과 패턴이 동일. |
| 3순위 | Screen 8b Technical Narrowing | 8a의 accepted structure blocks를 입력으로 받음. 설문 기반 tech preference 집계가 필요해 survey 데이터 읽기 패턴이 추가됨. |

Screen 9/10은 KF-015 ADR 확정 전까지 착수 불가. 순서를 건너뛸 수 없다.

---

### DB 스키마 확장 필요 사항 (KF-019)

현재 schema.prisma에는 킥오프 결정 관련 테이블이 전무하다. Screen 7~8b 구현을 위해 다음 테이블이 신규 필요하다.

#### 추가 필요 테이블

**KickoffTopic** — Screen 7 결과 저장

```
KickoffTopic {
  id            String    PK uuid
  teamId        String    FK Team (unique — 팀당 1개)
  suggestions   Json      // AI 생성 제안 목록 (TopicSuggestionsSchema)
  selectedIndex Int?      // 선택된 제안 인덱스 (null이면 custom)
  customTopic   String?   // 팀장 직접 입력 (selectedIndex null일 때 사용)
  confirmedAt   DateTime?
  confirmedBy   String    FK User (팀장)
  generationJob String?   // AI job ID (polling 용)
  createdAt     DateTime
  updatedAt     DateTime
}
```

**KickoffReaction** — Screen 7/8a/8b 멤버 반응 통합 저장

```
KickoffReaction {
  id         String   PK uuid
  teamId     String   FK Team
  userId     String   FK User
  screen     String   // 'topic' | 'structure' | 'stack'
  targetId   String   // 반응 대상 ID (topic suggestion index, block ID, stack option ID)
  reaction   String   // 'like' | 'concern'
  createdAt  DateTime
  updatedAt  DateTime

  @@unique([teamId, userId, screen, targetId])
}
```

**KickoffStructure** — Screen 8a 결과 저장

```
KickoffStructure {
  id            String    PK uuid
  teamId        String    FK Team (unique — 팀당 1개)
  suggestions   Json      // AI 생성 아키텍처 블록 목록 (StructureSuggestionsSchema)
  acceptedBlocks Json?    // 팀장이 accept한 블록 상태 (overrides 포함)
  acceptedAt    DateTime?
  acceptedBy    String    FK User (팀장)
  generationJob String?
  createdAt     DateTime
  updatedAt     DateTime
}
```

**KickoffStack** — Screen 8b 결과 저장

```
KickoffStack {
  id           String    PK uuid
  teamId       String    FK Team (unique — 팀당 1개)
  stackChoices Json      // 블록별 선택된 스택 (StackChoicesSchema)
  confirmedAt  DateTime?
  confirmedBy  String    FK User (팀장)
  createdAt    DateTime
  updatedAt    DateTime
}
```

**MemberExperience** — Screen 8b "이 기술 써봤어요" 배지

```
MemberExperience {
  id         String   PK uuid
  teamId     String   FK Team
  userId     String   FK User
  tech       String   // e.g. "React", "NestJS"
  createdAt  DateTime

  @@unique([teamId, userId, tech])
}
```

#### 스키마 확장 원칙 (KF-018 준수)

KF-018에 따라 킥오프 phase는 DB 컬럼이 아닌 서비스 계층 계산이다. 위 테이블의 `confirmedAt / acceptedAt` 존재 여부로 phase를 판단하므로 `Team` 테이블에 `kickoffPhase` 컬럼을 추가하지 않는다.

Phase 계산 확장 (kickoff.service.ts):

```
idle              — KickoffTopic 없음
survey_complete   — 모든 leader/member submitted=true
topic_confirmed   — KickoffTopic.confirmedAt IS NOT NULL
structure_accepted — KickoffStructure.acceptedAt IS NOT NULL
stack_confirmed   — KickoffStack.confirmedAt IS NOT NULL
handoff_accepted  — (KF-015 ADR 이후)
contract_signed   — (KF-015 ADR 이후)
meeting_active    — (Screen 11 구현 이후)
```

---

### AI 호출 아키텍처 (KF-020)

#### 호출 시점 및 패턴

Screen 7~8a의 AI 호출은 모두 "사용자가 화면에 진입할 때 최초 1회" 트리거된다.

| 화면 | 트리거 | 입력 컨텍스트 |
|------|--------|-------------|
| Screen 7 | `GET /topic/suggestions` 최초 요청 시 | 팀 전체 SurveyResponse answers (요약) |
| Screen 8a | `GET /structure/suggestions` 최초 요청 시 | confirmedTopic + 팀 tech profile (s2 answers 집계) |
| Screen 8b | `GET /stack/options` | 8a acceptedBlocks + 팀 tech preference (s2 집계) |

Screen 8b는 AI 신규 생성이 아닌 acceptedBlocks 기반 옵션 목록 조회다. Claude API 호출 없이 사전 정의된 tech 옵션 매핑 + 설문 선호도 집계로 처리한다.

#### AI Job 처리 패턴

Screen 7/8a는 Claude API 응답 시간이 5~15초 예상이므로 동기 HTTP 응답으로 처리하지 않는다.

```
클라이언트 → GET /topic/suggestions
  서비스 계층 확인:
    KickoffTopic.suggestions 이미 존재 → 즉시 반환 (200)
    존재하지 않음 → AI job 시작 → { status: 'pending', jobId } 반환 (202)

클라이언트 → 5초 간격 polling:
  GET /topic/suggestions?jobId=xxx
    job 완료 → suggestions 반환 (200)
    job 실패 → { status: 'failed' } 반환 (200, 에러 아님)
    job 진행 중 → { status: 'pending' } 반환 (200)
```

polling은 최대 5회(25초). 5회 이후에도 pending이면 클라이언트에서 fallback UI(수동 입력 폼) 전환.

#### 응답 저장 방식

AI 응답은 반드시 `packages/contracts/src/ai/` 스키마로 파싱 후 DB에 저장한다. 파싱 실패 시 최대 3회 재시도. 3회 후 실패 시 job status를 `failed`로 전환하고 fallback을 활성화한다.

```
// packages/contracts/src/ai/ 에 추가 필요
topic-suggestions.schema.ts    // TopicSuggestionsSchema
structure-suggestions.schema.ts // StructureSuggestionsSchema
```

#### Fallback 정책

| 화면 | Fallback 트리거 | Fallback 내용 |
|------|----------------|--------------|
| Screen 7 | AI job failed 또는 5회 polling 초과 | 자유 입력 텍스트 폼 (직접 주제 입력) |
| Screen 8a | AI job failed 또는 5회 polling 초과 | 사전 정의 기본 블록 세트 + 배너 표시 |
| Screen 8b | N/A (AI 미사용) | 정상 흐름과 동일 |

---

### Phase Transition 처리 레이어 (KF-021)

#### 결정: NestJS Service 직접 처리 (Event Emitter 미사용)

Screen 7~8b의 phase transition은 EventEmitter 없이 서비스 계층에서 직접 처리한다.

**이유:**

- Phase 전이 트리거는 항상 명시적 leader 액션(confirm, accept)이다. 이벤트 기반 비동기가 필요한 "조건 자동 만족" 케이스가 없다.
- `survey_complete` 전이는 이미 kickoff.service.ts에서 매 요청마다 계산하는 방식으로 구현돼 있다 (KF-018). 같은 패턴을 유지한다.
- EventEmitter 도입 시 phase 전이 로직이 서비스 + 리스너에 분산되어 추적이 어려워진다.
- Screen 9/10에서 외부 write-back(GitHub, Slack)이 필요해지면 그때 EventEmitter 또는 BullMQ job queue 도입을 검토한다 (KF-015 ADR에 포함).

#### Phase 계산 흐름

`KickoffService.getPhase(teamId)` 가 단일 계산 함수로 동작한다.

```
getPhase(teamId):
  1. 모든 leader/member submitted? → 아니면 'survey_in_progress'
  2. KickoffTopic.confirmedAt IS NOT NULL? → 아니면 'survey_complete'
  3. KickoffStructure.acceptedAt IS NOT NULL? → 아니면 'topic_confirmed'
  4. KickoffStack.confirmedAt IS NOT NULL? → 아니면 'structure_accepted'
  5. (이후 handoff/contract는 ADR 이후 추가)
  → 현재 최고 달성 phase 반환
```

각 API 엔드포인트 핸들러에서 phase guard를 호출한다:

```
POST /topic/confirm → getPhase 확인 → survey_complete 이상이어야 진행
POST /structure/accept → getPhase 확인 → topic_confirmed 이상이어야 진행
POST /stack/confirm → getPhase 확인 → structure_accepted 이상이어야 진행
```

---

### Socket.io 도입 시점 (KF-022)

#### 결론: Screen 7에서 최소 범위로 선택적 도입

Screen 7의 "멤버 reaction 실시간 업데이트"는 Socket.io 없이 polling으로 대체 구현 가능하다. 그러나 Screen 7 구현 시 Socket.io를 최소 범위로 먼저 도입해두면 Screen 11(Meeting Hub)의 실시간 협업 요구사항에 재사용 가능하다.

**도입 범위 분석:**

| 기능 | Socket.io 필수 여부 | Polling 대체 가능 여부 |
|------|--------------------|-----------------------|
| Screen 7 topic:reaction 실시간 집계 | 아니오 | 가능 (15초 polling) |
| Screen 7 topic:confirmed 즉각 전파 | 권장 | 가능 (5초 polling, UX 저하) |
| Screen 8a/8b reaction 집계 | 아니오 | 가능 |
| Screen 11 meeting:update 실시간 협업 | 예 | 실시간 편집에서 polling은 비실용적 |

**권장 전략 — 2단계 도입:**

1단계 (Screen 7 구현 시): Socket.io 서버 세팅 + `team:{teamId}` room 기반 연결만 구현. `topic:reaction`, `topic:confirmed` 이벤트 발행. 클라이언트는 연결 실패 시 polling fallback 유지.

2단계 (Screen 11 구현 시): `meeting:update` 이벤트로 확장. Screen 7/8 reaction 이벤트도 이 시점에 동일 패턴 통일.

**1단계에서 Socket.io를 건너뛰는 선택지:**

Screen 7 단독 구현 시 Socket.io를 완전히 생략하고 10초 polling만 구현해도 기능적으로 정상 동작한다. Screen 11 전까지 실시간 동시 편집 시나리오가 없기 때문이다. 이 선택 시 `screen-flow.md`의 Socket.io 의존성 항목을 `⚠️ polling fallback`으로 표시한다.

**결정 기준:** Screen 7 구현 시작 전 tf-backend 에이전트와 협의하여 최종 선택. 이 문서는 두 경로 모두 준비된 상태로 유지한다.

---

### ADR 필요 여부 (KF-022)

Screen 7~8b 구현 전 반드시 결정이 필요한 아키텍처 이슈:

| 이슈 | ADR 필요 여부 | 근거 |
|------|-------------|------|
| AI Job 처리 패턴 (polling vs webhook vs SSE) | 필요 (ADR-003) | 모든 AI 호출 화면(7, 8a, 5)에 영향. 패턴 통일 필요. |
| Socket.io 도입 시점 및 범위 | 필요 (ADR-004) | 인프라 의존성 추가. Screen 6의 survey:submitted 이벤트도 소급 적용 여부 결정 필요. |
| Claude API 프롬프트 관리 위치 | 권장 (ADR-005) | `tooling/prompts/` 관리 vs 서비스 파일 인라인. 재사용 가능 프롬프트가 3개 이상이면 외부화 기준. |
| KickoffReaction 단일 테이블 vs 화면별 분리 | 기록 권장 | decisions.md KF-019에 포함 가능. 규모 작아 독립 ADR 불필요. |

**즉시 작성 필요한 ADR:**

- **ADR-003-ai-job-polling-pattern.md**: Screen 7 구현 착수 전 확정 필요. polling 간격, 최대 시도 횟수, fallback 조건을 명시.
- **ADR-004-socketio-introduction.md**: Screen 7 착수 전 "도입 vs 생략" 결정 필요. 생략 결정 시에도 ADR로 기록.

---

### 역할별 분기 요약 (Screen 7~8b)

| 액션 | leader | member | observer |
|------|--------|--------|----------|
| AI 제안 목록 조회 | rw | rw | r |
| Topic/Block 반응 | yes | yes | 없음 |
| Topic 확정 (confirm) | yes | 없음 | 없음 |
| 커스텀 Topic 입력 | yes | 없음 | 없음 |
| Structure block accept/override | yes | 없음 | 없음 |
| Stack confirm | yes | 없음 | 없음 |
| "이 기술 써봤어요" 배지 | 없음 | yes | 없음 |
| Phase lock 후 화면 진입 | read-only | read-only | read-only |

Observer는 Screen 7/8a/8b 진입 가능하나 모든 write 액션이 비활성화된다. 별도 redirect 없음.

---

### 에러 상태 및 가드 정리 (Screen 7~8b)

#### Phase Guard (서버 + 클라이언트 이중 적용)

서버: 각 write 엔드포인트에서 phase 확인 후 조건 미달 시 `409 Conflict` 반환.
클라이언트: 페이지 진입 시 `GET /kickoff/phase` 응답 기반으로 redirect 또는 read-only 모드 전환.

| 화면 | 진입 최소 Phase | 미달 시 redirect |
|------|----------------|----------------|
| Screen 7 | `survey_complete` | `/team/[teamId]/dashboard` |
| Screen 8a | `topic_confirmed` | `/team/[teamId]/topic` (read-only 표시 후) |
| Screen 8b | `structure_accepted` | `/team/[teamId]/structure` (read-only 표시 후) |

Phase lock 후 이전 화면 진입 시 redirect가 아닌 read-only 모드 렌더링을 선택한다. 팀 전체가 결정 이력을 돌아볼 수 있어야 하기 때문이다.

#### 주요 에러 상태

| 상황 | 처리 방식 |
|------|---------|
| AI pending 5회 초과 | fallback UI 전환 + "AI 분석 실패" 배너 |
| non-leader가 confirm/accept POST 시도 | 서버 403, 클라이언트 버튼 비활성화로 사전 차단 |
| 이미 confirmed된 topic 재확정 시도 | 서버 409, 클라이언트 이미 lock 상태 표시 |
| AI 응답 스키마 파싱 실패 3회 | job status `failed` 전환, fallback 활성화 |
| 팀원 미반응 상태에서 leader confirm | 허용, "아직 반응 안 한 팀원이 있어요" 경고 toast만 표시 |

---

### API 엔드포인트 목록 (Screen 7~8b 신규)

모두 `apps/api/src/` 내 신규 모듈로 구현. 각 모듈은 독립 NestJS module.

```
// Screen 7 — Topic
GET  /api/teams/:teamId/topic/suggestions    — AI 제안 조회 (polling 포함)
POST /api/teams/:teamId/topic/react          — 멤버 반응 저장
POST /api/teams/:teamId/topic/confirm        — 팀장 topic 확정 (phase 전이)

// Screen 8a — Structure
GET  /api/teams/:teamId/structure/suggestions — AI 아키텍처 블록 조회
POST /api/teams/:teamId/structure/react       — 멤버 반응 저장
POST /api/teams/:teamId/structure/accept      — 팀장 블록 accept (phase 전이)

// Screen 8b — Stack
GET  /api/teams/:teamId/stack/options         — 블록별 스택 옵션 + 팀 선호도
POST /api/teams/:teamId/stack/experience      — 멤버 경험 배지 토글
POST /api/teams/:teamId/stack/confirm         — 팀장 스택 확정 (phase 전이)
```

Phase 조회는 기존 `GET /api/teams/:teamId/kickoff/status` 를 확장하거나 `GET /api/teams/:teamId/kickoff/phase` 전용 엔드포인트로 분리한다.

---

### Frontend 구현 파일 구조 (Screen 7~8b)

```
apps/web/app/team/[teamId]/
  topic/
    page.tsx               — Server Component, phase guard + data fetch
    topic-client.tsx       — Client Component, AI 제안 목록 + reaction UI
    actions.ts             — Server Actions: reactTopic, confirmTopic
  structure/
    page.tsx
    structure-client.tsx
    actions.ts
  stack/
    page.tsx
    stack-client.tsx
    actions.ts
```

page.tsx는 Server Component로 phase 검증 및 초기 데이터 fetch를 담당한다. AI pending 상태(`status: 'pending'`)이면 client 컴포넌트에 pending prop을 전달하고, 클라이언트에서 polling을 시작한다.

---

### 구현 시작 전 체크리스트

다음 항목이 완료된 후 Screen 7 구현 착수 가능하다:

- [ ] ADR-003 (AI job polling pattern) 작성 및 결정
- [ ] ADR-004 (Socket.io 도입 여부) 작성 및 결정
- [ ] `packages/contracts/src/ai/topic-suggestions.schema.ts` 스키마 초안
- [ ] `packages/contracts/src/ai/structure-suggestions.schema.ts` 스키마 초안
- [ ] Prisma 마이그레이션 파일 (KickoffTopic, KickoffReaction, KickoffStructure, KickoffStack, MemberExperience)
- [ ] `tooling/prompts/` 에 Screen 7, 8a 프롬프트 파일 초안 (내용 미확정이어도 파일 위치 확보)
- [ ] kickoff.service.ts `getPhase` 함수 확장 (topic_confirmed, structure_accepted, stack_confirmed 분기 추가)
