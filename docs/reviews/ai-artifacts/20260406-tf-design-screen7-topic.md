# tf-design Review: Screen 7 — 킥오프 주제 결정 (Topic Decision)

- **Date**: 2026-04-06
- **Agent**: tf-design
- **Review Type**: pre-build (구현 전 설계 검토)
- **Scope**: `/team/[teamId]/topic` 전체 컴포넌트 트리, 역할별 UX, 디자인 시스템 일관성
- **Input**: Codex 설계안 (AI 토픽 카드 3~5개, RoleIntentBanner, StickyFooterActionGate 4단계)
- **Figma**: vvmx5ls8xftcqB7Cvlse3Q (노드 조회 실패 — Screen 7 프레임 미생성 확인됨)

---

## 1. 디자인 시스템 일관성 분석

### 1-1. 현재 구현 코드에서 확인된 패턴

기존 Screen 4~6 구현체(`survey-client.tsx`, `kickoff-dashboard-client.tsx`, `result-client.tsx`)에서 다음 패턴이 확립되어 있다.

**카드 컨테이너 공통 패턴**
```
rounded-xl p-4
background: var(--tf-bg-layer-default)
border: 1px solid var(--tf-stroke-neutral)
```

**강조 카드 (결과, 경고) 패턴**
```
border: 2px solid var(--tf-fg-positive)   // 강점 카드
border: 2px solid var(--tf-fg-warning)    // 성장 카드
border: 2px solid var(--tf-bg-brand-solid) // 추천 역할
```

**배지 패턴 (인라인 상태 표시)**
```
inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
background: color-mix(in srgb, var(--tf-fg-positive) 12%, transparent)
color: var(--tf-fg-positive)
```

**페이지 레이아웃 패턴**
```
min-h-screen pb-8
background: var(--tf-bg-layer-alt)
max-w-2xl mx-auto px-4 py-6 space-y-5   // 대부분의 페이지
max-w-[640px]                            // survey-client (좁은 단일 폼)
```

**Sticky Footer 패턴 (survey-client에서 확립)**
```
fixed bottom-0 left-0 right-0
background: var(--tf-bg-layer-default)
border-top: 1px solid var(--tf-stroke-neutral)
paddingBottom: calc(12px + env(safe-area-inset-bottom, 0px))  // safe area 처리
```

**역할 뱃지 토큰**
```
--tf-role-leader:   #1B873B  (초록)
--tf-role-member:   #4E8EF7  (브랜드 블루)
--tf-role-observer: #6B6B6B  (뮤트 회색)
```

### 1-2. Screen 7에서 재사용 가능한 기존 컴포넌트

| 컴포넌트 | 위치 | Screen 7 적용 대상 |
|---------|------|-------------------|
| `MemberAvatar` (kickoff-dashboard) | `kickoff-dashboard-client.tsx` | TeamAvatarCluster 구성 |
| `SubmitStatusIcon` 패턴 | `kickoff-dashboard-client.tsx` | 반응 상태 아이콘 |
| 강점/성장 배지 패턴 | `result-client.tsx` | TopicTags 렌더링 |
| Sticky Footer + safe area 패턴 | `survey-client.tsx` | StickyFooterActionGate |
| Progress bar 패턴 | `survey-client.tsx` | AI 생성 로딩 진행 표시 |
| `color-mix` 12% 반투명 배경 | 모든 파일 | 선택 카드 강조 배경 |

---

## 2. 검토 항목별 가이드라인

### 2-1. DecisionCard 시각 계층 및 상태 구분

**권장 시각 계층 (위 → 아래)**

```
[TopicTitle]       text-lg font-bold  color: var(--tf-fg-default)
[TopicRationale]   text-sm           color: var(--tf-fg-muted)       mt-1
[TopicTags]        badge × N          variant: 12% mix               mt-2
[구분선]           border-top: 1px   color: var(--tf-stroke-neutral)  mt-3
[ReactionSummaryBar / 역할별 액션]                                     pt-3
```

**선택 상태 시각 구분 (Leader 기준)**

기존 `result-client.tsx`의 강조 카드 패턴을 확장 적용한다.

- 미선택 카드: `border: 1px solid var(--tf-stroke-neutral)` (현행 기본 카드)
- 선택된 카드: `border: 2px solid var(--tf-bg-brand-solid)` + `background: color-mix(in srgb, var(--tf-bg-brand-solid) 6%, var(--tf-bg-layer-default))` — `result-client`의 "추천 역할" 카드와 동일 패턴
- hover: `border: 1.5px solid var(--tf-stroke-brand)` (선택 전 hover 힌트)

**반응 상태 구분 (Member 기준)**

반응(👍/🤔)을 누른 카드에는 테두리 변경이 아닌 ReactionBar 배경 강조를 사용한다.

```
반응 완료된 카드 내 반응 버튼:
background: color-mix(in srgb, var(--tf-fg-positive) 12%, transparent)
color: var(--tf-fg-positive)
border-radius: 8px
```

이는 선택(단일)과 반응(다중 가능)을 시각적으로 명확히 분리하는 목적이다.

**MyReactionBadge 위치**

카드 우상단 절대 위치(`absolute top-3 right-3`)는 모바일에서 카드 텍스트와 겹칠 수 있다. **하단 ReactionBar 내부에 인라인 배치를 권장한다.** 반응 버튼 옆에 "내가 반응함" 텍스트를 작은 배지로 붙이는 것이 맥락상 자연스럽다.

```
// 권장 배치
[ReactionBar]
  [ThumbsUp 버튼] [HelpCircle 버튼] ← 미반응 시
  [ThumbsUp 버튼 (강조)] "내 반응" 배지 ← 반응 후
```

---

### 2-2. RoleIntentBanner 디자인

**색상 구분 결정**

globals.css에 `--tf-role-*` 토큰이 이미 정의되어 있으므로 이를 직접 활용한다.

| 역할 | 배경 | 텍스트 | 아이콘 |
|------|------|-------|-------|
| leader | `color-mix(in srgb, var(--tf-role-leader) 10%, var(--tf-bg-layer-default))` | `var(--tf-role-leader)` | `Crown` (Lucide) |
| member | `color-mix(in srgb, var(--tf-role-member) 10%, var(--tf-bg-layer-default))` | `var(--tf-role-member)` | `Users` (Lucide) |
| observer | `color-mix(in srgb, var(--tf-role-observer) 10%, var(--tf-bg-layer-default))` | `var(--tf-role-observer)` | `Eye` (Lucide) |

이 패턴은 `kickoff-dashboard-client.tsx`의 역할 배지 패턴과 동일 계열로 일관성을 유지한다.

**배너 위치**

헤더 바로 아래 인라인 배치(비고정)를 권장한다. 이유:

1. Sticky 배너가 둘 이상 겹칠 경우(AppHeader + RoleIntentBanner + StickyFooter) 모바일에서 콘텐츠 표시 영역이 과도하게 줄어든다.
2. 배너는 페이지 최초 진입 시 역할을 인지시키는 1회성 목적이므로 고정 필요 없음.
3. observer와 리더가 같은 URL을 공유할 때, 스크롤 후 배너가 사라져도 컨텍스트는 이미 인지된 상태다.

**배너 구조**
```
rounded-lg px-4 py-3
├── [아이콘] [역할명 bold] — 예: "리더로 참여 중"
└── [안내 텍스트 text-sm color: muted]
```

---

### 2-3. StickyFooterActionGate

**모바일 카드 가림 문제 해결**

survey-client.tsx에서 확립된 `pb-28` 패턴을 그대로 적용한다.

```
// 콘텐츠 스크롤 영역
<div className="max-w-2xl mx-auto px-4 py-6 pb-28 space-y-5">

// StickyFooter
<div
  className="fixed bottom-0 left-0 right-0 border-t"
  style={{
    background: 'var(--tf-bg-layer-default)',
    borderColor: 'var(--tf-stroke-neutral)',
    paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
  }}
>
```

`pb-28`은 `112px` = AppHeader(53px) + StickyFooter 예상 높이(~60px) + 여유. 실제 푸터 높이에 따라 `pb-[70px]` 수준으로 조정한다.

**4단계 상태 전환 — 텍스트 + 스타일 명세**

| 단계 | 버튼 상태 | 버튼 텍스트 | 서브텍스트 |
|------|---------|------------|----------|
| 1 미선택 | `disabled` + 불투명도 0.45 | "주제를 선택해 주세요" | — |
| 2 선택 + 반응 0건 | `enabled` + 경고 스타일 | "주제 확정하기" | "아직 팀 반응 0건 · 선택 가능" |
| 3 선택 + 일부 반응 | `enabled` + 기본 스타일 | "주제 확정하기" | "반응 N건 · 👍 N · 🤔 N" |
| 4 전원 반응 완료 | `enabled` + ReadyBadge | "주제 확정하기" | "모든 팀원이 반응했어요" (positive 색) |

단계 2의 "선택 가능" 경고 스타일:
```
background: var(--tf-bg-layer-default)
color: var(--tf-fg-warning)
border: 1.5px solid var(--tf-fg-warning)
```

단계 3~4 활성 스타일 (survey-client와 동일):
```
background: var(--tf-bg-brand-solid)
color: var(--tf-fg-inverse)
```

**애니메이션**

단계 전환 시 `transition-all duration-200`을 적용한다. 즉각 전환이 아닌 부드러운 전환이 적합한 이유는 4단계가 실시간 polling 결과로 갱신되는 구조이기 때문에, 갑작스러운 버튼 변화가 사용자를 혼란스럽게 할 수 있다. 단, 텍스트 변경은 즉각 반영(fade 없음)으로 해서 현재 상태를 명확히 전달한다.

---

### 2-4. AI 로딩 UX (TopicLoadingState)

**SkeletonCard 레이아웃**

실제 DecisionCard와 동일한 높이/구조를 유지해야 레이아웃 시프트(CLS)가 발생하지 않는다. 단순 회색 블록보다 카드 구조를 모방한 스켈레톤을 권장한다.

```
// 각 스켈레톤 카드 구조
rounded-xl p-4 border border-[var(--tf-stroke-neutral)]
├── div.h-5.w-3/4.rounded   ← 제목 스켈레톤 (animate-pulse)
├── div.h-4.w-full.mt-2     ← 설명 1줄
├── div.h-4.w-5/6.mt-1      ← 설명 2줄
├── div.flex.gap-2.mt-3     ← 태그 스켈레톤
│   ├── div.h-5.w-12.rounded-full
│   └── div.h-5.w-16.rounded-full
└── div.h-8.w-full.mt-4     ← 반응 영역 스켈레톤
```

스켈레톤 배경색: `color-mix(in srgb, var(--tf-stroke-neutral) 60%, var(--tf-bg-layer-default))`

**TeamAvatarCluster**

`kickoff-dashboard-client.tsx`의 `MemberAvatar` 컴포넌트를 그대로 재사용한다. 오버랩 배치:

```
// 클러스터: 아바타 3~5개 겹치기
<div className="flex items-center">
  {members.map((m, i) => (
    <div key={m.userId} style={{ marginLeft: i > 0 ? '-8px' : 0, zIndex: members.length - i }}>
      <MemberAvatar member={m} />
    </div>
  ))}
</div>
<span className="ml-3 text-sm" style={{ color: 'var(--tf-fg-muted)' }}>
  주제를 분석하고 있어요...
</span>
```

**"10초마다 자동 업데이트" 힌트**

카드 영역 최하단 또는 로딩 스피너 아래에 작은 텍스트로 배치한다.

```
text-xs color: var(--tf-fg-subtle)  // A4A4A4 — 가장 약한 텍스트
"자동으로 업데이트됩니다"
```

위치는 TopicGenerationSection 내부 하단, 카드 스택 아래가 적합하다. 헤더나 배너 근처에 두면 주요 액션과 시각적으로 경쟁한다.

**15초 이후 ManualFallbackPanel**

15초가 경과해도 카드가 생성되지 않을 경우 수동 입력 유도를 노출한다. 스타일:

```
rounded-lg px-4 py-3 mt-4
background: var(--tf-bg-warning)  // #FFF8E1 옅은 경고 배경
border: 1px solid var(--tf-fg-warning)
├── [AlertCircle icon] "AI 응답이 지연되고 있어요"  text-sm font-medium color: warning
└── [직접 입력하기] 버튼 (outline 스타일 → ManualTopicAccordion 열기)
```

---

### 2-5. 모바일(390px) 레이아웃

**카드 세로 스크롤 체크리스트**

- `pb-[70px]` 또는 `pb-28` 적용 (StickyFooter 높이 + 16px 여유)
- 카드 내 반응 버튼: `min-h-[44px] min-w-[44px]` 강제 — WCAG 터치 타겟 기준
- TopicTags: 줄바꿈(`flex-wrap`) 허용 — 태그 텍스트가 길 경우 모바일에서 잘리는 현상 방지
- ManualTopicAccordion: `Accordion` (shadcn/ui) 컴포넌트 그대로 사용 — 모바일 터치 영역 자동 보장

**StickyFooter 높이 기준**

```
mobile 기준 min-h:
  서브텍스트 없는 경우: 60px (버튼 44px + 상하 padding 8px)
  서브텍스트 있는 경우: 76px (버튼 44px + 텍스트 16px + padding)
  → pb-[80px] 를 콘텐츠에 적용하면 안전
```

**PhaseLockBanner (확정 후)**

확정 이후에는 StickyFooter가 사라지므로 `pb-8`로 되돌린다. 조건부 padding 처리가 필요하다.

```
<div className={cn(
  'max-w-2xl mx-auto px-4 py-6 space-y-5',
  isLocked ? 'pb-8' : 'pb-[80px]'
)}>
```

---

### 2-6. 접근성 (a11y) 요구사항

| 요소 | 요구사항 | 참고 |
|------|---------|------|
| DecisionCard (radio 선택) | `role="radio"` + `aria-checked` + `aria-label={topicTitle}` | leader만 선택 가능 |
| ReactionBar 버튼 | `aria-label="긍정 반응"` / `aria-label="재고 필요"` | member만 인터랙션 |
| ReadOnlyReactionSummary | `role="status"` — 실시간 업데이트되므로 | observer/lock 상태 |
| SkeletonCard | `aria-busy="true"` + `aria-label="주제 생성 중"` | 로딩 상태 알림 |
| StickyFooter 버튼 | `aria-disabled` (disabled 시 포커스 유지 권장) | 스크린리더 상태 전달 |
| PhaseLockBanner | `role="alert"` | 상태 변경 알림 |
| ConfirmTopicDialog | `<dialog>` 또는 shadcn/ui `Dialog` — 포커스 트랩 필수 | 확정 모달 |

**WCAG AA 대비 확인**

현재 토큰 기준:
- `--tf-fg-default` (#212124) on `--tf-bg-layer-default` (#ffffff) → 대비 ~15:1 (통과)
- `--tf-fg-muted` (#6B6B6B) on `--tf-bg-layer-default` (#ffffff) → 대비 ~5.7:1 (통과)
- `--tf-fg-warning` (#F9A825) on `--tf-bg-warning` (#FFF8E1) → 대비 ~2.8:1 (경고 — 텍스트에 사용 시 배경을 흰색으로 교체)

**경고 항목**: `--tf-fg-warning`을 `--tf-bg-warning` 위에 텍스트로 사용하지 말 것. `--tf-bg-layer-default`(흰 배경) 위에 사용하면 대비 ~4.5:1 경계선에 근접하므로 `font-medium` 이상으로 사용한다.

---

## 3. 컴포넌트 계층 최종 권고

Codex 설계안은 전반적으로 적절하다. 다음 수정 사항을 반영한다.

### 수정 권고 (MUST)

1. **MyReactionBadge 위치 변경**: 우상단 절대 위치 → ReactionBar 인라인 배치
2. **반응 버튼 터치 타겟**: `min-h-[44px]` 명시 — 현재 설계안에 수치가 없음
3. **StickyFooter safe area**: `env(safe-area-inset-bottom)` 반드시 적용 (survey-client 패턴 준수)
4. **PhaseLockBanner 조건부 padding**: 확정 후 `pb-[80px]` → `pb-8` 전환 처리
5. **ManualFallbackPanel 스타일**: 경고 배경(`--tf-bg-warning`) + 경고 테두리(`--tf-fg-warning`) — raw hex 금지 재확인

### 수정 권고 (SHOULD)

6. **SkeletonCard 구조**: 실제 카드와 동일 높이 유지 (CLS 방지)
7. **단계 2 ActionGate 색상**: warning 계열 outline 버튼으로 시각적 경고 전달
8. **ObserverBanner**: 별도 컴포넌트보다 RoleIntentBanner의 observer 상태로 통합 가능 — 컴포넌트 수 감소

### 유지 확정 (OK)

- AI 토픽 카드 3~5개 직행 구조 (멀티턴 채팅 제거) — 정보 밀도와 결정 속도 균형
- 10초 polling + 낙관적 업데이트 — 서버 부하와 실시간성 균형
- ManualTopicAccordion 하단 배치 — 주 흐름(AI 토픽)을 방해하지 않음
- ConfirmTopicDialog — 되돌릴 수 없는 단일 확정 액션에 모달 적합
- TeamSignalSummary leader 전용 — 의사결정자에게만 집계 정보 노출

---

## 4. 토큰 사용 매핑 (Screen 7 전용)

| UI 요소 | 사용 토큰 | 비고 |
|--------|---------|------|
| 페이지 배경 | `--tf-bg-layer-alt` | 전 화면 일관 |
| 카드 배경 | `--tf-bg-layer-default` | 전 화면 일관 |
| 카드 기본 테두리 | `--tf-stroke-neutral` | |
| 선택된 카드 테두리 | `--tf-bg-brand-solid` | result-client 추천역할 패턴 |
| 선택된 카드 배경 tint | `color-mix(in srgb, var(--tf-bg-brand-solid) 6%, var(--tf-bg-layer-default))` | |
| 리더 배너 배경 | `color-mix(in srgb, var(--tf-role-leader) 10%, var(--tf-bg-layer-default))` | `--tf-role-leader` 활용 |
| 멤버 배너 배경 | `color-mix(in srgb, var(--tf-role-member) 10%, var(--tf-bg-layer-default))` | `--tf-role-member` 활용 |
| 옵저버 배너 배경 | `color-mix(in srgb, var(--tf-role-observer) 10%, var(--tf-bg-layer-default))` | `--tf-role-observer` 활용 |
| TopicTags 배경 | `color-mix(in srgb, var(--tf-fg-muted) 12%, transparent)` | 중립 배지 |
| 긍정 반응(👍) 활성 | `color-mix(in srgb, var(--tf-fg-positive) 12%, transparent)` | result-client 강점 배지 패턴 |
| 재고(🤔) 반응 활성 | `color-mix(in srgb, var(--tf-fg-warning) 12%, transparent)` | |
| ActionGate 비활성 버튼 | `--tf-stroke-neutral` (bg) + `--tf-fg-disabled` (text) | survey-client 패턴 |
| ActionGate 경고 버튼(2단계) | `--tf-bg-layer-default` (bg) + `--tf-fg-warning` (border+text) | |
| ActionGate 활성 버튼(3~4단계) | `--tf-bg-brand-solid` (bg) + `--tf-fg-inverse` (text) | |
| ReadyBadge (4단계) | `--tf-fg-positive` | |
| 로딩 스피너 | `--tf-bg-brand-solid` | `Loader2` Lucide icon |
| PhaseLockBanner | `--tf-stroke-neutral` (border) + `--tf-fg-muted` (text) | 잠금 상태는 조용하게 |
| ManualFallbackPanel | `--tf-bg-warning` (bg) + `--tf-fg-warning` (border) | |
| SkeletonCard | `color-mix(in srgb, var(--tf-stroke-neutral) 60%, var(--tf-bg-layer-default))` | |

---

## 5. 아이콘 목록 (Lucide React 전용)

| 컴포넌트 | 아이콘 | 크기 |
|---------|-------|------|
| RoleIntentBanner — leader | `Crown` | w-4 h-4 |
| RoleIntentBanner — member | `Users` | w-4 h-4 |
| RoleIntentBanner — observer | `Eye` | w-4 h-4 |
| ObserverBanner | `EyeOff` | w-4 h-4 |
| PhaseLockBanner | `Lock` | w-4 h-4 |
| ReactionBar — 긍정 | `ThumbsUp` | w-5 h-5 |
| ReactionBar — 재고 | `HelpCircle` | w-5 h-5 |
| TopicLoadingState | `Loader2` (animate-spin) | w-5 h-5 |
| ManualFallbackPanel | `AlertCircle` | w-4 h-4 |
| ActionGate — 활성 | `Check` | w-4 h-4 |
| ConfirmTopicDialog — 확정 | `CheckCircle2` | w-5 h-5 |
| TeamSignalSummary | `BarChart2` | w-4 h-4 |

**금지**: 이모지(👍 🤔 등)를 아이콘 자리에 사용하지 않는다. 단, ReactionSummaryBar에서 텍스트 레이블 내 집계 표시 목적으로 단독 사용(`"👍 3건"`)은 허용 — 이는 아이콘 역할이 아닌 데이터 레이블이다.

---

## 6. Figma 상태

현재 Figma 파일(`vvmx5ls8xftcqB7Cvlse3Q`)에 Screen 7 프레임이 존재하지 않는다. 구현 완료 후 `tf-figma-sync` 에이전트로 desktop(1440px) + mobile(390px) 캡처를 Figma에 업데이트해야 한다.

---

## 7. 블로커 및 이슈 요약

### BLOCKED 항목 없음

raw hex 사용, 이모지 아이콘, critical 접근성 위반 없음 — 구현 진행 가능.

### ISSUE 목록

| ID | 우선순위 | 항목 | 권고 |
|----|---------|------|------|
| D07-01 | MUST | MyReactionBadge 절대 위치 → 인라인 변경 | ReactionBar 내부 배치 |
| D07-02 | MUST | 반응 버튼 터치 타겟 미명시 | `min-h-[44px] min-w-[44px]` 명시 |
| D07-03 | MUST | safe-area-inset 처리 | survey-client 패턴 그대로 복사 |
| D07-04 | MUST | PhaseLockBanner 조건부 padding | 확정 후 `pb-8` 복원 |
| D07-05 | SHOULD | SkeletonCard CLS 방지 | 실제 카드 구조 모방 |
| D07-06 | SHOULD | 단계 2 ActionGate warning 스타일 | outline warning 버튼 |
| D07-07 | SHOULD | ObserverBanner + RoleIntentBanner 통합 검토 | 컴포넌트 수 감소 |
| D07-08 | INFO | `--tf-fg-warning` on `--tf-bg-warning` 대비 부족 | 흰 배경 위에서만 사용 |

---

## 검토 결론

APPROVED: conditional

조건: MUST 항목 4건(D07-01 ~ D07-04)을 구현 시 반영할 것. 구현 완료 후 post-build 검토에서 실제 컴포넌트 대상으로 토큰 사용, 터치 타겟, 접근성 재검증 수행.
