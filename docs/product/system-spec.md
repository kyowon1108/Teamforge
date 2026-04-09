# TeamForge System Spec

> Status: implementation-aligned canonical spec
> Derived from: `docs/product/screen-flow.md` and the current repository state as of 2026-04-09

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
| 1 | `/login` | Login | all | authenticated session | implemented |
| 2 | `/role-select` | Role Select | all | legacy compatibility redirect | deprecated |
| 3 | `/team/create`, `/team/join` | Team Create / Join | leader, member, observer | team membership | implemented |
| 4 | `/team/[teamId]/survey` | Skill Assessment | leader, member | profile and skill input | implemented |
| 5 | `/team/[teamId]/result` | Personal Result | leader, member | result view, reaction, role finalization linkage | implemented |
| 6 | `/dashboard`, `/team/[teamId]/dashboard` | Global / Team Dashboard | all | team list, readiness, next actions | implemented |
| 7-A | `/team/[teamId]/topic/brainstorm` | Brainstorm | leader, member, observer(read) | idea divergence, clustering handoff | partial |
| 7-B | `/team/[teamId]/topic` | Topic Decision | leader, member, observer(read) | topic shortlist, voting, leader confirm | partial |
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

이 저장소는 더 이상 문서 스캐폴드 전용 상태가 아니다. `apps/web`와 `apps/api`에 Screen 1, 3a, 3b, 4, 5, 6과 Screen 7의 코어 흐름이 실제 코드로 존재한다. 다만 `/`는 아직 제품 진입 화면이 아니라 부트스트랩 플레이스홀더이며, 실제 인증 진입점은 `/login`이다.

문서 최신화 원칙:

- 구현 완료 또는 부분 구현된 화면은 repo code를 진실원천으로 삼는다.
- 아직 라우트/컨트롤러/계약이 없는 Screen 8 이후는 product docs를 진실원천으로 유지한다.
- 진행 일지와 ADR은 역사 기록이므로, 현재 상태와 충돌할 때는 후속 정정 메모나 신규 일지로 보정한다.

---

## 데이터 모델 보강 — Team Context (2026-04-09)

Screen 3a(`POST /api/teams`)가 기존에는 팀 이름만 받아 생성했기 때문에, GPT-4o가 주제 제안과 브레인스토밍 클러스터링을 수행할 때 "이 팀이 어떤 상황에서 무엇을 만들려는지"를 모른 채 설문 데이터만으로 추론하는 문제가 있었다. 이를 해결하기 위해 Prisma `Team` 모델에 Team Context 필드 7개를 추가한다.

| 필드 | Prisma 타입 | 값 / 제약 | 필수 | 의미 |
|------|------------|-----------|------|------|
| `teamType` | enum `TeamType` | `HACKATHON` / `CAPSTONE` / `BOOTCAMP` / `SIDE_PROJECT` / `STARTUP` | 필수 | 팀 운영 형태 |
| `projectDuration` | enum `ProjectDuration` | `UNDER_1_DAY` / `ONE_TO_FOUR_WEEKS` / `ONE_TO_THREE_MONTHS` / `OVER_THREE_MONTHS` | 필수 | 프로젝트 기간 |
| `completionTarget` | enum `CompletionTarget` | `DEMO` / `MVP` / `PRODUCTION` | 필수 | 목표 완성도 |
| `hasNonDeveloper` | `Boolean?` | nullable, default 없음 | 선택 | 비개발자(PM/디자이너) 팀원 포함 여부 |
| `usesVibeCoding` | `Boolean?` | nullable, default 없음 | 선택 | Cursor/Claude Code 등 바이브코딩 도구 활용 계획 |
| `hasSkillGap` | `Boolean?` | nullable, default 없음 | 선택 | 팀원 간 개발 경험 편차가 큰가 |
| `domainHints` | `String[]` (max 2) | `FINTECH` / `HEALTHCARE` / `EDUCATION` / `SOCIAL` / `AI_ML` / `INFRA_TOOLING` / `ECOMMERCE` / `PUBLIC` / `GAME` / `OTHER` | 선택 | 관심 도메인 힌트 (최대 2개) |

운영 규칙:

- **단일 enum 소스:** `packages/contracts/src/team/team-context.ts`에 Zod로 선언한다. 백엔드(NestJS/Prisma seed), 프론트엔드(폼 옵션), 계약(Server Actions) 모두 이 파일에서 import한다. Prisma 스키마의 enum 정의와 값이 일치하도록 단일 소스에서 재사용한다.
- **Boolean nullable 정책:** `hasNonDeveloper`, `usesVibeCoding`, `hasSkillGap`는 `Boolean?`으로 선언하며 default 값을 두지 않는다. legacy 팀(도입 이전 생성된 팀)과 "선택 안 함"을 의미적으로 동일하게 취급하지 않기 위함이다. Dashboard 배너는 null 값을 배지에서 생략하는 방식으로 렌더링한다.
- **현재 구현 메모:** 현재 `/team/create` 폼은 이 세 필드를 2-state 체크박스로 수집하므로, 신규 생성 팀에서는 미선택 값이 `false`로 전송된다. 즉, nullable 저장 구조는 유지되지만 기본 생성 UI는 아직 `null`과 `false`를 구분해 입력받지 않는다.
- **입력 권한:** 팀 생성 시점에 팀장이 입력한다. 이후 수정은 향후 팀 정보 페이지에서만 허용(backlog). 팀원·옵저버는 열람만 가능하다.

### Survey와 Team Context의 의미 경계

Survey(`apps/api/src/survey/`, `SurveyAnswersSchema`)는 **개인 단위** 역량 데이터다. 각 팀원이 본인의 기술 스택, 협업 습관, AI 활용 프로필, 경험 계층(experienceTier), 시스템 블록 신뢰도 등을 직접 답한다. 반면 Team Context는 **팀 단위** 운영·목표 컨텍스트로, 팀장이 팀을 대표해 한 번 입력하고 모든 멤버에게 공통 적용된다. 의미가 부분적으로 겹치는 필드(`usesVibeCoding` ↔ Survey `aiProfile`, `hasSkillGap` ↔ Survey `experienceTier` 분포)는 **레벨이 다른 입력**이다. 개인 답변의 통계는 팀의 실제 역량 분포를 보여주고, Team Context는 팀이 스스로 선언하는 운영 방향을 보여준다. GPT-4o 프롬프트는 두 입력을 모두 받아야 "현실 역량"과 "운영 의도"를 교차 참고해 의미 있는 주제를 제안할 수 있다. 상세 분리 원칙은 `docs/architecture/team-context-vs-survey-boundary.md` 참조.
