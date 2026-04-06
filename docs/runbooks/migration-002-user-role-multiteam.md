# Migration: User.role 필드 추가 및 다중 팀 지원 검증

## 변경 내용

- 추가: `User.role String?` — OAuth 로그인 후 전역 역할 저장용 (선택적 필드)
- 확인: `TeamMembership.@@unique([teamId, userId])` — 다중 팀 지원 구조 이미 적합함

## 배경

NextAuth Prisma Adapter 호환 모델(`Account`, `Session`, `VerificationToken`)은 이미
`schema.prisma`에 존재한다. `User` 모델에 `role` 필드만 누락되어 있었다.

`TeamMembership`의 unique constraint는 `(teamId, userId)` 조합이므로 한 유저가
여러 팀에 가입하는 것은 이미 허용된 구조다.

## 영향 범위

- 기존 데이터: `role` 컬럼은 nullable(`String?`)이므로 기존 레코드에 영향 없음
- 다운타임: 불필요
- 롤백: `role` 컬럼 DROP으로 즉시 복구 가능

## 실행 전 체크리스트

- [ ] 백업 완료 (또는 스테이징 환경 기준 확인)
- [ ] 스테이징 환경에서 마이그레이션 검증 완료
- [ ] API 서버 다운타임 불필요 확인 (nullable 추가이므로 무중단)

## 실행 명령

```bash
# 마이그레이션 파일 생성
pnpm --filter @teamforge/api prisma migrate dev --name user-role-multiteam

# 프로덕션 배포 시
pnpm --filter @teamforge/api prisma migrate deploy
```

## 롤백 방법

마이그레이션 파일 생성 후 이전 상태로 되돌리려면:

```bash
# 직전 마이그레이션으로 롤백 (수동 SQL)
ALTER TABLE "User" DROP COLUMN IF EXISTS "role";

# 이후 prisma migrate resolve로 마이그레이션 히스토리 정리
pnpm --filter @teamforge/api prisma migrate resolve --rolled-back <migration_name>
```

## 후속 작업

- `apps/api/src/users/` 서비스에서 `role` 필드 활용 로직 추가 (tf-backend 담당)
- NextAuth `signIn` 콜백에서 API sync 시 `role` 포함 여부 검토 (tf-frontend 담당)
