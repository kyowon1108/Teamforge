# 260407_04-survey-screen56-redesign

## 작업 요약

- Survey 스키마를 기존 6섹션에서 9섹션으로 확장했다. Section 7(블록 신뢰도), Section 8(협업 체크리스트), Section 9(AI 프로필) 3개 레이어를 Zod 계약과 프론트엔드 컴포넌트로 동시 구현했다.
- 새 섹션 데이터를 바탕으로 `getMyResult()`가 반환하는 개인 결과 필드를 확장했다. blockProfile, roleGoodFit, roleAvoid, collabScore, aiSupportPlan 5개 필드 추가.
- `_buildTeamInsight()`에 팀 수준 집계 필드(blockCoverage, teamCollabScore, aiNeedBlocks, teamRisks)를 추가해 Screen 6 킥오프 대시보드를 강화했다.
- Prisma 마이그레이션 없이 기존 JSONB `answers` 필드 확장으로 처리했다.

## 구현된 기능

**Contracts (`packages/contracts/src/jsonb/survey-answers.schema.ts`)**
- `Section7CapabilitySchema` — `blockConfidence`: SYSTEM_BLOCKS 11개 × 4레벨(lead/contribute/learn/cant)
- `Section8CollabSchema` — `collabChecklist`: 6개 협업 습관 boolean
- `Section9AIProfileSchema` — `aiProfile`: preferences, verificationLevel(1-3), pairComfort, selfLeadBlocks
- `SYSTEM_BLOCKS`, `BlockConfidenceLevel`, `AI_PREFERENCE_OPTIONS` 상수 export

**Survey 프론트엔드 (`apps/web/components/survey/sections/`)**
- `Section7Capability.tsx` (신규): 블록 신뢰도 매트릭스, Lucide 아이콘, 4레벨 라디오 그리드
- `Section8Collaboration.tsx` (신규): 6개 협업 체크리스트 항목
- `Section9AIProfile.tsx` (신규): 멀티셀렉트 preferences + verificationLevel 슬라이더 + selfLeadBlocks
- `survey-client.tsx`: TOTAL_SECTIONS 6→9 확장, isSectionValid 케이스 7-9 추가

**Backend (`apps/api/src/survey/survey.service.ts`)**
- `getMyResult()` 신규 반환 필드: blockProfile, roleGoodFit, roleAvoid, collabScore, aiSupportPlan
- 헬퍼 메서드: `_calcBlockProfile`, `_calcRoleGoodFit`, `_calcRoleAvoid`, `_calcCollabScore`, `_calcAISupportPlan`
- `VALID_BLOCKS Set`으로 JSONB 키 필터링 (보안 수정)

**Backend (`apps/api/src/kickoff/kickoff.service.ts`)**
- `_buildTeamInsight()` 신규 필드: blockCoverage, teamCollabScore, aiNeedBlocks, teamRisks

**Screen 5 (`apps/web/app/team/[teamId]/result/result-client.tsx`)**
- `BlockProfileCard` (strong/weak 블록 목록), `RoleFitCard` (roleGoodFit/roleAvoid), `AISupportCard` 추가
- 모든 신규 카드는 optional/null-safe — 섹션 7-9 미완료 응답자에게 안전하게 숨김

**Screen 6 (`apps/web/app/team/[teamId]/dashboard/kickoff-dashboard-client.tsx`)**
- `TeamInsightPanel`에 `BlockCoverageGrid`, `CollabMaturityBar`, `AINeeds`, `TeamRisks` 확장
- `dashboard/page.tsx`: TeamInsight 인터페이스에 4개 optional 필드 추가
- `dev-preview/page.tsx`: result, kickoff-dashboard-complete 목업에 신규 필드 반영

## 설계 결정

- `KF-026`: 블록 신뢰도 레이어는 SYSTEM_BLOCKS enum(11개) × 4레벨로 표현, JSONB 저장으로 Prisma 마이그레이션 불필요 — 상세 내용은 decisions.md 참조.
- `KF-027`: 팀 협업 점수 = 멤버별 collabChecklist true 개수 평균; blockCoverage = 블록별 lead/partial/gap 분류 — 상세 내용은 decisions.md 참조.

## 미완료 항목

- Section 7-9 입력이 없는 기존 응답자는 신규 카드를 볼 수 없음. 기존 데이터 backfill 정책 미결정.
- `_calcAISupportPlan` 로직의 AI 호출 여부(룰 기반 vs Claude API 기반)가 확정되지 않은 상태로 룰 기반 구현됨. 향후 KF-020 AI Job 패턴 적용 검토 필요.
- BlockCoverageGrid UI 세부 시각화(히트맵 vs 배지 레이아웃)는 Figma 스크린샷 업데이트 이전 상태.

## Next Start

1. Section 7-9 유효성 검사 엣지 케이스 확인 — `isSectionValid` 7/8/9번 케이스 Playwright 테스트 실행.
2. Screen 6 BlockCoverageGrid 레이아웃 Figma 반영 — `tf-figma-sync`로 캡처 업데이트.
3. Screen 7 Topic Decision 구현 계속 — KF-019/KF-020/KF-024 확정 사항 기준으로 착수.
