# 260406_04-auth-infra-screen1-3

## 작업 요약

- apps/api 인증 인프라를 완성했다. JwtStrategy(exp 상한선 검증), JwtAuthGuard 전역 등록, @Public()/@CurrentUser() 데코레이터, ThrottlerModule(60req/60s) 전역 rate limiting, SESSION_EXCHANGE_SECRET fail-fast를 모두 구현했다.
- apps/web 디자인 시스템 기반을 완성했다. globals.css 토큰 30개+, tailwind.config.ts shadcn/ui 완전 호환 재작성, NextAuth v5(Google/GitHub/Kakao), middleware.ts 경로 보호를 구현했다.
- Screen 1(로그인), Screen 2(역할 선택), Screen 3(팀 생성/참가)를 완성했다.
- tf-security가 지적한 보안 취약점 8개 중 7개를 즉시 수정했다. jti 재사용 방지 1건은 Redis 도입 후 처리 예정(KF-005 확장).

## 구현된 기능

**apps/api — 인증 인프라**
- `apps/api/src/auth/auth.module.ts` — AuthModule, JwtModule registerAsync (SESSION_EXCHANGE_SECRET 없으면 프로세스 종료)
- `apps/api/src/auth/jwt.strategy.ts` — JwtStrategy, payload.exp 상한선 검증 (MAX_JWT_AGE_S = 900)
- `apps/api/src/auth/jwt-auth.guard.ts` — JwtAuthGuard 전역 등록, @Public() 데코레이터로 예외 처리
- `apps/api/src/auth/decorators/current-user.decorator.ts` — @CurrentUser() 파라미터 데코레이터
- `apps/api/src/app.module.ts` — ThrottlerModule 전역 (ttl: 60000ms, limit: 60)

**apps/api — 도메인 모듈**
- `apps/api/src/prisma/prisma.module.ts` + `prisma.service.ts` — PrismaModule 전역 등록
- `apps/api/src/users/users.module.ts` + `users.service.ts` — UsersModule
- `apps/api/src/teams/teams.module.ts` + `teams.service.ts` + `teams.controller.ts` — TeamsModule (inviteCode는 leader에게만 노출)

**apps/web — 디자인 시스템 기반**
- `apps/web/app/globals.css` — primitive palette, shadcn/ui 호환 시맨틱 토큰, 역할색(leader/member/observer), 상태색, 카카오 브랜드 토큰 30개+
- `apps/web/tailwind.config.ts` — shadcn/ui 완전 호환 재작성 (CSS variable 기반)
- `apps/web/middleware.ts` — auth() 기반 PROTECTED_PATHS 목록 경로 보호, Open redirect 방어
- `apps/web/lib/auth.ts` — NextAuth v5 Google/GitHub/Kakao 프로바이더, session exchange Server Action 호출

**apps/web — Screen 1~3**
- `apps/web/app/(auth)/login/page.tsx` — 소셜 로그인 카드 UI
- `apps/web/app/(auth)/login/actions.ts` — signIn Server Action, callbackUrl allowlist 검증 (Open redirect 방어)
- `apps/web/app/(auth)/role-select/page.tsx` + `role-select-client.tsx` — 역할 선택 UI
- `apps/web/app/(auth)/role-select/actions.ts` — auth() guard 포함 Server Action
- `apps/web/app/(kickoff)/team/join-or-create/page.tsx` + `team-setup-client.tsx` — 팀 생성/참가 UI
- `apps/web/app/(kickoff)/team/join-or-create/actions.ts` — createTeamAction, joinTeamAction (auth() guard)

**공유 계약**
- `packages/contracts/src/auth/exchange-token.schema.ts` — session exchange payload Zod 스키마 신규 추가

**Prisma 스키마**
- `apps/api/prisma/schema.prisma` — NextAuth 표준 모델(Account, Session, VerificationToken) 추가

**Runbook**
- `docs/runbooks/migration-001-nextauth-tables.md` — prisma migrate dev 실행 절차 및 체크리스트 작성

## 설계 결정

- `KF-006`: 인증된 클라이언트 컴포넌트에서의 API 호출은 Server Actions 패턴을 표준으로 한다. 클라이언트 측 JWT 보관 및 직접 fetch 대신 Server Actions 내부에서 auth() 세션 검증 후 API 호출한다. 이유: 클라이언트에 토큰이 노출되지 않고, CSRF 방어가 자동 적용되며, 세션 유효성을 항상 서버에서 검증할 수 있다.
- jti 재사용 방지(KF-005)는 Redis 도입 후 처리. 현재는 exp 상한선 검증(15분)으로 위험 범위를 제한하는 것으로 대체.

## 미완료 항목

- **migration 대기**: `prisma migrate dev --name add-nextauth-tables` 미실행. `docs/runbooks/migration-001-nextauth-tables.md` 참고하여 개발자가 직접 실행해야 한다.
- **jti 재사용 방지 (KF-005 확장)**: Redis 도입 전까지 exp 상한선(15분)으로 위험 제한. Redis 준비 후 TokenBlacklist 서비스 구현 필요.
- **Screen 3 초대 코드 UX**: inviteCode가 leader 응답에만 포함되도록 API 측은 처리됐으나, 프론트엔드에서 복사 버튼 + 공유 링크 UI는 구현 예정.
- **ThrottlerModule 엔드포인트별 조정**: 현재 전역 60req/60s로 일괄 적용. 로그인 엔드포인트는 더 낮은 한도(예: 5req/60s)가 필요하며 별도 Guard로 추가 필요.

## Next Start

1. `prisma migrate dev --name add-nextauth-tables` 실행하여 NextAuth 테이블 생성 확인 (runbook 참고)
2. Screen 4 (스킬 설문) 구현 시작 — SurveyModule + 6섹션 15문항 UI
3. KF-006 결정에 따라 Survey Server Actions 패턴 동일하게 적용
