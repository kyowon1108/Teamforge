# 260407_07-screen5-persona-view

## 작업 요약

- Screen 5 결과 페이지에 팀장/팀원 페르소나 분기 UI를 구현했다.
- 팀장은 사이드바에서 팀원 목록을 선택해 개별 결과를 열람하고, 각 팀원의 역할을 확정(finalRole)할 수 있다.
- 팀원은 본인 결과 + 팀장이 확정한 역할 배지를 30초 폴링으로 확인한다.
- DB는 별도 테이블 없이 TeamMembership에 confirmedRole/confirmedAt/confirmedBy 컬럼을 추가하는 방식으로 확정했다.
- KF-029(설계 단계)를 구현 완료 상태로 갱신했다.

## 구현된 기능

- `apps/api/prisma/schema.prisma` — TeamMembership에 confirmedRole, confirmedAt, confirmedBy 컬럼 추가
- `packages/contracts/src/roles/role-finalize.schema.ts` — FINAL_ROLE_OPTIONS(9개), FinalizeRoleBodySchema 신규
- `apps/api/src/survey/survey.service.ts` — getMemberResult, _extractResultData, myRole 반환 로직 추가
- `apps/api/src/survey/survey.controller.ts` — GET result/:userId (leader only, ParseUUIDPipe 적용)
- `apps/api/src/kickoff/kickoff.service.ts` — getTeamMembersForLeader, getMyFinalizedRole, finalizeRole 구현
- `apps/api/src/kickoff/kickoff.controller.ts` — 팀원 목록/역할 조회/역할 확정 3개 엔드포인트 추가
- `apps/web/app/team/[teamId]/result/page.tsx` — searchParams(view, userId) 처리, UUID 검증, 다중 API 호출
- `apps/web/app/team/[teamId]/result/result-client.tsx` — leader/member 페르소나 분기 렌더링
- `apps/web/components/result/TeamMemberSidebar.tsx` — 팀원 목록 선택 사이드바 (신규)
- `apps/web/components/result/RoleFinalizationPanel.tsx` — 팀장 역할 확정 패널 (신규)
- `apps/web/components/result/FinalizedRoleBadge.tsx` — 팀원용 확정 역할 배지, 30초 폴링 (신규)
- `apps/web/components/result/MemberResultViewer.tsx` — 팀원 결과 레이더 차트 래퍼 (신규)
- `apps/web/app/dev-preview/page.tsx` — result-leader, result-member-confirmed 케이스 추가

## 설계 결정

- `KF-029 (완성)`: 팀장 열람 URL `?view=member&userId=X` 쿼리 파라미터 확정. DB는 TeamMembership 컬럼 확장(별도 테이블 없음). finalRole 9개 옵션은 actualRoles 설문 옵션과 동일. 30초 폴링(Socket.io 도입 전). Screen 10 Contract Gate의 선행 데이터로 활용.

## 미완료 항목

- LeaderNoteArea (팀원별 팀장 메모): Later 백로그
- AIPairingGuide (AI 페어링 추천): Later 백로그
- 최종 평가 리포트 (PDF 내보내기): Later 백로그
- Socket.io 도입 시 30초 폴링을 실시간 이벤트로 교체 필요

## Next Start

- Screen 8 `/team/[teamId]/structure` + `/stack` 아키텍처/스택 선택 구현
- Screen 5 Figma 재캡처 (팀장 뷰 + 팀원 확정 배지 반영)
- Screen 10 Contract Gate 선행 설계(tf-flow) 착수 — KF-029 finalRole 데이터 활용 방식 정의
