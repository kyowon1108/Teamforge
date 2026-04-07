# Migration: add_confirmed_role_to_team_membership

## 변경 내용

- 추가: `TeamMembership.confirmedRole` (`String?`) — 팀장이 확정한 역할 레이블
- 추가: `TeamMembership.confirmedAt` (`DateTime?`) — 역할 확정 시각
- 추가: `TeamMembership.confirmedBy` (`String?`) — 역할을 확정한 팀장 userId (soft ref, FK 없음)

## 마이그레이션 파일

`apps/api/prisma/migrations/20260407124409_add_confirmed_role_to_team_membership/migration.sql`

## 실행 전 체크리스트

- [ ] 백업 완료 (또는 스테이징 DB에서 먼저 검증)
- [ ] 스테이징 환경 검증 완료
- [ ] API 서버 다운타임 불필요 (모든 컬럼 nullable — 무중단 배포 가능)

## 실행 명령

```bash
# apps/api 디렉터리에서 실행
cd apps/api
npx prisma migrate deploy
```

또는 루트에서:

```bash
pnpm --filter @teamforge/api exec prisma migrate deploy
```

## 롤백 방법

컬럼이 nullable이므로 데이터 손실 없이 롤백 가능:

```sql
ALTER TABLE "TeamMembership"
  DROP COLUMN IF EXISTS "confirmedRole",
  DROP COLUMN IF EXISTS "confirmedAt",
  DROP COLUMN IF EXISTS "confirmedBy";
```

롤백 후 이전 schema.prisma로 복원하고 `prisma generate` 재실행.

## 영향 범위

- `TeamMembership` 테이블에만 영향
- 기존 행은 세 컬럼 모두 `NULL` 유지 — 하위 호환
- Prisma Client 재생성 필요 (`prisma generate`) — 이미 완료됨
