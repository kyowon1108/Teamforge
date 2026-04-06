# 260406_09-screen5-6-result-dashboard-implementation

## 작업 요약

- Screen 5(개인 결과) 와 Screen 6(팀 킥오프 대시보드) 를 전체 스택(DB → API → UI)으로 구현 완료했다.
- 레이더 차트를 외부 라이브러리 없이 순수 SVG로 구현했고, 점수 계산 로직은 NestJS 서비스 단에 단일 배치했다.
- `KickoffModule` 을 신규 생성하여 팀 설문 현황 및 phase 상태 조회 API 를 분리했다.
- `ParseTeamIdPipe` 를 공통 파이프로 추출하여 모든 teamId 파라미터에 CUID 형식 검증을 적용했다.
- tf-security 검토 결과를 반영해 API 응답에서 불필요한 JSONB 필드 반환을 제거하고 입력 검증을 강화했다.

## 구현된 기능

### 신규 Backend 파일
- `apps/api/src/kickoff/kickoff.module.ts` — KickoffModule 선언
- `apps/api/src/kickoff/kickoff.controller.ts` — `GET /api/teams/:teamId/kickoff/status` 엔드포인트
- `apps/api/src/kickoff/kickoff.service.ts` — 팀 설문 현황 집계, 멤버 목록, phase 계산 로직
- `apps/api/src/common/parse-team-id.pipe.ts` — CUID 형식(`c` 접두어, 소문자 영숫자 25자) 검증 파이프

### 신규 Frontend 파일
- `apps/web/app/team/[teamId]/result/page.tsx` — Server Component, 인증/팀 소속 검증 후 클라이언트로 데이터 전달
- `apps/web/app/team/[teamId]/result/result-client.tsx` — SVG 레이더 차트, 6축(기획력/기술력/소통력/추진력/창의력/성장력) 점수 시각화
- `apps/web/app/team/[teamId]/dashboard/page.tsx` — Server Component, kickoff status 조회
- `apps/web/app/team/[teamId]/dashboard/kickoff-dashboard-client.tsx` — 팀 설문 진행 현황, 멤버 완료 상태, phase 배지

### 수정된 파일
- `apps/api/src/survey/survey.service.ts` — `getMyResult` 메서드 추가 (6축 점수 계산), saveDraft/submitSurvey 응답에서 answers JSONB 반환 제거, getMyResponse metadata 필드 제거
- `apps/api/src/survey/survey.controller.ts` — `GET /api/teams/:teamId/survey/result/me` 엔드포인트 추가, 전체 teamId 파라미터에 ParseTeamIdPipe 적용
- `apps/api/src/app.module.ts` — KickoffModule 등록
- `apps/web/app/team/[teamId]/survey/page.tsx` — submitted 상태 감지 후 `/result` 로 redirect
- `apps/web/app/team/[teamId]/survey/survey-client.tsx` — 제출 완료 후 `/result` 로 router.push, Screen 7 미구현 버튼에서 alert() 제거 후 disabled 처리

### 보안 수정 (tf-security 검토 반영)
- saveDraft, submitSurvey 응답에서 answers JSONB 반환 제거 (최소 권한 원칙)
- getMyResponse 응답에서 metadata 필드 제거 (answers는 draft 복원 목적으로만 유지)
- CUID 형식 검증 파이프를 teamId 파라미터 전체에 적용 (숫자 ID, 경로 순회 문자열 차단)
- 클라이언트 alert() → disabled 버튼 + "곧 오픈됩니다" 텍스트로 교체

## 설계 결정

- `KF-016`: 레이더 차트는 recharts/d3 없이 순수 SVG 로 구현 — 의존성 추가 없이 6축 시각화 충족
- `KF-017`: 점수 계산 로직은 NestJS 서비스 단에서만 수행 — 클라이언트는 계산된 scores 배열만 수신
- `KF-018`: Phase State Machine — `idle → survey_in_progress → survey_complete → ...` 단방향 전이, 서비스 계층에서 계산

## 미완료 항목

- Screen 7 (`/team/[teamId]/topic`) 미구현 — 킥오프 주제 결정 UI 및 API 없음
- Screen 8 (`/team/[teamId]/structure`, `/stack`) 미구현
- `kickoff/status` 의 phase 필드는 현재 `idle` / `survey_in_progress` / `survey_complete` 3단계만 정의; 이후 topic/structure 단계 추가 필요
- ParseTeamIdPipe CUID 패턴 정규식이 프로덕션 Prisma CUID 발급 범위와 일치하는지 통합 테스트 미작성

## Next Start

1. Screen 7 `/team/[teamId]/topic` — 킥오프 주제 결정 (DB 모델: `KickoffTopic`, API: POST/GET, UI: 주제 선택 + 투표)
2. `kickoff.service.ts` phase 전이 로직에 `topic_selected` 단계 추가
3. `ParseTeamIdPipe` 단위 테스트 작성 (유효/무효 CUID, 경로 순회 문자열 케이스)
