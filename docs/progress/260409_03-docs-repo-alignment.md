# 260409_03-docs-repo-alignment

## 작업 요약

- 제품/아키텍처 정본 문서를 최신 repo 기준으로 재검증하고, 구현 완료/부분 구현 화면의 문서 서술을 실제 코드에 맞게 보정했다.
- `system-spec`, `screen-flow`, Screen 5/7 세부 문서, Team Context 경계 문서, ADR-006을 우선 정리했다.
- 문서 점검 과정에서 Screen 7의 프론트엔드-백엔드 payload contract, Topic manual draft UI의 서버 미연결, Team Context boolean 입력의 2-state 구현 등 코드-문서 차이를 명시적으로 기록했다.

## 반영한 핵심 정정

- Screen 1 진입 경로를 `/`가 아닌 `/login`으로 정정
- Screen 3a/3b 완료 후 이동 경로를 `/team/[teamId]/survey`로 정정
- Screen 5 API를 `/survey/result/me`, `/survey/result/:userId`, `/survey/role-reaction`, `/kickoff/roles/*` 기준으로 정리
- Screen 7 API를 `/brainstorm`, `/brainstorm/ideas`, `/ideas/:ideaId/react`, `/brainstorm/advance`, `/topic`, `/topic/react`, `/topic/confirm` 기준으로 정리
- 설문을 `9섹션 입력 / 6축 결과` 구조로 명시
- Team Context에서 `teamGoal` 흔적을 제거하고 `domainHints` 기준으로 정리

## 검증 결과

- `pnpm typecheck` 통과
- `pnpm --filter @teamforge/web build` 통과
  - `next-auth` / `jose` 경로에서 Edge Runtime warning 존재
- `pnpm --filter @teamforge/api build` 통과

## 코드 기준으로 확인한 현재 주의점

- Screen 7a 브레인스토밍 페이지는 route/API는 존재하지만, ideation payload shape와 프론트 기대 타입 사이를 추가 검증할 필요가 있다.
- Screen 7b의 leader manual topic 입력 UI는 local draft 수준이며, 서버에 새 topic을 생성해 확정하는 경로는 아직 연결되지 않았다.
- Team Context boolean 3종은 DB/contract에서는 nullable이지만, 현재 웹 생성 폼은 2-state 입력이라 신규 생성 팀에서 `null`과 `false`를 구분해 저장하지 않는다.

## 다음 시작 포인트

- Screen 7a/7b의 실제 UI 계약을 코드 레벨에서 정리할지, 문서에서 partial 상태로 유지할지 결정
- Team Context boolean 입력을 tri-state로 확장할지, 문서를 현재 2-state 구현 기준으로 확정할지 결정
- Screen 8 이후 문서도 같은 방식으로 "설계 truth"와 "repo truth"의 경계를 유지하며 확장
