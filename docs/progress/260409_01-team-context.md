# 260409_01-team-context

## 작업 요약

- Team 모델에 팀 단위 컨텍스트 7필드(`teamType`, `projectDuration`, `completionTarget`, `hasNonDeveloper`, `usesVibeCoding`, `hasSkillGap`, `teamGoal`)를 추가하고 `POST /api/teams` 생성 경로 전체에 연결했다.
- `packages/contracts/src/team/team-context.ts`를 enum 단일 소스로 두고, Prisma enum과 Zod enum 값을 수동 동기화했다.
- GPT-4o 주제 제안(`kickoff.service.ts`)과 브레인스토밍 클러스터링(`brainstorm.service.ts`) 두 프롬프트 모두 `<team_context>` XML 블록을 `<survey_data>` 앞에 주입하도록 수정했다.
- Screen 3a 팀 생성 폼과 Screen 6 Team Dashboard 배너 UI를 Team Context 입력/표시 경로로 연결했고, legacy 팀은 `null` 필드를 조건부로 생략하도록 처리했다.
- E2E 47개(기존) + 6개(Team Context) = 53개 모두 그린, TypeScript 0 errors, tf-supervisor/tf-security 모두 `ok-to-commit`.

## 구현된 기능

### DB 스키마 + 마이그레이션

| 파일 | 변경 |
| --- | --- |
| `apps/api/prisma/schema.prisma` | Team 모델에 `teamType TeamType?`, `projectDuration ProjectDuration?`, `completionTarget CompletionTarget?`, `hasNonDeveloper Boolean?`, `usesVibeCoding Boolean?`, `hasSkillGap Boolean?`, `teamGoal String?` 추가. `TeamType` / `ProjectDuration` / `CompletionTarget` enum 신규 선언 |
| `apps/api/prisma/migrations/20260409073517_add_team_context/` | 신규 마이그레이션. boolean 3종은 default 없이 nullable, string/enum도 모두 nullable |

### Contracts 단일 소스

| 파일 | 변경 |
| --- | --- |
| `packages/contracts/src/team/team-context.ts` | 신규. `TeamTypeSchema`, `ProjectDurationSchema`, `CompletionTargetSchema`, `TeamContextSchema` (전체 7필드), `TeamContextCreateInputSchema` (create DTO용 부분) 선언 |
| `packages/contracts/src/team/index.ts` | `team-context.ts` re-export |
| `packages/contracts/src/index.ts` | `team/*` barrel 노출 |

### Backend 연결

| 파일 | 변경 |
| --- | --- |
| `apps/api/src/common/team-context.util.ts` | 신규. `buildTeamContextBlock(team)` helper. null 필드는 블록에서 생략, legacy 팀은 빈 문자열 반환해 프롬프트에서 완전히 빠지게 함 |
| `apps/api/src/teams/dto/create-team.dto.ts` | `TeamContextCreateInputSchema`로 입력 검증 확장, `teamGoal` 길이 제한 포함 |
| `apps/api/src/teams/teams.service.ts` | `createTeam`에서 Team Context 필드를 `team.create` payload에 전달 |
| `apps/api/src/kickoff/kickoff.service.ts` | `GET /kickoff/status` 응답에 `teamContext` 필드 포함 (KF-039). `generateTopicSuggestions` GPT-4o 프롬프트에 `<team_context>` 블록을 `<survey_data>` 앞에 주입 |
| `apps/api/src/brainstorm/brainstorm.service.ts` | `clusterIdeas` GPT-4o 프롬프트에 동일한 `<team_context>` 블록 주입 |

### Frontend 폼 + 배너

| 파일 | 변경 |
| --- | --- |
| `apps/web/lib/team-context-labels.ts` | 신규. enum 값 → 한국어 라벨 + Lucide 아이콘 매핑 단일 모듈. `TeamTypeLabel`, `ProjectDurationLabel`, `CompletionTargetLabel`, boolean 특성 라벨 포함 |
| `apps/web/app/team/create/create-team-client.tsx` | Team Context 입력 섹션 추가. 팀 유형/기간/완료 기준은 Lucide 아이콘 카드 라디오, boolean 3종은 3-state(예/아니오/선택 안 함), teamGoal은 선택 textarea |
| `apps/web/app/team/join-or-create/actions.ts` | Server Action이 Team Context 7필드를 `POST /api/teams`에 전달 |
| `apps/web/app/team/join-or-create/team-setup-client.tsx` | 생성 탭 폼에 동일한 Team Context 섹션 노출 |
| `apps/web/app/team/[teamId]/dashboard/page.tsx` | `/kickoff/status` 응답의 `teamContext`를 클라이언트로 내려보냄 |
| `apps/web/app/team/[teamId]/dashboard/kickoff-dashboard-client.tsx` | 상단 Team Context 배너. enum은 라벨+아이콘 배지로, boolean은 true인 것만 배지로 표시, null 필드는 생략 |
| `apps/web/app/dev-preview/page.tsx` | Team Context 입력 경로 preview 보강 |

### 테스트 업데이트

| 파일 | 변경 |
| --- | --- |
| `tests/e2e/fixtures/teams.ts` | Team 생성 fixture에 Team Context 샘플 데이터 추가 |
| `tests/e2e/helpers/seed.ts` | seed 유틸리티가 Team Context 필드를 함께 insert |
| `tests/e2e/scenarios/01-auth-team.spec.ts` | Team Context 입력/저장/배너 표시 경로 6개 시나리오 추가 |

### 문서

| 파일 | 변경 |
| --- | --- |
| `docs/product/screen-flow.md` | Screen 3a Team Create Flow Detail, Screen 6 Dashboard 배너, Screen 7a/7b AI 프롬프트 주입 지점 섹션 갱신 |
| `docs/product/system-spec.md` | 데이터 모델 섹션에 Team Context 필드 서술 추가 |
| `docs/architecture/team-context-vs-survey-boundary.md` | 신규. 팀 단위 운영 맥락 vs 개인 설문 통계의 경계, legacy 팀 fallback, 프롬프트 순서 결정 근거 정리 |
| `docs/runbooks/migration-add-team-context.md` | 신규. `20260409073517_add_team_context` 마이그레이션 실행 절차, legacy 데이터 호환 확인 체크리스트 |
| `docs/progress/decisions.md` | KF-036~040 본문을 tf-flow가 추가했고, 이번 세션에서 일지 링크와 ADR-006 상호 참조를 보강 |

## 설계 결정

- `KF-036`: Team Context boolean 3종(`hasNonDeveloper`, `usesVibeCoding`, `hasSkillGap`)은 `Boolean?` nullable. default 값을 두지 않아 legacy 팀의 미입력 상태와 팀장이 "아니오"로 선택한 상태를 구분한다. AI 프롬프트와 Dashboard 배너 모두 null을 조건부로 생략한다.
- `KF-037`: `TeamType`, `ProjectDuration`, `CompletionTarget` enum은 `packages/contracts/src/team/team-context.ts`를 단일 소스로 둔다. Prisma enum은 DB 스키마 요구로 존재하지만 값 drift를 방지하기 위해 이 파일을 기준으로 수동 동기화하며, 불일치는 CI 검증으로 잡는다.
- `KF-038`: Team Context는 `kickoff.service.ts`의 주제 제안 생성과 `brainstorm.service.ts`의 클러스터링 **두 곳 모두** GPT-4o 프롬프트에 주입한다. 주입 위치는 `<team_context>` XML 블록이며 `<survey_data>` 블록 **앞에** 위치한다. 팀 단위 맥락이 개인 설문 통계의 상위 제약으로 작용해야 앵커링 편향을 피할 수 있다.
- `KF-039`: Team Context의 Dashboard 배너는 기존 `GET /api/teams/:teamId/kickoff/status` 응답에 `teamContext` 필드를 추가해 제공한다. 별도 `GET /teams/:teamId/context` 엔드포인트는 만들지 않는다. 팀 생성 이후 거의 변하지 않는 정적 데이터이고 대시보드 라운드트립을 줄여야 하기 때문이다.
- `KF-040`: Team Context 관련 모든 UI(팀 생성 폼 헤더, Dashboard 배너, 이후 추가될 컴포넌트)는 Lucide React 아이콘만 사용한다. 이모지 사용 금지 원칙을 새 도메인 도입 시점에 명시적으로 재확인했으며, enum → 라벨/아이콘 매핑은 `apps/web/lib/team-context-labels.ts` 한 곳으로 모았다.

## 미완료 항목

- 없음. tf-db, tf-backend, tf-frontend, tf-supervisor, tf-security 모두 `done` 또는 `ok-to-commit`. E2E 53/53 green, TypeScript API/Web 0 errors, 마이그레이션 로컬 적용 완료.
- `PATCH /teams/:teamId/context`(팀 정보 수정용) 엔드포인트는 KF-039 주석에 명시한 대로 향후 별도 세션에서 추가 예정. 현재는 팀 생성 시점에만 입력 가능.

## 다음 시작 포인트

- Screen 8 (`/team/[teamId]/structure` + `/stack`) 또는 Screen 10 Contract Gate 진입. Contract Gate는 KF-038을 활용해 `completionTarget` 기반 DEMO / MVP / PRODUCTION별 분기 로직을 구현할 수 있다.
- Team Context enum 값 drift 감지용 CI 검증 테스트가 아직 수동 동기화에 의존 중이므로, 다음 세션에서 `packages/contracts` vs `prisma schema` 값 비교 테스트를 자동화 검토.
- Screen 7a 클러스터링이 `<team_context>` 주입 이후 실제로 더 정합한 결과를 내는지, 프롬프트 품질 회귀 테스트가 필요한 경우 `tooling/prompts/` 아래에 snapshot 케이스 도입 검토.
