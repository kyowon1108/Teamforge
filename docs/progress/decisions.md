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
