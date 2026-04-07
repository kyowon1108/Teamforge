# 260407_06 — Survey Card UI Refresh (P2+P3+P6)

## 작업 요약

- Screen 4 설문 9개 섹션 전체의 선택 옵션을 아이콘 카드 UI로 교체했다 (P2).
- 선택 시 border 색상 전환 + scale-[1.02] 마이크로인터랙션 150ms 적용했다 (P3-lite).
- Section8 협업 체크리스트는 빈 선택을 허용해 필수 입력 부담을 제거했다.
- survey-metadata.schema.ts의 draftStep max 버그(6→9)를 수정했다.
- DB/백엔드 변경 없음. JSONB answers 구조는 그대로 유지됐다.

## 구현된 기능

### contracts
- `packages/contracts/src/jsonb/survey-metadata.schema.ts` — `draftStep` max 6 → max 9 버그 수정 (9섹션 확장 이후 드래프트 저장이 7~9 스텝에서 유효성 검사 실패하던 문제)

### Section1BasicInfo
- `apps/web/components/survey/sections/Section1BasicInfo.tsx` — experienceTier + backgroundType 선택지를 아이콘 카드 2열 그리드로 교체

### Section2TechStack
- `apps/web/components/survey/sections/Section2TechStack.tsx` — 카테고리 헤더 아이콘 추가, topStrengths 최대 선택 도달 시 미선택 항목 disabled 처리

### Section3ProjectExp
- `apps/web/components/survey/sections/Section3ProjectExp.tsx` — projectCount 아이콘 카드, actualRoles 아이콘 chip, gitCollab 아이콘 카드로 전환

### Section4CollabStyle
- `apps/web/components/survey/sections/Section4CollabStyle.tsx` — workArchetype 아이콘 카드, desiredRoles 최대 선택 시 disabled 처리

### Section5Availability
- `apps/web/components/survey/sections/Section5Availability.tsx` — weeklyHours 4개 옵션 아이콘 카드로 전환

### Section6Portfolio
- `apps/web/components/survey/sections/Section6Portfolio.tsx` — 입력 필드를 카드 래퍼로 감싸고 포커스 전달 처리

### Section7Capability
- `apps/web/components/survey/sections/Section7Capability.tsx` — 블록 옵션을 2×2 타일 + 아이콘 레이아웃으로 교체

### Section8Collaboration
- `apps/web/components/survey/sections/Section8Collaboration.tsx` — 체크리스트 아이템 아이콘 추가, 빈 체크리스트(0개 선택) 유효성 통과 허용

### Section9AIProfile
- `apps/web/components/survey/sections/Section9AIProfile.tsx` — 전체 선택 UI를 아이콘 카드로 교체

### survey-client
- `apps/web/app/team/[teamId]/survey/survey-client.tsx` — SECTIONS title 동기화, Section8 validation 룰 업데이트 (required → optional)

## 설계 결정

- `KF-028`: Survey 카드 UI 표준 — 아이콘 카드 2열 그리드 + border 2px transparent/brand 패턴 + 150ms ease-out scale-[1.02] 마이크로인터랙션 표준 확정

상세:
- 선택 카드 기본 상태: `border: 2px solid transparent` + `box-shadow: 0 0 0 1px var(--tf-stroke-neutral)` (레이아웃 점프 방지)
- 선택 상태: `border: 2px solid var(--tf-stroke-brand)`, box-shadow 제거
- 전환: `transition: all 150ms ease-out` + `scale-[1.02]`
- 컬러 변경 없음 (P4 컬러 팔레트 리프레시는 별도 세션)
- Section8 협업 체크리스트는 자발적 항목이므로 빈 제출 허용

## 미완료 항목

- P4 (선택 카드 배경 컬러 팔레트 리프레시) — 이번 세션 범위 제외, 별도 세션 필요
- Figma 스크린샷 업데이트 미실시 — Screen 4 UI가 변경됐으므로 다음 figmaSync 세션에서 캡처 필요
- Section2의 langauge/framework 태그 멀티셀렉트는 아이콘 카드 패턴 적용 제외 (자유 텍스트 특성)

## Next Start

1. `figmaSync=true` 플래그로 Screen 4 Figma 스크린샷 업데이트 (`40:2` 페이지)
2. P4 선택 카드 배경 컬러 적용 — `var(--tf-bg-brand-subtle)` 계열 선택 상태 배경색
3. Screen 8a 구조 선택 페이지 구현 착수 (KF-019, KF-020 순서)
