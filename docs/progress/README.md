# 진행 일지 인덱스

이 폴더는 세션 단위의 구현 기록과 계획 이력을 보관한다.

## 규칙

- 의미 있는 작업 세션마다 파일 하나를 생성한다.
- 파일명 형식은 `YYMMDD_NN-brief-english-desc.md`를 유지한다.
- 항상 `다음 시작 포인트` 섹션을 포함한다.
- 설계 결정은 `decisions.md`와 서로 연결한다.

## 항목

| 날짜 | 파일 | 요약 |
| --- | --- | --- |
| 2026-04-06 | `260406_01-repo-docs-structure-bootstrap.md` | Initial repository and docs governance scaffolding |
| 2026-04-06 | `260406_02-workspace-bootstrap-scaffold.md` | Monorepo workspace, app scaffolds, and shared contracts bootstrap |
| 2026-04-06 | `260406_03-full-structure-analysis.md` | Full structure analysis — auth gap, design system baseline, security blockers |
| 2026-04-06 | `260406_04-auth-infra-screen1-3.md` | Auth infra complete, design system base, Screen 1-3 implemented, 7 security fixes |
| 2026-04-06 | `260406_05-css-auth-bff-dashboard.md` | CSS system port, BFF JWT pattern, multi-team dashboard, Figma Button set |
| 2026-04-06 | `260406_06-screen4-survey-implementation.md` | Screen 4 skill survey full stack, Figma sync agent, CLAUDE.md rebase, security fixes |
| 2026-04-06 | `260406_07-shared-app-header.md` | Shared AppHeader component, CSS height variable, applied to all auth pages, dev-preview protected |
| 2026-04-06 | `260406_08-codebase-edge-case-analysis-and-bug-fixes.md` | Full codebase edge-case analysis, 5 bugs fixed (404 route, survey error handling, auth sync logging, debounce cleanup) |
| 2026-04-06 | `260406_09-screen5-6-result-dashboard-implementation.md` | Screen 5 radar chart result page and Screen 6 kickoff dashboard, KickoffModule, ParseTeamIdPipe, security hardening |
| 2026-04-06 | `260406_10-screen5-screen6-figma-sync.md` | Screen 5 + Screen 6 implementation complete with security hardening, Figma sync (6 captures: desktop+mobile) |
| 2026-04-07 | `260407_01-screen7-topic-decision.md` | Screen 7 topic decision full-stack: GPT-4o, 202/polling, role-based UI, Figma 6 captures |
| 2026-04-07 | `260407_02-screen5-role-reaction.md` | Screen 5 role reaction buttons (ok/burden/prefer_other), DB migration, optimistic UI, Figma recapture |
| 2026-04-07 | `260407_03-screen6-team-insight.md` | Screen 6 P0-B TeamInsightPanel: server-side axis aggregation, mini radar SVG, Figma recapture (248:2, 249:2) |
| 2026-04-07 | `260407_04-survey-screen56-redesign.md` | Survey 9-section expansion (block confidence, collab checklist, AI profile), Screen 5/6 enhanced result cards |
| 2026-04-07 | `260407_06-survey-card-ui-refresh.md` | Survey P2+P3+P6 card UI refresh: icon cards, 150ms micro-interactions, Section8 optional validation, draftStep max bug fix |
| 2026-04-07 | `260407_07-screen5-persona-view.md` | Screen 5 leader/member persona views, role finalization (finalRole), 30s polling, TeamMembership column expansion |
| 2026-04-07 | `260407_08-document-language-policy-korean-default.md` | 문서 기본 언어를 한국어로 통일하고 템플릿, 에이전트, 스킬 규칙을 정리 |
| 2026-04-08 | `260408_01-current-screen-status-and-intent-summary.md` | progress 문서를 통합해 최신 screen 진행 상태와 각 screen의 의도를 한 문서로 정리 |
| 2026-04-08 | `260408_02-screen7-brainstorm.md` | Screen 7 브레인스토밍 전체 스택 구현 (7a/7b 분리, DB 4모델, 8컴포넌트, dot voting, KF-031~033) |
| 2026-04-08 | `260408_03-merge-socketio.md` | Multi-parent merge + Socket.io 실시간 동기화 도입 (ADR-005, KF-034~035) |
