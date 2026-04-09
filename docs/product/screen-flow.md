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
      -> Brainstorm (발산+공유+AI정리)
      -> Topic Decision (투표+확정)
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
| 5 Personal Result | `/team/[teamId]/result` | survey submitted (leader/member only) | role reaction saved or skipped | ⚠️ | implemented (반응 버튼 개선 필요 — P0-A) |
| 6 Team Dashboard | `/dashboard` (global) + `/team/[teamId]/dashboard` (per-team) | authenticated | kickoff CTA clicked (all surveys submitted) | ⚠️ | implemented (팀 스킬 요약 패널 미구현 — P0-B) |
| 7a Brainstorm | `/team/[teamId]/topic/brainstorm` | all surveys submitted (phase: survey_complete) | AI 클러스터링 완료, Stage 4로 전환 | ⬜ | ready-for-build (KF-031) |
| 7b Topic Decision | `/team/[teamId]/topic` | 브레인스토밍 Stage 3 완료 | topic confirmed by leader | ⬜ | ready-for-build (KF-031) |
| 8a System Framing | `/team/[teamId]/structure` | topic confirmed via 7b (phase: topic_confirmed) | structure blocks accepted by leader | ⬜ | ready-for-build |
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
| 7a Brainstorm | `/team/[teamId]/topic/brainstorm` | rw | rw | r | leader/member: 아이디어 작성+Build-on+공감; leader: 단계 전환+AI 정리 요청; observer: 읽기 전용 (KF-031) |
| 7b Topic Decision | `/team/[teamId]/topic` | rw | react | r | leader: Dot voting+주제 확정+커스텀 입력; member: Dot voting(인당 2표); observer: 읽기 전용. topic_confirmed 이후 전체 read-only (KF-023, KF-033) |
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

> 2026-04-09 업데이트: Team Context 필드 7개 도입. 팀 이름 단독 입력 구조에서 **6개 섹션 폼**으로 확장한다.
> 배경: `/api/teams` 생성 시점에 팀의 운영 맥락이 없으면 GPT-4o가 주제/클러스터링을 제안할 때 설문 데이터만으로 추론해야 하고, 팀 단위 의도와 개인 설문이 분리되지 않는다. `docs/architecture/team-context-vs-survey-boundary.md` 참조.

```
/dashboard → "새 팀 만들기" button
  -> /team/create
     -> [섹션 1] 팀 이름 입력 (teamName, 2–50자)                      ← 필수
     -> [섹션 2] 팀 운영 형태 선택 (teamType)                          ← 필수
     -> [섹션 3] 프로젝트 기간 선택 (projectDuration)                  ← 필수
     -> [섹션 4] 목표 완성도 선택 (completionTarget)                   ← 필수
     -> [섹션 5] 팀 구성 특성 (3개 boolean, nullable)                  ← 선택
          - hasNonDeveloper (비개발자 포함 여부)
          - usesVibeCoding (바이브코딩 도구 활용 계획)
          - hasSkillGap (팀원 간 개발 경험 편차 큼)
     -> [섹션 6] 관심 도메인 힌트 (domainHints, 최대 2개)              ← 선택
     -> createTeamAction(payload) called (Server Action)
        -> API: POST /teams  (body에 Team Context 7개 필드 포함)
        -> creator assigned leader role automatically
        -> invite code generated
     -> success: invite code shown with copy button
     -> "팀 페이지로 이동" → /team/[teamId]

권한:
  - 팀 생성 시점에만 팀장이 입력한다 (팀장 단독 입력).
  - 입력 후 수정은 향후 팀 정보 페이지(backlog)에서만 허용한다.
  - 팀원/옵저버는 Screen 6 배너를 통한 read-only 열람만 가능하다.

Team Context 필드 스키마 소스:
  - 단일 소스: `packages/contracts/src/team/team-context.ts` (Zod)
  - 백엔드/프론트엔드/Prisma 모두 이 파일에서 enum을 import (KF 신규)

Boolean 정책:
  - hasNonDeveloper, usesVibeCoding, hasSkillGap 는 nullable, default 없음.
  - legacy 팀(도입 전 생성된 팀)과 "선택 안 함"을 의미적으로 구분하기 위해 nullable을 채택 (KF 신규).

Error states:
  - teamName < 2 or > 50 chars: inline validation (client-side)
  - 필수 enum 미선택 (teamType / projectDuration / completionTarget): 제출 버튼 비활성화
  - domainHints 3개 이상 선택 시도: 3번째 선택 차단 + 토스트 "최대 2개까지 선택할 수 있어요"
  - API error: inline error message
  - network error: "네트워크 오류가 발생했습니다. 다시 시도해 주세요."

UI 원칙:
  - 모바일 퍼스트. 6개 섹션을 세로 스크롤 단일 폼으로 배치.
  - 섹션 헤더는 Lucide React 아이콘만 사용 (이모지 금지 — CLAUDE.md 규칙).
  - enum 선택은 icon card 2열 그리드 패턴 (KF-028 Survey 카드 UI 표준과 동일 톤).

Back navigation:
  - "대시보드로 돌아가기" → /dashboard
```

### Team Context 필드 정의

| 필드 | 타입 | 값 | 필수 | 의미 |
|------|------|-----|------|------|
| `teamType` | enum | `HACKATHON` / `CAPSTONE` / `BOOTCAMP` / `SIDE_PROJECT` / `STARTUP` | 필수 | 팀이 어떤 제도·형태로 운영되는가 |
| `projectDuration` | enum | `UNDER_1_DAY` / `ONE_TO_FOUR_WEEKS` / `ONE_TO_THREE_MONTHS` / `OVER_THREE_MONTHS` | 필수 | 프로젝트 총 기간 |
| `completionTarget` | enum | `DEMO` / `MVP` / `PRODUCTION` | 필수 | 목표하는 완성도 수준 |
| `hasNonDeveloper` | `boolean \| null` | true / false / null | 선택 | PM·디자이너 등 비개발자 팀원 포함 여부 |
| `usesVibeCoding` | `boolean \| null` | true / false / null | 선택 | Cursor·Claude Code 등 바이브코딩 도구 활용 계획 |
| `hasSkillGap` | `boolean \| null` | true / false / null | 선택 | 팀원 간 개발 경험 편차가 큰가 |
| `domainHints` | `string[]` (max 2) | `FINTECH` / `HEALTHCARE` / `EDUCATION` / `SOCIAL` / `AI_ML` / `INFRA_TOOLING` / `ECOMMERCE` / `PUBLIC` / `GAME` / `OTHER` | 선택 | 관심 도메인 힌트 (중복 허용하지 않음) |

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
          -> Screen 7a — Brainstorm (/team/[teamId]/topic/brainstorm)
              [Stage 1: leader/member 개별 아이디어 발산]
              [Stage 2: 전체 공유 + Build-on + 공감]
              [Stage 3: AI 클러스터링 (GPT-4o)]
              -> Screen 7b — Topic Decision (/team/[teamId]/topic)
                  [Stage 4: Dot voting (인당 2표)]
                  [leader: confirm topic]
                  [member: vote]
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
| 7a Brainstorm | `/team/[teamId]/topic/brainstorm` | 신규. 팀원 발산 + 공유 + AI 클러스터링 (KF-031) |
| 7b Topic Decision | `/team/[teamId]/topic` | 기존 Screen 7. Dot voting + 리더 확정으로 리팩토링 (KF-031, KF-033) |
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
- Role reaction prompt: "이 역할 추천이 어떤가요?" (ok/burden/prefer_other — saved to DB)
  - "괜찮아요" (ok)
  - "부담돼요" (burden)
  - "다른 역할 선호해요" (prefer_other) → 선택 시 추가 텍스트 필드: "어떤 역할을 선호하나요?" (선택 사항, 최대 100자)
  - DONE (260407_02): ok/burden/prefer_other 3종 구현 완료. Screen 10 Contract Gate 역할 확정 연결 고리 확보.
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
- `POST /api/teams/:teamId/survey/reaction` — saves role reaction
  - Body: `{ reaction: 'ok' | 'burden' | 'prefer_other', preferOtherNote?: string }`
  - DONE (260407_02): 'ok'/'burden'/'prefer_other' 값으로 변경 완료. DB migration 20260407031550 적용.

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
- **Team Context 배너 (상단, 2026-04-09 신규):**
  - 팀장이 Screen 3a에서 입력한 운영 컨텍스트를 한 줄 요약 카드로 표시
  - 예: `해커톤 · 1–4주 · MVP 목표 · 핀테크 도메인` + 하위 특성 배지 (비개발자 포함 / 바이브코딩 / 스킬 편차)
  - nullable boolean 필드는 배지에서 생략 (legacy 팀 또는 미입력과 "false 선택"을 시각적으로 동일하게 처리하지 않기 위함)
  - 아이콘은 Lucide React만 사용
  - 데이터 소스: `/kickoff/status` 응답의 `teamContext` 필드 (별도 엔드포인트 신설하지 않음)
  - 역할별 동작: leader/member/observer 모두 read-only 열람. 수정 액션 없음.
- Member list with per-member survey status badge:
  - "제출 완료" (green) — submitted
  - "작성 중" (yellow) — draft saved, not submitted
  - "미시작" (grey) — no response yet
- Aggregate progress bar: `submitted_count / total_member_count`
- 팀 스킬 요약 패널 (P0-B 완료 — 260407_03):
  - submitted_count >= 1 시 표시
  - 미니 레이더 차트 (6축, 120x120 SVG, submitted 팀원 axisScores 평균)
  - "N명의 평균 프로필" 부제
  - 가장 높은 축 2개 "팀 강점" 배지, 가장 낮은 축 1개 "팀 성장 포인트" 배지
  - 역할 분포 요약 (suggestedRole 집계): "백엔드 N명 / 프론트엔드 N명 / PM N명"
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
- `GET /api/teams/:teamId/kickoff/status` — 응답에 다음 필드 포함:
  - `teamInsight` (P0-B 완료): avgAxisScores, topAxes, bottomAxis, roleDistribution
  - `teamContext` (2026-04-09 신규): teamType, projectDuration, completionTarget, hasNonDeveloper, usesVibeCoding, hasSkillGap, domainHints. Team Context 배너 렌더링 소스.
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

### Screen 7a -- Brainstorm (신규)

**경로:** `/team/[teamId]/topic/brainstorm`

**상세 설계:** `docs/product/screen7-brainstorm-flow.md` 참조

**진입 조건:**
- 인증 완료, 팀 멤버십 존재
- 팀 phase가 `survey_complete` 이상 (모든 leader/member가 설문 제출 완료)
- observer: 읽기 전용 접근 허용

**핵심 UI (3단계):**

- **Stage 1 -- Ideation (개별 발산):** 7분 가이드 타이머, 본인 아이디어만 보임, 팀 역량 요약 사이드바 표시 (AI 주제 제안 없음 -- 앵커링 방지)
- **Stage 2 -- Sharing + Build-on:** 전체 아이디어 실명 공개, 공감(하트) 토글, Build-on 작성 (single-parent, 깊이 1단계, KF-032)
- **Stage 3 -- AI Clustering:** GPT-4o가 아이디어를 3~5개 주제 클러스터로 정리. 202/200 polling 패턴 (KF-020)

**AI 프롬프트 주입 구조 (Stage 3 클러스터링, 2026-04-09 신규):**

`brainstorm.service.ts`에서 GPT-4o 호출 시 프롬프트는 다음 순서로 구성된다.

```
<team_context>
  teamType, projectDuration, completionTarget,
  hasNonDeveloper, usesVibeCoding, hasSkillGap,
  domainHints
</team_context>
<survey_data>
  팀원별 SurveyResponse.answers 집계 (6섹션)
</survey_data>
<ideas>
  Stage 1~2에서 수집된 아이디어 원문 + build-on + merge 관계
</ideas>
```

- `<team_context>` 블록은 항상 `<survey_data>` **앞에** 위치한다. 팀 단위 운영 맥락이 개인 단위 설문보다 상위 제약으로 작용해야 하기 때문.
- XML 경계 분리는 prompt injection 방어 규칙(CLAUDE.md)에 따른 필수 구조다.
- Team Context가 비어있는 legacy 팀은 `<team_context>` 블록을 생략하고 과거 동작으로 fallback.

**실시간 이벤트:**
- Socket.io 미도입 (KF-022). Stage 2 공감/Build-on 갱신은 10초 폴링.

**API 의존성:**
- `POST /api/teams/:teamId/brainstorm/ideas` -- 아이디어 생성
- `GET /api/teams/:teamId/brainstorm/ideas/mine` -- Stage 1 본인 아이디어
- `GET /api/teams/:teamId/brainstorm/ideas` -- Stage 2 전체 아이디어
- `POST /api/teams/:teamId/brainstorm/ideas/:ideaId/empathy` -- 공감 토글
- `POST /api/teams/:teamId/brainstorm/ideas/:ideaId/buildon` -- Build-on 생성
- `POST /api/teams/:teamId/brainstorm/advance` -- Stage 1 -> 2 전환 (leader only)
- `POST /api/teams/:teamId/brainstorm/cluster` -- AI 클러스터링 요청 (leader only, 202)
- `GET /api/teams/:teamId/brainstorm/cluster` -- 클러스터링 결과 폴링

**역할 분기:**

| | leader | member | observer |
|-|--------|--------|----------|
| 아이디어 작성 | rw | rw | - |
| 공감/Build-on | yes | yes | no |
| 단계 전환 | yes | no | no |
| AI 정리 요청 | yes | no | no |
| 재생성 요청 | yes (최대 2회) | no | no |

**DB 테이블:** `BrainstormIdea`, `BrainstormEmpathy`, `BrainstormClusterJob`, `BrainstormCluster` (KF-031)

**에러 상태:**
- 설문 미완료 -> Screen 6로 리다이렉트
- 아이디어 0개로 Stage 2 진입 -> 경고 메시지 + Stage 1로 되돌리기
- AI 클러스터링 실패 -> 재생성 버튼 (leader) 또는 수동 주제 입력 안내
- 네트워크 오류 -> 재시도 버튼

---

### Screen 7b -- Topic Decision (리팩토링)

**경로:** `/team/[teamId]/topic`

**상세 설계:** `docs/product/screen7-brainstorm-flow.md` Stage 4 참조

**진입 조건:**
- 인증 완료, 팀 멤버십 존재
- 브레인스토밍 Stage 3(AI 클러스터링) 완료 상태
- observer: 읽기 전용 접근 허용

**핵심 UI (Stage 4 -- Dot Voting + 확정):**
- AI가 정리한 3~5개 클러스터가 투표 카드로 표시 (클러스터 생성 시 이미 Team Context가 프롬프트에 주입됨 — 7a 참조)
- Dot voting: 인당 2표, 같은 클러스터 중복 투표 허용 (KF-033)
- 투표 현황 10초 폴링 갱신
- leader: "이 주제로 확정" 버튼 (투표 결과 참고, 강제 아님)
- leader: 커스텀 주제 직접 입력 옵션 유지
- 확정 후 read-only 전환 (KF-023)
- CTA: "다음: 아키텍처 설계" -> `/team/[teamId]/structure`

**실시간 이벤트:**
- Socket.io 미도입 (KF-022). 투표 현황 10초 폴링.
- `topic:confirmed` 감지는 10초 폴링으로 대체.

**API 의존성:**
- `GET /api/teams/:teamId/topic` -- 클러스터 기반 주제 목록
- `POST /api/teams/:teamId/topic/vote` -- Dot voting (인당 2표)
- `GET /api/teams/:teamId/topic/votes` -- 투표 현황 집계
- `POST /api/teams/:teamId/topic/confirm` -- 주제 확정 (leader only), phase -> `topic_confirmed`

**역할 분기:**

| | leader | member | observer |
|-|--------|--------|----------|
| 클러스터 열람 | r | r | r |
| Dot voting | yes (2표) | yes (2표) | no |
| 주제 확정 | yes | no | no |
| 커스텀 주제 입력 | yes | no | no |

**Phase lock 동작 (topic_confirmed):**
- 확정 후 투표 카드 read-only 렌더링. 투표 버튼 숨김. 확정 배지 표시.
- 재편집 불가 (KF-023).
- CTA: "다음: 아키텍처 설계" -> `/team/[teamId]/structure`

**DB 테이블:** `TopicVote` (신규, KF-033), `KickoffTopic`, `KickoffReaction` (기존, KF-019)

**에러 상태:**
- 클러스터링 미완료 -> 7a로 리다이렉트
- 투표 초과 시도 -> "투표는 최대 2개까지 가능해요" 토스트
- 확정 후 투표 시도 -> 409 응답, "주제가 이미 확정되었습니다" 메시지
- 리더 확정 전 전원 미투표 -> 허용, "아직 투표하지 않은 팀원이 있어요" 경고 (차단 아님)
- 네트워크 오류 -> 재시도 버튼

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
| Screen 7 | `GET /topic/suggestions` 최초 요청 시 | **Team Context (2026-04-09 추가)** + 팀 전체 SurveyResponse answers (요약) |
| Screen 7a (brainstorm) | `POST /brainstorm/cluster` 최초 요청 시 | **Team Context (2026-04-09 추가)** + Stage 1~2 아이디어 원문 + build-on/merge 관계 + 팀 SurveyResponse 요약 |
| Screen 8a | `GET /structure/suggestions` 최초 요청 시 | confirmedTopic + 팀 tech profile (s2 answers 집계) |
| Screen 8b | `GET /stack/options` | 8a acceptedBlocks + 팀 tech preference (s2 집계) |

> Team Context 주입 범위: `kickoff.service.ts`의 주제 제안 생성과 `brainstorm.service.ts`의 클러스터링 **두 곳 모두**에서 `<team_context>` XML 블록을 `<survey_data>` 앞에 주입한다. 팀 단위 운영 맥락(Team)과 개인 단위 역량(Survey)은 레벨이 다른 입력이므로 둘 다 필요하다. 상세 설계: `docs/architecture/team-context-vs-survey-boundary.md`.

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

---

## 구현 로드맵 및 우선순위 매트릭스

> Added: 2026-04-07
> 기준: Screen 7 구현 완료 후 총평 기반 재정렬. Screen 1~7 implemented.

---

### 현재 구현 상태 요약 (2026-04-07)

| Screen | 경로 | 구현 상태 | 비고 |
|--------|------|---------|------|
| 1 Login | `/login` | ✅ implemented | |
| 3a Team Create | `/team/create` | ✅ implemented | |
| 3b Team Join | `/team/join` | ✅ implemented | |
| 4 Skill Assessment | `/team/[teamId]/survey` | ✅ implemented | |
| 5 Personal Result | `/team/[teamId]/result` | ✅ implemented | 역할 반응 버튼 개선 필요 (아래 P0 참조) |
| 6 Team Dashboard | `/team/[teamId]/dashboard` | ✅ implemented | 팀 스킬 패널 미구현 (P0) |
| 7 Topic Decision | `/team/[teamId]/topic` | ✅ implemented | Observer dev-preview mock 미등록 (P1) |
| 8a System Framing | `/team/[teamId]/structure` | ⬜ ready-for-build | DB 스키마 확장 필요 |
| 8b Technical Narrowing | `/team/[teamId]/stack` | ⬜ ready-for-build | 8a 완료 후 착수 |
| 9 Handoff Layer | `/team/[teamId]/handoff` | ⬜ needs-adr (KF-015) | |
| 10 Contract Gate | `/team/[teamId]/contract` | ⬜ needs-adr (KF-015) | |
| 11 Meeting Hub | `/team/[teamId]/meeting` | ⬜ ready-for-build | Socket.io ADR 후 착수 |

---

### P0 — 즉시 (파일럿 전 필수)

#### P0-A: Screen 5 역할 반응 버튼 개선 — DONE (260407_02)

**현재 상태:** ok / burden / prefer_other 3종 구현 완료. DB migration 20260407031550 적용. Figma 노드 234:2, 235:2 재캡처 완료.

~~**이전 상태:** yes / somewhat / no 3종 반응 저장. Screen 10 역할 확정과 연결 고리 없음.~~

**필요 변경:**

역할 반응 선택지를 다음으로 교체한다.

| 현재 | 변경 후 |
|------|--------|
| yes | 괜찮아요 |
| somewhat | 부담돼요 |
| no | 다른 역할 선호해요 |

"다른 역할 선호해요" 선택 시 추가 UI: 자유 입력 텍스트 필드 "어떤 역할을 선호하나요?" (선택 사항, 최대 100자).

이 반응 데이터는 Screen 10 Contract Gate에서 역할 확정 시 참고 자료로 표시된다.

**DB 영향:** `SurveyResponse` 테이블에 신규 컬럼 없음. 반응은 별도 저장소 필요.

현재 `POST /api/teams/:teamId/survey/reaction`의 응답 값을 `ok | burden | prefer_other` + `preferOtherNote?: string`으로 변경한다. 기존 yes/somewhat/no 반응 데이터는 마이그레이션 스크립트로 ok/burden/prefer_other로 전환하거나, API 계층에서 backward-compatible 매핑을 유지한다.

**신규 API 계약:**

```
POST /api/teams/:teamId/survey/reaction
Body: { reaction: 'ok' | 'burden' | 'prefer_other', preferOtherNote?: string }
Response: { saved: true }
```

**영향 파일:**
- `apps/web/app/team/[teamId]/result/result-client.tsx` — 버튼 레이블 및 조건부 텍스트 필드
- `apps/api/src/survey/survey.service.ts` — reaction 저장 로직 (값 변경)
- `packages/contracts/src/jsonb/` — reaction 스키마 업데이트

**역할별 분기:**

| | leader | member | observer |
|-|--------|--------|----------|
| 반응 버튼 노출 | yes | yes | 없음 (redirect) |
| preferOtherNote 입력 | yes | yes | 없음 |
| 반응 없이 CTA 진행 | 허용 | 허용 | n/a |

---

#### P0-B: Screen 6 팀 스킬 요약 패널 추가 — DONE (260407_03)

**현재 상태:** TeamInsightPanel 구현 완료. `getKickoffStatus` 서버사이드 집계 (avgAxisScores, topAxes, bottomAxis, roleDistribution). 미니 레이더 SVG(120x120) + 배지 UI. Figma 재캡처 완료(248:2 desktop, 249:2 mobile).

**필요 변경:**

설문 완료 팀원(submitted=true)의 axisScores를 집계하여 팀 수준 레이더 차트를 표시한다.

**UI 구성 (추가 영역):**

```
[팀 스킬 요약 패널] — submitted_count >= 1 시 표시
  - 미니 레이더 차트 (6축, 개인 결과 페이지의 1/2 크기)
  - "N명의 평균 프로필" 부제
  - 가장 높은 축 2개: "팀 강점" 배지
  - 가장 낮은 축 1개: "팀 성장 포인트" 배지
  - 역할 분포 요약: "백엔드 N명 / 프론트엔드 N명 / PM N명" 형태
    (AI 추천 역할 집계 — survey result API의 suggestedRole 필드 활용)
```

**표시 조건:**

- submitted_count === 0: 패널 숨김 (설문 독려 메시지만 표시)
- submitted_count >= 1: 미니 레이더 차트 표시 (전체 제출 아니어도 가능)
- submitted_count === total_member_count: 킥오프 CTA 활성화 (기존 동작 유지)

**API 의존성:**

기존 `GET /api/teams/:teamId/members` 응답에 `axisScores` 필드 추가 필요.

```
// 현재 응답 (추정)
{ members: [{ userId, name, role, surveyStatus }] }

// 변경 후
{ members: [{ userId, name, role, surveyStatus, axisScores?: number[6] }] }
// axisScores는 submitted=true인 멤버만 포함. submitted=false이면 null.
```

집계는 클라이언트에서 수행 (KF-017 위반 없음 — 개인 계산은 서버, 팀 평균 집계는 프론트엔드에서 수행).

**역할별 분기:**

| | leader | member | observer |
|-|--------|--------|----------|
| 팀 스킬 패널 표시 | yes | yes | yes |
| 역할 분포 배지 | yes | yes | yes |
| "내 결과 보기" 링크 | yes | yes | 없음 |

**영향 파일:**
- `apps/api/src/teams/teams.service.ts` (또는 members 엔드포인트) — axisScores 포함
- `apps/api/src/survey/survey.service.ts` — getMyResult 재사용 or 별도 팀 집계 메서드
- `apps/web/app/team/[teamId]/dashboard/` — 미니 레이더 차트 컴포넌트, 팀 스킬 집계 로직

**에러 상태:**
- axisScores fetch 실패 → 패널 숨김, 진행률 bar만 표시 (degraded gracefully)

---

### P1 — 다음 스프린트 (1~2주)

#### P1-A: Screen 8a System Framing 구현

**진입 조건:** topic_confirmed phase (Screen 7 완료)

**신규 DB 테이블:** KickoffStructure (docs에 설계 완료, 미마이그레이션)

**AI 호출:** ADR-003 확정 후 같은 polling 패턴 적용

**핵심 구현 단위:**
1. Prisma 마이그레이션: KickoffStructure 테이블 추가
2. `apps/api/src/structure/` NestJS 모듈 신규 (3개 엔드포인트)
3. `packages/contracts/src/ai/structure-suggestions.schema.ts` Zod 스키마
4. `tooling/prompts/structure-suggestion.md` 프롬프트 파일
5. `apps/web/app/team/[teamId]/structure/` 페이지 구현

**Observer UI:** Screen 7과 동일 패턴. 블록 카드 read-only 렌더링, 반응 버튼 비활성화.

---

#### P1-B: Screen 7 Observer dev-preview mock 등록

**현재 상태:** Observer 상태 코드에 존재하나 `/dev-preview` mock이 없어 Figma 캡처 불가.

**필요 작업:**
- `apps/web/app/dev-preview/page.tsx`에 Screen 7 Observer 상태 mock 데이터 추가
- topic_confirmed 후 read-only 상태 mock 데이터 추가

**영향 파일:**
- `apps/web/app/dev-preview/page.tsx`

---

#### P1-C: Screen 7 반응 토글 동작 명확화

**현재 상태:** 스펙에 반응 토글(agree → concern 변경 가능 여부) 명시 없음.

**설계 결정:** 반응은 upsert 방식으로 처리한다. 동일 userId + topicId에 재반응 시 기존 반응을 덮어쓴다. topic_confirmed 이후에는 409로 차단.

**UI:** 반응 버튼이 이미 선택된 상태이면 선택된 버튼에 강조 스타일. 재클릭 시 반응 취소(upsert null) 또는 다른 버튼 클릭 시 교체. topic_confirmed 이후 버튼 전체 disabled.

이 동작은 `POST /api/teams/:teamId/topic/react`의 upsert 구현으로 이미 지원됨 (KickoffReaction @@unique([topicId, userId])). 클라이언트 UI만 명확화 필요.

---

#### P1-D: Screen 8b Technical Narrowing 구현

**진입 조건:** structure_accepted phase (Screen 8a 완료)

**신규 DB 테이블:** KickoffStack, MemberExperience

**AI 호출 없음:** acceptedBlocks 기반 옵션 목록 매핑 + 설문 선호도 집계

---

### P2 — Backlog

#### P2-A: Screen 9 Handoff Layer

**차단 조건:** KF-015 ADR 미확정. 외부 write-back(GitHub, Notion, Slack) 형식 미결정.

**사전 필요:** ADR-005 또는 KF-015 전담 ADR 작성 → 승인 후 착수.

---

#### P2-B: Screen 10 Contract Gate

**차단 조건:** KF-015 ADR 미확정. 계약서 저장 형식(PDF, DB 스냅샷) 미결정.

**사전 필요:** KF-015 ADR → DB 마이그레이션 runbook 작성 → 착수.

---

#### P2-C: Screen 11 Meeting Hub

**진입 조건:** contract_signed phase. ADR-004 (Socket.io) 확정 필요.

**상태:** ready-for-build이나 Socket.io 인프라 결정 선행 필요.

---

#### P2-D: Screen 6 역할 추천 분포 고도화

현재 P0-B에서 suggestedRole 단순 집계를 구현한다. 이후 역할 분포를 더 정교하게 표현하는 UI 개선은 P2로 유보. Screen 10 Contract Gate 역할 확정 흐름이 확정된 후 재검토.

---

#### P2-E: Figma 전체 스크린샷 업데이트

Screen 5/6/7 개선 사항이 P0/P1 구현 완료 후 Figma 캡처 업데이트 필요.

---

### 권장 다음 구현 순서

```
P0-A (Screen 5 반응 버튼 개선)
  → P0-B (Screen 6 팀 스킬 패널 추가)
  → P1-B (Screen 7 dev-preview mock)
  → P1-A (Screen 8a System Framing)
  → P1-D (Screen 8b Technical Narrowing)
  → P2-A/B (ADR 확정 후 Screen 9/10)
  → P2-C (ADR-004 확정 후 Screen 11)
```

**P0-A와 P0-B를 먼저 하는 이유:**

Screen 5의 역할 반응 데이터는 Screen 10 Contract Gate에서 역할 확정 시 사용한다. 지금 반응 스키마(yes/somewhat/no)가 굳어지면 나중에 DB 마이그레이션이 필요해진다. Screen 6의 팀 스킬 패널은 기존 API 응답 확장만으로 구현 가능하며, 파일럿 시연 시 "팀 분석 결과"를 직관적으로 보여주는 핵심 요소다.

Screen 8a를 P0가 아닌 P1로 배치한 이유: ADR-003이 확정되어야 AI 호출 패턴이 고정된다. ADR 없이 착수하면 Screen 7과 다른 패턴으로 구현될 위험이 있다.

---

### Figma 신규 캡처 필요 항목

| 항목 | 대상 화면/상태 | 비고 |
|------|-------------|------|
| Screen 5 — 역할 반응 버튼 3종 새 레이블 | 234:2 (desktop), 235:2 (mobile) | DONE — 260407_02 재캡처 완료 |
| Screen 5 — "다른 역할 선호" 텍스트 필드 노출 상태 | 234:2, 235:2 포함 | DONE — 260407_02 재캡처 완료 |
| Screen 6 — 팀 스킬 요약 패널 (미니 레이더 + 역할 분포) | 248:2 (desktop), 249:2 (mobile) | DONE — 260407_03 재캡처 완료 |
| Screen 7 — Observer read-only 상태 | 212:2 신규 프레임 | P1-B 완료 후 |
| Screen 7 — topic_confirmed 후 read-only 상태 | 212:2 신규 프레임 | P1-B 완료 후 |
| Screen 8a System Framing — 전체 | 신규 Figma 페이지 | P1-A 완료 후 |
| Screen 8b Technical Narrowing — 전체 | 신규 Figma 페이지 | P1-D 완료 후 |
