# TeamForge — System Design Specification (Final)

> Slack/GitHub/Notion을 **대체하지 않고**, 그 위에서 팀의 결정 · 회의 · 변경 · 진행 상태를 묶는 **control plane**. 팀 프로젝트의 전체 생명주기를 한 곳에서 운영하는 웹 서비스.

**Product identity:** TeamForge는 "매일 전원이 들어오는 협업툴"이 아니라, **회의 · 변경 · 리스크가 생길 때 반드시 돌아오는 운영 시스템**이다. DAU 싸움이 아니라 **주간 운영 관련성 싸움**에서 이기는 제품.

**Target segment:** 대학 캡스톤, 부트캠프, 코디세이AI올인원 팀 프로젝트, 액셀러레이터형 팀 프로젝트.

**Why this positioning works:** 협업 도구 시장은 "하나의 툴이 모든 걸 먹는 시장"이 아니라 "역할이 다른 툴을 묶어 쓰는 스택 시장"이다. Atlassian 조사에 따르면 팀이 시간의 25%를 답 찾기에 쓰고, Asana는 업무 시간의 60%가 work about work라고 본다. 새 제품이 이기려면 **이미 쓰는 도구 위에서 결정과 운영을 묶는 상위 레이어**여야 한다.

---

## 0. Design philosophy

### 0.1 Toss UX 원칙

| 원칙 | 설명 | 적용 지점 |
|------|------|-----------|
| 1 thing per 1 page | 하나의 화면에 하나의 명확한 목표 | 설문 6단계, 스택 선택 순차 진행 |
| Minimum Input | 꼭 필요한 정보만 요구 | 소셜 로그인만, 선택 항목 최소화 |
| Clear CTA | 다음 단계 버튼이 명확하고 즉시 누를 수 있게 | 하단 고정 Primary 버튼 |
| Minimum Policy | '알아야 할 것'을 없앰 | 약관 요약, 인라인 설명 |
| Casual Concept | 어려운 개념을 친숙하게 | Git Level → "팀플 기여" 등 |

### 0.2 UX 원칙

| 원칙 | 설명 | 적용 지점 |
|------|------|-----------|
| Progressive Disclosure | 현재 필요한 것만 노출 | 설문 6단계, 스택 선택 순차 진행 |
| Time-to-First-Value < 15min | 가입 후 15분 내 Aha Moment | 팀장: 스킬 차트, 팀원: 개인 결과 |
| Lock-in by Value Accumulation | 데이터가 쌓일수록 떠나기 어려움 | 회의록 히스토리, ADR 축적, 방향 추적 기록 |

### 0.3 이탈 방지 전략

| 이탈 지점 | 해결책 |
|-----------|--------|
| 가입 직후 | 역할 선택 → 즉시 다음 행동 제시 |
| 설문 도중 | 6섹션 15문항 / 프로그레스 바 / 자동 저장 |
| 팀원 대기 중 | 실시간 알림 + 6자리 초대 코드 (모바일 대응) |
| 스택 선택 | AI가 3개로 좁혀 추천 + 팀 매치율 % |
| 설정 완료 후 | 회의록 허브 + 방향 추적 + 변경 관리 |
| 프로젝트 중반 | 주간 AI 요약 + drift alert + 자동 안건 생성 |

**아이콘:** Lucide React. 이모지 사용 금지. 기능적 의미 전달에만 사용.

---

## 1. Design system tokens + Component architecture

### 1.0 Architecture overview

| 레이어 | 시스템 | 담당 |
|--------|--------|------|
| Color | SEED Design (Carrot 제외) | Gray / Blue / Green / Yellow / Red 팔레트 + 역할 기반 시맨틱 토큰 |
| Typography / Spacing / Radius | SEED Design | 폰트 스케일, 스페이싱, 라디우스 토큰 |
| Components | **shadcn/ui** (Radix + Tailwind) | copy-paste 방식. 코드 소유. SEED 토큰으로 커스텀. |
| Extra components | TanStack Table, Recharts, Vaul | 데이터 테이블, 차트, Bottom Sheet/Drawer |
| UX 패턴 | Toss | 1-thing-per-page, Minimum Input, Clear CTA |

TeamForge는 White 테마를 기본으로 한다. 다크 모드는 향후 버전에서 고려.

### 1.1 SEED Color System (Carrot 제외)

SEED의 역할 기반 색상 시스템(Property-Role-Variant-State)을 적용. Carrot(당근 브랜드)는 제외하고 Blue를 Primary로 사용.

**Property 3가지:** Background(bg), Foreground(fg), Stroke

**Role-based semantic tokens:**
```css
/* globals.css — SEED role-based color tokens */
:root {
  /* Background */
  --tf-bg-layer-default:    #ffffff;
  --tf-bg-layer-alt:        #f7f8fa;
  --tf-bg-layer-floating:   #ffffff;
  --tf-bg-overlay:          rgba(0, 0, 0, 0.5);

  /* Background — Semantic */
  --tf-bg-brand-solid:      #4E8EF7;   /* Blue 500 */
  --tf-bg-positive:         #E8F5E9;   /* Green light */
  --tf-bg-negative:         #FFEBEE;   /* Red light */
  --tf-bg-warning:          #FFF8E1;   /* Yellow light */
  --tf-bg-info:             #E3F2FD;   /* Blue light */

  /* Foreground (Text / Icon) */
  --tf-fg-default:          #212124;   /* Gray 1000 */
  --tf-fg-muted:            #6B6B6B;   /* Gray 600 */
  --tf-fg-subtle:           #A4A4A4;   /* Gray 400 */
  --tf-fg-disabled:         #C4C4C4;   /* Gray 300 */
  --tf-fg-inverse:          #ffffff;
  --tf-fg-brand:            #4E8EF7;   /* Blue 500 — Primary interactive */
  --tf-fg-positive:         #1B873B;   /* Green 600 */
  --tf-fg-negative:         #D32F2F;   /* Red 600 */
  --tf-fg-warning:          #F9A825;   /* Yellow 700 */
  --tf-fg-info:             #1565C0;   /* Blue 700 */

  /* Stroke (Border) */
  --tf-stroke-neutral:      #E8E8E8;   /* Gray 200 */
  --tf-stroke-neutral-muted:#F0F0F0;   /* Gray 100 */
  --tf-stroke-brand:        #4E8EF7;   /* Blue 500 */
  --tf-stroke-positive:     #1B873B;
  --tf-stroke-negative:     #D32F2F;
  --tf-stroke-focus:        #4E8EF7;   /* Blue 500, 2px ring */
}
```

**SEED 팔레트 (참조용, 직접 사용 지양):**

| Color | 100 | 300 | 500 | 700 | 900 |
|-------|-----|-----|-----|-----|-----|
| Gray | #F7F8FA | #D1D3D8 | #8B8B8B | #4E4E4E | #212124 |
| Blue | #E3F2FD | #90CAF9 | #4E8EF7 | #1565C0 | #0D47A1 |
| Green | #E8F5E9 | #81C784 | #4CAF50 | #1B873B | #1B5E20 |
| Yellow | #FFF8E1 | #FFE082 | #FFC107 | #F9A825 | #F57F17 |
| Red | #FFEBEE | #EF9A9A | #EF5350 | #D32F2F | #B71C1C |

> **Anti-pattern:** `#4E8EF7` 같은 raw hex를 직접 쓰지 않는다. 반드시 `var(--tf-*)` 시맨틱 토큰 사용.

**shadcn/ui CSS 변수 매핑:**
```css
/* shadcn의 기본 CSS 변수를 SEED 토큰으로 오버라이드 */
:root {
  --background:    0 0% 100%;          /* --tf-bg-layer-default */
  --foreground:    0 0% 13%;           /* --tf-fg-default */
  --primary:       217 90% 64%;        /* --tf-bg-brand-solid (Blue 500) */
  --primary-foreground: 0 0% 100%;     /* --tf-fg-inverse */
  --secondary:     220 9% 97%;         /* --tf-bg-layer-alt */
  --muted:         220 9% 97%;
  --muted-foreground: 0 0% 42%;        /* --tf-fg-muted */
  --border:        0 0% 91%;           /* --tf-stroke-neutral */
  --ring:          217 90% 64%;        /* --tf-stroke-focus */
  --destructive:   0 72% 51%;          /* --tf-fg-negative */
  --radius:        0.5rem;             /* SEED $radius.r2 = 8px */
}
```

### 1.2 SEED Typography Tokens

폰트: Pretendard (한국어 최적화) + 시스템 폴백.

```css
font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo',
  'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif;
```

| 역할 | SEED 토큰 | 값 | 적용 위치 |
|------|-----------|-----|-----------|
| 라벨·캡션 | `$font-size.t2` | 12px | 태그, 메타 텍스트 |
| 보조 텍스트 | `$font-size.t3` | 13px | 힌트, helper |
| 본문 | `$font-size.t4` | 14px | 기본 본문 |
| 강조 본문 | `$font-size.t5` | 16px | 리스트 타이틀 |
| 서브 헤딩 | `$font-size.t6` | 18px | 섹션 제목 |
| 헤딩 | `$font-size.t7` | 20px | 페이지 제목 |
| 대형 헤딩 | `$font-size.t9` | 24px | 대시보드 수치 |
| 화면 제목 | `$font-size.t10` | 26px | 온보딩, 빈 상태 |

줄 높이: `$line-height.tN` 페어링. 폰트 두께: Regular(400), Medium(500), Bold(700).

**반응형 Typography Scale:**

| 역할 | 데스크톱 | 모바일 |
|------|---------|--------|
| 화면 제목 | t10 (26px) | t9 (24px) |
| 페이지 제목 | t7 (20px) | t6 (18px) |
| 섹션 제목 | t6 (18px) | t5 (16px) |
| 본문 | t4 (14px) | t4 (14px) |
| 라벨 | t2 (12px) | t2 (12px) |

### 1.3 SEED Spacing Tokens

| SEED 토큰 | 값 | 용도 |
|-----------|-----|------|
| `$dimension.x1` | 4px | 인라인 아이콘 간격 |
| `$dimension.x2` | 8px | 컴포넌트 내부 패딩 |
| `$dimension.x3` | 12px | 컴포넌트 기본 간격 |
| `$dimension.x4` | 16px | 글로벌 거터, 섹션 패딩 |
| `$dimension.x5` | 20px | nav-to-title |
| `$dimension.x6` | 24px | 카드 내부 패딩 |
| `$dimension.x8` | 32px | 섹션 간 간격 |
| `$dimension.x10` | 40px | 페이지 상단 여백 |
| `$dimension.x14` | 56px | 화면 하단 safe padding |
| `$dimension.x16` | 64px | 히어로 섹션 여백 |

### 1.4 SEED Radius Tokens

| 역할 | SEED 토큰 | 값 | 적용 |
|------|-----------|-----|------|
| 소형 | `$radius.r1` | 4px | 뱃지, 태그 |
| 기본 | `$radius.r2` | 8px | 입력 필드, 칩, shadcn default |
| 카드 | `$radius.r3` | 12px | 카드, 패널 |
| 모달 | `$radius.r4` | 16px | 모달, Bottom Sheet |
| 원형 | `$radius.full` | 9999px | 아바타, 아이콘 버튼 |

### 1.5 shadcn/ui Component 매핑

**설치:** `npx shadcn@latest init` → SEED 토큰으로 `globals.css` 오버라이드.

| TeamForge 기능 | shadcn 컴포넌트 | 비고 |
|---------------|----------------|------|
| CTA 버튼 | `Button` | variant: default, outline, ghost, destructive |
| 폼 입력 (설문) | `Input`, `Select`, `Slider`, `Checkbox`, `RadioGroup` | React Hook Form 연동 |
| 다이얼로그 | `Dialog`, `AlertDialog` | 확인 모달, 경고 |
| 모바일 시트 | `Drawer` (Vaul) | Bottom Sheet 대체 |
| 탭 | `Tabs` | 네비게이션, 화면 전환 |
| 프로그레스 | `Progress` | 설문 진행 바 |
| 드롭다운 | `DropdownMenu` | 설정, 정렬 |
| 토스트 알림 | `Sonner` | 액션 결과 피드백 |
| 아바타 | `Avatar` | 팀원 프로필 |
| 뱃지 | `Badge` | 상태 태그, 기술 태그 |
| 카드 | `Card` | 메트릭 카드, 프로필 카드 |
| 사이드바 | `Sidebar` | 데스크톱 네비게이션 |
| 토글/스위치 | `Switch`, `Toggle` | 도구 ON/OFF |
| 스켈레톤 | `Skeleton` | 로딩 상태 |
| 투표 버튼 | `ToggleGroup` + custom | Approve/Reject/Abstain |
| 데이터 테이블 | `Table` + **TanStack Table** | 팀원 목록, 이슈 목록 |
| 차트 | **Recharts** (shadcn Chart 래퍼) | 레이더, 바, 히트맵 |

**shadcn + SEED 토큰 통합 방법:**
```bash
# 1. shadcn 초기화 (Tailwind 기반)
npx shadcn@latest init

# 2. globals.css의 CSS 변수를 SEED 토큰 값으로 교체
# (위 1.1의 shadcn CSS 변수 매핑 참조)

# 3. 필요한 컴포넌트 추가
npx shadcn@latest add button input card dialog tabs progress badge avatar sidebar
npx shadcn@latest add drawer sonner skeleton toggle-group table
```

---

## 2. Responsive strategy

TeamForge는 단일 Next.js 웹앱으로 데스크톱과 모바일 브라우저를 모두 지원. 별도 앱 없이 카카오톡 링크 클릭 → 모바일 웹에서 완전히 사용 가능.

### 2.1 브레이크포인트

| 이름 | 범위 | 컬럼 | 거터 | 마진 |
|------|------|------|------|------|
| `sm` | 0~671px | 4 | 16px | 16px |
| `md` | 672~1055px | 8 | 16px | 24px |
| `lg` | 1056~1311px | 16 | 16px | 32px |
| `xl` | 1312px+ | 16 | 16px | auto |

```js
// tailwind.config.js
screens: { sm: '320px', md: '672px', lg: '1056px', xl: '1312px' }
```

### 2.2 터치 타겟

| 요소 | 최소 | 권장 |
|------|------|------|
| 탭 가능한 모든 요소 | 44×44px | 48×48px |
| CTA 버튼 | h:48px | h:52px |
| 아이콘 버튼 | 40×40px | 44×44px |
| 체크박스/라디오 | 20px visible | 44px touch area |
| 리스트 아이템 | h:44px | h:52px |
| 텍스트 입력 | h:44px | h:48px |

```css
.icon-btn { position: relative; width: 24px; height: 24px; }
.icon-btn::after { content: ''; position: absolute; inset: -10px; }
```

### 2.3 Safe Area

```css
:root {
  --safe-area-inset-top:    env(safe-area-inset-top, 0px);
  --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
}
.bottom-cta {
  padding-bottom: calc(56px + var(--safe-area-inset-bottom));
}
```

### 2.4 모바일 UX 컴포넌트 패턴

**Bottom Sheet:** 모바일에서 dialog/overlay 대신 사용. 상단 `$radius.r4` (16px).
**탭 내비게이션:** 데스크톱=좌측 사이드바, 모바일=하단 탭 바 (max 5 items, safe-area 대응).
**입력 필드:** 하단 보더 강조 스타일 + `inputmode` 필수 (6자리 코드=`numeric`, 검색=`search`).
**스와이프:** 설문 섹션 이동(좌우), 액션 아이템 완료 처리(우→좌).

### 2.5 스크린별 반응형 분류

| 화면 | 모바일 (sm) | 데스크톱 (lg+) |
|------|------------|----------------|
| 1 로그인 | 전체 지원 | 전체 지원 |
| 2 역할 선택 | 카드 세로 스택 | 카드 가로 배열 |
| 3 팀 생성 | 전체 지원, 6자리 코드 키패드 | 2컬럼 |
| 4 설문 | 전체 지원 (모바일 우선) | 전체 지원 |
| 5 개인 결과 | 레이더 차트 280px | 레이더 차트 400px |
| 6 팀 대시보드 | 요약 텍스트 카드 | 바 차트 + 드래그 |
| 7 주제 결정 | 전체 (화이트보드=데스크톱만) | 전체 지원 |
| 8 아키텍처 빌더 | 채팅만 | 채팅 + 다이어그램 |
| 9 도구 세팅 | 토글만 (파일 빌더=lg+) | 전체 지원 |
| 10 킥오프 요약 | 읽기 전용 | 전체 (PDF 내보내기) |
| 11 회의 허브 | 전체 (30초 액션) | 전체 지원 |
| 12 방향 추적 | 수치 카드 4개 | 이중 바 차트 |
| 13 변경 관리 | 투표만 (Bottom Sheet) | 전체 지원 |
| 14 대시보드 | 메트릭 2×2 + 수평 바 | 전체 히트맵 |

---

## 3. Market context & competitive landscape

### 3.1 시장 구조

**현업 개발팀 표준 스택** (Stack Overflow 2025):
- 코드: GitHub (80.5%), GitLab (36.7%)
- 이슈/계획: Jira (52.1%), Confluence (36.5%)
- 실시간 소통: Teams (56.2%), Slack (49.1%), Zoom (39.8%)
- 문서/지식: Markdown (35.2%), Notion (17.2%), Miro (15.6%)

**학생/학습자 표준 스택** (Stack Overflow 2025):
- 코드: GitHub (88.8%), GitLab (27.5%)
- 이슈/정리: Markdown (36.5%), Notion (18.5%), Trello (13.5%), Jira (10.0%)
- 실시간 소통: Discord (70.6%), WhatsApp (43.2%), Zoom (35.3%)
- 커뮤니티: YouTube (70.1%), GitHub (69.6%), Discord (61.7%)

### 3.2 경쟁 지도

| 제품 | 강점 | TeamForge와의 차이 |
|------|------|---------------------|
| GitHub Classroom | 과제 배포, 자동 채점, contribution 가시성 | 스킬 분석, 스택 결정, 회의-변경-ADR 미지원 |
| Devpost for Teams | 프로젝트 생성/참가, 제출 허브 | 운영 허브가 아닌 제출 허브 |
| Jira + Confluence | 프로세스 통제, 추적성, 30만+ 고객사 | 학생 진입 마찰 큼. 스킬 분석/매칭 없음 |
| Notion | 유연성, 학생 무료, 1억+ 사용자 | wiki 중심. 스택 결정, drift, vote 미지원 |
| Slack/Discord | 실시간 소통, 생태계 | 소통 도구. 구조화된 결정/변경 관리 없음 |

**TeamForge 차별점:** 팀 스킬 데이터 + 킥오프 결정 + 회의 분석 + drift 감지 + 변경 이력을 교차 연결.

### 3.3 연동 우선순위

| 순위 | 서비스 | Phase |
|------|--------|-------|
| 1 | GitHub (webhook + write-back) | Phase 1~3 |
| 2 | Slack (auto-import + DM write-back) | Phase 4 |
| 3 | Notion (auto-import) | Phase 4 |
| 4 | Google Meet/Zoom (transcript import) | Phase 4 |
| 5 | Discord (bot) | Phase 5+ |

---

## 4. Risk management

### 4.1 Integration tax (highest)

- Slack: non-Marketplace 앱 제한 강화, files.upload sunset.
- Notion: API rate limit 3 req/sec.
- GitHub: 5,000 req/hour.
- **대응:** 모든 연동에 graceful fallback. import 실패 → 직접 입력 유도. health check 표시. Slack Marketplace 등록(MVP 이후).

### 4.2 데이터 규율 의존성

- Direction tracker는 GitHub issue/PR 데이터가 쌓여야 작동.
- **대응:** Confidence score < 40% → alert 숨김 + "데이터 부족" 가이드. Git 온보딩에서 이슈 사용 유도. 설문 기반 분석(규율 불필요)이 기본값.

### 4.3 감시 느낌 (mitigated)

- 개인 저활동 alert → 팀장에게만.
- Observer → 집계형 데이터만 (개인 식별 불가).
- 톤: "low activity detected" → "Git 브랜칭에서 막힌 부분이 있을 수 있어요, 페어링 세션을 요청해보는 건 어떨까요?"

---

## 5. User roles

| Role | 권한 | 설명 |
|------|------|------|
| **Leader** | 읽기/쓰기/설정/삭제 | 팀 생성자. 스택 결정, 역할 배정 최종 권한 |
| **Member** | 읽기/쓰기 | 설문 참여, 투표 참여, 회의록 업로드, 변경 제안 |
| **Observer** | 읽기 전용 (제한적) | 프로젝트 미참여자 (교수, 멘토, 외부 평가자) |

**Observer 접근 범위:**

| 열람 가능 | 열람 불가 |
|-----------|-----------|
| 팀 스킬 대시보드 (개인 상세 제외) | 개별 설문 원본 |
| 프로젝트 설정 요약 | 이력서 / GitHub URL |
| 진행 대시보드, 주간 AI 요약 | AI 워크샵 채팅, 투표 개별 의견 |

---

## 6. User journey overview

```
Phase 1: Setup       [1] Social login → [2] Role select → [3] Team create + invite
Phase 2: Assessment  [4] Skill survey → [5] Personal result
Phase 3: Formation   [6] Team dashboard → [7] Topic decision → [8] Architecture builder
Phase 4: Execution   [9] Tool setup → [10] Kickoff summary
Phase 5: Ongoing     [11] Meeting hub → [12] Direction tracker → [13] Change mgmt → [14] Dashboard
```

---

## 7. Screen specifications — Phase 1~4

### 7.1 Screen 1: Social login

- 소셜 로그인만 (Google, Kakao, GitHub). 이메일/비밀번호 없음.
- GitHub 로그인 시 프로필 데이터 자동 연동.
- 데스크톱: 중앙 카드 (max-width: 400px). 모바일: 풀스크린.
- Kakao 버튼: `#FEE500` (브랜드 색상 예외). GitHub: `var(--tf-fg-default)`.
- 기술: NextAuth.js v5, JWT 전략.

### 7.2 Screen 2: Role select + 서비스 튜토리얼

- 카드 3개: Leader / Member / Observer.
- 선택 시: `border: 2px solid var(--tf-stroke-brand)`, `bg: var(--tf-bg-info)` (#d0e2ff).
- 첫 진입 시 tooltip walkthrough 3~4단계. 모바일에서는 Bottom Sheet.

### 7.3 Screen 3: Team create + invite

- 팀 이름 (필수), 한 줄 소개 (선택), 예상 인원 (3~6명).
- 초대: URL 링크 + 6자리 숫자 코드 (`inputmode="numeric"`, 모바일 키패드 최적화).
- 코드 생성: `Math.random().toString().slice(2, 8)`, DB unique index.
- 실시간 합류: Socket.io broadcast. "1/4명 합류" Zeigarnik 효과.

### 7.4 Screen 4: Skill assessment survey

**6 sections, 15 questions, ~5 min.**

프로그레스 바: `var(--tf-fg-brand)` (#0f62fe), 배경 `var(--tf-bg-layer-alt)`.

#### Section 1: 기본 정보 + 경험 수준 (~30s, 2Q)

| # | 질문 | 유형 | Output |
|---|------|------|--------|
| Q1 | 개발을 시작한 지 얼마나 되었나요? | 5-radio | `experience_tier` (1~5) |
| Q2 | 현재 본인을 가장 잘 설명하는 것은? | 5-radio | `background_type` |

Q1 선택지: 6개월 미만 / 6개월~1년 / 1~2년 / 2~4년 / 4년 이상
Q2 선택지: CS/SW 전공 학부생 / 비전공이지만 개발 학습 중 / 부트캠프 수료 / 현업 개발자(인턴 포함) / PM·디자이너(개발 경험 있음)

#### Section 2: 기술 스택 + 숙련도 (~90s, 3Q)

| # | 질문 | 유형 | Output |
|---|------|------|--------|
| Q3 | 경험해 본 기술을 모두 선택하세요 | multi-select (카테고리별) | `tech_stack_list[]` |
| Q4 | 선택한 기술별 숙련도 표시 | slider 1~5 (Q3 기반 동적) | `skill_ratings{}` |
| Q5 | 자신 있는 영역 Top 2 순서 선택 | rank | `top_strengths[2]` |

**Q3 기술 목록:**
```
LANGUAGE:  JavaScript/TS, Python, Java, C/C++, Go, Kotlin, Rust, Dart
FRONTEND:  React, Next.js, Vue, Svelte, Flutter, React Native
BACKEND:   NestJS, Express, Spring Boot, Django, FastAPI, Go Fiber
DATABASE:  PostgreSQL, MySQL, MongoDB, Redis, Firebase, Supabase
INFRA:     Docker, GitHub Actions, AWS, GCP, Vercel, Kubernetes
AI/DATA:   PyTorch, TensorFlow, LangChain, Pandas, scikit-learn, Hugging Face
DESIGN:    Figma, Photoshop, Blender, Unity
```

**Q4 숙련도 레벨 기준:**

| Level | 기준 |
|-------|------|
| 1 | 튜토리얼 따라해 봄 |
| 2 | 간단한 프로젝트 완성 |
| 3 | 팀 프로젝트에서 기여 |
| 4 | 주도적 설계 가능 |
| 5 | 타인 멘토링 가능 |

모바일: 슬라이더 touch area 44px, thumb 24×24px. Multi-select 칩 height: 44px, `$radius.r2`.

#### Section 3: 프로젝트 경험 (~60s, 3Q)

| # | 질문 | 유형 | Output |
|---|------|------|--------|
| Q6 | 완성한 프로젝트 수 | 4-radio | `project_count` |
| Q7 | 최근 프로젝트 역할 (Q6≥1일 때) | multi-select | `actual_roles[]` |
| Q8 | Git 협업 경험 레벨 | 5-radio (계단식) | `git_collab_level` (0~4) |

Q7 선택지: API/서버 개발, 화면(UI) 구현, DB 스키마 설계, 배포/인프라, PM/일정 관리, 디자인, AI 모델, 테스트/QA

**Q8 Git 레벨:**
- 0: Git 안 써봄 → Git 기초 튜토리얼 자동 제공
- 1: 혼자 add/commit/push → Git 브랜칭 가이드
- 2: branch + merge 경험 → 기본 워크플로우 추천
- 3: PR 기반 코드 리뷰 → GitHub Flow 추천
- 4: 전략적 브랜칭 → 고급 옵션 제공

#### Section 4: 협업 스타일 (~45s, 3Q)

| # | 질문 | 유형 | Output |
|---|------|------|--------|
| Q9 | 팀에서 나는 주로... | 5-radio | `work_archetype` |
| Q10 | 선호 작업 방식 | 양극 슬라이더 3개 | `work_style_vector[3]` |
| Q11 | 맡고 싶은 역할 | 1순위+2순위 | `desired_roles[1~2]` |

Q9 Archetype: Initiator / Architect / Executor / Coordinator / Documenter
Q10 축: 혼자↔함께, 프로토타입↔설계, 새기술↔익숙한기술 (각 0~100)

#### Section 5: 가용 시간 (~30s, 2Q)

| # | 질문 | 유형 | Output |
|---|------|------|--------|
| Q12 | 주당 투입 가능 시간 | 4-radio | `weekly_hours` |
| Q13 | 팀원들이 알았으면 하는 것 | textarea (optional) | `free_text` → AI 키워드 추출 |

#### Section 6: 포트폴리오 (~30s, 2Q, optional)

| # | 질문 | 유형 | Output |
|---|------|------|--------|
| Q14 | 이력서 PDF 업로드 | file upload + AI parsed | `resume_data{}` |
| Q15 | GitHub URL | text input + API 수집 | `github_data{}` |

Q14: Claude API로 PDF 분석 → `tech_from_resume[]`, `projects_from_resume[]`, `roles_from_resume[]`
Q15: GitHub REST API → `language_stats{}`, `commit_frequency`, `repo_count`

#### 교차 검증 로직

- Q4(숙련도) vs Q5(자신 있는 영역) → 불일치 시 플래그
- Q5(자기 평가) vs Q7(실제 역할) → 경험 증거 검증
- Q4 vs Q14/Q15(이력서/GitHub) → 객관적 보정 (이력서에 "React 2년"인데 Q4에서 1 → 겸손 보정 +1)

#### 스킬 벡터 변환

```
skill_vector[6] = [backend, frontend, database, devops, ai_ml, design]
각 차원 = avg(Q4에서 해당 카테고리 기술들의 숙련도)

experience_score = experience_tier × log(project_count + 1) × (git_level + 1)

reliability_score = match_rate(self_assessment, behavioral_evidence, external_data)
```

### 7.5 Screen 5: Personal result

- 레이더 차트 (Recharts): 모바일 280px, 데스크톱 400px.
- 차트: `var(--tf-fg-brand)` fill, `var(--tf-stroke-brand)` stroke.
- 포지션 예측: skill_vector와 역할 archetype 간 cosine similarity.

### 7.6 Screen 6: Team dashboard

- 팀 스킬 오버레이 바 차트 + 강점/약점 + 개별 프로필 확장.
- 모바일: 텍스트 요약 카드 ("백엔드 강함, DevOps 보강 필요"). 데스크톱: 전체 뷰.
- 역할 제안: Hungarian algorithm. 드래그 수정 (데스크톱), 탭 선택 (모바일).
- Reliability score 색상: ≥80% success, 60~79% warning, <60% error.
- "일단 진행하기": 미완료 팀원 = 기본값 + "추정값" 표시.

### 7.7 Screen 7: Project topic decision

- "주제를 정하셨나요?" → Yes / No 분기.
- Yes: 문서 업로드(PDF/DOCX/PPT) 또는 직접 입력 → AI가 platform_type, features[], complexity 분류.
- No Path 1: AI 브레인스톰 (맥락 파악 → 팀 스킬 기반 방향 3개 → 구체화).
- No Path 2: 팀 화이트보드 (데스크톱 전용. 모바일은 AI 브레인스톰 유도).

### 7.8 Screen 8: Architecture builder

- 8단계: Framework → Styling → Realtime → API → Server → DB/ORM → Auth → State.
- 각 단계 2~4개 선택지 + 1문장 장단점. 팀 프로필 기반 정렬 (Nudge).
- 자유 질문 → RAG Agent가 새 옵션 카드 추가.
- 모바일: 채팅만. 데스크톱: 채팅 + 실시간 다이어그램 (Pending → Active → Confirmed).
- 선택 카드: 비선택 `var(--tf-bg-layer-alt)`, 선택 `var(--tf-bg-info)` + `var(--tf-stroke-brand)` 2px.
- 스택 갈등: mismatch 감지 → 팀장에게 알림 → 팀 토론 → 팀장 최종 결정.

### 7.9 Screen 9: Collaboration tool setup

**3개 서브시스템:**

1. **도구 선택 + 연동 토글:** 도구별 ON(OAuth→API 자동 세팅) / OFF(수동 가이드). 팀 Git level 기반 추천 복잡도 조절.
2. **AI 파일 빌더 (데스크톱 전용):** CONTRIBUTING.md, PR 템플릿, CI 파이프라인, Issue 템플릿, AGENTS.md를 대화로 생성. 엄격도 선택 (Relaxed/Standard/Strict).
3. **Git 온보딩:** Q8 레벨별 적응형 인터랙티브 튜토리얼. Level 0: Git 설치부터. Level 3+: 고급 팁만. 실제 팀 이슈를 예시로 사용. 팀장 대시보드에서 온보딩 진행률 확인.

API 실패 시: 개별 성공/실패 + 재시도 버튼 + 실패 항목은 수동 가이드 전환.

### 7.10 Screen 10: Kickoff summary

- 전체 결정사항 1페이지 요약. 모바일: 읽기 전용. 데스크톱: PDF/PPT 내보내기.
- 워크스페이스 자동 프로비저닝: GitHub 레포 + branch protection + PR 템플릿 + webhook + Slack 채널.
- GitHub export: `docs/teamforge/` 폴더에 자동 커밋.

---

## 8. Screen specifications — Phase 5: Ongoing collaboration

### 8.1 Screen 11: Meeting hub

**목적:** "회의록을 새로 쓰게 하는 제품"이 아니라, "이미 생긴 노트를 빨아와서 분석하는 제품".

#### 입력 방식 (Primary: 자동 import, Fallback: 직접 입력)

**Primary — 기존 도구에서 자동 import:**

| 소스 | API | 가져오는 데이터 |
|------|-----|----------------|
| Slack | `conversations.history` + `canvases.read` | Canvas, Huddle AI notes |
| Notion | `databases.query` + `pages.retrieve` | Meeting notes 페이지 |
| Google Meet | Google Drive API | 자동 녹음 transcript |
| Zoom | `recordings.list` | Cloud recording transcript |
| GitHub | REST API | PR description, Issue 코멘트 (맥락 보강) |

**Fallback:** 직접 텍스트 입력, 음성 파일 업로드 (Whisper STT), 클립보드 붙여넣기.

**UX:** "새 회의록 작성" 대신 **"최근 노트 가져오기"가 primary CTA**. 연동된 도구에서 최근 24시간 내 노트 자동 감지 → 카드 표시 → 클릭 → import + 분석.

#### AI 분석 파이프라인 (5단계)

```
[입력] 회의 원문 (auto-import / STT / 직접 입력)
  ↓
[Step 1] 요약 — 핵심 논의 사항 3~5줄
  ↓
[Step 2] 액션 아이템 추출 — 누가, 무엇을, 언제까지
  ↓
[Step 3] 이전 회의 대비 진행 비교 — 지난 액션 아이템 완료 여부
  ↓
[Step 4] 킥오프 계획 대비 방향 이탈 감지 — drift %와 원인 분석
  ↓
[Step 5] 다음 회의 안건 자동 생성
```

**Step 4 — Drift 감지:** 킥오프 baseline vs 회의록 추출 + GitHub webhook 교차 검증. 불일치 플래그.
**Step 5 — 안건 소스:** 미완료 액션, 새 블로커, Q13 제약 조건("HyunWoo 시험 기간 4~5주차"), drift alert.

#### 모바일 우선 (30초 경험)

| 액션 | 시간 | UI |
|------|------|-----|
| 요약 확인 | 10s | Summary 카드 |
| 액션 체크 | 5s | 스와이프/탭 |
| 투표 | 10s | Bottom Sheet |
| Drift alert | 5s | 상단 배너 |

Drift 배너 색상: Green `var(--tf-fg-positive)`, Yellow `var(--tf-fg-warning)`, Red `var(--tf-fg-negative)`.

#### API 리스크 관리

- import 실패 → graceful fallback (직접 입력 유도).
- 도구 세팅 화면에서 각 연동 health check 표시.
- integration tax를 제품 전략의 일부로 관리.

---

### 8.2 Screen 12: Direction tracker

**목적:** "계획대로 가고 있나?"에 대한 객관적 답.

#### Plan vs Actual

- Plan: 킥오프 Screen 10에서 확정된 스프린트 목표.
- Actual: GitHub webhook(이슈 종료, PR 머지) + 회의록 AI 분석 교차.
- 데스크톱: 이중 바 차트 (투명=plan, 실선=actual). 모바일: 4개 수치 카드.

#### Drift alert + Confidence score

| Confidence | 데이터 상태 | alert 표시 |
|-----------|------------|-----------|
| ≥ 70% | 이슈/PR 활발 | 정상 alert (Green/Yellow/Red) |
| 40~69% | 일부만 존재 | alert + "데이터 제한적". 바 차트 점선. |
| < 40% | 거의 미사용 | alert 숨김. "데이터 부족" 가이드 표시. |

```
confidence = weighted_avg(
  github_signal: (closed_issues / total_tasks) × (merged_PRs / total_commits),
  meeting_data: (meeting_count ≥ 2) × (action_item_tracking_rate),
  time_coverage: (data_days / sprint_duration)
)
```

| Gap (confidence ≥ 70%) | Alert | AI 행동 |
|------------------------|-------|---------|
| 0~20% | Green | 정상 |
| 20~40% | Yellow | 원인 분석 + 조정 제안 |
| 40%+ | Red | 즉시 스코프 조정 + 블로킹 분석 |

Confidence 색상: ≥70% `var(--tf-fg-positive)`, 40~69% `var(--tf-fg-warning)`, <40% `var(--tf-fg-muted)`.

---

### 8.3 Screen 13: Change management

**목적:** 프로젝트 중간 변경을 체계적으로 관리. **3단계 분류로 과공정화 방지.**

#### 변경 등급 3단계

| 등급 | 예시 | 프로세스 | 기록 |
|------|------|----------|------|
| **Minor** | 라이브러리 패치, 린트 규칙, 경로 정리, 환경변수 | 자동 로그 (실행자만) | changelog 1줄 |
| **Standard** | 새 라이브러리 도입, API 구조 변경, 테스트 전략 | AI 영향 요약 + **팀장 승인** | 간략 ADR |
| **Major** | 프레임워크/ORM/DB 교체, 아키텍처 패턴 변경 | AI 상세 영향 분석 + **팀원 전원 투표** + 다이어그램 업데이트 | 전체 ADR |

**AI 자동 분류:** dependencies patch/minor, eslint, .env → Minor. new dependency major, API route, CI → Standard. framework, ORM, DB, auth → Major. 기본값 Standard, 팀장이 한 단계 올릴 수 있음.

#### Major 변경 플로우

```
[1] Propose — 팀원 누구나 변경 제안 가능
    입력: 무엇을 바꿀 것인가 + 왜
    ↓
[2] AI impact analysis — 자동 생성
    - 영향 받는 파일 수 / 마이그레이션 시간 / 일정 영향
    - 팀 스킬 매치 변화 / 아키텍처 다이어그램 변경 프리뷰
    ↓
[3] Team vote — 팀원 전원
    - Approve / Reject / Abstain
    - Reject 시 이유 필수. 투표 기한 48시간. 과반수 승인.
    - 모바일: Bottom Sheet 투표.
    ↓
[4] Auto-update (승인 시)
    - 아키텍처 다이어그램, 킥오프 요약, AGENTS.md, CI 자동 업데이트
    - ADR 자동 생성 → docs/adr/ 에 커밋
```

#### 변경 제안 트리거 3가지

| 트리거 | 설명 |
|--------|------|
| 수동 | 아키텍처 다이어그램이나 킥오프 요약에서 "변경 제안" 클릭 |
| AI 제안 | Drift analysis에서 구조적 문제 감지 → draft 생성 |
| 회의록 감지 | 원문에서 "X로 바꾸자" 패턴 → 자동 draft proposal |

투표 색상: Approve `var(--tf-fg-positive)`, Reject `var(--tf-fg-negative)`, Abstain `var(--tf-fg-muted)`.

---

### 8.4 Screen 14: Progress dashboard (action hub)

**목적:** "보여주는 곳"이 아니라 **"즉시 조치하는 곳"**.

#### 데이터 수집: GitHub Webhook

| 이벤트 | 수집 데이터 | 사용처 |
|--------|------------|--------|
| push | 커밋 수, 커밋터, 타임스탬프 | 활동 히트맵 |
| pull_request | PR 생성/머지/리뷰 시간 | PR 사이클 타임 |
| issues | 이슈 생성/종료 | 벨로시티 |
| issue_comment | 코멘트 수 | 소통 활성도 |

#### 상단 4개 메트릭 카드

Sprint 진행률, Velocity, PR cycle time, Review coverage.
모바일: 2×2 그리드. 데스크톱: 4×1.
카드: `var(--tf-bg-layer-alt)`, `$radius.r3`, 수치 `$font-size.t9` Bold.

#### 활동 히트맵

데스크톱: 7일 × N명 그리드. 모바일: 최근 7일 집계 수평 바 (개인 식별 없음).
색상: 3+ `var(--tf-fg-positive)`, 1~2 `var(--tf-fg-brand)` @50%, 0 `var(--tf-bg-layer-alt)`.

#### AI Alert → Action (write-back)

모든 alert에 즉시 실행 가능한 action 버튼 연결.

| Alert | Action | API |
|-------|--------|-----|
| 팀원 저활동 | "페어링 세션 제안" | Slack `chat.postMessage` |
| | "이슈 배정" | GitHub `issues.create` |
| PR 리뷰 지연 | "리뷰어 재배정" | GitHub `pulls.requestReviewers` |
| | "리마인더 발송" | Slack 멘션 |
| 스프린트 지연 | "스코프 조정 제안" | change proposal draft 생성 |
| 데이터 부족 | "이슈 만들기" | GitHub issue 생성 template |

#### 감시 → 코칭 톤

- 개인 저활동 alert: **팀장에게만** 표시.
- Observer: 팀 **집계형만** (개인 식별 불가). "팀원 1명의 참여도가 평균 이하" 형태.
- 톤: "Git 브랜칭에서 막힌 부분이 있을 수 있어요, 페어링 세션을 요청해보는 건 어떨까요?"

**가시성 매트릭스:**

| 데이터 | 본인 | 팀원 | 팀장 | Observer |
|--------|------|------|------|----------|
| 활동 히트맵 | 전체 | 본인만 | 전원 | 집계만 |
| Git level | 보임 | 안 보임 | 보임 | 안 보임 |
| Reliability score | 보임 | 안 보임 | 보임 | 안 보임 |
| 저활동 alert | 본인에게 | 안 보임 | 팀장에게만 | 안 보임 |

#### 주간 AI 요약 (매주 월 09:00 KST)

이번 주 커밋/PR/이슈 통계, Top contributor, 병목, 위험, 제안.
Observer용: 개인명 제거 익명화 버전 별도 생성.
발송: Slack 채널 + 팀장 이메일. GitHub 자동 커밋: `docs/teamforge/weekly-digests/week-N.md`.

---

## 9. Data privacy & security

### 9.1 개인정보 처리방침

- 한국 개인정보보호법 준수.
- 수집 항목: 이름, 이메일, 기술 스택 자기 평가, GitHub URL(선택), 이력서(선택).
- 목적: 팀 매칭, 스킬 분석, 스택 추천, 프로젝트 관리.

### 9.2 데이터 접근 권한 매트릭스

| 데이터 | Leader | Member | Observer |
|--------|--------|--------|----------|
| 팀원 설문 상세 | 본인 팀만 | 본인 것만 | 불가 |
| 팀 스킬 차트 (집계) | 가능 | 가능 | 가능 |
| 이력서/GitHub 원본 | 본인 팀만 | 본인 것만 | 불가 |
| 회의록 원문 | 가능 | 가능 | 요약만 |
| AI 워크샵 채팅 | 가능 | 가능 | 불가 |
| 투표 개별 의견 | 가능 | 가능 | 불가 |
| 진행 대시보드 | 가능 | 가능 | 가능 |
| 주간 AI 요약 | 가능 | 가능 | 가능 (개인명 제거) |

### 9.3 데이터 보존 정책

- 스킬 프로필: 유저 계정 삭제 시까지 (다음 프로젝트에서 설문 자동 채우기).
- 팀/프로젝트 데이터: 종료 후 6개월 읽기 전용 아카이브 → 자동 삭제.
- 이력서 원본: AI 파싱 완료 후 30일 뒤 삭제. 파싱 결과(구조화 데이터)만 보존.
- GitHub export: 레포 커밋 데이터는 영구 보존.

---

## 10. RAG knowledge base strategy

### 10.1 파이프라인

```
Collect → Chunk (512토큰, 50토큰 오버랩) → Embed (OpenAI text-embedding-3-small, 1536dim) → Store (pgvector)
```

### 10.2 소스 전략

**Tier 1 (초기 seed):** 프레임워크 공식 문서 Getting Started + Core Concepts (~200p), GitHub awesome-* (~50p), 스택 비교 아티클 (~100p).
**Tier 2 (주간 업데이트):** 한국 테크 블로그 RSS (d2.naver, tech.kakao, toss.tech, techblog.woowahan), GitHub trending READMEs (~50p/week).
**Tier 3 (제외):** Stack Overflow (품질 편차), Medium/Dev.to 일반 글.

### 10.3 품질 관리

- `source_trust_score` (1~5): 공식 문서=5, 기업 블로그=3, 개인 글=1. 검색 시 가중치 적용.
- 1년 이상 된 문서 자동 비활성화. 주 1회 Cron 크롤링 + 임베딩.
- 비용: < $1/month.

---

## 11. AI agent architecture

| # | Agent | Trigger | Model | RAG? | 역할 |
|---|-------|---------|-------|------|------|
| 1 | Onboarding assistant | 설문 중 질문 | Haiku | No | 기술 용어 설명 |
| 2 | Stack recommender | Screen 8 | Sonnet | Yes | 팀 맞춤 스택 추천 |
| 3 | Collab advisor | Screen 9 도구 선택 | Haiku | Optional | 채널 구조/워크플로우 |
| 4 | File builder | Screen 9 파일 생성 | Sonnet | No | CONTRIBUTING.md, PR 템플릿 등 |
| 5 | Workspace provisioner | Screen 10 | Sonnet | No | GitHub+Slack API (MCP) |
| 6 | Meeting analyzer | 회의록 import | Sonnet | No | 요약+액션+drift+안건 |
| 7 | Direction tracker | 주간 + 회의 후 | Haiku | No | Plan vs actual, confidence |
| 8 | Change impact analyzer | 변경 제안 | Sonnet | Yes | 영향 분석, 3단계 분류, ADR |
| 9 | Weekly digest | Cron 매주 월 09:00 | Haiku | No | 주간 요약 (Observer 익명화 별도) |
| 10 | Action executor | alert action 클릭 | — | No | GitHub/Slack write-back 실행 |

**월 비용 (200 users, 40 teams): ~$86**

---

## 12. Edge case resolutions

| Case | 해결 방식 |
|------|-----------|
| 팀원 이탈 | 팀 탈퇴. `team_members.status = 'left'`. 역할 재배정 AI 추천. |
| 팀장 이탈 | 이탈 전 리더 위임 UI. 원하는 팀원에게 `role: leader` 이전. |
| 새 팀원 합류 | 설문 → 기존 팀 데이터에 merge → 스킬 차트 자동 업데이트. |
| 스택 갈등 | Mismatch 감지 → 팀장에게 알림 → 팀원 토론 유도 → 팀장 최종 결정. |
| API 실패 | 개별 성공/실패 + 재시도 버튼 + 실패 항목은 수동 가이드 전환. |
| 설문 미완료 | "일단 진행하기". 미완료 = 기본값 + "추정값" 표시. 완료 시 자동 업데이트. |
| 데이터 export | GitHub `docs/teamforge/` 폴더에 자동 커밋. |
| 서비스 온보딩 | 첫 진입 시 tooltip walkthrough 3~4단계. |

---

## 13. Data model (14 tables)

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  auth_provider VARCHAR(20) NOT NULL,
  github_url    VARCHAR(255),
  avatar_url    VARCHAR(500),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE teams (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  description   TEXT,
  invite_code   VARCHAR(6) UNIQUE NOT NULL,
  leader_id     UUID REFERENCES users(id),
  project_topic TEXT,
  platform_type VARCHAR(30),
  selected_stack JSONB,
  collab_tools  JSONB,
  sprint_config JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE team_members (
  team_id           UUID REFERENCES teams(id),
  user_id           UUID REFERENCES users(id),
  role              VARCHAR(20) DEFAULT 'member',
  assigned_position VARCHAR(50),
  status            VARCHAR(20) DEFAULT 'active',
  joined_at         TIMESTAMPTZ DEFAULT NOW(),
  left_at           TIMESTAMPTZ,
  PRIMARY KEY (team_id, user_id)
);

CREATE TABLE skill_assessments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES users(id),
  team_id           UUID REFERENCES teams(id),
  experience_tier   SMALLINT NOT NULL,
  background_type   VARCHAR(30) NOT NULL,
  tech_stacks       JSONB NOT NULL,
  top_strengths     VARCHAR(50)[] NOT NULL,
  project_count     SMALLINT NOT NULL,
  actual_roles      VARCHAR(50)[],
  git_collab_level  SMALLINT NOT NULL,
  work_archetype    VARCHAR(20) NOT NULL,
  work_style        JSONB NOT NULL,
  desired_roles     VARCHAR(50)[] NOT NULL,
  weekly_hours      VARCHAR(20) NOT NULL,
  free_text         TEXT,
  resume_data       JSONB,
  github_data       JSONB,
  skill_vector      vector(6) NOT NULL,
  experience_score  FLOAT NOT NULL,
  reliability_score FLOAT,
  completed_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, team_id)
);

CREATE TABLE stack_recommendations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         UUID REFERENCES teams(id),
  step_number     SMALLINT NOT NULL,
  question        TEXT NOT NULL,
  options         JSONB NOT NULL,
  selected_index  SMALLINT,
  chat_history    JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE meetings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         UUID REFERENCES teams(id),
  title           VARCHAR(200),
  input_type      VARCHAR(20) NOT NULL,
  raw_content     TEXT,
  summary         TEXT,
  drift_analysis  JSONB,
  next_agenda     JSONB,
  created_by      UUID REFERENCES users(id),
  meeting_date    TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE action_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id    UUID REFERENCES meetings(id),
  team_id       UUID REFERENCES teams(id),
  description   TEXT NOT NULL,
  assignee_id   UUID REFERENCES users(id),
  due_date      DATE,
  status        VARCHAR(20) DEFAULT 'open',
  completed_at  TIMESTAMPTZ,
  source        VARCHAR(20) DEFAULT 'meeting',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE change_proposals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         UUID REFERENCES teams(id),
  proposed_by     UUID REFERENCES users(id),
  title           VARCHAR(200) NOT NULL,
  description     TEXT NOT NULL,
  reason          TEXT NOT NULL,
  trigger_type    VARCHAR(20) NOT NULL,
  impact_analysis JSONB,
  diagram_diff    JSONB,
  status          VARCHAR(20) DEFAULT 'voting',
  vote_deadline   TIMESTAMPTZ,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE votes (
  proposal_id   UUID REFERENCES change_proposals(id),
  user_id       UUID REFERENCES users(id),
  vote          VARCHAR(10) NOT NULL,
  reason        TEXT,
  voted_at      TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (proposal_id, user_id)
);

CREATE TABLE architecture_decisions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       UUID REFERENCES teams(id),
  proposal_id   UUID REFERENCES change_proposals(id),
  adr_number    SERIAL,
  title         VARCHAR(200) NOT NULL,
  status        VARCHAR(20) NOT NULL,
  context       TEXT NOT NULL,
  decision      TEXT NOT NULL,
  consequences  TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE github_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       UUID REFERENCES teams(id),
  event_type    VARCHAR(30) NOT NULL,
  actor_github  VARCHAR(100),
  payload       JSONB NOT NULL,
  event_date    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tech_documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url    VARCHAR(500),
  title         VARCHAR(300),
  content_chunk TEXT NOT NULL,
  embedding     vector(1536) NOT NULL,
  metadata      JSONB,
  is_active     BOOLEAN DEFAULT true,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE action_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       UUID REFERENCES teams(id),
  triggered_by  UUID REFERENCES users(id),
  alert_type    VARCHAR(50) NOT NULL,
  action_type   VARCHAR(50) NOT NULL,
  target        JSONB,
  status        VARCHAR(20) NOT NULL,
  error_message TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE usage_quota (
  team_id           UUID REFERENCES teams(id) PRIMARY KEY,
  ai_calls_used     INT DEFAULT 0,
  ai_calls_limit    INT DEFAULT 100,
  features_enabled  JSONB DEFAULT '{"api_integration": true, "meeting_import": true}',
  reset_at          TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_gh_events_team_date ON github_events(team_id, event_date);
CREATE INDEX idx_tech_docs_embedding ON tech_documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_invite_code ON teams(invite_code);
CREATE INDEX idx_team_member ON team_members(team_id, user_id);
CREATE INDEX idx_action_items_team ON action_items(team_id, status);
CREATE INDEX idx_meetings_team ON meetings(team_id, meeting_date);
CREATE INDEX idx_proposals_team ON change_proposals(team_id, status);
```

---

## 14. Tech stack + Deployment

### 14.1 Tech stack

| Layer | Technology | 선택 이유 |
|-------|-----------|-----------|
| Frontend | Next.js 14 (App Router) | SSR + API routes + TS |
| UI Components | **shadcn/ui** (Radix + Tailwind) | copy-paste, 코드 소유, Claude Code 친화적 |
| Styling | Tailwind CSS + CSS Custom Properties | SEED 토큰 → CSS var 매핑 |
| Data Table | **TanStack Table** | headless, 정렬/필터/페이지네이션 |
| Charts | Recharts | 레이더 + 바 차트, 모바일 반응형 |
| Drawer/Sheet | **Vaul** | 모바일 Bottom Sheet (shadcn Drawer) |
| State | TanStack Query | 서버 상태 캐싱 |
| Backend | NestJS | 구조적, DI/Guard/Pipe |
| ORM | Prisma | 타입 안전, auto migration |
| Database | PostgreSQL + pgvector | 관계형 + 벡터 |
| Auth | NextAuth.js v5 | OAuth |
| Realtime | Socket.io | NestJS Gateway |
| AI | Claude API (Sonnet + Haiku) | 구조화 JSON |
| STT | OpenAI Whisper API | 음성 → 텍스트 |
| Embedding | OpenAI text-embedding-3-small | 1536 dim |
| File storage | Supabase Storage | 이력서/음성 업로드 |
| CI/CD | GitHub Actions | 자동화 |

**Tailwind + SEED 토큰 연동:**
```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // SEED role-based tokens (CSS var 참조)
        'tf-bg-default':   'var(--tf-bg-layer-default)',
        'tf-bg-alt':       'var(--tf-bg-layer-alt)',
        'tf-fg-default':   'var(--tf-fg-default)',
        'tf-fg-muted':     'var(--tf-fg-muted)',
        'tf-fg-brand':     'var(--tf-fg-brand)',
        'tf-fg-positive':  'var(--tf-fg-positive)',
        'tf-fg-negative':  'var(--tf-fg-negative)',
        'tf-fg-warning':   'var(--tf-fg-warning)',
        'tf-stroke':       'var(--tf-stroke-neutral)',
        'tf-stroke-brand': 'var(--tf-stroke-brand)',
      },
      screens: { sm: '320px', md: '672px', lg: '1056px', xl: '1312px' },
      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont',
               'Apple SD Gothic Neo', 'Segoe UI', 'Roboto', 'Helvetica Neue',
               'Arial', 'Noto Sans', 'sans-serif'],
      },
    },
  },
};
```

### 14.2 Local development (Docker)

```yaml
# docker-compose.yml
services:
  db:
    image: pgvector/pgvector:pg16
    ports: ['5432:5432']
    environment:
      POSTGRES_DB: teamforge
      POSTGRES_USER: teamforge
      POSTGRES_PASSWORD: devpassword
    volumes: [pgdata:/var/lib/postgresql/data]
  api:
    build: ./apps/api
    ports: ['3001:3001']
    depends_on: [db]
    environment:
      DATABASE_URL: postgresql://teamforge:devpassword@db:5432/teamforge
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
    volumes: [./apps/api/src:/app/src]
  web:
    build: ./apps/web
    ports: ['3000:3000']
    depends_on: [api]
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3001
    volumes: [./apps/web:/app]
volumes:
  pgdata:
```

### 14.3 Production (서비스 구축 후)

| 서비스 | 플랫폼 | 비용 |
|--------|--------|------|
| Frontend | Vercel (free) | $0 |
| Backend + DB | Railway (hobby) | $5/mo |
| Domain | .app or .dev | $12/yr |
| AI APIs (5-10 teams) | Claude + OpenAI | $11-22/mo |
| **Total** | | **$17-28/mo** |

---

## 15. Repository structure

```
teamforge/
├── apps/
│   ├── web/                       # Next.js frontend
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   ├── (setup)/
│   │   │   ├── (formation)/
│   │   │   ├── (execution)/
│   │   │   ├── (collaboration)/
│   │   │   └── (dashboard)/
│   │   ├── components/
│   │   │   ├── ui/                # shadcn/ui components (copy-paste, 코드 소유)
│   │   │   │   ├── button.tsx     # shadcn Button + SEED 토큰
│   │   │   │   ├── card.tsx       # $radius.r3
│   │   │   │   ├── dialog.tsx     # Radix Dialog
│   │   │   │   ├── drawer.tsx     # Vaul (모바일 Bottom Sheet)
│   │   │   │   ├── input.tsx
│   │   │   │   ├── sidebar.tsx    # 데스크톱 네비게이션
│   │   │   │   ├── tabs.tsx
│   │   │   │   ├── table.tsx      # TanStack Table 래퍼
│   │   │   │   └── ...            # npx shadcn@latest add 로 추가
│   │   │   └── features/          # TeamForge 전용 복합 컴포넌트
│   │   │       ├── survey/
│   │   │       ├── dashboard/
│   │   │       ├── meeting/
│   │   │       └── architecture/
│   │   └── lib/
│   └── api/                       # NestJS backend
│       ├── src/
│       │   ├── auth/
│       │   ├── teams/
│       │   ├── survey/
│       │   ├── ai/
│       │   ├── realtime/
│       │   ├── provisioning/
│       │   ├── meetings/
│       │   ├── direction/
│       │   ├── changes/
│       │   └── github-webhook/
│       └── prisma/
├── packages/
│   ├── shared/
│   └── ui/
├── docs/
│   ├── adr/
│   └── api/
├── .github/
│   ├── CODEOWNERS
│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── ISSUE_TEMPLATE/
│   └── workflows/
├── AGENTS.md
├── CONTRIBUTING.md
├── README.md
└── package.json                   # Turborepo monorepo
```

---

## 16. Milestone plan

| Phase | 기간 | 목표 | 핵심 산출물 |
|-------|------|------|------------|
| 1: MVP | 4주 | 가입 → 설문 → 결과 | 소셜 로그인, 설문, 레이더 차트, 팀 대시보드 |
| 2: AI Core | 4주 | 주제 결정 → 스택 추천 | RAG 파이프라인, 아키텍처 빌더 |
| 3: Automation | 4주 | 도구 세팅 → 워크스페이스 | API 연동, 파일 빌더, Git 온보딩 |
| 4: Collaboration | 5주 | 회의 허브 → 방향 추적 | auto-import, drift+confidence, 모바일 Phase 5 |
| 5: Governance | 4주 | 변경 관리 → 액션 허브 | 3단계 change, 투표, write-back |
| 6: Polish | 2주 | Observer, 프라이버시, 반응형 | 톤 전환, 익명화, 전 화면 모바일 검증 |
| **Total** | **23주** | | |

### 16.1 Pilot-first 실행 전략

23주 풀스코프를 한 번에 만들면 위험. 잔존을 만드는 핵심 4가지를 먼저 검증.

**Pilot core (Phase 3 완료 직후):**
1. Meeting hub auto-import (Slack/Notion → 분석)
2. Direction tracker (plan vs actual + confidence)
3. GitHub/Slack write-back (alert → 즉시 action)
4. Observer view (교수/멘토 읽기 전용)

**파일럿 성공 기준:**
- 설문 완료율 ≥ 80%
- AI 스택 추천 수용률 ≥ 60%
- 주간 재방문율 ≥ 40% (회의 허브)
- 1개 이상 change proposal 실제 발생

---

## 17. Business model

**현재:** Free + usage cap. 결제 시스템 없음. AI 호출 팀당 월 100회 제한. 5~10팀 테스트 비용 $11~22/month 자비 부담. `usage_quota` 테이블 + feature flag로 향후 과금 확장 가능.

**향후:** Freemium ($5/team/month), B2B (기관 단위), 오픈소스+호스팅.

---

## 18. Empty states design

**원칙:** "비어있다"가 아닌 "진행 중이다". Primary CTA = 가장 효과적인 다음 행동.

| 화면 | 상태 문구 | Primary CTA |
|------|-----------|-------------|
| Screen 3 (팀 대기) | "팀원을 기다리는 중이에요" | "초대 링크 복사하기" |
| Screen 6 (설문 미완료) | "설문이 아직 완료되지 않았어요" | "리마인더 보내기" + "일단 N명으로 진행하기" |
| Screen 11 (회의 허브) | "첫 번째 회의를 기록해보세요" | **"Slack에서 가져오기"** (직접 입력 아님) |
| Screen 12 (방향 추적) | "데이터를 모으는 중이에요" | "첫 회의 기록하기" + 체크리스트 |
| Screen 14 (대시보드) | "GitHub 활동이 시작되면 표시돼요" | "GitHub 레포 열기" + git 명령어 제공 |
| Screen 13 (변경 관리) | "아직 변경 사항이 없어요" | (과도한 유도 불필요) |

---

## 19. Testing strategy

### 19.1 테스트 피라미드

| Layer | 수량 | 도구 | 실행 시점 |
|-------|------|------|-----------|
| Unit | ~100 | Jest | 매 커밋 |
| Integration | ~40 | Jest + Supertest + MSW | 매 PR |
| E2E | ~10 | Playwright | 배포 전 (label trigger) |
| Performance | ~3 | k6 | 마일스톤 전 |

### 19.2 모듈별 테스트 매핑

| Module | Unit | Integration | Mock (MSW) |
|--------|------|-------------|------------|
| survey/ | skill_vector, experience_score, reliability, 교차 검증 | POST /survey 전체 | GitHub API, Claude API |
| ai/ | prompt 조립, JSON 파싱, RAG context | RAG search (pgvector) | Claude, OpenAI embedding |
| meetings/ | action item 추출, drift %, confidence | 저장→분석→action_items | Slack, Notion, Whisper |
| changes/ | 3단계 분류, 투표 집계 | 제안→분석→투표→ADR | Claude API |
| github-webhook/ | payload 파싱, 시그니처 검증 | 수신→저장→집계 | — |
| provisioning/ | — | 워크스페이스 생성 전체 | GitHub, Slack API |

### 19.3 모바일 E2E

- Playwright mobile viewport (`iPhone 14`, `Pixel 7`).
- 터치 타겟 크기 자동 검증 (`getBoundingClientRect() >= 44x44`).
- Safe area 대응 확인 (bottom CTA 위치).

### 19.4 CI pipeline

```yaml
name: CI
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env: { POSTGRES_DB: teamforge_test, POSTGRES_PASSWORD: test }
        ports: ['5432:5432']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test
      - run: npm run test:integration
      - run: npx playwright install && npm run test:e2e
        if: contains(github.event.pull_request.labels.*.name, 'e2e')
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run lint && npx tsc --noEmit
```

---

## 20. First users acquisition

**방침:** Landing page는 나중에. 직접 영업으로 첫 유저 확보.

| Tier | 대상 | 팀 수 |
|------|------|-------|
| 1 | 본인 네트워크 (광운대 CS, 해커톤 팀) | 5~10 |
| 2 | 타 대학 캡스톤, CS 동아리 | 10~20 |
| 3 | 한국 개발자 커뮤니티 (Discord, OKKY, velog) | 20~50 |
| 4 | 부트캠프 파트너십, Product Hunt (PMF 확인 후) | 50+ |

**Validation milestones:**

| 팀 수 | 검증 질문 | 핵심 지표 |
|-------|----------|-----------|
| 5 | 설문을 끝까지 하는가? | Survey completion rate |
| 10 | AI 스택 추천이 유용한가? | 추천 수용률 |
| 20 | 회의 허브에 돌아오는가? | 주간 재방문율 |
| 50 | 자발적 입소문이 나는가? | 비마케팅 유입 비율 |

---

## Appendix A: GitHub export structure

```
docs/teamforge/
├── README.md              # 킥오프 요약
├── team-profile.md        # 스킬 차트 + 역할 배정
├── stack-decisions.md     # 8단계 아키텍처 결정
├── collab-setup.md        # 도구 설정 + 워크플로우
├── weekly-digests/
│   ├── week-1.md
│   └── ...
├── meetings/
│   ├── 2026-03-17-kickoff.md
│   └── ...
└── changes/
    ├── change-001-add-socketio.md
    └── ...

docs/adr/
├── 001-initial-stack.md
├── 002-add-socketio.md
└── template.md
```

---

## Appendix B: 참고 문헌

**Design & UX:**
- SEED Design: seed-design.io
- SEED Design (당근마켓): seed-design.io
- Toss Design Principles: toss.tech/category/design

**Engineering:**
- Conventional Commits: conventionalcommits.org
- ADR Template: github.com/joelparkerhenderson/architecture-decision-record
- OpenAI Whisper API: platform.openai.com/docs/guides/speech-to-text
- MCP: modelcontextprotocol.io

**Market research:**
- Stack Overflow Developer Survey 2025 (49,000+, 177 countries)
- Stack Overflow Developer Survey 2024 (65,437, 185 countries)
- GitHub: 180M+ developers, 420M+ repositories
- Atlassian: 300,000+ customers; 25% time wasted finding answers
- Slack: 200,000+ paid customers, 2,500+ apps
- Notion: 100M+ users worldwide
- Miro: 100M+ users, 250,000+ companies
- Microsoft Teams: 320M+ MAU
- Discord: 200M+ MAU, 90M+ DAU
- Asana: 169,000+ customers; 60% work about work
- GitHub Education: 5M+ students
- GitHub Classroom: 과제 배포, 자동 채점, contribution 가시성
- Notion Education: 학생 free Plus, 조직 unlimited
- Google Workspace for Education: 150M+ active users
- Le Wagon Slack case: 20개국 39도시, 8,000+ alumni
- GitLab DevSecOps 2026: 3,266명, 주 7시간 AI 비효율