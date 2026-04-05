# TeamForge — 진행 일지 인덱스

> 날짜별 작업 기록. 설계 결정, 구현 현황, 미구현 추적, 다음 시작점 포함.
> AI 세션 간 컨텍스트 인계를 위해 **각 파일 끝의 `Next Start` 섹션**이 가장 중요.
> `/tfo` 명령으로 작업 완료 후 `tf-docs` 에이전트가 자동으로 일지를 생성하고 이 인덱스를 업데이트합니다.

**파일명 규칙:** `YYMMDD_NN-brief-english-desc.md`

---

## 일지 목록

| 날짜 | 파일 | 한 줄 요약 |
|------|------|-----------|
| 2026-04-04 | [260404_01-mvp-product-priorities.md](./260404_01-mvp-product-priorities.md) | MVP 이후 우선순위 분석 — Meeting Hub를 첫 retention loop로 |
| 2026-04-05 | [260405_01-kakao-oauth-observer-diagram-fix.md](./260405_01-kakao-oauth-observer-diagram-fix.md) | Kakao OAuth, 옵저버 카운트 수정, 아키텍처 다이어그램 고정 |
| 2026-04-05 | [260405_02-screen-flow-docs-kickoff-planning.md](./260405_02-screen-flow-docs-kickoff-planning.md) | Screen 1~10 플로우 문서화 + 킥오프 보완 항목 확정 |
| 2026-04-05 | [260405_03-kickoff-batch-abcd-implementation.md](./260405_03-kickoff-batch-abcd-implementation.md) | 킥오프 배치 A/B/C/D 구현 (DB + API + UI) |
| 2026-04-05 | [260405_04-openai-sdk-verify-typecheck.md](./260405_04-openai-sdk-verify-typecheck.md) | OpenAI SDK 전환 검증 + 타입 체크 통과 확인 |
| 2026-04-05 | [260405_05-dashboard-centric-refactor-screen9.md](./260405_05-dashboard-centric-refactor-screen9.md) | 대시보드 중심 리팩토링 + Screen 9 협업 도구 세팅 기초 |
| 2026-04-05 | [260405_06-redirect-fix-flow-verification-security.md](./260405_06-redirect-fix-flow-verification-security.md) | ERR_TOO_MANY_REDIRECTS 수정 + 전체 플로우 검증 + 보안 감사 |
| 2026-04-05 | [260405_07-architecture-stack-flow-robust.md](./260405_07-architecture-stack-flow-robust.md) | 아키텍처 스택 플로우 강화 — 블록별 추천 + 팀 수준 말투 + applicable categories |
| 2026-04-05 | [260405_08-kickoff-phase-navigation-fix.md](./260405_08-kickoff-phase-navigation-fix.md) | 킥오프 phase 네비게이션 버그 수정 — back 버튼 400 에러 제거 + revert 기능 |

---

## 결정 키 목록 → [decisions.md](./decisions.md)

| 키 | 제목 | 최종 결론 | 일지 |
|----|------|----------|------|
| KF-001 | 아키텍처 다이어그램 업데이트 방식 | pendingMermaidCode + 명시적 버튼 클릭 시에만 적용 | [260405_01](./260405_01-kakao-oauth-observer-diagram-fix.md) |
| KF-002 | Screen 9 구현 여부 | 별도 페이지 불필요, integrations 모델 + Screen 10 흡수 | [260405_02](./260405_02-screen-flow-docs-kickoff-planning.md) |
| KF-003 | 킥오프 보완 구현 순서 | 배치 A→B→C→D, 백엔드 먼저 | [260405_02](./260405_02-screen-flow-docs-kickoff-planning.md) |
| KF-004 | 옵저버 팀원 수 계산 | 옵저버 제외한 nonObserverCount만 expectedSize 비교 | [260405_01](./260405_01-kakao-oauth-observer-diagram-fix.md) |
| KF-005 | Meeting Hub 우선순위 | 첫 번째 retention loop로 먼저 구현 | [260404_01](./260404_01-mvp-product-priorities.md) |
| KF-006 | reliability score 네이밍 | → profile confidence (사람 신뢰도 오인 방지) | [260404_01](./260404_01-mvp-product-priorities.md) |
| KF-007 | KickoffParticipant 저장 방식 | 별도 테이블 (JSONB 동시 write 위험 방지, signedRevision 보장) | — |
| KF-011 | 팀 합류 시 역할 선택 방식 | 합류 페이지 내 명시적 UI (localStorage 의존 제거) | [260405_06](./260405_06-redirect-fix-flow-verification-security.md) |
| KF-012 | 아키텍처 블록별 추천 | 한 번에 1 카테고리씩, 다음 미결 카테고리 자동 추적 | [260405_07](./260405_07-architecture-stack-flow-robust.md) |
| KF-013 | applicableCategories 결정 위치 | 서버에서 preset+features 기반 결정, 클라이언트는 수신만 | [260405_07](./260405_07-architecture-stack-flow-robust.md) |
| KF-014 | topic 페이지 phase guard | phase ≠ topic_decision이면 read-only view + CTA | [260405_08](./260405_08-kickoff-phase-navigation-fix.md) |
| KF-015 | revert-to-topic 허용 범위 | architecture 단계에서만 허용, summary 이후 불가 | [260405_08](./260405_08-kickoff-phase-navigation-fix.md) |
