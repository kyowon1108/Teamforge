# TeamForge — 결정 키 원장 (Decision Log)

> 각 결정의 **현재 유효한 결론**만 모은 참조 문서.
> 폐기된 결정은 `~~취소선~~` + `Superseded by KF-XXX`.
> 상세 맥락은 각 일지 파일 참조.

---

## KF-001 — 아키텍처 다이어그램 업데이트 방식

**결론:** AI 채팅 응답의 mermaidCode는 `pendingMermaidCode`에만 저장. 화면에 표시된 다이어그램(`mermaidCode`)은 팀장/팀원이 "다이어그램 업데이트" 버튼을 명시적으로 클릭할 때만 덮어씀.

**이유:** Topic 단계에서 확정된 다이어그램이 Architecture 단계 진입 시 AI 응답에 의해 자동 덮어써지는 문제 발생. 사용자가 의도하지 않은 변경 방지.

**영향 파일:** `apps/web/app/team/[teamId]/kickoff/architecture/page.tsx`

**일지:** [260405_01](./260405_01-kakao-oauth-observer-diagram-fix.md)

---

## KF-002 — Screen 9 (도구 세팅) 별도 페이지 구현 여부

**결론:** 별도 페이지 불필요. `integrations` DB 테이블 + Screen 10 내 흡수 방식으로 구현.

**이유:** 화면의 부재보다 연동 상태를 저장할 도메인 모델의 부재가 진짜 문제. Screen 9 UI는 나중에 "설정/관리" 화면으로 분리 가능. Screen 10 + integrations 저장 모델만 있으면 Phase 5 진입 가능.

**영향 범위:** `integrations` 테이블 신규 생성, Screen 10 UI 확장

**일지:** [260405_02](./260405_02-screen-flow-docs-kickoff-planning.md)

---

## KF-003 — 킥오프 보완 항목 구현 순서

**결론:** 4개 배치로 진행. 백엔드(KickoffSession 스키마 확장) 먼저, 프론트 일괄 구현.

```
배치 A: 의사결정 입력 — Out of Scope, 성공 기준, 협업 규칙 4개, 팀원 우려
배치 B: 합의 — 역할 수락/조정 UI
배치 C: 산출물 자동화 — 첫 Issue 생성, 첫 회의 agenda, Mini ADR
배치 D: 게이트 — Summary 서명 + finalize 조건 강화
```

**이유:** 배치 C(자동 생성)는 배치 A,B의 입력값(owner, scope, 데모 기준)이 있어야 의미 있는 결과 생성 가능. 서명(D)은 모든 합의 후 마지막.

**일지:** [260405_02](./260405_02-screen-flow-docs-kickoff-planning.md)

---

## KF-007 — KickoffParticipant 저장 방식

**결론:** 팀원별 우려·역할수락·서명 상태는 `KickoffSession` JSONB가 아닌 별도 `KickoffParticipant` 테이블에 저장.

**이유:** 여러 팀원이 동시에 자신의 상태를 업데이트할 때 JSONB 전체 덮어쓰기 방식은 lost update 위험이 있음. 별도 테이블은 행 단위 잠금으로 동시성 안전. `signedRevision` 컬럼으로 서명 시점의 내용 불변성 보장.

**영향 범위:** `prisma/schema.prisma`, `packages/contracts/src/jsonb-schemas.ts`, kickoff 모듈 전체

**마이그레이션:** [runbook](../../runbooks/migration-kickoff-participant-artifact.md)

---

## KF-008 — AI 백엔드 서비스 선택

**결론:** kickoff 모듈의 AI 호출은 OpenAI `gpt-4o-mini`로 통일. Anthropic SDK 미사용.

**이유:** 초기 비용 절감 및 팀 내 OpenAI API 키 보유. `response_format: json_object`로 구조화 출력 신뢰성 확보.

**영향 파일:** `apps/api/src/modules/kickoff/kickoff.service.ts`, `apps/api/package.json`

**일지:** [260405_04](./260405_04-openai-sdk-verify-typecheck.md)

---

## KF-009 — 대시보드 중심 아키텍처 전환

**결론:** 선형 위저드(login → onboarding → team) 구조에서 `/dashboard` 진입점 중심으로 전환. 팀 목록 `GET /teams` API로 fresh하게 조회. `session.user.teamId` 하위 호환 유지.

**이유:** DB는 이미 multi-team 설계됨(TeamMember 복합 unique). 세션/라우팅만 대시보드 중심으로 맞추면 복수 팀 완전 지원. ADR-003 참조.

**영향 파일:** `app/page.tsx`, `app/onboarding/role/page.tsx`, `app/dashboard/page.tsx`, `app/team/[teamId]/layout.tsx`

**일지:** [260405_05](./260405_05-dashboard-centric-refactor-screen9.md)

---

## KF-010 — Screen 9 협업 도구 연동 방식

**결론:** Discord/Slack/GitHub/Notion 등 Webhook URL 직접 입력 방식 우선 구현. OAuth 팝업(Slack App, GitHub App 등록 필요)은 추후 추가.

**이유:** Webhook URL 입력은 사이트 이탈 없이 완결 가능. OAuth는 TeamForge Slack App/GitHub App 등록이 선행되어야 해 현시점에서 구현 불가.

**영향 파일:** `apps/api/src/modules/integrations/`, `apps/api/prisma/schema.prisma` (integrations 테이블)

**일지:** [260405_05](./260405_05-dashboard-centric-refactor-screen9.md)

---

## KF-011 — 팀 합류 시 역할 선택 방식

**결론:** 팀원/옵저버 역할은 `/team/join` 및 `/team/join/[code]` 페이지 내에서 명시적 UI 카드 선택으로 결정. `localStorage.getItem("teamforge_role")` 의존 제거.

**이유:** 다중 팀 환경에서 사용자는 팀마다 다른 역할로 합류할 수 있음. 최초 온보딩에서 선택한 `teamforge_role` localStorage 값은 stale해질 수 있어 합류 시점의 명시적 선택이 필요.

**영향 파일:** `apps/web/app/team/join/page.tsx`, `apps/web/app/team/join/[code]/page.tsx`

**일지:** [260405_06](./260405_06-redirect-fix-flow-verification-security.md)

---

## KF-014 — topic 페이지 phase guard

**결론:** topic 페이지 마운트 시 `GET /kickoff/:teamId`로 phase 확인. phase ≠ `topic_decision`이면 결정된 주제 read-only 뷰 표시 + 단계별 forward CTA. 리더에게는 architecture 단계에 한해 "주제 변경" 버튼 제공.

**이유:** URL 직접 접근이나 back 버튼으로 topic 페이지에 도달했을 때, phase guard 없으면 모든 write API가 400을 반환하며 사용자 혼란 발생. "URL보다 session phase가 진실"이 되어야 함.

**영향 파일:** `apps/web/app/team/[teamId]/kickoff/topic/page.tsx`

**일지:** [260405_08](./260405_08-kickoff-phase-navigation-fix.md)

---

## KF-015 — revert-to-topic 허용 범위

**결론:** `POST /kickoff/:teamId/revert-to-topic`은 `architecture` 단계에서만 허용. `summary` 이후는 `_assertPhase(["architecture"])` 에 의해 자동 차단.

**이유:** summary 이후는 역할 수락·서명 등 합의 상태가 존재. 주제까지 되돌리면 파생 데이터 정합성 비용이 큼. 필요하다면 `revert-to-architecture`만 별도 설계하는 것이 낫다.

**영향 파일:** `apps/api/src/modules/kickoff/kickoff.service.ts`, `apps/api/src/modules/kickoff/kickoff.controller.ts`

**일지:** [260405_08](./260405_08-kickoff-phase-navigation-fix.md)

---

## KF-012 — 아키텍처 스택 블록별(1개씩) 추천

**결론:** AI가 한 번의 응답에 모든 카테고리를 나열하지 않고, `currentCategory` 1개만 추천. 다음 응답 시 다음 미결 카테고리로 자동 진행.

**이유:** 8개 카테고리를 한 번에 보여주면 팀이 압도됨. 단계별 진행이 선택 완료율을 높임.

**구현:** `_architectureSystemPrompt` `<current_step>` 블록, `chatBrainstorm`에서 `nextCategory` 추적, `_buildOptionCards(platformType, decided, targetCategory)` 단일 카테고리 모드.

**일지:** [260405_07](./260405_07-architecture-stack-flow-robust.md)

---

## KF-013 — `applicableCategories` 결정 위치

**결론:** 서버에서 `matchPlatformPreset` + `preset.applicableCategories`로 결정. 클라이언트는 seed 응답 또는 `GET /architecture/plan` 엔드포인트로 수신. DB 변경 없음.

**이유:** 클라이언트도 동일 로직 실행 가능하지만, 서버 결정이 일관성 보장. 팀 레벨 계산(`_computeTeamLevel`)도 서버에서만 가능.

**신규 엔드포인트:** `GET /kickoff/:teamId/architecture/plan` → `{ applicableCategories, teamLevel }`

**일지:** [260405_07](./260405_07-architecture-stack-flow-robust.md)

---

## KF-004 — 옵저버의 팀원 수 계산 포함 여부

**결론:** 옵저버는 `expectedSize` 비교 및 모든 팀원 수 표시에서 제외. `nonObserverCount = members.filter(m => m.role !== 'observer').length`만 사용.

**이유:** 옵저버는 팀 프로젝트 참여자가 아니라 외부 관찰자(교수, 멘토 등). expectedSize에 포함되면 "3/4명"이 실제보다 부풀려짐.

**영향 파일:** `apps/web/app/team/[teamId]/page.tsx`

**일지:** [260405_01](./260405_01-kakao-oauth-observer-diagram-fix.md)
