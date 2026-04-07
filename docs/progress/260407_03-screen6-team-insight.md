# 260407_03-screen6-team-insight

## 작업 요약

- Screen 6 킥오프 대시보드에 P0-B 팀 스킬 분석 패널(TeamInsightPanel)을 추가했다.
- 백엔드 `getKickoffStatus`에 팀 인사이트 집계 로직을 추가해 survey_complete 단계 이상에서 avgAxisScores, topAxes, bottomAxis, roleDistribution을 반환하도록 변경했다.
- 클라이언트 컴포넌트에 미니 레이더 SVG(120x120), 팀 강점 배지, 성장 포인트 배지, 역할 분포 텍스트를 렌더링하는 TeamInsightPanel을 구현했다.
- `middleware.ts`에 `kickoff-dashboard-complete` dev-preview 인증 예외를 추가해 Figma 캡처가 가능하도록 처리했다.
- Screen 6 Figma 재캡처 완료 (노드 248:2 desktop, 249:2 mobile).

## 구현된 기능

- **Backend:** `apps/api/src/kickoff/kickoff.service.ts` — `getKickoffStatus` 응답에 `teamInsight` 집계 필드 추가. submitted된 설문 answers를 순회해 6축 평균(avgAxisScores), 상위 2축(topAxes), 최하위 1축(bottomAxis), suggestedRole 분포(roleDistribution) 계산.
- **Frontend:** `apps/web/app/team/[teamId]/dashboard/kickoff-dashboard-client.tsx` — `TeamInsightPanel` 컴포넌트 추가. submitted_count >= 1 조건 시 패널 표시. 순수 SVG 미니 레이더 차트(120x120), 강점/성장 배지, 역할 분포 행 렌더링.
- **Middleware:** `apps/web/middleware.ts` — `kickoff-dashboard-complete` dev-preview 경로 인증 예외 추가.
- **Figma:** Screen 6 Kickoff Dashboard 재캡처 완료. 노드 248:2(desktop), 249:2(mobile).

## 설계 결정

- 팀 인사이트 집계는 서버 사이드에서만 수행한다. KF-017(설문 점수 계산은 NestJS 서비스 단 단일 수행) 원칙과 일관된다.
- 미니 레이더 SVG는 KF-016(순수 SVG, 외부 차트 라이브러리 불도입) 원칙을 따라 동일한 SVG polygon 계산 방식으로 구현했다.
- submitted_count >= 1인 경우에만 TeamInsightPanel을 표시한다. 0명 제출 시 패널을 숨겨 빈 레이더 차트가 노출되지 않도록 처리했다.

## 미완료 항목

- P2-D(Screen 6 역할 추천 분포 고도화)는 Screen 10 Contract Gate 역할 확정 흐름 확정 후 재검토로 유보.
- Socket.io `survey:submitted` 실시간 이벤트는 ADR-004 확정 전까지 보류 상태(KF-022).

## Next Start

- P1-A: Screen 7 Observer read-only dev-preview mock 구성 또는 Screen 8a System Framing 설계
- ADR-003(AI Job polling 패턴) 작성 후 Screen 8a 착수
- Screen 7 Figma 재캡처: Observer read-only 상태(212:2 신규 프레임), topic_confirmed read-only 상태
