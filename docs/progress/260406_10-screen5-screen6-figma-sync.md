# 260406_10-screen5-screen6-figma-sync

## 작업 요약

- Screen 5(개인 결과/레이더 차트)와 Screen 6(킥오프 대시보드) 구현 완료 및 보안 강화 작업을 마쳤다.
- ParseTeamIdPipe를 공통 파이프로 추출해 survey/kickoff 전 엔드포인트에 CUID 형식 검증을 적용했다.
- XSS whitelist 에러 정규화, JSONB 최소 권한 반환, 인증 로그 하드닝 등 tf-security 검토 항목을 반영했다.
- Screen 5(desktop+mobile), Screen 6a 진행 중(desktop+mobile), Screen 6b 완료(desktop+mobile) 총 6장을 Figma에 동기화했다.
- Figma capture script가 `apps/web/app/layout.tsx`에서 완전히 제거되어 프로덕션 번들이 정리되었다.

## 구현된 기능

### 신규 Backend 파일
- `apps/api/src/kickoff/kickoff.module.ts` — KickoffModule 선언
- `apps/api/src/kickoff/kickoff.controller.ts` — `GET /api/teams/:teamId/kickoff/status` 엔드포인트
- `apps/api/src/kickoff/kickoff.service.ts` — 팀 설문 현황 집계, 멤버 목록, phase 계산 (단방향 State Machine)
- `apps/api/src/common/parse-team-id.pipe.ts` — CUID 형식(`/^[a-z0-9]{20,30}$/`) 검증 파이프

### 신규 Frontend 파일
- `apps/web/app/team/[teamId]/result/page.tsx` — Server Component, 401/403/404 처리
- `apps/web/app/team/[teamId]/result/result-client.tsx` — 순수 SVG 레이더 차트, 6축(기획력/기술력/소통력/추진력/창의력/성장력)
- `apps/web/app/team/[teamId]/dashboard/page.tsx` — Server Component, kickoff status 조회
- `apps/web/app/team/[teamId]/dashboard/kickoff-dashboard-client.tsx` — 진행률 바, 멤버 완료 상태, 페이즈 배지

### 수정된 파일
- `apps/api/src/survey/survey.service.ts` — `getMyResult()` + `calculateAxisScores()` 추가, saveDraft/submitSurvey 응답에서 answers JSONB 제거
- `apps/api/src/survey/survey.controller.ts` — `GET /api/teams/:teamId/survey/result/me` 엔드포인트 추가, ParseTeamIdPipe 전체 적용
- `apps/api/src/app.module.ts` — KickoffModule 등록
- `apps/web/app/team/[teamId]/survey/page.tsx` — submitted 상태 감지 후 `/result` redirect
- `apps/web/app/team/[teamId]/survey/survey-client.tsx` — 제출 완료 후 `/result` router.push, 미구현 버튼 disabled 처리
- `apps/web/app/layout.tsx` — Figma capture script 제거 완료

### 보안 수정 (tf-security 검토 반영)
- saveDraft, submitSurvey 응답에서 answers JSONB 반환 제거 (최소 권한 원칙)
- CUID 형식 검증 파이프를 teamId 파라미터 전체에 적용 (숫자 ID, 경로 순회 문자열 차단)
- XSS whitelist 에러 정규화 (join/create/survey 클라이언트)
- 클라이언트 alert() 완전 제거 → disabled 버튼 + "곧 오픈됩니다" 텍스트로 교체
- 대시보드 "계속하기" 버튼 → `/team/${teamId}/survey` 경로 수정
- 팀 참가/생성 후 네비게이션 → `/team/${teamId}/survey` 경로 수정
- 인증 로그 하드닝

### Figma 동기화
- Screen 5 desktop(1440px) + mobile(390px) 캡처 업로드
- Screen 6a(진행 중 상태) desktop + mobile 캡처 업로드
- Screen 6b(완료 상태) desktop + mobile 캡처 업로드

## 설계 결정

- `KF-016`: 레이더 차트는 recharts/d3 없이 순수 SVG로 구현 — 의존성 추가 없이 6축 시각화 충족
- `KF-017`: 설문 점수 계산 로직은 NestJS 서비스 단에서만 수행 — 클라이언트는 계산된 scores 배열만 수신
- `KF-018`: Phase State Machine — `idle → survey_in_progress → survey_complete → ...` 단방향 전이, 서비스 계층 계산

## 미완료 항목

- Screen 7 (`/team/[teamId]/topic`) 미구현 — 킥오프 주제 결정 UI 및 API 없음
- Screen 8 (`/team/[teamId]/structure`, `/stack`) 미구현
- `kickoff/status` phase 필드는 현재 3단계만 정의; `topic_selected` 이후 단계 추가 필요
- ParseTeamIdPipe CUID 패턴이 프로덕션 Prisma CUID 발급 범위와 일치하는지 통합 테스트 미작성

## Next Start

1. Screen 7 `/team/[teamId]/topic` — 킥오프 주제 결정 (DB 모델: `KickoffTopic`, API: POST/GET, UI: 주제 선택 + 투표)
2. `kickoff.service.ts` phase 전이 로직에 `topic_selected` 단계 추가
3. `ParseTeamIdPipe` 단위 테스트 작성 (유효/무효 CUID, 경로 순회 문자열 케이스)
