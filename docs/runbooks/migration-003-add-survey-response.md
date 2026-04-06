# Migration: SurveyResponse 테이블 추가 (Screen 4 스킬 설문)

## 변경 내용

- 추가: `SurveyResponse` 테이블 신규 생성
- 추가: `Team.surveyResponses` 역참조 relation
- 추가: `User.surveyResponses` 역참조 relation

### SurveyResponse 테이블 컬럼

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | TEXT (UUID) | PK |
| `teamId` | TEXT | FK → Team(id), CASCADE |
| `userId` | TEXT | FK → User(id), CASCADE |
| `answers` | JSONB NOT NULL | 설문 6섹션 답변 (SurveyAnswersSchema) |
| `metadata` | JSONB NULL | 드래프트 상태 (SurveyMetadataSchema) |
| `submitted` | BOOLEAN | 제출 완료 여부, 기본값 false |
| `submittedAt` | TIMESTAMP NULL | 제출 완료 시각 |
| `createdAt` | TIMESTAMP | 생성 시각 |
| `updatedAt` | TIMESTAMP | 수정 시각 |

### 인덱스

- `UNIQUE (teamId, userId)` — 팀 내 유저당 설문 1건 제한
- `INDEX (teamId, submitted)` — 팀별 제출 현황 집계 쿼리 최적화

### 연관 Zod 스키마

- `answers`: `packages/contracts/src/jsonb/survey-answers.schema.ts` — `SurveyAnswersSchema`
- `metadata`: `packages/contracts/src/jsonb/survey-metadata.schema.ts` — `SurveyMetadataSchema`

## 마이그레이션 파일

```
apps/api/prisma/migrations/20260406045443_add_survey_response/migration.sql
```

## 실행 전 체크리스트

- [ ] 스테이징 DB 백업 완료
- [ ] 프로덕션 DB 백업 완료
- [ ] `SurveyResponse` 테이블 미존재 확인 (`\dt "SurveyResponse"`)
- [ ] `Team`, `User` 테이블 정상 존재 확인
- [ ] API 서버 다운타임 불필요 (신규 테이블 추가만, 기존 테이블 무변경)

## 실행 명령

```bash
# 스테이징 검증 후 프로덕션 적용
pnpm --filter @teamforge/api prisma migrate deploy
```

### 적용 확인

```sql
-- 테이블 생성 확인
\dt "SurveyResponse"

-- 인덱스 확인
\di "SurveyResponse_*"

-- FK 제약 확인
SELECT conname, contype FROM pg_constraint WHERE conrelid = '"SurveyResponse"'::regclass;
```

## 롤백 방법

신규 테이블 추가이므로 데이터가 없는 경우 안전하게 롤백 가능.

```sql
DROP TABLE IF EXISTS "SurveyResponse";
```

데이터가 존재하는 경우 롤백 전 반드시 백업 후 진행:

```bash
pg_dump -t '"SurveyResponse"' $DATABASE_URL > survey_response_backup_$(date +%Y%m%d).sql
psql $DATABASE_URL -c 'DROP TABLE "SurveyResponse";'
```

## ADR 여부

신규 테이블 추가 — ADR 필요.
ADR 작성 요청: `tf-docs` 에이전트에 "SurveyResponse 테이블 설계 근거" ADR 생성 요청.
