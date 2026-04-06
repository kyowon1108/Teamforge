# 260406_08-codebase-edge-case-analysis-and-bug-fixes

## 작업 요약

- 전체 codebase(backend/frontend/database)를 횡단 분석해 유저 이탈 위험이 있는 edge case를 식별했다.
- 팀 생성·참가 후 존재하지 않는 라우트로 이동하는 Critical 버그 2건을 수정했다.
- survey page의 API 에러 silent fail 및 submit 실패 무응답 문제를 High 수준으로 수정했다.
- auth sync 실패 시 빈 catch block을 로깅으로 교체하고, debounce 타이머 메모리 누수를 정리했다.

## 구현된 기능

### [Critical] 팀 생성/참가 후 404 라우트 이동 수정

- `apps/web/app/team/join/join-team-client.tsx:40`
  - `/team/${teamId}` → `/team/${teamId}/survey` 로 변경
- `apps/web/app/team/create/create-team-client.tsx:52`
  - 동일하게 `/team/${teamId}/survey` 로 변경
- 배경: `/team/[teamId]` 라우트가 존재하지 않으므로 팀 생성·참가 직후 유저가 404를 보고 이탈했다. 킥오프 플로우의 다음 단계는 survey이므로 해당 경로가 정확한 목적지다.

### [High] survey page API 에러 silent fail 수정

- `apps/web/app/team/[teamId]/survey/page.tsx`
  - 기존에는 403만 observer 처리하고 나머지 에러는 빈 폼으로 렌더링했다.
  - 401 → `/login` redirect, 404(팀 멤버 아님) → `/dashboard` redirect, 500 이상 기타 → `/dashboard` fallback 추가.
  - 유저가 권한 없는 survey를 보고 저장/제출을 반복하다 이탈하는 흐름을 제거했다.

### [High] survey submit 실패 시 에러 표시 없음 수정

- `apps/web/app/team/[teamId]/survey/survey-client.tsx`
  - `submitError` state 추가.
  - 바텀 네비게이션 위에 에러 토스트 UI 표시.
  - 기존에는 `console.error`만 호출되고 버튼이 재활성화되어 유저는 제출 실패 여부를 알 수 없었다.

### [Medium] auth sync 실패 silent catch 수정

- `apps/web/lib/auth.ts`
  - 빈 catch block을 `console.error` 로깅으로 교체.
  - sync 실패 시 `apiUserId` 미설정으로 이어지는 이후 모든 API 호출 401 연쇄 장애를 추적 가능하게 했다.

### [Minor] debounce 타이머 언마운트 시 미정리 수정

- `apps/web/app/team/[teamId]/survey/survey-client.tsx`
  - `useEffect` cleanup 함수에서 debounce 타이머 클리어 추가.
  - 컴포넌트 언마운트 후 타이머가 실행되어 발생하는 메모리 누수 제거.

## 설계 결정

신규 결정 키 없음. 이번 세션은 기존 결정(KF-006, KF-009, KF-010)의 구현 경계 안에서 버그를 수정했다.

기존 미해결 항목 상태 확인:
- `KF-005`: jti 인메모리 캐시 → Redis 전환 여전히 미완료. 서버 재시작 시 replay 방어가 리셋되는 위험이 유지됨. 현재 단계에서는 수용 가능한 기술 부채로 유지.

## 미완료 항목

- **KF-005 (jti Redis 전환)**: `JtiCacheService`가 인메모리 구현이므로 서버 재시작 시 이전 JTI 이력이 초기화된다. Redis 도입 전까지 재생 공격 방어가 완전하지 않다.
- **팀 초대코드 rotation 정책 없음**: 생성 후 만료되지 않는 초대코드가 유출되면 팀에 임의 멤버가 참가할 수 있다. 만료 정책 또는 단일 사용 코드 구현이 필요하다.
- **`/team/[teamId]` 라우트 부재**: 현재 survey로 직행하도록 우회했으나, 향후 team overview 페이지가 생기면 이 라우트를 정식 구현하거나 survey 이후 상태의 기본 랜딩으로 교체해야 한다.

## Next Start

1. Screen 5 `/team/[teamId]/result` 구현 — 개인 설문 결과 레이더 차트. `SurveyResponse` answers 데이터가 이미 있으므로 API 집계 엔드포인트 설계부터 시작.
2. Screen 6 `/team/[teamId]/dashboard` — 팀원 전체 survey 완료 현황 집계 뷰. realtime 없이 polling 방식으로 먼저 구현.
3. KF-005 Redis 전환 시점 결정 — Screen 7 이전에 인프라 안정화가 필요한지 검토.
