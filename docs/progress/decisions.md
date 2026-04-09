# Decision Ledger

This file keeps the currently effective working decisions in a compact format.

## KF-001 — Documentation precedence is explicit

**Conclusion:** Stable implementation work follows `product -> api -> architecture -> adr/progress` order, while `research/` remains background only.

**Why:** The repository already contains rich research documents and Claude operating instructions. Without a precedence rule, future work can drift or contradict itself.

**Impact:** `docs/README.md`, `README.md`, `docs/research/README.md`

**ADR:** [ADR-001](../adr/ADR-001-repo-structure-and-documentation-governance.md)

**Log:** [260406_01](./260406_01-repo-docs-structure-bootstrap.md)

## KF-002 — TeamForge starts as a collaboration-first monorepo

**Conclusion:** The working top-level structure is `apps/`, `packages/`, `tooling/`, `infra/`, `tests/`, and `docs/`, with `apps/web` and `apps/api` as the initial runtime boundaries.

**Why:** The existing `.claude` orchestration already assumes app and package separation, and the documentation workflow needs a stable place for contracts, prompts, and runbooks.

**Impact:** root structure, `docs/architecture/repo-structure.md`, app/package folder ownership

**ADR:** [ADR-001](../adr/ADR-001-repo-structure-and-documentation-governance.md)

**Log:** [260406_01](./260406_01-repo-docs-structure-bootstrap.md)

## KF-003 — Research and implementation backend views are intentionally separated

**Conclusion:** Research documents that mention FastAPI are preserved as conceptual input, but the repository implementation baseline is currently `apps/api` with NestJS + Prisma. Python extraction is a later architecture option, not the starting point.

**Why:** The imported research and the active Claude orchestration rules describe different backend boundaries. Choosing one implementation baseline avoids repeated confusion while keeping the research valuable.

**Impact:** `docs/architecture/repo-structure.md`, `docs/api/implementation-supplement-v1.0.md`, `CLAUDE.md`, `.claude/agents/tf-flow.md`

**ADR:** [ADR-002](../adr/ADR-002-implementation-baseline-nestjs-bff.md)

**Log:** [260406_01](./260406_01-repo-docs-structure-bootstrap.md)

## KF-004 — 역할별 접근 매트릭스를 코드 이전에 문서로 확정

**결론:** middleware.ts 경로 추가 전에 leader/member/observer 각 역할이 접근 가능한 경로 목록을 `docs/architecture/` 또는 ADR로 먼저 명시한다.

**이유:** 역할 분기 구조물이 전무한 상태에서 코드부터 작성하면 경로 보호 로직이 일관성 없이 산재될 위험이 있다. 매트릭스를 먼저 확정하면 middleware.ts, NestJS 가드, 프론트엔드 조건부 렌더링이 동일 기준을 공유할 수 있다.

**영향 범위:** `apps/web/middleware.ts`, `apps/api/src/` 가드 계층, Screen 2~10 접근 제어 로직

**일지:** [260406_03](./260406_03-full-structure-analysis.md)

## KF-005 — middleware.ts `matcher: []`는 즉시 수정 대상인 보안 부채

**결론:** 현재 `matcher: []`는 임시 스캐폴드 상태이며, Screen 1~3 인증 구현 시 보호 경로 목록을 추가하는 것을 첫 번째 작업으로 강제한다. 260406_04 세션에서 PROTECTED_PATHS 기반 경로 보호로 수정 완료. jti 재사용 방지는 Redis 도입 후 처리 예정.

**이유:** tf-security가 CRITICAL로 판정. 인증 보호가 전무한 채로 기능 구현이 누적되면 나중에 경로 보호를 소급 적용하기 어려워진다.

**영향 범위:** `apps/web/middleware.ts`, NextAuth 세션 검사 로직

**일지:** [260406_03](./260406_03-full-structure-analysis.md), [260406_04](./260406_04-auth-infra-screen1-3.md), [260406_08](./260406_08-codebase-edge-case-analysis-and-bug-fixes.md) (상태 재확인: 여전히 미완료, 수용 가능한 기술 부채로 유지 중)

## KF-006 — Server Actions를 인증된 API 호출의 표준 패턴으로 확정

**결론:** 클라이언트 컴포넌트에서 인증이 필요한 API를 호출할 때는 Server Actions를 경유한다. 클라이언트 측에서 JWT를 직접 보관하거나 fetch하는 방식을 금지한다.

**이유:** Server Actions 내부에서 auth() 세션 검증을 수행하면 클라이언트에 토큰이 노출되지 않고, Next.js가 CSRF 방어를 자동 적용하며, 세션 유효성을 항상 서버에서 보장할 수 있다. Screen 1~3 구현 시 이 패턴이 검증됐다.

**영향 범위:** `apps/web/app/**/actions.ts` 전체, `apps/web/lib/auth.ts`, 이후 Screen 4~10 Server Actions

**일지:** [260406_04](./260406_04-auth-infra-screen1-3.md)

## KF-007 — BFF 패턴: apiFetch는 서버 전용, 클라이언트 호출은 별도 hook 경로로 분리

**결론:** `apps/web/lib/api-fetch.ts`의 `apiFetch`는 서버 컴포넌트 및 Server Actions 전용이다. 클라이언트 컴포넌트에서 API를 직접 호출해야 하는 경우 별도의 클라이언트 hook(`useXxx`) 경로를 만들고 서버에서 발급한 세션 쿠키를 통해 인증한다.

**이유:** `apiFetch`는 내부적으로 `INTERNAL_API_URL`과 `jose SignJWT`를 사용해 서버 간 신뢰 토큰을 생성한다. 이 로직이 클라이언트 번들에 포함되면 서명 시크릿이 노출될 위험이 있다.

**영향 범위:** `apps/web/lib/api-fetch.ts`, `apps/web/app/**/actions.ts`, 이후 클라이언트 훅 파일

**일지:** [260406_05](./260406_05-css-auth-bff-dashboard.md)

## KF-008 — /api/auth/sync 는 X-Sync-Secret 헤더로 BFF 전용 보호

**결론:** `POST /api/auth/sync` 엔드포인트는 `SyncSecretGuard`를 통해 `X-Sync-Secret` 헤더 값을 검증한다. 이 값은 환경변수 `SYNC_INTERNAL_SECRET`에서 읽으며, BFF(`apps/web`) 서버 외부에서의 직접 호출을 차단한다.

**이유:** NextAuth jwt callback에서 DB sync를 수행할 때 해당 엔드포인트가 공개 인터넷에 노출되면 임의의 사용자가 role·profile 데이터를 조작할 수 있다. 서버 간 시크릿 헤더로 BFF 전용 경로임을 강제한다.

**영향 범위:** `apps/api/src/auth/sync.guard.ts`, `apps/web/lib/auth.ts` jwt callback, `SYNC_INTERNAL_SECRET` 환경변수

**일지:** [260406_05](./260406_05-css-auth-bff-dashboard.md)

## KF-009 — SurveyResponse JSONB answers는 단일 통합 스키마로 관리

**결론:** 6개 설문 섹션 전체를 하나의 `SurveyAnswersSchema` Zod 스키마(`packages/contracts/src/jsonb/survey-answers.schema.ts`)로 통합 관리한다. 섹션별 분리 스키마를 두지 않는다.

**이유:** JSONB 필드는 DB 수준에서 타입 강제가 없으므로 애플리케이션 계층에서 단일 스키마로 파싱·검증해야 일관성이 보장된다. 섹션 분리 시 섹션 간 의존 검증이 불가능해지고, 부분 저장(드래프트) 처리도 어려워진다.

**영향 범위:** `packages/contracts/src/jsonb/survey-answers.schema.ts`, `apps/api/src/survey/survey.service.ts`, `apps/web/app/team/[teamId]/survey/actions.ts`

**일지:** [260406_06](./260406_06-screen4-survey-implementation.md)

## KF-010 — submitSurvey는 idempotent last-write-wins, submitted=true 후 재제출 차단

**결론:** 드래프트 저장(`saveDraft`)은 언제든 덮어쓸 수 있다. 최종 제출(`submitSurvey`)은 `submitted=true`로 전환되며, 이후 재제출 요청은 서비스 계층에서 400 오류로 차단한다. draft 상태에서의 중복 POST는 last-write-wins로 처리한다.

**이유:** 설문은 한 번 제출하면 팀 결과 집계에 포함된다. 재제출을 허용하면 결과 페이지 일관성이 깨진다. 동시에 네트워크 재시도로 인한 중복 draft 저장은 방어할 필요가 없으므로 last-write-wins가 적절하다.

**영향 범위:** `apps/api/src/survey/survey.service.ts`, `apps/web/app/team/[teamId]/survey/actions.ts`

**일지:** [260406_06](./260406_06-screen4-survey-implementation.md)

## KF-011 — Section 6 포트폴리오는 GitHub URL + selfIntro만 보관, PDF 업로드 제거

**결론:** Section 6 포트폴리오 섹션에서 PDF 파일 업로드를 제거하고 GitHub URL과 자기소개(selfIntro) 텍스트만 `SurveyAnswersSchema`에 포함한다.

**이유:** PDF 업로드는 magic bytes 검증, Supabase Storage 연동, 업로드 진행 UX 등 별도 인프라가 필요하다. Screen 4 구현 범위를 킥오프 설문 핵심 데이터 수집으로 한정하고, 파일 업로드는 추후 별도 기능으로 분리한다.

**영향 범위:** `packages/contracts/src/jsonb/survey-answers.schema.ts`, `apps/web/components/survey/sections/Section6Portfolio.tsx`

**일지:** [260406_06](./260406_06-screen4-survey-implementation.md)

## KF-012 — AppHeader 높이는 CSS 변수 `--tf-app-header-height`로 단일 관리

**결론:** 공유 AppHeader의 높이 값 `53px`을 `globals.css`의 `--tf-app-header-height` CSS 변수 하나로 관리한다. 하위 요소(스티키 바 등)는 이 변수를 참조한다.

**이유:** 컴포넌트마다 하드코딩된 픽셀 값이 분산되면 AppHeader 높이 변경 시 모든 참조처를 찾아 수정해야 한다. 단일 CSS 변수로 관리하면 수정 범위가 `globals.css` 한 곳으로 한정된다.

**영향 범위:** `apps/web/app/globals.css`, `apps/web/components/layout/AppHeader.tsx`, sticky 요소가 있는 모든 페이지

**일지:** [260406_07](./260406_07-shared-app-header.md)

## KF-013 — AppHeader는 Client Component 유지, signOut 인터랙션이 이유

**결론:** AppHeader는 Client Component(`"use client"`)로 유지한다. Server Component로 전환하지 않는다.

**이유:** signOut 버튼 클릭 핸들러가 반드시 클라이언트 인터랙션이 필요하다. RSC로 전환하면 인터랙티브 요소를 별도 Client 자식 컴포넌트로 분리해야 하며, 단일 헤더 컴포넌트의 복잡도 대비 이점이 없다.

**영향 범위:** `apps/web/components/layout/AppHeader.tsx`

**일지:** [260406_07](./260406_07-shared-app-header.md)

## KF-015 — Screen 9/10 외부 write-back 및 계약 형식은 ADR 확정 전 구현 불가

**결론:** Screen 9 핸드오프 아티팩트의 GitHub/Notion/Slack 외부 연동과 Screen 10 킥오프 계약서의 저장 형식(PDF, DB 스냅샷, export API)은 별도 ADR이 확정되기 전까지 구현을 차단한다. 두 화면의 readiness는 `needs-adr`로 유지한다.

**이유:** AI 생성 파일을 외부 시스템에 write-back하는 흐름은 돌이킬 수 없는 부작용(레포 커밋, 워크스페이스 생성)을 포함하므로 반드시 Human approval checkpoint와 함께 설계되어야 한다. 계약서 형식도 서명 법적 효력, 불변 스냅샷 저장 방식, export 포맷을 사전에 확정하지 않으면 DB 마이그레이션 비용이 급증할 수 있다.

**차단 항목:** Screen 9 write-back 버튼 활성화, Screen 10 계약서 PDF export, 워크스페이스 프로비저닝 연동

**영향 범위:** `apps/api/src/handoff/`, `apps/api/src/contract/`, `apps/web/app/team/[teamId]/handoff/`, `apps/web/app/team/[teamId]/contract/`, `docs/reviews/ai-artifacts/`

**일지:** [260406 screen-flow design](./260406_screen5-11-flow-design.md) (screen-flow.md 설계 시 추가)

## KF-016 — 레이더 차트는 순수 SVG 구현, 외부 차트 라이브러리 불도입

**결론:** Screen 5 개인 결과 페이지의 6축 레이더 차트를 recharts, d3 등 외부 라이브러리 없이 순수 SVG 로 구현한다.

**이유:** 레이더 차트 단일 목적을 위해 차트 라이브러리 전체를 번들에 추가하면 클라이언트 JS 크기가 불필요하게 증가한다. 6축 고정 형태는 SVG polygon/polyline 계산으로 충분히 구현 가능하며, 커스터마이징 유연성도 더 높다.

**영향 범위:** `apps/web/app/team/[teamId]/result/result-client.tsx`

**일지:** [260406_09](./260406_09-screen5-6-result-dashboard-implementation.md)

## KF-017 — 설문 점수 계산은 NestJS 서비스 단 단일 수행

**결론:** 6축 점수 계산 로직은 `apps/api/src/survey/survey.service.ts` 의 `getMyResult` 메서드에서만 수행한다. 프론트엔드는 계산된 `scores` 배열만 수신하며, 원본 answers 데이터를 받아 클라이언트에서 집계하지 않는다.

**이유:** 점수 계산 로직이 클라이언트에 노출되면 설문 문항 가중치와 집계 방식이 공개된다. 서버 단 단일 계산으로 로직을 보호하고, 향후 가중치 조정 시 배포 없이 서버만 수정하면 된다.

**영향 범위:** `apps/api/src/survey/survey.service.ts` (getMyResult), `apps/api/src/survey/survey.controller.ts` (GET result/me), `apps/web/app/team/[teamId]/result/`

**일지:** [260406_09](./260406_09-screen5-6-result-dashboard-implementation.md)

## KF-018 — Phase State Machine: 단방향 전이, 서비스 계층 계산

**결론:** 킥오프 phase 는 `idle → survey_in_progress → survey_complete → topic_selected → ...` 단방향 전이만 허용한다. phase 값은 DB 컬럼이 아닌 서비스 계층(`kickoff.service.ts`)에서 현재 데이터 상태를 기반으로 계산한다.

**이유:** DB에 phase 컬럼을 별도로 두면 실제 데이터 상태(설문 제출 수, 주제 선정 여부 등)와 phase 값이 불일치할 위험이 있다. 서비스 계층에서 매번 계산하면 단일 진실원천이 보장되고, phase 정의 변경 시 마이그레이션이 불필요하다.

**영향 범위:** `apps/api/src/kickoff/kickoff.service.ts`, `apps/web/app/team/[teamId]/dashboard/kickoff-dashboard-client.tsx`

**일지:** [260406_09](./260406_09-screen5-6-result-dashboard-implementation.md)

## KF-014 — `/dev-preview`는 PROTECTED_PATHS 포함 대상

**결론:** Figma 캡처 전용 경로인 `/dev-preview`도 `middleware.ts`의 PROTECTED_PATHS에 포함하여 인증 없이는 접근할 수 없도록 한다.

**이유:** dev-preview는 인증 우회 화면 미리보기 용도이지만 스테이징 환경에서 외부에 노출되면 미완성 UI가 공개된다. 인증 보호를 유지하면서 Playwright 캡처 시에는 세션 쿠키를 주입하는 방식으로 대응한다.

**영향 범위:** `apps/web/middleware.ts`, Figma 캡처 자동화 스크립트

**일지:** [260406_07](./260406_07-shared-app-header.md)

## KF-019 — Screen 7~8b 구현 순서 및 DB 스키마 확장 결정

**결론:** Screen 7 → Screen 8a → Screen 8b 순으로 순차 구현한다. DB에 KickoffTopic, KickoffReaction, KickoffStructure, KickoffStack, MemberExperience 5개 테이블을 신규 추가한다. KF-018(phase 서비스 계층 계산)에 따라 Team 테이블에 phase 컬럼을 추가하지 않으며, 각 테이블의 confirmedAt/acceptedAt 존재 여부로 phase를 판단한다. KickoffReaction은 screen 컬럼으로 구분하는 단일 테이블로 통합한다.

**이유:** 각 화면이 이전 phase를 게이트로 사용하는 단방향 의존성 때문에 순서를 건너뛸 수 없다. Screen 7이 Claude API 최초 호출 검증 지점이므로 AI 인프라를 가장 먼저 검증한다. KickoffReaction을 화면별로 분리하면 공통 집계 쿼리가 중복되고, 단일 테이블이 향후 Screen 9/10 반응 확장에도 유리하다.

**영향 범위:** `apps/api/prisma/schema.prisma`, `apps/api/src/kickoff/kickoff.service.ts` (getPhase 확장), `packages/contracts/src/ai/`, `packages/contracts/src/jsonb/`

**일지:** screen-flow.md Screen 7~8b 설계 가이드 (2026-04-06)

## KF-020 — AI Job 처리는 polling 기반 202/200 패턴, ADR-003 확정 필요

**결론:** Screen 7/8a의 Claude API 호출은 동기 HTTP 응답이 아닌 202 Accepted → polling 패턴으로 처리한다. 최초 요청 시 job ID를 반환하고, 클라이언트는 5초 간격 최대 5회 polling. 5회 초과 시 fallback UI 전환. AI 응답은 `packages/contracts/src/ai/` 스키마로 검증 후 저장하며 파싱 실패 3회 시 job을 failed 처리. Screen 8b(stack)는 AI 신규 생성 없이 acceptedBlocks 기반 옵션 매핑만 수행한다.

**이유:** Claude API 응답 시간이 5~15초이므로 동기 처리 시 클라이언트 timeout 위험이 있다. polling은 서버 재시작 후에도 복구 가능한 상태를 보장하며, KF-001 구현 보완 문서의 "Long-running AI work must expose job state" 원칙에 부합한다. ADR-003에서 polling 간격, 재시도 횟수, fallback 조건을 공식화해야 한다.

**차단 항목:** ADR-003 작성 전까지 Screen 7 AI 호출 구현 착수 불가.

**영향 범위:** `apps/api/src/topic/`, `apps/api/src/structure/`, `packages/contracts/src/ai/`

**일지:** screen-flow.md Screen 7~8b 설계 가이드 (2026-04-06)

## KF-021 — Phase Transition은 NestJS 서비스 직접 처리, EventEmitter 미도입

**결론:** Screen 7~8b의 kickoff phase transition은 EventEmitter 없이 서비스 계층에서 직접 처리한다. 각 write 엔드포인트(confirm, accept)가 자신의 서비스 메서드에서 phase 전이 조건을 검증하고 데이터를 저장한다. Screen 9/10의 외부 write-back이 필요해지는 시점(KF-015 ADR)에서 EventEmitter 또는 BullMQ 도입을 재검토한다.

**이유:** Screen 7~8b의 phase transition은 모두 명시적 leader 액션으로만 발생하므로 이벤트 기반 비동기가 필요하지 않다. EventEmitter 도입 시 phase 전이 로직이 서비스 + 리스너에 분산되어 추적이 어려워진다. KF-018의 "서비스 계층 단일 계산" 원칙과 일관된다.

**영향 범위:** `apps/api/src/kickoff/kickoff.service.ts`, `apps/api/src/topic/topic.service.ts`, `apps/api/src/structure/structure.service.ts`, `apps/api/src/stack/stack.service.ts`

**일지:** screen-flow.md Screen 7~8b 설계 가이드 (2026-04-06)

## KF-023 — topic_confirmed 이후 주제 재편집은 현 단계 불허, 별도 ADR 선행

**결론:** `topic_confirmed` phase 이후 리더의 주제 재편집 기능을 현 Screen 7 구현 범위에 포함하지 않는다. 확정 후 화면은 read-only로 전환하고 재편집 버튼을 노출하지 않는다. 재편집 허용 시 하위 phase(structure, stack) 데이터 초기화 정책 전체가 미설계 상태이므로 별도 ADR 확정 전까지 구현을 차단한다.

**이유:** phase 역행 흐름(confirmed → 미확정 → 재선택)은 structure/stack/handoff 데이터의 캐스케이드 초기화 정책을 수반한다. 이 정책 없이 재편집을 허용하면 structure 데이터가 이전 주제 기반으로 오염된 채 남는다.

**차단 항목:** Screen 7 확정 후 재편집 버튼, phase 역행 API

**영향 범위:** `apps/api/src/topic/topic.service.ts`, `apps/web/app/team/[teamId]/topic/`

**일지:** docs/architecture/screen7-design-review.md (2026-04-06)

## KF-022 — Socket.io 도입은 Screen 7 착수 전 ADR-004로 결정, ADR 전까지 보류

**결론:** Socket.io를 Screen 7에 최소 범위로 도입할지, Screen 11까지 미룰지는 ADR-004로 공식 결정한다. Screen 7의 reaction 실시간성은 polling으로 대체 가능하나, Screen 7 구현 시 도입해두면 Screen 11 실시간 협업에 재사용 가능하다. ADR-004 확정 전까지 Socket.io 관련 코드를 작성하지 않는다.

**이유:** Socket.io는 인프라 의존성 추가를 수반한다. "Screen 7 단독 polling"과 "Screen 7에서 Socket.io 세팅"은 구현 비용 차이가 있으므로 결정 없이 착수하면 나중에 소급 리팩터링이 필요해진다. ADR을 통해 근거 있는 결정을 남겨야 한다.

**차단 항목:** ADR-004 작성 전까지 Socket.io 서버 설정 코드 작성 불가.

**영향 범위:** `apps/api/src/main.ts` (Socket.io 서버 설정), `apps/api/src/` 실시간 게이트웨이 모듈, `apps/web/hooks/` 클라이언트 소켓 훅

**일지:** screen-flow.md Screen 7~8b 설계 가이드 (2026-04-06)

## KF-024 — OpenAI GPT-4o SDK 도입 (Screen 7 AI 주제 제안)

**결론:** `openai` npm 패키지를 `apps/api`에 추가하고 `process.env.OPENAI_API_KEY` 환경변수로 인증한다. Screen 7 주제 제안에 `gpt-4o` 모델을 JSON 모드로 사용한다. AI 응답은 `TopicSuggestionsSchema` Zod 스키마로 파싱·검증하며, 실패 3회 시 job을 FAILED 처리한다.

**이유:** 팀 설문 데이터(6섹션 answers)를 분석해 킥오프 주제 3~5개를 생성하는 작업은 GPT-4o JSON 모드가 가장 직접적으로 지원한다. Claude API는 Screen 8a/8b 구조/스택 제안에서 재검토한다. SDK 방식 도입으로 스트리밍, 재시도, 타임아웃 설정을 표준 인터페이스로 관리한다.

**영향 범위:** `apps/api/package.json`, `apps/api/src/topic/topic.service.ts`, `packages/contracts/src/ai/topic-suggestions.schema.ts`, `OPENAI_API_KEY` 환경변수

**일지:** [260407_01](./260407_01-screen7-topic-decision.md)

## KF-026 — 블록 신뢰도 레이어는 SYSTEM_BLOCKS × 4레벨 JSONB 구조, 마이그레이션 불필요

**결론:** Section 7 블록 신뢰도는 SYSTEM_BLOCKS(11개 고정 블록) × 4레벨(lead/contribute/learn/cant) 매트릭스로 표현한다. 응답은 기존 JSONB `answers` 필드 안에 `blockConfidence` 키로 저장하며, Prisma 스키마 변경 및 마이그레이션이 필요 없다. 11개 블록 목록과 레벨 값은 `packages/contracts/src/jsonb/survey-answers.schema.ts`의 `SYSTEM_BLOCKS`, `BlockConfidenceLevel` 상수로 단일 관리한다.

**이유:** 블록 정의는 제품 출시 전까지 변경될 수 있다. DB 컬럼화하면 블록 추가/삭제 시마다 마이그레이션이 필요하다. JSONB + 계약 레이어 스키마 검증 방식은 KF-009 원칙과 일관되며, 블록 목록 변경을 계약 파일 수정만으로 처리할 수 있다.

**영향 범위:** `packages/contracts/src/jsonb/survey-answers.schema.ts`, `apps/web/components/survey/sections/Section7Capability.tsx`, `apps/api/src/survey/survey.service.ts` (_calcBlockProfile, VALID_BLOCKS)

**일지:** [260407_04](./260407_04-survey-screen56-redesign.md)

## KF-027 — 팀 협업 점수 = 멤버별 collabChecklist true 평균; blockCoverage = lead/partial/gap 분류

**결론:** 팀 협업 성숙도 점수(`teamCollabScore`)는 제출된 각 멤버의 `collabChecklist` true 개수(0-6)의 평균값으로 계산한다. 팀 블록 커버리지(`blockCoverage`)는 블록별로 lead가 1인 이상이면 "covered", contribute만 있으면 "partial", 둘 다 없으면 "gap"으로 분류한다. 두 계산 모두 `kickoff.service.ts` `_buildTeamInsight()`에서 수행한다(KF-018 서비스 계층 단일 계산 원칙 준수).

**이유:** 단순 평균/분류 방식은 계산 근거가 명확하고 클라이언트 노출 없이 서버에서 보호된다. blockCoverage 3단계 분류는 Screen 6 대시보드에서 팀 강점/공백을 직관적으로 시각화하기에 충분한 세분화다.

**영향 범위:** `apps/api/src/kickoff/kickoff.service.ts` (_buildTeamInsight), `apps/web/app/team/[teamId]/dashboard/kickoff-dashboard-client.tsx` (BlockCoverageGrid, CollabMaturityBar), `apps/web/app/team/[teamId]/dashboard/page.tsx` (TeamInsight 인터페이스)

**일지:** [260407_04](./260407_04-survey-screen56-redesign.md)

## KF-028 — Survey 카드 UI 표준: 아이콘 카드 2열 그리드 + border 전환 패턴

**결론:** 설문 섹션 선택 옵션의 기본 UI 표준을 아이콘 카드 2열 그리드로 확정한다. 선택 카드 기본 상태는 `border: 2px solid transparent` + `box-shadow: 0 0 0 1px var(--tf-stroke-neutral)`이며, 선택 상태에서는 `border: 2px solid var(--tf-stroke-brand)`로 전환한다. 전환 애니메이션은 `transition: all 150ms ease-out` + `scale-[1.02]`를 적용한다.

**이유:** 2px border를 기본 상태에서도 transparent로 고정하면 선택 시 레이아웃 점프가 발생하지 않는다. 아이콘 카드 패턴은 텍스트 라디오 버튼 대비 스캔 속도가 빠르고 터치 타겟이 넓어 모바일 UX에 유리하다. scale 인터랙션은 150ms로 제한해 지나친 움직임을 방지한다.

**영향 범위:** `apps/web/components/survey/sections/Section1BasicInfo.tsx` ~ `Section9AIProfile.tsx` 전체 섹션, 이후 추가될 설문 섹션

**일지:** [260407_06](./260407_06-survey-card-ui-refresh.md)

## KF-025 — Screen 5 역할 반응 값을 ok/burden/prefer_other 3종으로 확정

**결론:** 기존 yes/somewhat/no 3종 반응 값을 `ok` / `burden` / `prefer_other` 로 교체한다. `prefer_other` 선택 시 선택적 자유 텍스트 필드(`preferOtherNote`, 최대 100자)를 함께 저장한다. `POST /api/teams/:teamId/survey/reaction` Body 스키마를 이에 맞게 변경하고, 기존 저장된 yes/somewhat/no 값은 API 계층에서 backward-compatible 매핑(yes→ok, somewhat→burden, no→prefer_other)으로 처리하거나 마이그레이션 스크립트를 작성한다.

**이유:** Screen 10 Contract Gate에서 역할 확정 시 팀원별 역할 반응을 참고 자료로 표시한다. yes/somewhat/no는 역할 수용 의사를 명확히 전달하지 않는다. ok/burden/prefer_other는 역할 협상 컨텍스트에 맞는 의미론적 레이블이다. preferOtherNote는 Screen 10에서 팀장이 역할 재배정 시 참고할 수 있는 근거 데이터다.

**영향 범위:** `apps/api/src/survey/survey.service.ts`, `apps/web/app/team/[teamId]/result/result-client.tsx`, `packages/contracts/src/jsonb/` (reaction 스키마)

**일지:** [260407_02](./260407_02-screen5-role-reaction.md)

## KF-029 — Screen 5 팀장 열람 URL은 쿼리 파라미터 방식, 역할 확정은 TeamMembership 컬럼 확장

**결론:** 팀장의 팀원 결과 열람 URL 구조를 `?view=member&userId=[memberId]` 쿼리 파라미터 방식으로 확정한다. 서버 컴포넌트에서 role이 `leader`인지 확인 후 렌더하며, 팀원이 직접 접근 시 본인 결과로 silently redirect한다. 역할 확정(`finalRole`)은 별도 테이블 없이 TeamMembership에 confirmedRole/confirmedAt/confirmedBy 컬럼을 추가하는 방식으로 구현 완료. finalRole 9개 옵션은 actualRoles 설문 옵션과 동일. finalRole 데이터는 Screen 10 Contract Gate에서 역할 배정 표로 참조된다.

**구현된 엔드포인트:**
- `GET /api/teams/:teamId/survey/result/:userId` — leader only, 팀원 설문 결과 열람 (ParseUUIDPipe)
- `GET /api/teams/:teamId/roles/me` — 본인 확정 역할 조회
- `POST /api/teams/:teamId/roles/finalize` — 팀원 역할 확정 (leader only, last-write-wins)

**실시간 반영:** Socket.io 미도입 시기에는 FinalizedRoleBadge 컴포넌트에서 30초 폴링으로 팀원 화면에 반영.

**이유:** 팀원 결과 열람에 별도 경로(`/result/[userId]`)를 두면 layout 공유 경계와 보안 guard 적용 범위가 복잡해진다. 쿼리 파라미터 방식은 동일 page.tsx에서 서버 컴포넌트 레벨 role 확인을 재사용할 수 있어 구현이 단순하다.

**연관:** KF-025 (roleReaction ok/burden/prefer_other), Screen 10 Contract Gate

**영향 범위:** `apps/api/prisma/schema.prisma`, `packages/contracts/src/roles/role-finalize.schema.ts`, `apps/api/src/survey/survey.service.ts`, `apps/api/src/survey/survey.controller.ts`, `apps/api/src/kickoff/kickoff.service.ts`, `apps/api/src/kickoff/kickoff.controller.ts`, `apps/web/app/team/[teamId]/result/page.tsx`, `apps/web/app/team/[teamId]/result/result-client.tsx`, `apps/web/components/result/`

**일지:** [260407_07](./260407_07-screen5-persona-view.md)

## KF-030 — 내부 문서 기본 언어는 한국어, 파일명과 식별자는 영어 유지

**결론:** TeamForge 내부 운영 문서의 기본 언어를 한국어로 통일한다. `docs/`, 프로젝트 전용 Claude 운영 문서, 문서 생성 템플릿, review/runbook/ADR/progress 문서 본문은 한국어로 작성한다. 다만 파일명 slug, 파일 경로, 명령어, 환경 변수, API path, 코드 식별자, Prisma 모델명 등은 영어 원문을 유지한다.

**이유:** 현재 저장소는 한국어와 영어가 문서마다 섞여 있어 문서 생성 결과가 일관되지 않고, 에이전트와 스킬이 매번 언어 선택을 다시 판단해야 했다. 언어 정책을 문서와 템플릿에 명시하면 신규 문서 생성 시 모호함이 줄고, 문서 품질과 토큰 효율도 함께 개선된다.

**영향 범위:** `docs/architecture/document-language-policy.md`, `docs/_templates/`, `CLAUDE.md`, `.claude/commands/tfo.md`, `.claude/agents/tf-docs.md`, `.claude/agents/tf-flow.md`, `.claude/agents/tf-db.md`, `.claude/agents/tf-design.md`, `/Users/kapr/.claude/skills/teamforge-docs/SKILL.md`

**일지:** [260407_08](./260407_08-document-language-policy-korean-default.md)

## KF-031 — Screen 7 분리: 7a(Brainstorm) + 7b(Topic Decision) 2단계 구조

**결론:** Screen 7을 7a(Brainstorm)와 7b(Topic Decision) 두 단계로 분리한다. 7a에서는 팀원들이 자유롭게 아이디어를 제출하고 build-on/리액션을 통해 발산하며, 7b에서는 dot voting과 리더 확정을 통해 킥오프 주제를 결정한다.

**이유:** 아이디어 생성(발산)과 주제 확정(수렴)은 성격이 다른 활동이다. 하나의 화면에 합치면 UI 복잡도가 높아지고, 단계별 상태 관리가 어려워진다. 분리하면 각 단계의 UX 목표를 명확히 하고, BrainstormPhase enum으로 상태 전이를 체계적으로 관리할 수 있다.

**영향 범위:** `apps/api/prisma/schema.prisma` (BrainstormSession, BrainstormPhase), `apps/web/app/team/[teamId]/topic/brainstorm/`, `apps/web/app/team/[teamId]/topic/`, `docs/product/screen-flow.md`, `docs/product/screen7-brainstorm-flow.md`

**일지:** [260408_02](./260408_02-screen7-brainstorm.md)

## KF-032 — Build-on은 single-parent MVP, 깊이 1단계 고정

**결론:** 브레인스토밍의 build-on(아이디어 확장) 기능은 single-parent 구조로 구현하며, 깊이를 1단계로 고정한다. 하나의 아이디어에 대해 build-on을 달 수 있지만, build-on에 대한 추가 build-on은 허용하지 않는다.

**이유:** 트리 구조 build-on은 UI 렌더링 복잡도와 모바일 레이아웃 처리 비용이 크다. MVP 단계에서는 flat 1단계 확장만으로 아이디어 발전 흐름을 충분히 표현할 수 있다. IdeaBuildOnEdge 테이블 구조는 향후 깊이 확장이 필요할 때 parentId 체이닝으로 대응 가능하다.

**영향 범위:** `apps/api/prisma/schema.prisma` (IdeaBuildOnEdge), `packages/contracts/src/brainstorm/` (BuildOnBodySchema), `apps/api/src/brainstorm/brainstorm.service.ts`, `apps/web/components/brainstorm/BuildOnModal.tsx`

**일지:** [260408_02](./260408_02-screen7-brainstorm.md)

## KF-033 — Dot voting 인당 2표, 폴링 기반, 리더 확정은 투표 결과와 독립

**결론:** 브레인스토밍 아이디어에 대한 dot voting은 팀원당 2표를 부여하며, 투표 결과는 폴링 방식으로 집계한다. 리더의 최종 주제 확정은 투표 순위를 참고하되, 반드시 최다 득표 아이디어를 선택할 의무는 없다. 리더는 투표 결과와 독립적으로 주제를 확정할 수 있다.

**이유:** 인당 2표는 선호도 분산과 집중 사이의 균형점이다. 1표는 합의 도출이 어렵고, 3표 이상은 무차별 투표 경향이 생긴다. 리더 재량 확정은 소규모 팀(3~8인)에서 다수결보다 효과적인 의사결정 방식이며, Screen 10 Contract Gate에서 팀 합의를 최종 확인하는 구조와 보완적이다.

**영향 범위:** `apps/api/src/kickoff/kickoff.service.ts`, `apps/api/src/kickoff/kickoff.controller.ts`, `apps/web/app/team/[teamId]/topic/topic-client.tsx`, `apps/web/components/brainstorm/IdeaCard.tsx`

**일지:** [260408_02](./260408_02-screen7-brainstorm.md)

## KF-034 — Socket.io 조기 도입, ADR-004 supersede

**결론:** ADR-004(Screen 11까지 Socket.io 지연)를 supersede하고, Screen 7 브레인스토밍 시점에 Socket.io를 도입한다. `/team` namespace, `team:{teamId}` room, 30초 유효 ws-token 인증, PrismaService 멤버십 검증 구조를 확정한다. 클라이언트는 `useTeamSocket` 훅으로 연결하며, 연결 실패 시 자동 폴링 fallback을 유지한다.

**이유:** 브레인스토밍에서 아이디어 제출, build-on, merge, 리액션, dot voting이 모두 실시간으로 반영되어야 자연스러운 협업 경험이 가능하다. 10초 폴링으로는 카드 출현 지연과 build-on/merge 결과 확인 지연으로 핵심 UX가 저하된다. Screen 5의 FinalizedRoleBadge 30초 폴링도 소켓으로 전환하여 역할 확정 알림 지연을 해소했다.

**영향 범위:** `apps/api/src/gateways/team.gateway.ts`, `apps/api/src/gateways/gateways.module.ts`, `apps/api/src/auth/auth.controller.ts`, `apps/api/src/brainstorm/brainstorm.service.ts`, `apps/api/src/kickoff/kickoff.service.ts`, `apps/web/lib/socket.ts`, `apps/web/hooks/useTeamSocket.ts`, `apps/web/components/result/FinalizedRoleBadge.tsx`, `docs/adr/ADR-004-socketio-introduction.md` (superseded), `docs/adr/ADR-005-socketio-early-introduction.md`

**일지:** [260408_03](./260408_03-merge-socketio.md)

## KF-035 — Multi-parent merge는 POST /ideas/merge 별도 엔드포인트, 최대 5개 부모

**결론:** 브레인스토밍 아이디어 merge 기능을 `POST /ideas/merge` 별도 엔드포인트로 구현한다. merge된 아이디어의 `type`은 `'merge'`이며, 부모 아이디어는 최대 5개까지 허용한다. `MergeIdeasBodySchema`로 입력을 검증하고, 기존 build-on(1:1 single-parent)과 분리해 API 의미론을 명확히 한다.

**이유:** build-on은 하나의 아이디어를 확장하는 1:1 관계이고, merge는 여러 아이디어를 합치는 N:1 관계다. 두 기능을 같은 엔드포인트로 처리하면 body 스키마 분기와 엣지 테이블 처리가 복잡해진다. 별도 엔드포인트로 분리하면 각각의 비즈니스 로직, 권한 검증, 실시간 이벤트 발행을 독립적으로 관리할 수 있다.

**영향 범위:** `packages/contracts/src/brainstorm/idea-submit.schema.ts`, `apps/api/src/brainstorm/brainstorm.service.ts`, `apps/api/src/brainstorm/brainstorm.controller.ts`, `apps/web/components/brainstorm/MergeModal.tsx`, `apps/web/components/brainstorm/IdeaCard.tsx`, `apps/web/components/brainstorm/IdeaCardWall.tsx`

**일지:** [260408_03](./260408_03-merge-socketio.md)

## KF-036 — Team Context의 boolean 필드는 nullable로 둔다 (legacy 팀의 미입력 의미 보존)

**결론:** Team 모델에 추가되는 Team Context boolean 필드 3종(`hasNonDeveloper`, `usesVibeCoding`, `hasSkillGap`)은 `Boolean?` (nullable)로 선언하며 default 값을 두지 않는다. 팀 생성 시 팀장이 명시적으로 true/false를 선택하지 않으면 `null`로 저장되며, 이는 legacy 팀(도입 이전 생성된 팀)의 미입력 상태와 동일하게 처리된다. Dashboard 배너와 AI 프롬프트 양쪽에서 null 값을 "정보 없음"으로 해석하고, "false 선택"과는 구분한다.

**이유:** default false로 두면 "비개발자 없음"과 "응답 안 함"이 동일하게 취급되어 팀 컨텍스트의 해석 정밀도가 떨어진다. legacy 팀과의 호환도 default 값으로 흐릿해진다. nullable 유지 시 AI 프롬프트가 null 필드를 `<team_context>` 블록에서 생략하는 fallback을 안전하게 구현할 수 있고, Dashboard 배너도 null인 특성은 배지로 표시하지 않는 단순 규칙을 적용할 수 있다. Survey의 experienceTier와 교차검증할 때도 "팀장이 false를 선택한 것"과 "선택 자체가 없는 것"을 구분해야 향후 Screen 10 Contract Gate 분기 로직에서 의미 있는 신호를 잃지 않는다.

**영향 범위:** `apps/api/prisma/schema.prisma` (Team 모델), `packages/contracts/src/team/team-context.ts`, `apps/api/src/kickoff/kickoff.service.ts` (배너 응답 직렬화), `apps/api/src/brainstorm/brainstorm.service.ts` (프롬프트 주입 시 null 생략), `apps/web/app/team/create/` (3-state radio 또는 체크박스 + "선택 안 함" 옵션), `apps/web/app/team/[teamId]/dashboard/` (null 배지 생략)

**관련 문서:** `docs/architecture/team-context-vs-survey-boundary.md`, `docs/product/system-spec.md` 데이터 모델 보강 섹션, `docs/product/screen-flow.md` Screen 3a Team Create Flow Detail

**ADR:** [ADR-006](../adr/ADR-006-team-context-domain.md)

**일지:** [260409_01](./260409_01-team-context.md)

## KF-037 — Team Context enum은 packages/contracts/src/team/team-context.ts 단일 소스로 둔다

**결론:** `TeamType`, `ProjectDuration`, `CompletionTarget` enum은 `packages/contracts/src/team/team-context.ts`에 Zod로 단일 소스 선언한다. 백엔드(NestJS 서비스/컨트롤러), 프론트엔드(Server Action + 폼 옵션), Prisma(schema.prisma의 enum 정의와 값 일치) 모두 이 파일의 정의를 기준으로 삼는다. Prisma enum은 수동 복제를 허용하되 값이 불일치할 경우 CI가 실패하도록 검증 테스트를 추가한다.

**이유:** enum 값이 복수 소스에 분산되면 필연적으로 drift가 발생한다. 특히 GPT-4o 프롬프트에 주입되는 값이 폼 옵션과 한 글자라도 다르면 legacy 팀과 신규 팀의 처리 경로가 조용히 달라진다. Zod 단일 소스로 두면 런타임 검증 + 타입 추론 + 프론트엔드 옵션 생성을 한 파일에서 처리할 수 있고, 향후 enum 값 추가 시 한 곳만 수정하면 된다. Prisma enum은 DB 스키마 요구사항으로 별도 존재하지만, 값 동기화는 CI 테스트로 강제한다.

**영향 범위:** `packages/contracts/src/team/team-context.ts` (신규), `apps/api/prisma/schema.prisma`, `apps/api/src/teams/teams.service.ts`, `apps/api/src/teams/teams.controller.ts`, `apps/api/src/kickoff/kickoff.service.ts`, `apps/api/src/brainstorm/brainstorm.service.ts`, `apps/web/app/team/create/` (폼 옵션), `apps/web/app/team/[teamId]/dashboard/` (배너 라벨 매핑)

**관련 문서:** `docs/architecture/team-context-vs-survey-boundary.md`

**ADR:** [ADR-006](../adr/ADR-006-team-context-domain.md)

**일지:** [260409_01](./260409_01-team-context.md)

## KF-038 — Team Context는 brainstorm 클러스터링과 kickoff 주제 생성 두 곳 모두 GPT-4o 프롬프트에 주입한다

**결론:** Team Context는 `apps/api/src/kickoff/kickoff.service.ts`의 주제 제안 생성(`GET /topic/suggestions`)과 `apps/api/src/brainstorm/brainstorm.service.ts`의 브레인스토밍 클러스터링(`POST /brainstorm/cluster`) **두 곳 모두**에서 프롬프트에 주입한다. 주입 위치는 `<team_context>` XML 블록이며, `<survey_data>` 블록 **앞에** 위치한다. legacy 팀은 `<team_context>` 블록을 생략하고 과거 동작으로 fallback한다.

**이유:** 브레인스토밍 클러스터링 단계에서 이미 Team Context가 아이디어 묶음에 반영되어야, Stage 4 Dot voting 시점에 사용자에게 제시되는 클러스터가 팀 목표와 정합성을 갖는다. 클러스터링에만 주입하고 주제 생성(기존 topic suggestions 경로)에는 주입하지 않으면, 두 경로의 결과 품질이 어긋나 팀이 어느 경로로 들어왔는지에 따라 주제 품질이 달라진다. 반대로 주제 생성에만 주입하면 브레인스토밍 Stage 3 AI 정리가 Team Context를 모른 채 진행되어 팀 방향과 맞지 않는 클러스터가 생성된다. 양쪽 모두 주입이 필수다. XML 블록 순서를 `<team_context>` → `<survey_data>`로 고정하는 이유는 팀 단위 운영 맥락이 개인 설문 통계의 상위 제약으로 작용해야 하기 때문이며, 반대 순서는 앵커링 편향을 유발한다.

**영향 범위:** `apps/api/src/kickoff/kickoff.service.ts`, `apps/api/src/brainstorm/brainstorm.service.ts`, `tooling/prompts/` (관련 프롬프트 파일), `packages/contracts/src/ai/topic-suggestions.schema.ts`, `docs/product/screen-flow.md` Screen 7a/7b 섹션, `docs/architecture/team-context-vs-survey-boundary.md`

**관련 문서:** `docs/architecture/team-context-vs-survey-boundary.md`의 "GPT-4o 주제 생성 / 브레인스토밍 클러스터링 프롬프트" 시나리오

**ADR:** [ADR-006](../adr/ADR-006-team-context-domain.md)

**일지:** [260409_01](./260409_01-team-context.md)

## KF-039 — Team Context의 Dashboard 배너는 /kickoff/status 응답을 확장한다 (별도 엔드포인트 X)

**결론:** Screen 6 Team Dashboard 상단에 표시되는 Team Context 배너의 데이터 소스는 기존 `GET /api/teams/:teamId/kickoff/status` 응답을 확장해서 제공한다. 별도의 `GET /api/teams/:teamId/context` 같은 엔드포인트는 만들지 않는다. 응답에는 `teamContext` 필드를 추가하며, 필드 구조는 `packages/contracts/src/team/team-context.ts`의 Zod 스키마와 일치한다.

**이유:** Screen 6 대시보드는 이미 `/kickoff/status` 호출 한 번으로 `teamInsight`, `phase`, `members` 같은 집계 데이터를 가져오고 있다. 배너 전용 엔드포인트를 추가하면 대시보드 진입 시 라운드트립이 늘어나고 로딩 순서가 복잡해진다. Team Context는 팀 생성 이후 거의 변하지 않는 정적 데이터이므로 별도 엔드포인트로 분리할 만한 캐싱 전략이나 권한 차이가 없다. `/kickoff/status`는 이미 팀 멤버십 검증을 통과한 요청이므로 Team Context 노출 권한과도 일치한다. 향후 팀 정보 수정 페이지가 생기면 그때 `PATCH /teams/:teamId/context` 같은 별도 엔드포인트를 추가할 수 있지만, **열람**은 `/kickoff/status`로 단일화한다.

**영향 범위:** `apps/api/src/kickoff/kickoff.service.ts` (응답 직렬화), `apps/api/src/kickoff/kickoff.controller.ts` (타입), `packages/contracts/src/kickoff/` (status 응답 스키마), `apps/web/app/team/[teamId]/dashboard/` (배너 컴포넌트가 status 응답 소비), `docs/product/screen-flow.md` Screen 6 API dependencies

**관련 문서:** `docs/architecture/team-context-vs-survey-boundary.md` Screen 6 대시보드 배너 섹션

**일지:** [260409_01](./260409_01-team-context.md)

## KF-040 — Team Context UI는 Lucide React 아이콘만 사용한다 (이모지 금지)

**결론:** Team Context와 관련된 모든 UI(Screen 3a 팀 생성 폼의 섹션 헤더, Screen 6 Dashboard 배너의 특성 배지, Screen 7a 브레인스토밍 클러스터 뱃지 등)에서 Lucide React 아이콘만 사용한다. 이모지는 사용하지 않는다. enum 값별 아이콘 매핑은 프론트엔드 단일 매핑 파일(`apps/web/lib/team-context-icons.ts` 또는 동등 위치)에서 관리한다.

**이유:** CLAUDE.md 디자인 시스템 규칙 "아이콘: Lucide React만. 이모지 사용 금지"를 Team Context 도입 시점에 명확히 재확인한다. 이모지는 플랫폼/폰트별 렌더링 차이가 크고, 스크린리더 접근성이 불안정하며, Figma 디자인과 실제 구현이 어긋나기 쉽다. Lucide React는 이미 프로젝트에 도입되어 있고 shadcn/ui 컴포넌트들과 톤이 일치한다. 새 기능 도입 시점이 규칙 drift를 막는 가장 효과적인 순간이므로 여기서 명시적으로 재선언한다.

**영향 범위:** `apps/web/app/team/create/create-team-client.tsx` (폼 섹션 헤더 아이콘), `apps/web/app/team/[teamId]/dashboard/kickoff-dashboard-client.tsx` (배너 특성 배지 아이콘), `apps/web/lib/team-context-labels.ts` (enum → 라벨 + Lucide 아이콘 단일 매핑), `docs/product/screen-flow.md` Screen 3a / 6 UI 원칙 섹션, CLAUDE.md 디자인 시스템 규칙과 일치

**관련 문서:** CLAUDE.md "디자인 시스템 규칙" 섹션, `docs/architecture/team-context-vs-survey-boundary.md`

**일지:** [260409_01](./260409_01-team-context.md)

## KF-041 — OAuth 브랜드 로고는 Lucide React 단일 사용 원칙의 명시적 예외다

**결론:** Google / GitHub / Kakao 등 OAuth provider 브랜드 마크는 Lucide React 단일 사용 원칙(KF-040)의 명시적 예외로 처리한다. 공식 SVG 자산을 `apps/web/public/oauth-logos/`(예: `google.svg`, `github.svg`, `kakao.svg`)에 두고 `next/image`로 로딩한다. Lucide 아이콘으로 대체하지 않는다. SVG 자산은 `<script>`, `<foreignObject>`, 이벤트 핸들러 속성을 포함하지 않은 정적 자산에 한정하며, `next/image`가 image context로 렌더링하므로 `next.config.mjs`의 `dangerouslyAllowSVG` 옵션은 추가하지 않는다.

**이유:** Google/GitHub/Kakao는 각자 브랜드 가이드를 가진 외부 서비스이며, Lucide에는 해당 마크가 없거나 가이드라인 위반이 되는 형태로만 존재한다. 공식 SVG를 사용하지 않으면 OAuth 버튼이 브랜드 가이드를 어기게 되어 사용자 신뢰도와 식별성이 동시에 떨어진다. 단, 예외를 무한정 확장하면 Lucide 단일 사용 원칙이 침식되므로 "OAuth provider 브랜드 마크"라는 좁은 범주에만 한정한다. 자산 위치를 `public/oauth-logos/`로 격리해 다른 디자인 자산과 섞이지 않게 하고, 정적 SVG에 한정해 XSS 위험도를 차단한다.

**영향 범위:** `apps/web/public/oauth-logos/google.svg`, `apps/web/public/oauth-logos/github.svg`, `apps/web/public/oauth-logos/kakao.svg`, `apps/web/app/login/page.tsx`, `apps/web/app/dev-preview/page.tsx`, CLAUDE.md "디자인 시스템 규칙" 섹션의 Lucide 예외 정의

**관련 문서:** KF-040 (Lucide React 단일 사용 원칙)

**일지:** [260409_02](./260409_02-oauth-brand-buttons.md)

## KF-042 — OAuth 브랜드 색상은 OAuth 전용 시맨틱 토큰으로 격리한다

**결론:** OAuth provider 브랜드 색상은 컴포넌트에 raw hex로 박지 않고 OAuth 전용 시맨틱 토큰으로 격리한다. 토큰은 `apps/web/app/globals.css`에 다음 7개를 신설한다: `--tf-oauth-google-bg`, `--tf-oauth-google-border`, `--tf-oauth-google-text`, `--tf-oauth-github-bg`, `--tf-oauth-github-text`, `--tf-oauth-kakao-bg`, `--tf-oauth-kakao-text`. raw hex는 `globals.css` 한 곳에만 존재하고, 컴포넌트는 시맨틱 토큰만 참조한다. 기존 `--tf-kakao-yellow` / `--tf-kakao-text`는 dev-preview/Storybook 호환을 위해 legacy alias로 유지한다.

**이유:** 공식 브랜드 색상을 컴포넌트마다 raw hex로 복사하면 색상 drift와 일관성 붕괴가 필연적으로 발생한다. 시맨틱 토큰으로 격리하면 추후 dark mode, 고대비 모드, hover/active 상태를 토큰 정의 한 곳에서 일괄 조정할 수 있다. `--tf-*` 네임스페이스에 OAuth 영역을 별도 prefix(`--tf-oauth-*`)로 분리하면 일반 SEED 토큰과 OAuth 브랜드 색상을 의미적으로 구분할 수 있고, OAuth 추가/삭제 시 영향 범위가 명확해진다. legacy alias를 유지하는 이유는 dev-preview와 Storybook이 이전 토큰명을 직접 참조하고 있어 한 번에 정리하면 visual regression을 일으킬 수 있기 때문이며, 후속 세션에서 alias 제거를 검토한다.

**영향 범위:** `apps/web/app/globals.css`, `apps/web/app/login/page.tsx`, `apps/web/app/dev-preview/page.tsx`

**관련 문서:** CLAUDE.md "디자인 시스템 규칙"의 시맨틱 토큰 사용 원칙

**일지:** [260409_02](./260409_02-oauth-brand-buttons.md)

## KF-043 — Kakao 이메일/이름 권한이 비즈앱 통과 전이므로 합성 이메일 + 닉네임 fallback을 유지한다

**결론:** Kakao Developers 콘솔(앱 ID 1423308)의 `account_email`, `name` 동의 항목은 비즈앱 등록 + 추가 기능 신청 + 심사 통과 후에만 활성화 가능하다. 심사 통과 전까지 NextAuth Kakao provider는 다음 정책을 유지한다: (1) 사용자 식별자는 합성 이메일 `kakao_<id>@teamforge.local` 형식으로 생성하고, (2) `name`은 Kakao `profile_nickname`을 그대로 사용한다. 이 정책은 `apps/web/lib/auth.ts:36-44`에 이미 구현되어 있어 이번 작업에서 코드 변경은 발생하지 않았다. `profile_image`는 사용 안 함에서 선택 동의로 변경했으나 NextAuth 매핑에는 사용하지 않는다.

**이유:** Kakao 비즈앱 등록은 사용자 직접 작업 영역이며 심사 기간이 길기 때문에 그 사이 사용자 식별 경로가 끊기면 안 된다. 합성 이메일은 다른 OAuth provider(Google/GitHub)가 제공하는 실제 이메일과 충돌하지 않도록 `@teamforge.local` 도메인으로 격리해 두며, 같은 Kakao 사용자가 재로그인할 때 동일 식별자가 생성되도록 `id`를 키로 사용한다. 닉네임 fallback은 사용자 표시명을 유지해 UX 단절을 막는다. 정책 자체는 임시 조치임을 명시하며, 비즈앱 통과 후에는 KF-043을 재평가해 합성 이메일 사용자를 실제 이메일로 마이그레이션하는 절차를 별도로 설계한다.

**영향 범위:** `apps/web/lib/auth.ts` (Kakao provider 매핑 — 이번 세션에서는 변경 없음), Kakao Developers 콘솔 동의 항목 설정, 향후 비즈앱 통과 시 마이그레이션 runbook (미작성)

**관련 문서:** CLAUDE.md "환경변수" 섹션 (`KAKAO_CLIENT_ID` 분기), `apps/web/lib/auth.ts:36-44` 합성 이메일 fallback 로직

**일지:** [260409_02](./260409_02-oauth-brand-buttons.md)

