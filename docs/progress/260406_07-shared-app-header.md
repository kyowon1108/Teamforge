# 260406_07-shared-app-header

## 작업 요약

- 공유 AppHeader 컴포넌트를 신규 생성하여 인증된 모든 페이지에 일관된 상단 네비게이션을 제공한다.
- AppHeader 높이를 CSS 변수 `--tf-app-header-height: 53px`로 관리하여 하위 요소가 정확한 offset을 계산할 수 있도록 했다.
- Dashboard, Team Create, Team Join, Survey, Dev Preview 5개 페이지에 AppHeader를 주입하고 각 페이지의 기존 헤더 블록을 제거했다.
- Survey 스티키 진행 상태바가 AppHeader 바로 아래에서 sticky되도록 `top-[var(--tf-app-header-height)]`로 수정했다.
- `/dev-preview`를 middleware PROTECTED_PATHS에 추가하여 스테이징 환경에서 미인증 접근을 차단했다.

## 구현된 기능

- `apps/web/components/layout/AppHeader.tsx` (신규) — Client Component, signOut 인터랙션 포함 공유 상단바
- `apps/web/app/globals.css` — `--tf-app-header-height: 53px` CSS 변수 추가
- `apps/web/app/dashboard/page.tsx` — AppHeader 주입, 레이아웃 재구성
- `apps/web/app/dashboard/dashboard-client.tsx` — 중복 헤더 블록 제거, signOut 로직 AppHeader로 이동
- `apps/web/app/team/create/page.tsx` — AppHeader 추가
- `apps/web/app/team/join/page.tsx` — AppHeader 추가
- `apps/web/app/team/[teamId]/survey/page.tsx` — AppHeader 추가
- `apps/web/app/team/[teamId]/survey/survey-client.tsx` — 스티키 진행 상태바 offset 수정
- `apps/web/app/dev-preview/page.tsx` — AppHeader 추가 (mock userName)
- `apps/web/middleware.ts` — `/dev-preview` PROTECTED_PATHS 추가

## 설계 결정

- `KF-012`: AppHeader 높이를 `--tf-app-header-height: 53px` CSS 변수로 관리. 하드코딩된 픽셀 값이 컴포넌트 간에 분산되지 않도록 단일 소스로 관리한다.
- `KF-013`: AppHeader는 Client Component로 유지. signOut 버튼 인터랙션이 필요하므로 Server Component로 전환하지 않는다.
- `KF-014`: `/dev-preview`는 PROTECTED_PATHS 포함 대상. Figma 캡처용이라도 미인증 접근을 허용하면 스테이징 데이터가 노출될 수 있다.

## 미완료 항목

- AppHeader에 팀 컨텍스트(현재 팀명, 팀 전환 드롭다운)가 없음. Screen 5~10 구현 시 팀 컨텍스트 표시 추가 필요.
- AppHeader 모바일 뷰(390px) 검증 미완료. Figma 캡처 전 반드시 확인 필요.

## Next Start

1. Screen 5 `/team/[teamId]/result` 개인 결과 페이지 구현 — 레이더 차트 (`recharts` 또는 `d3`) 선택 후 DB 집계 쿼리 작성
2. Screen 6 `/team/[teamId]/dashboard` 팀 대시보드 — survey 제출 상태 집계 및 실시간 업데이트 (Socket.io)
3. AppHeader 팀 컨텍스트 드롭다운 추가 검토 (Screen 5 착수 전 UX 결정 필요)
