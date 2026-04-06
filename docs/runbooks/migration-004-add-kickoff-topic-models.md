# Migration: Add Kickoff Topic Models

## 변경 내용

- 추가: `TopicJobStatus` enum (`pending`, `processing`, `completed`, `failed`)
- 추가: `KickoffTopicJob` 테이블 — AI 주제 생성 잡 상태 추적 (team당 1건, unique)
- 추가: `KickoffTopic` 테이블 — AI 생성 킥오프 주제 후보 (title, rationale, tags, confirmedAt)
- 추가: `KickoffReaction` 테이블 — 멤버별 주제 반응 (topicId + userId unique)
- 변경: `Team` 모델에 `kickoffTopicJob`, `kickoffTopics`, `kickoffReactions` relation 추가

## 스키마 파일 변경 위치

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260406171622_add_kickoff_topic_models/migration.sql`

## 연관 계약 파일

- `packages/contracts/src/ai/topic-suggestions.schema.ts` — AI 응답 Zod 파싱 스키마

## 실행 전 체크리스트

- [ ] 백업 완료
- [ ] 스테이징 환경 검증 완료
- [ ] API 서버 다운타임 필요 여부 확인 (신규 테이블 추가만 — 다운타임 불필요)

## 실행 명령

```bash
pnpm --filter api exec prisma migrate deploy
```

## 롤백 방법

```sql
-- 의존성 역순으로 삭제
DROP TABLE IF EXISTS "KickoffReaction";
DROP TABLE IF EXISTS "KickoffTopic";
DROP TABLE IF EXISTS "KickoffTopicJob";
DROP TYPE IF EXISTS "TopicJobStatus";
```

> 주의: 롤백 전 해당 테이블에 데이터가 없는지 확인 필요.

## ADR 필요 여부

신규 테이블 3개 추가 — ADR 작성 권장 (tf-docs에 요청).
- 킥오프 주제 결정 플로우에서 AI 잡 패턴(polling) 채택 근거 기록 필요.
