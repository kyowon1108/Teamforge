# 마이그레이션: Screen 7 브레인스토밍 모델 추가

## 변경 내용

- 추가: `BrainstormPhase` enum (`ideation`, `sharing`, `clustering`, `voting`, `confirmed`)
- 추가: `BrainstormSession` 테이블 (팀당 1:1, 세션 단계/모드 관리)
- 추가: `BrainstormIdea` 테이블 (아이디어 제출, 세션-유저 복합 인덱스)
- 추가: `IdeaBuildOnEdge` 테이블 (아이디어 간 build-on 관계, 부모-자식 유니크 제약)
- 추가: `IdeaReaction` 테이블 (아이디어 반응, ideaId+userId+type 유니크 제약)
- 변경: `KickoffTopic`에 `sourceIdeaIds String[]` 컬럼 추가
- 변경: `Team` 모델에 `brainstormSession` 관계 추가
- 변경: `User` 모델에 `brainstormIdeas` 관계 추가

## 영향 범위

- 신규 테이블 4개, enum 1개 추가 (기존 데이터 영향 없음)
- `KickoffTopic`에 `sourceIdeaIds` 컬럼 추가 (기본값 빈 배열, 기존 데이터 안전)
- 관계 필드만 추가되므로 데이터 손실 위험 없음

## 실행 전 체크리스트

- [ ] 백업 완료
- [ ] 스테이징 환경 검증 완료
- [ ] API 서버 다운타임 필요 여부 확인 (이번 변경은 다운타임 불필요)

## 실행 명령

```bash
cd apps/api
npx prisma migrate dev --name add_brainstorm_models
```

프로덕션 배포 시:

```bash
pnpm --filter @teamforge/api prisma migrate deploy
```

## 롤백 방법

```bash
cd apps/api
npx prisma migrate resolve --rolled-back add_brainstorm_models
```

또는 직접 SQL로 롤백:

```sql
DROP TABLE IF EXISTS "IdeaReaction";
DROP TABLE IF EXISTS "IdeaBuildOnEdge";
DROP TABLE IF EXISTS "BrainstormIdea";
DROP TABLE IF EXISTS "BrainstormSession";
DROP TYPE IF EXISTS "BrainstormPhase";
ALTER TABLE "KickoffTopic" DROP COLUMN IF EXISTS "sourceIdeaIds";
```
