# Migration: add_team_context

## 목적

- 팀 컨텍스트(KF-036~KF-040) 개념을 `Team` 모델에 도입한다.
- 팀장이 팀 생성 시 입력하는 팀 단위 운영/목표 데이터 (팀 유형, 기간, 완성 목표, 비개발자/바이브 코딩/스킬 갭 여부, 도메인 힌트)를 저장한다.
- legacy 팀(기존 데이터)은 모든 신규 컬럼이 `NULL` 상태로 보존되며, "미입력"을 명시적으로 의미한다.

## 변경 내용

### 추가된 Enum (PostgreSQL type)

- `TeamType`: `HACKATHON | CAPSTONE | BOOTCAMP | SIDE_PROJECT | STARTUP`
- `ProjectDuration`: `UNDER_1_DAY | ONE_TO_FOUR_WEEKS | ONE_TO_THREE_MONTHS | OVER_THREE_MONTHS`
- `CompletionTarget`: `DEMO | MVP | PRODUCTION`

### 추가된 컬럼 (`Team` 테이블)

| 컬럼 | 타입 | Nullable | Default | 의미 |
|------|------|----------|---------|------|
| `teamType` | `TeamType` | yes | NULL | 팀 유형 (해커톤, 캡스톤 등) |
| `projectDuration` | `ProjectDuration` | yes | NULL | 프로젝트 예상 기간 |
| `completionTarget` | `CompletionTarget` | yes | NULL | 완성 목표 (데모/MVP/프로덕션) |
| `hasNonDeveloper` | `BOOLEAN` | yes | NULL | 비개발자 포함 여부 — `NULL`은 "미입력"을 의미 |
| `usesVibeCoding` | `BOOLEAN` | yes | NULL | 바이브 코딩 사용 여부 — `NULL`은 "미입력"을 의미 |
| `hasSkillGap` | `BOOLEAN` | yes | NULL | 스킬 갭 존재 여부 — `NULL`은 "미입력"을 의미 |
| `domainHints` | `TEXT[]` | no | `ARRAY[]::TEXT[]` | 도메인 힌트 (0~2개). 애플리케이션 레이어에서 `DomainHintSchema`로 검증 |

### 설계 결정 (중요)

1. **Boolean 필드는 default 없이 nullable**이다.
   - `hasNonDeveloper`, `usesVibeCoding`, `hasSkillGap`의 `NULL` 값은 "아직 입력하지 않음"을 의미한다.
   - `false`로 기본값을 주면 legacy 팀이 "비개발자가 없다고 응답했다"와 구분할 수 없어진다.
2. **Enum 단일 소스 of truth**는 `packages/contracts/src/team/team-context.ts`이다.
   - Prisma enum의 값 문자열과 Zod enum의 값 문자열은 정확히 일치한다.
   - Enum 추가/변경 시 반드시 두 파일을 동시에 수정해야 한다.
3. **배열은 `TEXT[] @default([])`**. 빈 배열이 "선택 안 함"을 의미한다 (NULL과 구별 불필요).

## 마이그레이션 파일

`apps/api/prisma/migrations/20260409073517_add_team_context/migration.sql`

## 사전 조건

- [ ] 프로덕션 DB 백업 완료
- [ ] 스테이징 환경에서 먼저 검증 완료
- [ ] `packages/contracts` 빌드 완료 (`pnpm --filter @teamforge/contracts build`)
- [ ] API 서버 다운타임 **불필요** — 모든 신규 컬럼이 nullable / default 있음 → 무중단 배포 가능

## 실행 명령

`apps/api` 디렉터리에서:

```bash
cd apps/api
pnpm prisma migrate deploy
```

또는 루트에서:

```bash
pnpm --filter @teamforge/api exec prisma migrate deploy
```

## 검증 쿼리

마이그레이션 적용 후 다음 쿼리로 확인:

```sql
-- 1) 신규 컬럼이 추가되었는지 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'Team'
  AND column_name IN (
    'teamType', 'projectDuration', 'completionTarget',
    'hasNonDeveloper', 'usesVibeCoding', 'hasSkillGap', 'domainHints'
  )
ORDER BY column_name;

-- 2) 모든 legacy 팀이 NULL로 보존되었는지 확인
SELECT COUNT(*) FROM "Team" WHERE "teamType" IS NULL;
SELECT COUNT(*) FROM "Team" WHERE "projectDuration" IS NULL;
SELECT COUNT(*) FROM "Team" WHERE "completionTarget" IS NULL;
SELECT COUNT(*) FROM "Team" WHERE "hasNonDeveloper" IS NULL;
SELECT COUNT(*) FROM "Team" WHERE "usesVibeCoding" IS NULL;
SELECT COUNT(*) FROM "Team" WHERE "hasSkillGap" IS NULL;

-- 3) domainHints가 빈 배열로 시작했는지 확인 (NULL이 아니어야 함)
SELECT COUNT(*) FROM "Team" WHERE "domainHints" = ARRAY[]::TEXT[];
SELECT COUNT(*) FROM "Team" WHERE "domainHints" IS NULL; -- 0이어야 함

-- 4) Enum 타입이 존재하는지 확인
SELECT typname FROM pg_type
WHERE typname IN ('TeamType', 'ProjectDuration', 'CompletionTarget');
```

기대 결과:
- 모든 legacy 팀의 `teamType`/`projectDuration`/`completionTarget`/`hasNonDeveloper`/`usesVibeCoding`/`hasSkillGap`는 `NULL`
- 모든 legacy 팀의 `domainHints`는 빈 배열 (`{}`)
- `pg_type`에 `TeamType`, `ProjectDuration`, `CompletionTarget` 3개 enum 존재

## 롤백 방법

모든 컬럼이 nullable이고 enum은 독립적이므로 데이터 손실 없이 롤백 가능하다.

### 권장: Prisma migrate resolve 사용

```bash
cd apps/api
pnpm prisma migrate resolve --rolled-back 20260409073517_add_team_context
```

그 다음 아래 SQL로 실제 컬럼과 enum을 제거한다:

```sql
-- 1) 컬럼 제거
ALTER TABLE "Team"
  DROP COLUMN IF EXISTS "teamType",
  DROP COLUMN IF EXISTS "projectDuration",
  DROP COLUMN IF EXISTS "completionTarget",
  DROP COLUMN IF EXISTS "hasNonDeveloper",
  DROP COLUMN IF EXISTS "usesVibeCoding",
  DROP COLUMN IF EXISTS "hasSkillGap",
  DROP COLUMN IF EXISTS "domainHints";

-- 2) Enum 타입 제거 (반드시 컬럼 DROP 이후)
DROP TYPE IF EXISTS "TeamType";
DROP TYPE IF EXISTS "ProjectDuration";
DROP TYPE IF EXISTS "CompletionTarget";
```

### 롤백 후 체크리스트

- [ ] 이전 버전의 `schema.prisma`로 복원
- [ ] `packages/contracts/src/team/team-context.ts` 및 export 라인 제거
- [ ] `pnpm --filter @teamforge/api exec prisma generate` 재실행
- [ ] `pnpm --filter @teamforge/contracts build` 재빌드

## legacy 팀 데이터 처리

- 기존 팀 행은 모든 enum/boolean 컬럼에 대해 `NULL`로 채워진다.
- 기존 팀 행의 `domainHints`는 빈 배열 `{}`로 초기화된다.
- 애플리케이션은 `NULL` 값을 "팀장이 아직 팀 컨텍스트를 입력하지 않음"으로 해석해야 하며, 팀 컨텍스트 수집 UI(추후 구현)에서 `UPDATE`로 채운다.
- 데이터 마이그레이션 스크립트는 **작성하지 않는다** — legacy 팀의 의도는 "미입력"이며 추측으로 값을 채우면 안 된다.

## 참고

- 결정 키: KF-036 ~ KF-040 (팀 컨텍스트 관련)
- Zod 단일 소스: `packages/contracts/src/team/team-context.ts`
- Prisma schema: `apps/api/prisma/schema.prisma` (`Team` 모델 끝부분)
- 담당자: tf-db 에이전트 (스키마) / tf-backend (API 수용) / tf-frontend (입력 UI)
- 위험 시간대: 없음 (무중단 배포 가능)
