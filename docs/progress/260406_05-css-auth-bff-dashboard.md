# 260406_05-css-auth-bff-dashboard

## 작업 요약

- SEED 디자인 시스템 CSS 변수(`--tf-bg-*`, `--tf-fg-*`, `--tf-stroke-*`)를 원본에서 이식하고 기존 alias를 유지했다.
- 인증 플로우를 login → dashboard로 단축해 role-select 중간 화면을 제거하고, NextAuth jwt callback 내부에서 DB sync를 처리하도록 변경했다.
- JWT exchange token BFF 패턴을 도입해 서버 전용 `apiFetch`와 `jose SignJWT`(TTL 240s)를 구현했다.
- 다중 팀 지원을 활성화하고 Dashboard 화면을 신규 구현했다.
- Figma에 tf-tokens 28개를 업데이트하고 Button Component Set(15 variants)을 신규 생성했다.

## 구현된 기능

**CSS / 디자인 시스템**
- `apps/web/app/globals.css`: `--tf-bg-*`, `--tf-fg-*`, `--tf-stroke-*` 전체 이식, 기존 alias 유지
- Figma `tf-tokens` 컬렉션 28개 토큰 업데이트
- Figma `Button` Component Set 신규 생성 (Primary/Secondary/Outline/Ghost/Destructive × sm/md/lg = 15 variants)

**인증 플로우 변경**
- `apps/web/app/auth/` 관련: login 성공 후 role-select 화면 제거, dashboard 직접 이동
- `apps/web/lib/auth.ts` jwt callback: NextAuth 세션 내부에서 DB sync 호출
- `apps/api/src/auth/`: `POST /api/auth/sync` 엔드포인트 추가, `SyncSecretGuard`로 `X-Sync-Secret` 헤더 검증

**BFF 패턴**
- `apps/web/lib/api-fetch.ts`: 서버 전용 `apiFetch` 유틸, `jose SignJWT` 사용, TTL 240s
- 환경변수 `NEXT_PUBLIC_API_URL` → `INTERNAL_API_URL` 교체 (서버 전용)
- `packages/contracts/`: CommonJS 빌드 추가

**보안 강화**
- `apps/api/src/auth/jti-cache.service.ts`: jti 재사용 방지 인메모리 캐시 (`JtiCacheService`) 구현
- `apps/api/src/team/`: inviteCode 생성 로직 `Math.random` → `crypto.getRandomValues` 교체

**다중 팀 지원 / Dashboard**
- BUG-001 단일팀 제한 코드 제거
- `apps/api/src/team/`: `GET /api/teams` 엔드포인트 추가
- `apps/api/prisma/schema.prisma`: `User.role` 필드 추가
- `apps/web/app/dashboard/`: 팀 목록, 새 팀 만들기, 초대코드로 참가하기 신규 구현

## 설계 결정

- `KF-007`: apiFetch는 서버 전용 BFF 유틸. 클라이언트 API 호출은 별도 hook 경로로 분리한다.
- `KF-008`: `/api/auth/sync`는 `X-Sync-Secret` 헤더로 BFF 전용 보호. 외부에서 직접 호출 불가.

## 미완료 항목

- **KF-005 보류**: `JtiCacheService`는 현재 인메모리 임시 구현. 멀티 인스턴스 환경에서 동작하지 않으므로 Redis 교체가 필요하다. 단일 서버 개발 단계에서는 허용 가능.
- **MEDIUM 보류**: 역할 자기 선택(member/observer) — 현재 사용자가 login 시 role을 직접 선택하는 구조가 남아 있다. 스펙상 역할은 팀장이 지정하는 흐름이 맞는지 재검토 필요.
- Figma Button Component Set은 생성 완료이나 Code Connect 매핑은 아직 미연결.

## Next Start

1. `JtiCacheService` Redis 교체 — `apps/api/src/auth/jti-cache.service.ts`에서 `ioredis` 기반으로 교체 (KF-005)
2. 역할 자기 선택 스펙 재검토 — `docs/product/system-spec.md` Screen 2 섹션 확인 후 KF-004 매트릭스에 결론 추가
3. Screen 4 스킬 설문 API 연동 — 현재 목업 데이터 사용 중, `GET /api/survey` 실제 연동
