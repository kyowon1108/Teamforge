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

**일지:** [260406_03](./260406_03-full-structure-analysis.md), [260406_04](./260406_04-auth-infra-screen1-3.md)

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
