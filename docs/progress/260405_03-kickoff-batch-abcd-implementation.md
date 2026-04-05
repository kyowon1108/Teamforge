---
date: 2026-04-05
seq: 03
area: db, backend, frontend
screens: [10]
tags: [kickoff, batch-a, batch-b, batch-c, batch-d, participant, artifact, openai]
decision_keys: [KF-007]
---

# 260405_03 — 킥오프 배치 A/B/C/D 구현 (DB + API + UI)

## 한 줄 요약

KickoffParticipant/Artifact 테이블 추가 마이그레이션, 배치 A~D API 11개 구현, Screen 10 summary UI 전면 재작성.

---

## 이번에 본 사실

- `apps/api/prisma/schema.prisma`: KickoffSession에 outOfScope/successCriteria/collabRules/revision/generationStatus 컬럼이 없었음 → 추가
- `apps/api/src/modules/kickoff/kickoff.service.ts`: OpenAI SDK(`gpt-4o-mini`) 기반으로 구현. Anthropic SDK 아님.
- `apps/web/app/team/[teamId]/kickoff/summary/page.tsx`: 팀장 단독 finalize만 있었고 팀원 참여 장치 없었음
- `apps/web/hooks/useKickoffChannel.ts`: 이벤트 타입 union에 새 이벤트 추가 필요했음
- `generateArtifacts`에서 TOCTOU 경쟁 조건 위험 → `updateMany` atomic 패턴으로 수정
- `seedArchitectureChat`이 `verifyMember`를 쓰고 있었음 → `verifyLeader`로 수정 (기존 버그)

---

## 결정사항

| 결정 키 | 채택 | 이유 | 대안 | 영향 |
|---------|------|------|------|------|
| KF-007 | KickoffParticipant 별도 테이블 | 팀원 동시 수정 시 JSONB lost update 방지, signedRevision 보장 | KickoffSession JSONB에 포함 | kickoff 모듈 전체, 마이그레이션 |

---

## 구현 상세

### DB 스키마 (tf-db)

- `KickoffSession` 컬럼 7개 추가: `out_of_scope`, `success_criteria`, `collab_rules`, `revision`, `generation_status`, `generation_requested_at`, `generation_completed_at`
- 신규 테이블 `kickoff_participants`: 팀원별 우려/역할수락/서명 상태
- 신규 테이블 `kickoff_artifacts`: AI 생성 산출물 (first_issues / first_agenda / mini_adrs)
- 마이그레이션: `20260405041635_kickoff_participant_artifact`

### Zod 스키마 (packages/contracts)

`packages/contracts/src/jsonb-schemas.ts`에 10개 스키마 추가:
- `OutOfScopeSchema`, `SuccessCriteriaSchema`, `CollabRulesSchema`
- `MemberConcernSchema`, `MemberConcernsSchema`
- `FirstIssuesArtifactSchema`, `FirstAgendaArtifactSchema`, `MiniAdrsArtifactSchema`

### API 엔드포인트 (tf-backend) — 11개 신규

| 메서드 | 경로 | 배치 |
|--------|------|------|
| PATCH | `/kickoff/:teamId/decisions` | A |
| POST  | `/kickoff/:teamId/concerns` | A |
| GET   | `/kickoff/:teamId/participants` | B |
| PATCH | `/kickoff/:teamId/members/:userId/role-status` | B |
| POST  | `/kickoff/:teamId/artifacts/generate` | C |
| GET   | `/kickoff/:teamId/artifacts` | C |
| POST  | `/kickoff/:teamId/sign` | D |
| POST  | `/kickoff/:teamId/finalize` | D (강화) |

Socket.io 이벤트 6개: `decisions_updated`, `concerns_updated`, `role_status_updated`, `all_roles_accepted`, `artifacts_ready`, `member_signed`

### 보안 수정 (tf-security 검증 결과)

- `prompt()` → 인라인 input state로 교체 (page.tsx)
- `seedArchitectureChat`: `verifyMember` → `verifyLeader`
- `generateArtifacts`: TOCTOU → `updateMany` atomic 잠금
- `concerns.type`: `VALID_CONCERN_TYPES` Set 화이트리스트 검증
- `saveDecisions`: `OutOfScopeSchema.parse()`, `CollabRulesSchema.parse()` Zod 검증
- AI artifact: `safeParse()` 검증 후 저장
- `start` 엔드포인트: JWT `teamId` ↔ body `teamId` 교차 검증

### Screen 10 UI (tf-frontend)

`apps/web/app/team/[teamId]/kickoff/summary/page.tsx` 전면 재작성:
- 서명 진행 현황 배지 (N/M명 서명 완료)
- Batch A: 범위 제외/성공 기준/협업 규칙 편집 폼 (팀장)
- Batch A: 우려 태그 버튼 (팀원)
- Batch B: 역할 수락/조정/거절 카드 (인라인 input)
- Batch C: AI 산출물 생성 버튼 + Issue/Agenda/ADR 아코디언
- Batch D: 서명 버튼 → 전원 서명 시 팀장 "킥오프 완료" 활성화

---

## 보류/미구현

| 항목 | 왜 미룸 | 재개 조건 |
|------|---------|----------|
| Artifact `status: confirmed` 처리 | 현재 draft 상태로만 저장, 팀장 확정 버튼 없음 | 다음 배치에서 추가 |
| Role `declined` 시 팀장 알림 | UI에 거절 상태 표시만, 별도 액션 없음 | Meeting Hub 연동 시 |
| OPENAI_API_KEY 없을 때 Artifact generate 안내 | graceful fallback 있으나 UI 미표시 | |

---

## 다음 시작점 (Next Start)

**다음 작업:** Screen 10 직접 테스트 (서버 기동 후 E2E 검증)

시작 파일:
- `apps/web/app/team/[teamId]/kickoff/summary/page.tsx` — 서명 → 완료 플로우 테스트
- `apps/api/src/modules/kickoff/kickoff.service.ts` — `_generateFirstIssues` 등 OpenAI 연동 테스트

Open Questions:
- Artifact `confirmed` 상태로 업데이트하는 별도 엔드포인트 필요한가?
- 팀원이 `declined` 했을 때 팀장이 역할 재배정 할 수 있어야 하는가?

---

## 참조 소스

- 수정 파일:
  - `apps/api/prisma/schema.prisma`
  - `apps/api/prisma/migrations/20260405041635_kickoff_participant_artifact/`
  - `packages/contracts/src/jsonb-schemas.ts`
  - `apps/api/src/modules/kickoff/kickoff.service.ts`
  - `apps/api/src/modules/kickoff/kickoff.controller.ts`
  - `apps/web/app/team/[teamId]/kickoff/summary/page.tsx`
  - `apps/web/hooks/useKickoffChannel.ts`
- 플로우: `docs/product/kickoff-enhancement-flow.md`
- Runbook: `docs/runbooks/migration-kickoff-participant-artifact.md`
- 결정 키: `docs/progress/decisions.md` KF-007
