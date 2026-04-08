# 260408_02-screen7-brainstorm

## 작업 요약

- Screen 7을 7a(Brainstorm) + 7b(Topic Decision) 2단계로 분리하고, 7a 브레인스토밍 전체 스택을 구현했다.
- DB에 BrainstormSession, BrainstormIdea, IdeaBuildOnEdge, IdeaReaction 4개 모델과 BrainstormPhase enum을 추가했다.
- NestJS BrainstormModule(controller + service)을 신규 생성하고, KickoffModule에 dot voting + AI 결정 기록을 연동했다.
- 프론트엔드에 brainstorm 페이지와 8개 컴포넌트(PhaseProgressBar, TeamCapabilityBanner, IdeaSubmitForm, IdeaSubmissionCounter, BrainstormTimer, IdeaCard, IdeaCardWall, BuildOnModal)를 구현했다.
- `docs/product/screen7-brainstorm-flow.md` 설계 문서를 작성하고, `screen-flow.md`에서 Screen 7 행을 7a+7b로 분리했다.

## 구현된 기능

- `apps/api/prisma/schema.prisma` — BrainstormSession, BrainstormIdea, IdeaBuildOnEdge, IdeaReaction 모델 + BrainstormPhase enum, KickoffTopic에 sourceIdeaIds 필드 추가
- `packages/contracts/src/brainstorm/` — IdeaSubmitBodySchema, BuildOnBodySchema, IdeaReactBodySchema Zod 계약
- `apps/api/src/brainstorm/` — BrainstormController + BrainstormService + BrainstormModule 신규 생성
- `apps/api/src/kickoff/` — dot voting 지원 (인당 2표), AI 결정 기록, BrainstormModule import
- `apps/web/app/team/[teamId]/topic/brainstorm/` — brainstorm 페이지 (page.tsx + brainstorm-client.tsx)
- `apps/web/components/brainstorm/` — PhaseProgressBar, TeamCapabilityBanner, IdeaSubmitForm, IdeaSubmissionCounter, BrainstormTimer, IdeaCard, IdeaCardWall, BuildOnModal
- `apps/web/app/team/[teamId]/topic/` — page.tsx, topic-client.tsx에 dot voting + brainstorm redirect 연동
- `apps/web/app/dev-preview/page.tsx` — brainstorm 4단계 케이스 추가
- `docs/product/screen7-brainstorm-flow.md` — 브레인스토밍 플로우 설계 문서 신규
- `docs/product/screen-flow.md` — Screen 7 행을 7a(Brainstorm) + 7b(Topic Decision)로 분리

## 설계 결정

- `KF-031`: Screen 7을 7a(Brainstorm) + 7b(Topic Decision) 2단계로 분리. 아이디어 생성과 주제 확정을 독립적 화면으로 관리한다.
- `KF-032`: Build-on은 single-parent MVP, 깊이 1단계 고정. 복잡한 트리 구조 대신 단순 parent-child 관계만 지원한다.
- `KF-033`: Dot voting은 인당 2표, 폴링 기반 집계. 리더의 최종 주제 확정은 투표 결과와 독립적으로 수행한다.

## 미완료 항목

- Socket.io 실시간 브레인스토밍 동기화 미구현 (현재 폴링 방식)
- BrainstormTimer 서버 동기화 미구현 (클라이언트 타이머만)
- Screen 7b(Topic Decision) AI 기반 주제 추천 개선 여지 있음

## 다음 시작 포인트

- Screen 8 `/team/[teamId]/structure` + `/stack` 아키텍처/스택 선택 구현
- brainstorm 실시간 동기화를 위한 Socket.io 이벤트 설계 검토
- Screen 7 Figma 캡처 업데이트 (7a brainstorm + 7b topic)
