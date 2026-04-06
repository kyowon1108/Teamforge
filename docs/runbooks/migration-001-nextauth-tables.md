# Migration 001: NextAuth Tables

## 변경 내용

### User 모델 필드 추가
- `emailVerified DateTime?` — NextAuth Prisma Adapter 필수 필드
- `image String?` — OAuth 프로필 이미지 URL

### 신규 모델 추가
- `Account` — OAuth 공급자 계정 연결 (Google, GitHub, Kakao)
- `Session` — NextAuth 데이터베이스 세션 관리
- `VerificationToken` — 이메일 인증 토큰 (magic link 등)

### 관계 추가
- `User.accounts Account[]`
- `User.sessions Session[]`

---

## 실행 전 체크리스트

- [ ] 데이터베이스 백업 완료
- [ ] 스테이징 환경에서 마이그레이션 검증 완료
- [ ] `DATABASE_URL` 환경변수 프로덕션 값 확인
- [ ] API 서버 다운타임 불필요 (기존 테이블 유지, 신규 테이블만 추가)
- [ ] `SESSION_EXCHANGE_SECRET` 환경변수 설정 확인

---

## 실행 명령

### 개발 환경 (마이그레이션 파일 생성 + 적용)

```bash
pnpm --filter @teamforge/api exec prisma migrate dev --name add-nextauth-tables
```

### 프로덕션/스테이징 (마이그레이션 파일 적용만)

```bash
pnpm --filter @teamforge/api exec prisma migrate deploy
```

### Prisma Client 재생성 (마이그레이션 후 필수)

```bash
pnpm --filter @teamforge/api exec prisma generate
```

---

## 마이그레이션 후 확인

```bash
# 테이블 존재 여부 확인
pnpm --filter @teamforge/api exec prisma db pull

# Prisma Studio로 스키마 시각 확인 (개발 환경)
pnpm --filter @teamforge/api exec prisma studio
```

---

## 롤백 방법

신규 테이블만 추가하는 마이그레이션이므로 롤백은 테이블 삭제로 처리합니다.

```sql
-- 관계 순서에 맞게 삭제 (Account, Session 먼저, 그 후 User 컬럼 변경)
DROP TABLE IF EXISTS "VerificationToken";
DROP TABLE IF EXISTS "Session";
DROP TABLE IF EXISTS "Account";

ALTER TABLE "User"
  DROP COLUMN IF EXISTS "emailVerified",
  DROP COLUMN IF EXISTS "image";
```

> 주의: 롤백 전 Account, Session 테이블에 데이터가 존재할 경우 해당 데이터는 삭제됩니다.
> 프로덕션 롤백 시 반드시 DBA 확인 후 실행하세요.

---

## 관련 파일

- 스키마: `apps/api/prisma/schema.prisma`
- 교환토큰 계약: `packages/contracts/src/auth/exchange-token.schema.ts`
- NextAuth 설정: `apps/web/src/auth.ts` (tf-backend 담당)
