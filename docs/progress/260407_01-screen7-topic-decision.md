# 260407_01-screen7-topic-decision

## 작업 요약

- Screen 7 (`/team/[teamId]/topic`) 킥오프 주제 결정 페이지를 풀스택으로 구현했다.
- DB에 KickoffTopicJob, KickoffTopic, KickoffReaction 모델과 TopicJobStatus enum을 추가했다.
- OpenAI GPT-4o SDK(`openai` npm 패키지)를 API 앱에 처음 도입했다.
- 202/polling 패턴(ADR-003)으로 AI 주제 제안을 처리하고, Socket.io 없이 5초 간격 최대 5회 polling을 구현했다 (ADR-004 결정에 따라 실시간 소켓 도입 보류).
- Figma Screen 7 — Topic Decision 페이지를 신규 생성하고 loading/leader/member × desktop/mobile 6장 캡처를 완료했다.

## 구현된 기능

### DB (Prisma)
- `KickoffTopicJob` — AI 생성 job 상태 추적 (TopicJobStatus enum: PENDING / PROCESSING / DONE / FAILED)
- `KickoffTopic` — AI 제안 주제 3~5개 저장, `confirmedAt IS NOT NULL` 패턴으로 확정 상태 판단
- `KickoffReaction` — 주제별 멤버 이모지 반응 (screen 컬럼으로 구분, KF-019 단일 테이블 통합)

### Backend (NestJS)
- `GET /topic` — 최초 요청 시 202 + jobId 반환, 이후 polling 시 job 상태 및 결과 반환
- `POST /topic/react` — 멤버/리더 이모지 반응 저장 (cross-team 교차 접근 방지 포함)
- `POST /topic/confirm` — 리더 전용 주제 확정, phase `topic_confirmed`로 전이
- OpenAI GPT-4o 호출: 팀 설문 데이터 → 킥오프 주제 3~5개 JSON 모드 생성
- `TopicSuggestionsSchema` Zod 스키마로 AI 응답 검증, 파싱 실패 3회 시 job FAILED 처리
- prompt injection 방어: 사용자 입력을 XML 태그(`<teamData>...</teamData>`)로 경계 분리

### Frontend (Next.js)
- `/team/[teamId]/topic/page.tsx` — Server Component, 인증/phase 게이트 포함
- `topic-client.tsx` — polling 루프(5초 × 5회), loading/결과/확정 상태 UI 분기
- 역할별 렌더링: leader(주제 선택+확정 버튼), member(이모지 반응만), observer(읽기 전용)
- `kickoff-dashboard-client.tsx`: "킥오프 주제 결정" 버튼 활성화 (phase === survey_complete 시)
- `middleware.ts`: `kickoff-topic-*` dev-preview 화면 인증 예외 추가

### Figma
- Screen 7 — Topic Decision 페이지 신규 생성
- 6장 캡처: loading-desktop, loading-mobile, leader-desktop, leader-mobile, member-desktop, member-mobile

## 설계 결정

- `KF-024`: OpenAI GPT-4o SDK 도입 (이번 세션 신규 결정, 아래 decisions.md 참조)
- `ADR-003` (AI job polling 패턴) — proposed → accepted (Screen 7에서 실제 구현으로 검증)
- `ADR-004` (Socket.io 보류) — proposed → accepted (Screen 7 polling 방식으로 진행 확정)
- `KF-020` polling 5초 × 5회, fallback UI 전환 기준 실제 구현에서 확정
- `KF-023` topic_confirmed 이후 read-only 전환, 재편집 버튼 미노출 적용

## 미완료 항목

- Screen 7 member/observer 반응 실시간 업데이트는 polling(5초)으로 처리 중. Socket.io 백필은 Screen 11 구현 시 수행 (ADR-004)
- `jti` replay 방지는 여전히 인메모리 JtiCacheService 사용. Redis 교체는 KF-005 기술 부채로 유지

## Next Start

1. Screen 8a (`/team/[teamId]/structure`) — 시스템 프레이밍 구현 시작
   - phase gate: `topic_confirmed` 확인
   - DB: KickoffStructure 모델 + StructureJobStatus enum 추가
   - AI: GPT-4o (또는 Claude API 검토) → StructureSuggestionsSchema 정의
2. Screen 8b (`/team/[teamId]/stack`) — Screen 8a 완료 후 이어서 구현
3. Figma: Screen 8a/8b desktop+mobile 캡처
