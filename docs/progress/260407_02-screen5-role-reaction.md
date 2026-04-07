# 260407_02-screen5-role-reaction

## 작업 요약

- P0-A 우선 과제인 Screen 5 역할 반응 버튼 3종(ok/burden/prefer_other)을 전체 스택에 걸쳐 구현 완료했다.
- DB 마이그레이션(20260407031550)으로 `SurveyResponse`에 `roleReaction`, `roleReactionNote` 컬럼을 추가했다.
- NestJS에 `POST /api/teams/:teamId/survey/role-reaction` 엔드포인트를 신규 추가하고, `getMyResult` 응답에 `roleReaction` 필드를 포함시켰다.
- 프론트엔드 `result-client.tsx`에 낙관적 UI 패턴으로 반응 버튼 3개와 `prefer_other` 선택 시 노출되는 자유 입력 필드를 구현했다.
- Screen 5 — Result를 Figma에 desktop + mobile 재캡처 완료(노드 234:2, 235:2).

## 구현된 기능

- **DB:** `SurveyResponse` 테이블에 `roleReaction String?` 및 `roleReactionNote String?` 컬럼 추가. Prisma migration `20260407031550` 적용.
- **Backend:** `POST /api/teams/:teamId/survey/role-reaction` 엔드포인트 추가. Body: `{ reaction: 'ok' | 'burden' | 'prefer_other', note?: string }`. `submitted=true`인 경우만 허용, note 최대 100자 검증. `GET /survey/result` 응답에 `roleReaction`, `roleReactionNote` 포함.
- **Frontend:** `result-client.tsx`에 역할 반응 섹션 추가. 낙관적 UI(클릭 즉시 선택 반영, 서버 저장 실패 시 롤백). `prefer_other` 선택 시 텍스트 입력 필드 조건부 표시.
- **Figma:** Screen 5 — Result desktop(234:2) + mobile(235:2) 재캡처로 변경된 UI 반영.
- **middleware.ts:** `dev-preview?screen=result` 경로 인증 예외 처리 추가.

## 설계 결정

- `KF-025`: Screen 5 역할 반응 값을 `ok` / `burden` / `prefer_other` 3종으로 확정. `prefer_other` 선택 시 선택적 자유 텍스트(`roleReactionNote`, 최대 100자) 저장. `submitted=true`인 경우만 반응 저장 허용. (이미 decisions.md에 등록됨)

## 미완료 항목

- 기존 `yes/somewhat/no` 값 backward-compatible 매핑 또는 마이그레이션 스크립트 미작성. 현재 프로덕션 데이터 없으므로 이슈 없음. 파일럿 전 DB 초기화 시 불필요.
- Screen 10 Contract Gate에서 역할 반응 데이터를 참고 표시하는 연동은 Screen 10 구현 시 수행.

## Next Start

- P0-B: Screen 6 팀 스킬 요약 패널 추가 (`GET /api/teams/:teamId/survey/team-scores` 신규 또는 기존 dashboard 응답 확장, 미니 레이더 차트 컴포넌트)
- `submitted=true` 팀원 axisScores 집계 쿼리를 `kickoff.service.ts` 또는 `survey.service.ts`에 추가하는 것이 첫 번째 단계.
