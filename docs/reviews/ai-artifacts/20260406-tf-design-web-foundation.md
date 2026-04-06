# tf-design Review: Web Foundation & SEED Compatibility Analysis

- **Date**: 2026-04-06
- **Agent**: tf-design
- **Review Type**: pre-build (구현 전 기반 설계 검토)
- **Scope**: apps/web 전체 디자인 토큰 체계, 역할별 UI 구조, 이탈 방지 UX, 글로벌 컴포넌트 우선순위

---

## 섹션 1: 현재 디자인 토큰 분석

### 정의된 `--tf-*` 토큰 현황

`apps/web/app/globals.css`에 7개의 시맨틱 토큰이 정의되어 있다.

| 토큰 | 값 | 용도 |
|------|----|------|
| `--tf-surface-background` | `hsl(48 33% 96%)` | 페이지 배경 |
| `--tf-surface-card` | `hsl(42 100% 99%)` | 카드 배경 |
| `--tf-text-primary` | `hsl(204 22% 8%)` | 본문 텍스트 |
| `--tf-text-muted` | `hsl(208 11% 40%)` | 보조 텍스트 |
| `--tf-border-subtle` | `hsl(210 18% 87%)` | 경계선 |
| `--tf-accent-primary` | `hsl(162 62% 23%)` | 주요 액션 |
| `--tf-accent-primary-strong` | `hsl(161 60% 16%)` | hover/pressed 상태 |

### 발견된 문제점

**[ISSUE-D01] 토큰 수 부족 — 구현 불가 수준**

현재 7개 토큰으로는 14개 화면을 구현할 수 없다. 최소한 다음 카테고리의 토큰이 없다:

- 상태 색상: `--tf-status-success`, `--tf-status-warning`, `--tf-status-error`, `--tf-status-info`
- 역할 색상: `--tf-role-leader`, `--tf-role-member`, `--tf-role-observer`
- 표면 레이어: `--tf-surface-overlay`, `--tf-surface-sunken`
- 텍스트 추가: `--tf-text-inverse`, `--tf-text-on-accent`
- 액션 추가: `--tf-accent-secondary`, `--tf-accent-destructive`
- 포커스: `--tf-focus-ring`
- 비활성: `--tf-disabled-bg`, `--tf-disabled-text`

**[ISSUE-D02] Tailwind 색상 토큰 연결 누락**

`tailwind.config.ts`에 연결된 시맨틱 색상이 `background`와 `foreground` 2개뿐이다. shadcn/ui 컴포넌트가 참조하는 `primary`, `secondary`, `muted`, `destructive`, `border`, `ring`, `card` 등이 모두 누락되어, shadcn/ui를 설치하면 토큰 충돌이 발생한다.

**[ISSUE-D03] shadcn/ui 미설치**

`apps/web/package.json`에 `@radix-ui/*`, `class-variance-authority`, `clsx`, `tailwind-merge`가 없다. `components/ui/` 디렉토리는 존재하지만 비어 있다. shadcn/ui는 설치되지 않은 상태다.

**[ISSUE-D04] 다크모드 토큰 없음**

`globals.css`에 `@media (prefers-color-scheme: dark)` 블록 또는 `.dark` 클래스 토큰 오버라이드가 없다. 향후 다크모드 지원 시 전체 토큰 재정의가 필요하다. 지금 설계 시 반드시 이중 정의 구조를 고려해야 한다.

**[ISSUE-D05] raw hex 색상 발견 없음 (양호)**

현재 코드 전체에서 raw hex(`#XXXXXX`) 사용이 탐지되지 않았다. `page.tsx`가 `color-mix(in oklab, ...)` + `var(--tf-*)` 조합을 사용하고 있어 토큰 원칙을 준수하고 있다.

### SEED 디자인 시스템 정합성

SEED 디자인 시스템의 컬러 토큰 구조는 시맨틱 레이어(`semantic`)와 기반 팔레트(`primitive`) 2단계를 사용한다. 현재 `--tf-*` 구조는 시맨틱 단계만 있고 primitive 팔레트가 없다. 이는 `color-mix()` 기반 변형 시 일관성 손실 위험이 있다.

SEED 호환을 위한 권고 구조:

```
1단계 (primitive): --tf-green-{50~950}, --tf-gray-{50~950}, --tf-red-{50~950}
2단계 (semantic) : --tf-surface-*, --tf-text-*, --tf-accent-*, --tf-status-*
```

현재는 2단계만 존재하므로 1단계 primitive 팔레트를 `globals.css`에 먼저 정의하고, 시맨틱 토큰이 이를 참조하도록 재구성해야 한다.

---

## 섹션 2: 역할별 UI 설계 권고

### 2-1. 공통 원칙

세 역할은 같은 화면 URL을 공유하되, 서버 컴포넌트 또는 클라이언트 조건부 렌더링으로 역할별 UI 섹션을 분기한다. 역할 컨텍스트는 `SessionProvider`의 세션 데이터에서 공급한다.

역할별 색상 배지를 일관되게 사용해야 한다. 역할 시각화는 텍스트 배지 + 아이콘 조합으로 처리하며, 이모지 사용은 금지다.

권고 역할 색상 토큰 (구현 시 globals.css에 추가):

```css
--tf-role-leader:   hsl(162 62% 23%);   /* 팀장: accent-primary 재사용 */
--tf-role-member:   hsl(215 72% 35%);   /* 팀원: 블루 계열 */
--tf-role-observer: hsl(38 85% 35%);    /* 옵저버: 앰버 계열 */
```

### 2-2. 팀장(leader) UI 구조

**핵심 컴포넌트 목록**

| 컴포넌트 | 설명 | 필요 위치 |
|---------|------|---------|
| `ActionGate` | 팀장 단독 클릭이 필요한 최종 확인 버튼. 44px 이상. 로딩 + 성공/실패 상태 내장. | Screen 10 서명 게이트, Screen 6 브레인스톰 시작 |
| `LeaderBadge` | 팀장 신원 표시 칩. Lucide `Crown` 아이콘 + "팀장" 텍스트. | 프로필, 대시보드 헤더 |
| `DecisionCard` | AI 추천안을 팀장이 확정/거부할 수 있는 카드. 확정/거부 버튼 포함. | Screen 7 주제 카드, Screen 8 아키텍처 옵션 |
| `ApprovalBanner` | "N명이 동의를 기다리는 중" 상태 배너. sticky 위치. | Screen 10 |

**설계 원칙**

- 팀장의 결정 액션은 페이지 중앙 또는 하단 고정 CTA로 배치한다.
- 비가역적 액션(서명, 확정)은 반드시 확인 다이얼로그를 거친다.
- 팀장 전용 섹션은 시각적으로 `--tf-role-leader` 악센트 테두리로 구분한다.

### 2-3. 팀원(member) UI 구조

**핵심 컴포넌트 목록**

| 컴포넌트 | 설명 | 필요 위치 |
|---------|------|---------|
| `SurveySection` | 6섹션 설문 하나의 블록. 자동저장 인디케이터 내장. | Screen 4 |
| `ReactionBar` | AI 추천안에 찬성/반대/수정 제안 반응. | Screen 7, 8 |
| `ContributionStatus` | 팀원 자신의 기여 완료 여부 표시. Lucide `CheckCircle2`. | Screen 6 대시보드 |
| `WaitingState` | 팀장 결정을 기다리는 중립적 상태 UI. Lucide `Clock`. | Screen 10 서명 대기 |

**설계 원칙**

- 팀원 화면에서는 결정 버튼이 없거나 `disabled` 상태로 렌더링된다.
- 응답 완료된 항목에는 명확한 완료 시각 피드백(`CheckCircle2`)을 제공한다.
- AI 추천 결과를 보여줄 때 "AI 제안입니다"라는 출처 레이블을 항상 표시한다.

### 2-4. 옵저버(observer) UI 구조

**핵심 컴포넌트 목록**

| 컴포넌트 | 설명 | 필요 위치 |
|---------|------|---------|
| `ObserverBanner` | 화면 상단 고정. "읽기 전용 모드" 안내. Lucide `Eye`. | 모든 팀 화면 최상단 |
| `ReadOnlyOverlay` | 입력 폼/버튼 위를 덮는 반투명 레이어. pointer-events: none. | Screen 4, 7, 8, 10 |
| `ProgressSnapshot` | 팀 전체 진행 현황을 요약하는 카드. 팀원 응답률 포함. | Screen 6, 14 |
| `CoachingNote` | 옵저버 전용 코칭 메모 입력. 다른 역할에게는 표시 안 됨. | Screen 6, 11 |

**설계 원칙**

- 옵저버 UI는 "보이지만 건드릴 수 없다"는 명확한 신호를 준다.
- `ObserverBanner`는 sticky로 항상 노출되어 역할 혼동을 방지한다.
- 옵저버만 볼 수 있는 컨텐츠(코칭 메모, 집계 인사이트)를 별도 섹션으로 분리한다.
- `ReadOnlyOverlay`는 form element에 `disabled` 속성 추가와 병행한다 (접근성).

---

## 섹션 3: 유저 이탈 방지 UX 설계 권고

### 3-1. Screen 4 설문 자동저장 인디케이터

**이탈 위험 요소**

- 6섹션 15문항 완료에 예상 10~15분 소요
- 중간 저장 없이 브라우저 종료 시 전체 손실
- 모바일 환경에서 화면 전환 시 상태 손실 가능

**권고 설계**

```
[자동저장 인디케이터 위치]: 화면 우측 상단 고정, 툴바 영역

상태 3가지:
1. Lucide `Cloud` 아이콘 + "저장됨 3분 전" — 저장 완료 (기본)
2. Lucide `Loader2` 아이콘 (spin) + "저장 중..." — 저장 진행
3. Lucide `CloudOff` 아이콘 + "저장 실패 — 재시도" — 실패 (클릭 시 재시도)
```

저장 트리거: 섹션 이동 시 + 입력 후 2초 debounce.

브라우저 종료 시 `beforeunload` 이벤트로 미저장 데이터 경고를 표시한다. 단, 저장 완료 상태에서는 경고를 표시하지 않는다.

**권고 설문 진행률 설계**

```
[진행률 바 위치]: 화면 최상단 sticky 영역 (헤더 하단)

구성 요소:
- 선형 진행률 바: 현재 섹션 / 전체 섹션 비율 (CSS transition 0.3s)
- 섹션 스텝 인디케이터: "3 / 6 섹션 완료"
- 예상 잔여 시간: "약 5분 남음" (섹션당 평균 시간 기반 추정)
- 섹션 미리보기: 현재 섹션명 표시
```

섹션 이동은 단순 `next/prev` 버튼이 아닌, 상단 섹션 번호 탭으로도 직접 이동 가능하게 한다. 완료된 섹션은 `CheckCircle2` 아이콘으로 표시한다.

### 3-2. Screen 10 팀장 서명 게이트 UX

**이탈 위험 요소**

- 팀원들이 동의를 기다리는 동안 팀장이 자리를 비울 수 있음
- 서명 액션의 비가역성으로 인한 망설임
- 옵저버와 팀원이 "언제 팀장이 서명하나" 상태를 알 수 없음

**권고 설계: 팀장 관점**

```
[서명 게이트 레이아웃]

상단: 요약 카드 (합의된 내용 전체 미리보기, 스크롤 가능)
중간: 팀원 동의 현황 (아바타 + 이름 + Lucide `Check`/`Clock` 아이콘)
하단: "팀장으로서 위 내용을 확정합니다" 체크박스 + 확정 버튼

확정 버튼 상태:
- 기본: disabled (체크박스 미체크)
- 활성: primary 색상, Lucide `PenLine` 아이콘 포함
- 로딩: Lucide `Loader2` spin, 텍스트 "서명 중..."
- 완료: Lucide `CheckCircle2`, 텍스트 "서명 완료", 5초 후 다음 화면 이동
```

**권고 설계: 팀원/옵저버 관점**

```
[대기 화면 레이아웃]

상단: ObserverBanner 또는 "팀장의 서명을 기다리고 있습니다" WaitingState 배너
중간: 킥오프 계약서 전문 읽기 전용 뷰
하단: "나의 동의" 토글 (팀원만, 옵저버는 읽기 전용)

실시간 업데이트: 팀장 서명 완료 시 WebSocket으로 즉시 화면 전환 알림
토스트 메시지: "팀장이 킥오프 계약에 서명했습니다. 다음 단계로 이동합니다."
```

**공통 이탈 방지 요소**

- 모든 긴 폼 화면(Screen 4, 10)에서 `window.onbeforeunload` 미저장 경고를 적용한다.
- Screen 10에서 팀장이 30분 이상 비활성화 시, 팀원 화면에 "팀장이 현재 자리를 비웠습니다" 상태를 표시한다.

---

## 섹션 4: 즉시 필요한 글로벌 컴포넌트 목록

구현 시작 전 반드시 `apps/web/components/ui/`에 있어야 할 컴포넌트를 우선순위 순으로 정렬한다.

### 우선순위 1 — 토큰/설정 기반 (코드 한 줄도 못 짜기 전에 필요)

| 항목 | 유형 | 이유 |
|------|------|------|
| `globals.css` 토큰 확장 | CSS | `--tf-status-*`, `--tf-role-*`, primitive 팔레트 없으면 모든 컴포넌트 미완성 |
| `tailwind.config.ts` 전체 재작성 | 설정 | shadcn/ui 설치를 위한 `primary`, `card`, `muted` 등 16개 색상 연결 필요 |
| shadcn/ui 설치 (`@radix-ui/*`, `clsx`, `cva`, `tailwind-merge`) | 패키지 | `components/ui/` 디렉토리가 빈 상태 |
| `SessionProvider` + `ThemeProvider` 래퍼 in `layout.tsx` | 컴포넌트 | 역할 분기 불가, 전역 상태 없음 |

### 우선순위 2 — 모든 화면 공통 기반 컴포넌트

| 컴포넌트 | 파일 경로 | 의존 화면 |
|---------|---------|---------|
| `RoleBadge` | `components/ui/role-badge.tsx` | Screen 2, 6, 10, 전체 |
| `ObserverBanner` | `components/ui/observer-banner.tsx` | Screen 4, 6, 7, 8, 10, 11 |
| `AutoSaveIndicator` | `components/ui/auto-save-indicator.tsx` | Screen 4, 7 |
| `PageProgress` | `components/ui/page-progress.tsx` | Screen 4 (설문), Screen 8 |
| `LoadingSpinner` | `components/ui/loading-spinner.tsx` | 모든 API 호출 화면 |
| `ErrorBoundary` | `components/error-boundary.tsx` | 전체 레이아웃 |
| `ToastProvider` (shadcn Sonner) | `components/ui/` | 자동저장, 서명, 오류 알림 |

### 우선순위 3 — 역할 분기 레이아웃 컴포넌트

| 컴포넌트 | 파일 경로 | 역할 |
|---------|---------|------|
| `TeamLayout` | `components/layouts/team-layout.tsx` | 팀 공통 레이아웃 (네비게이션, 역할 컨텍스트) |
| `LeaderOnlySection` | `components/layouts/leader-only-section.tsx` | 팀장 전용 UI 래퍼 |
| `ReadOnlySection` | `components/layouts/read-only-section.tsx` | 옵저버 전용 읽기 전용 래퍼 |

### 우선순위 4 — 킥오프 플로우 전용 컴포넌트

| 컴포넌트 | 파일 경로 | 의존 화면 |
|---------|---------|---------|
| `ActionGate` | `components/kickoff/action-gate.tsx` | Screen 10 |
| `DecisionCard` | `components/kickoff/decision-card.tsx` | Screen 7, 8 |
| `WaitingState` | `components/kickoff/waiting-state.tsx` | Screen 10 팀원/옵저버 |
| `ReactionBar` | `components/kickoff/reaction-bar.tsx` | Screen 7, 8 |

---

## 종합 판단

### 즉시 조치 필요 항목 (구현 시작 전 반드시 완료)

1. `globals.css` — `--tf-*` 토큰 약 20개 추가 (primitive + semantic 완성)
2. `tailwind.config.ts` — shadcn/ui 호환 색상 매핑 전체 재작성
3. `apps/web/package.json` — shadcn/ui 의존성 설치
4. `apps/web/app/layout.tsx` — `SessionProvider` + `ToastProvider` 추가

### 현재 상태 평가

- raw hex 사용: 0건 (양호)
- 이모지 사용: 0건 (양호)
- `--tf-*` 토큰 구조: 방향은 올바르나 범위가 7개로 극히 부족
- shadcn/ui 준비: 미설치
- 역할 분기 구조: 전무
- 접근성 기반: aria-label, alt text 미정의 (스캐폴드 수준으로 허용 가능)

---

## 출력 블록

```
AGENT: tf-design
STATUS: done
CHANGED_FILES:
  - docs/reviews/ai-artifacts/20260406-tf-design-web-foundation.md
DESIGN_GUIDELINES:
  - globals.css에 primitive 팔레트 + 20개 시맨틱 토큰 추가 후 구현 시작
  - tailwind.config.ts를 shadcn/ui 호환 구조로 전체 재작성
  - 역할별 색상 토큰 (--tf-role-leader/member/observer) 반드시 정의
  - ObserverBanner는 모든 팀 화면 sticky 상단에 고정
  - AutoSaveIndicator는 Screen 4 우측 상단 고정, 3상태 관리
  - 팀장 서명 게이트(ActionGate)는 체크박스 + 비가역 확인 다이얼로그 구조
  - 이모지 사용 금지, Lucide React 아이콘만 사용
  - 터치 타겟 최소 44x44px (ActionGate, ReactionBar 주의)
ISSUES_FOUND:
  - [ISSUE-D01] --tf-* 토큰 7개만 정의, 구현에 필요한 20개+ 토큰 누락
  - [ISSUE-D02] tailwind.config.ts — shadcn/ui 색상 16개 미연결
  - [ISSUE-D03] shadcn/ui 미설치, components/ui/ 디렉토리 비어있음
  - [ISSUE-D04] layout.tsx에 SessionProvider/ToastProvider 없음
  - [ISSUE-D05] 역할 분기 컴포넌트 전무 (LeaderOnlySection 등)
APPROVED: conditional
  조건: ISSUE-D01~D05 해소 후 구현 시작 허용
```
