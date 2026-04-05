# Migration: KickoffParticipant + KickoffArtifact 테이블 추가

**날짜:** 2026-04-05  
**관련 결정:** KF-003 (배치 A→B→C→D), KF-007 (KickoffParticipant 별도 테이블)  
**ADR:** ADR-003 (생성 예정)

---

## 변경 내용

### 신규 테이블

| 테이블 | 목적 |
|--------|------|
| `kickoff_participants` | 팀원별 우려·역할수락·서명 상태 (Batch B, D) |
| `kickoff_artifacts` | AI 생성 산출물 — 첫 Issue/Agenda/Mini ADR (Batch C) |

### `kickoff_sessions` 컬럼 추가

| 컬럼 | 타입 | 목적 |
|------|------|------|
| `out_of_scope` | JSONB | 이번에 안 하는 것 (string[]) |
| `success_criteria` | JSONB | 데모 필수 항목 3개 (string[]) |
| `collab_rules` | JSONB | 협업 규칙 4개 (branch/PR/issue/meeting) |
| `revision` | INT DEFAULT 0 | 낙관적 동시성 제어 |
| `generation_status` | VARCHAR | AI 생성 상태 (idle/generating/done/failed) |
| `generation_requested_at` | TIMESTAMPTZ | 생성 요청 시각 |
| `generation_completed_at` | TIMESTAMPTZ | 생성 완료 시각 |

---

## 실행 전 체크리스트

- [ ] 스테이징 환경에서 먼저 실행 확인
- [ ] 현재 `kickoff_sessions` 데이터 개수 확인: `SELECT COUNT(*) FROM kickoff_sessions;`
- [ ] DB 백업 완료 (프로덕션 배포 시)
- [ ] API 서버 다운타임 불필요 — 컬럼 추가 + 신규 테이블 추가 (non-destructive)

---

## 실행 명령

### 개발 환경

```bash
cd /Users/kapr/Projects/Personal/Teamforge
pnpm --filter @teamforge/api prisma migrate dev --name kickoff_participant_artifact
```

### 스테이징 / 프로덕션

```bash
pnpm --filter @teamforge/api prisma migrate deploy
```

---

## 마이그레이션 후 확인

```sql
-- 신규 테이블 생성 확인
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('kickoff_participants', 'kickoff_artifacts');

-- kickoff_sessions 신규 컬럼 확인
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'kickoff_sessions'
  AND column_name IN ('out_of_scope', 'success_criteria', 'collab_rules', 'revision', 'generation_status');
```

---

## 롤백 방법

```sql
-- 신규 테이블 삭제 (데이터 유실 주의)
DROP TABLE IF EXISTS kickoff_artifacts;
DROP TABLE IF EXISTS kickoff_participants;

-- kickoff_sessions 신규 컬럼 삭제
ALTER TABLE kickoff_sessions
  DROP COLUMN IF EXISTS out_of_scope,
  DROP COLUMN IF EXISTS success_criteria,
  DROP COLUMN IF EXISTS collab_rules,
  DROP COLUMN IF EXISTS revision,
  DROP COLUMN IF EXISTS generation_status,
  DROP COLUMN IF EXISTS generation_requested_at,
  DROP COLUMN IF EXISTS generation_completed_at;
```

---

## 관련 Zod 스키마

`packages/contracts/src/jsonb-schemas.ts`에 추가된 스키마:
- `OutOfScopeSchema` — `kickoff_sessions.out_of_scope`
- `SuccessCriteriaSchema` — `kickoff_sessions.success_criteria`
- `CollabRulesSchema` — `kickoff_sessions.collab_rules`
- `MemberConcernsSchema` — `kickoff_participants.concerns`
- `FirstIssuesArtifactSchema` — `kickoff_artifacts.content` (type: first_issues)
- `FirstAgendaArtifactSchema` — `kickoff_artifacts.content` (type: first_agenda)
- `MiniAdrsArtifactSchema` — `kickoff_artifacts.content` (type: mini_adrs)
