# TeamForge — 최종 리서치 보고서

> 상태: 리서치 아카이브
> 사용 규칙: 이 문서는 배경 자료로 유지한다. 구현 기준으로 승격된 내용은 `docs/product/`, `docs/api/`, `docs/architecture/`, `docs/adr/`에서 관리한다.

> 작성일: 2026-04-06
> 대상: 100~150명 (25~35팀), 4~5명/팀, 옵저버(멘토/교수) 포함
> 기술 스택: Next.js + SEED Design(React) / FastAPI(Python) / PostgreSQL

---

# Part 1. 페이지별 설계 및 협업 흐름

---

## 1.1 전체 흐름 요약

```
[Login] → [Role Select] → [Team Create/Join] → [Skill Assessment] → [Personal Result]
  → [Team Dashboard] → [Topic Decision] → [System Framing (8-A)] → [Technical Narrowing (8-B)]
  → [Handoff Layer] → [Kickoff Summary / Contract Gate] → [First Meeting]
```

**핵심 원칙:**
- 비동기 우선, 핵심 순간만 동기화
- 각 단계에서 팀원은 최소 1개의 "흔적"을 남긴다
- 리더는 facilitator이지 dictator가 아니다
- Observer는 read-only + coach

---

## 1.2 Screen 1 — Login

### 보여주고 싶은 것
"이 서비스가 무엇인지 3초 안에 이해시키고, friction 없이 안으로 들여보낸다."

### 화면 구성
| 요소 | 웹 | 모바일 |
|------|-----|--------|
| 로고 + 한줄 설명 | 중앙 정렬, 히어로 영역 | 상단 고정 |
| OAuth 버튼 | Google / GitHub / Kakao 세로 배치 | 동일, 전체 너비 |
| 가치 제안 | 하단에 3개 아이콘 + 텍스트 | 생략 또는 캐러셀 |
| 에러 상태 | 인라인 Callout | Snackbar |

### SEED 컴포넌트 매핑
- `ActionButton` (variant="brandSolid") → OAuth 버튼
- `Callout` → 에러/상태 메시지
- `Snackbar` → 모바일 에러 피드백

### 협업 흐름
```
Leader  ──→ 로그인 ──→ Session 생성 ──→ Screen 2
Member  ──→ 로그인 ──→ Session 생성 ──→ Screen 2
Observer──→ 로그인 ──→ Session 생성 ──→ Screen 2
```
이 단계에서는 역할 구분 없이 모두 동일한 경험.

### 산출물
`authenticated_session` + `callback_context`

---

## 1.3 Screen 2 — Role Select

### 보여주고 싶은 것
"당신이 이 팀에서 어떤 위치인지 스스로 선택하게 하고, 그 선택의 무게를 느끼게 한다."

### 화면 구성
| 요소 | 웹 | 모바일 |
|------|-----|--------|
| 역할 카드 3개 | 가로 3열 카드 | 세로 스택 |
| 카드 내용 | 역할명 + 아이콘 + 핵심 책임 2줄 + 권한 뱃지 | 동일 |
| 기존 팀 있음 안내 | 상단 PageBanner | 상단 PageBanner |
| 선택 확정 | 하단 ActionButton | 하단 고정 ActionButton |

### SEED 컴포넌트 매핑
- `RadioGroup` → 역할 선택 (한 개만)
- `Badge` → 각 역할의 권한 표시 ("생성 가능", "읽기 전용")
- `PageBanner` → 기존 팀 복귀 안내
- `ActionButton` → 선택 확정

### 협업 흐름
```
Leader  ──→ "Leader" 선택 ──→ Screen 3 (Team Create)
Member  ──→ "Member" 선택 ──→ Screen 3 (Team Join)
Observer──→ "Observer" 선택 ──→ Screen 3 (Team Join)
```

### 산출물
`role_context` (leader | member | observer)

---

## 1.4 Screen 3 — Team Create / Join

### 보여주고 싶은 것
"팀이라는 협업 단위가 만들어지는 순간을 느끼게 한다. 사람이 들어올 때마다 살아있는 느낌."

### 화면 구성 — Create (Leader)
| 요소 | 웹 | 모바일 |
|------|-----|--------|
| 팀 이름 입력 | TextField | TextField (전체 너비) |
| 팀 소개 입력 | TextField (multiline) | TextField |
| 예상 인원 | Chip.RadioRoot (2~6) | 동일 |
| 생성 버튼 | ActionButton | 하단 고정 |
| 생성 후: 초대 코드 | 큰 텍스트 + 복사 버튼 | 동일 |
| 합류 현황 | Avatar 리스트 + Badge(역할) | 세로 List |
| 다음 CTA | "설문 시작하기" ActionButton | 하단 고정 |

### 화면 구성 — Join (Member/Observer)
| 요소 | 웹 | 모바일 |
|------|-----|--------|
| 초대 코드 입력 | 6자리 OTP 스타일 | 동일 |
| 팀 정보 프리뷰 | 팀명 + 인원 + 역할 분포 | 동일 |
| 합류 버튼 | ActionButton | 하단 고정 |

### SEED 컴포넌트 매핑
- `TextField` / `TextFieldInput` → 팀 이름, 소개
- `Chip.RadioRoot` + `Chip.RadioItem` → 예상 인원 선택
- `Avatar` + `Badge` → 합류 멤버 표시
- `List` → 합류 현황 리스트
- `ActionButton` → 생성/합류/다음
- `Snackbar` → "박팀원이 합류했습니다" 실시간 알림

### 협업 흐름
```
Leader ──→ 팀 생성 ──→ 초대 코드 생성 ──→ 합류 대기 ──→ Screen 4
Member ──→ 코드 입력 ──→ 팀 정보 확인 ──→ 합류 ──→ Screen 4
Observer──→ 코드 입력 ──→ 팀 정보 확인 ──→ 합류 ──→ Screen 6 (Dashboard, read-only)
```

### 비동기 처리
- 합류는 비동기: 리더가 접속 중이 아니어도 멤버는 합류 가능
- WebSocket 또는 SSE로 합류 이벤트 실시간 반영
- 리더에게는 "N명 합류 완료, 설문 시작 가능" 상태 표시

### 산출물
`team_membership` + `team_id` + `team_role` + `invite_code`

---

## 1.5 Screen 4 — Skill Assessment

### 보여주고 싶은 것
"나의 기술과 경험이 팀에 어떻게 기여할 수 있는지 데이터로 남기는 과정."

### 설문 섹션 구조 (6 단계)
1. **기본 정보** — 학년, 전공, 경험 수준
2. **기술 스택** — 언어/프레임워크 태그 선택 + 숙련도 슬라이더
3. **프로젝트 경험** — 완성 프로젝트 수, 최근 역할, Git 수준
4. **협업 스타일** — 선호 소통 방식, 갈등 대응 스타일
5. **가용 시간** — 주간 가능 시간, 선호 시간대
6. **선택 보강** — 이력서 업로드 / GitHub URL

### 화면 구성
| 요소 | 웹 | 모바일 |
|------|-----|--------|
| 진행률 | ProgressCircle + "3/6" | 상단 고정 |
| 섹션 컨텐츠 | 중앙 카드 (max-w-640) | 전체 너비 |
| 스킬 태그 | Chip.Toggle 그리드 | 2열 그리드 |
| 숙련도 | Slider (1~5) | 동일 |
| Git 수준 | RadioGroup | 동일 |
| 이전/다음 | 하단 좌우 ActionButton | 하단 고정 |
| 자동 저장 | Snackbar "자동 저장됨" | 동일 |

### SEED 컴포넌트 매핑
- `ProgressCircle` → 진행률
- `Chip.Toggle` → 기술 태그 다중 선택
- `Slider` → 숙련도 입력
- `RadioGroup` → 단일 선택 항목
- `Checkbox` → 다중 선택 항목
- `TextField` → 텍스트 입력
- `ActionButton` → 이전/다음/제출
- `Snackbar` → 자동 저장 피드백
- `Skeleton` → AI 처리 중 로딩

### 협업 흐름
```
Leader  ──→ 자기 설문 작성 ──→ 제출 ──→ AI 처리 ──→ Screen 5
Member  ──→ 자기 설문 작성 ──→ 제출 ──→ AI 처리 ──→ Screen 5
Observer──→ 설문 없음 ──→ Screen 6 대기
```

### AI 개입 지점
- 이력서 업로드 시: PDF 파싱 → 기술 태그 자동 추출 → 사용자 확인
- GitHub URL 입력 시: 언어/커밋 분석 → 스킬 보강 제안
- 제출 후: 스킬 벡터 계산 + 역할 예측 준비

### 비동기 처리
- 설문은 섹션별 자동 저장 (draft 상태)
- 제출하지 않은 멤버가 있어도 리더는 Dashboard에서 진행 상태 확인 가능
- 24시간 미제출 시 리더에게 "리마인드 보내기" CTA 활성화

### 산출물
`member_profile` + `skill_vector` + `role_prediction_inputs`

---

## 1.6 Screen 5 — Personal Result

### 보여주고 싶은 것
"AI가 분석한 나의 강점과 역할 후보를 확인하고, 이에 대한 반응을 남긴다."

### 화면 구성
| 요소 | 웹 | 모바일 |
|------|-----|--------|
| 스킬 레이더 차트 | 좌측 반 | 상단 카드 |
| 추천 역할 | 우측: 1순위 + 2순위 카드 | 차트 아래 카드 |
| 강점/성장 포인트 | 추천 역할 아래 텍스트 | 접히는 Callout |
| 역할 반응 | 3버튼: 괜찮아요/부담/다른역할 | 하단 고정 3버튼 |
| 다음 CTA | "팀 대시보드 보기" | 하단 고정 |

### SEED 컴포넌트 매핑
- **차트**: SEED에 차트 컴포넌트 없음 → `recharts` RadarChart 사용 (SEED 토큰 색상 적용)
- `Callout` → 강점/성장 포인트 설명
- `Badge` → 역할 라벨 (예: "Backend Lead")
- `ToggleButton` 또는 `Chip.RadioRoot` → 역할 반응 3택
- `ActionButton` → 설문 다시하기 / 팀 대시보드 이동

### 협업 흐름
```
Leader  ──→ 결과 확인 ──→ 역할 반응 저장 (선택) ──→ Screen 6
Member  ──→ 결과 확인 ──→ 역할 반응 저장 (선택) ──→ Screen 6
Observer──→ 접근 불가
```

### 역할 반응의 의미
역할 반응은 Screen 10에서 "역할 수락/조정" 흐름의 입력값이 된다.
- "괜찮아요" → 기본 수락 예정
- "부담돼요" → 리더에게 concern 플래그
- "다른 역할 선호" → 자유 텍스트 입력 → 리더에게 조정 필요 플래그

### 산출물
`personal_role_understanding` + `role_expectation` + `role_reaction`

---

## 1.7 Screen 6 — Team Dashboard

### 보여주고 싶은 것
"팀의 현재 상태를 한눈에 파악하고, 다음에 해야 할 일이 명확하게 보인다."

### 화면 구성 — 웹 (2컬럼 레이아웃)
```
┌─────────────────────┬─────────────────────────────┐
│   Next Actions      │   팀 스킬 분포 차트          │
│   (Sticky Sidebar)  │   역할 추천 카드              │
│                     │   팀원 상태 리스트            │
│   - 미완료 알림      │   최근 활동 피드              │
│   - CTA 버튼들      │                              │
└─────────────────────┴─────────────────────────────┘
```

### 화면 구성 — 모바일 (단일 스택)
```
┌─────────────────────┐
│ [Phase Indicator]   │ ← SegmentedControl
│ [Next Actions Card] │ ← 접히는 카드
│ [팀 스킬 차트]       │
│ [역할 추천]          │ ← List
│ [팀원 상태]          │ ← List + Badge
│ [최근 활동]          │ ← List
│                     │
│ [킥오프 시작] (FAB)  │ ← Leader만 표시
└─────────────────────┘
```

### SEED 컴포넌트 매핑
- `SegmentedControl` → Phase 전환 탭
- `List` + `Avatar` + `Badge` → 팀원 상태 리스트
- `Callout` → Next Actions 카드
- `FloatingActionButton` → 킥오프 시작 (Leader 전용)
- `ProgressCircle` → 설문 완료율
- `Snackbar` → "박팀원이 설문을 완료했습니다"
- `Skeleton` → 데이터 로딩 상태

### 협업 흐름 (역할별 차이가 큰 화면)
```
Leader:
  ──→ Dashboard 진입
  ──→ 미완료자 확인 → [리마인드 보내기]
  ──→ 전원 완료 시 → [킥오프 시작하기] 활성화
  ──→ 킥오프 시작 ──→ Screen 7

Member:
  ──→ Dashboard 진입
  ──→ 내 pending action 확인 (설문 미완료, 역할 미반응 등)
  ──→ pending action 클릭 → 해당 화면으로 이동
  ──→ 대기 (리더가 킥오프 시작할 때까지)

Observer:
  ──→ Dashboard 진입 (read-only)
  ──→ 팀 상태 읽기
  ──→ 위험 신호 발견 시 → [Review Request] 전송
```

### 게이트 규칙
- 킥오프 시작 조건: **리더 포함 최소 3명 또는 60% 설문 완료**
- 조건 미충족 시 FAB 비활성화 + 이유 표시

### 산출물
`team_readiness` + `role_draft` + `unresolved_readiness_status`

---

## 1.8 Screen 7 — Topic Decision

### 보여주고 싶은 것
"무엇을 만들지 팀원 모두가 참여해서 결정한다. 기술을 몰라도 의견을 낼 수 있다."

### 화면 구성 — 웹
```
┌─────────────────────────────┬─────────────────────────┐
│   프로젝트 브리프 프리뷰     │   AI 브레인스톰 채팅      │
│                             │   (ChatUI)               │
│   - 제목                    │   입력: 직접 / AI 제안     │
│   - 플랫폼                   │                          │
│   - 핵심 기능               │   후보 카드 (2~3개)       │
│   - 복잡도                   │   └ 각 후보에 반응 버튼    │
│                             │                          │
│                             │   [주제 확정] (Leader)    │
└─────────────────────────────┴─────────────────────────┘
```

### 화면 구성 — 모바일
```
┌─────────────────────┐
│ [SegmentedControl]  │ ← "AI 브레인스톰" | "브리프 보기"
│                     │
│ (AI 탭 선택 시)     │
│ AI 채팅 UI          │
│ [직접 입력] [AI 추천]│
│                     │
│ 후보 1: 개발자 도구  │ ← 카드
│ [좋아요][우려][보류]  │ ← ReactionButton
│                     │
│ 후보 2: 데이터 플랫폼│
│ [좋아요][우려][보류]  │
│                     │
│ (브리프 탭 선택 시)  │
│ 프로젝트 요약 문서   │
│                     │
│ [주제 확정] (Leader) │
└─────────────────────┘
```

### SEED 컴포넌트 매핑
- `SegmentedControl` → 탭 전환 (모바일에서 핵심)
- `ReactionButton` → 좋아요/우려/보류 반응
- `Callout` → 후보별 설명 카드
- `BottomSheet` → 우려 사항 입력 (모바일)
- `TextField` → 직접 주제 입력
- `ActionButton` → 주제 확정 (Leader 전용)
- `Badge` → 반응 집계 표시 ("좋아요 3")

### 협업 흐름
```
Leader:
  ──→ 직접 입력 또는 AI 브레인스톰 시작
  ──→ 후보 2~3개 정리
  ──→ 팀원 반응 수집 대기
  ──→ 반응 확인 후 → [주제 확정]
  ──→ Screen 8-A

Member:
  ──→ 후보 목록 확인
  ──→ 각 후보에 반응 남기기 (좋아요/우려/보류)
  ──→ 우려 시 자유 텍스트 입력 가능
  ──→ 대기

Observer:
  ──→ read-only 열람
  ──→ 필요 시 Review Request
```

### AI 개입
- Topic Agent: 팀 스킬 맵 + 직접 입력을 기반으로 프로젝트 후보 생성
- 후보별 난이도, 예상 소요 시간, 팀 역량 적합도 표시

### 게이트 규칙
- 주제 확정 조건: **리더 + 최소 2명 반응**
- 미충족 시 확정 버튼 비활성화

### 산출물
`project_brief` (title, platform, features, complexity)

---

## 1.9 Screen 8-A — Service Structure Inference

### 보여주고 싶은 것
"이 서비스에 어떤 기능적 블록이 필요한지를 시각적으로 이해하고 합의한다."

### 화면 구성 — 웹
```
┌─────────────────────────────┬─────────────────────────┐
│   구조 다이어그램 (시각적)    │   AI 제안 블록 리스트     │
│                             │                          │
│   User → Client UI → API   │   [Client UI] 필수        │
│              → Database     │   [API Server] 필수       │
│              → Auth         │   [Database] 필수         │
│                             │   [Auth] 필수             │
│                             │   [File Storage] 선택     │
│                             │   [Realtime] 선택         │
│                             │                          │
│   팀원 반응 요약             │   각 블록: [승인][거절][보류]│
│   - 박팀원: Realtime 불필요  │                          │
│                             │   [구조 확정] (Leader)    │
└─────────────────────────────┴─────────────────────────┘
```

### 화면 구성 — 모바일
```
┌─────────────────────┐
│ [SegmentedControl]  │ ← "블록 목록" | "다이어그램"
│                     │
│ (블록 목록 탭)       │
│ [Client UI] 필수    │ ← 카드
│ [승인][거절][보류]    │ ← Chip.RadioRoot
│                     │
│ [API Server] 필수   │
│ [승인][거절][보류]    │
│                     │
│ [Database] 필수     │
│ [승인][거절][보류]    │
│                     │
│ [구조 확정] (Leader) │
└─────────────────────┘
```

### SEED 컴포넌트 매핑
- `SegmentedControl` → 탭 전환 (모바일)
- `Chip.RadioRoot` + `Chip.RadioItem` → 승인/거절/보류 반응
- `List` → 블록 리스트
- `Badge` → "필수" / "선택" / "보류가능" 태그
- `Callout` → 블록 설명
- `BottomSheet` → 우려 사항 입력
- `ActionButton` → 구조 확정 (Leader 전용)

### 협업 흐름
```
AI:
  ──→ project_brief + team_skill_map 분석
  ──→ 시스템 블록 제안 (필수/선택/불필요 분류)
  ──→ 구조 다이어그램 생성

Leader:
  ──→ 제안 검토 ──→ 팀원 반응 대기 ──→ [구조 확정]

Member:
  ──→ 각 블록에 승인/거절/보류 반응
  ──→ 거절/보류 시 이유 입력 가능

Observer:
  ──→ read-only
```

### 게이트 규칙
- 구조 확정 조건: **non-observer 과반 반응**

### 산출물
`service_structure_blocks` + `accepted/rejected/optional_blocks` + `structure_diagram`

---

## 1.10 Screen 8-B — Technical Narrowing

### 보여주고 싶은 것
"승인된 시스템 블록에 어떤 기술을 쓸지, 팀 수준에 맞게 좁힌다."

### 화면 구성 — 웹
```
┌─────────────────────────────┬─────────────────────────┐
│   기술 다이어그램             │   블록별 기술 옵션 카드    │
│                             │                          │
│   User → Next.js → NestJS  │   UI → [Next.js] [Vite]  │
│            → PostgreSQL     │   API → [FastAPI] [NestJS]│
│            → NextAuth       │   DB → [PostgreSQL]       │
│                             │                          │
│                             │   조합 A (추천)           │
│   팀원 반응 요약             │   장점: 팀 역량과 맞음    │
│                             │   단점: 학습량 약간       │
│                             │                          │
│                             │   [찬성][우려][학습필요]   │
│                             │   [기술 확정] (Leader)    │
└─────────────────────────────┴─────────────────────────┘
```

### 화면 구성 — 모바일
```
┌─────────────────────┐
│ 기술 추천            │
│                     │
│ UI → Next.js        │ ← 카드 + 설명
│ API → FastAPI       │
│ DB → PostgreSQL     │
│ Auth → NextAuth     │
│                     │
│ [찬성][우려][학습필요]│ ← Chip.RadioRoot
│                     │
│ [다이어그램 보기]    │ ← BottomSheet
│ [기술 확정] (Leader) │
└─────────────────────┘
```

### SEED 컴포넌트 매핑
- `Chip.RadioRoot` → 찬성/우려/학습필요 반응
- `Callout` → 조합별 장단점
- `BottomSheet` → 다이어그램 확대 보기 (모바일)
- `Badge` → "추천" 태그
- `ActionButton` → 기술 확정

### 협업 흐름
```
AI:
  ──→ accepted_blocks + team_skill 분석
  ──→ 기술 조합 1~2개 추천 (팀 수준 반영)
  ──→ 기술 다이어그램 생성

Leader:
  ──→ 조합 비교 ──→ 팀원 반응 대기 ──→ [기술 확정]

Member:
  ──→ 찬성/우려/학습필요 반응
  ──→ "학습 필요"는 팀 내 멘토링 필요 신호

Observer:
  ──→ read-only
```

### 게이트 규칙
- 기술 확정 조건: **리더 최종 확정 + 핵심 블록 과반 반응**

### 산출물
`selected_stack` + `stack_rationale` + `technical_diagram`

---

## 1.11 Screen 9 — Handoff Layer

### 보여주고 싶은 것
"킥오프 결과가 실제 GitHub/문서로 변환되는 순간. 첫 태스크를 고를 수 있다."

### 화면 구성 — 웹
```
┌─────────────────────────────┬─────────────────────────┐
│   설정 항목                  │   생성될 산출물 미리보기   │
│                             │                          │
│   Export Target             │   README.md              │
│   (●) GitHub bundle         │   team-profile.md        │
│   ( ) Webhook               │   stack-decisions.md     │
│                             │   CONTRIBUTING-lite.md   │
│   규칙 강도                  │   ISSUE_TEMPLATE/*.md    │
│   [Relaxed][Standard][Strict]│   PR_TEMPLATE.md        │
│                             │                          │
│   첫 태스크 선호             │                          │
│   [API 세팅][DB 스키마]      │                          │
│   [UI 기본구조]              │                          │
│                             │                          │
│   [템플릿 생성] [내보내기]    │                          │
└─────────────────────────────┴─────────────────────────┘
```

### 화면 구성 — 모바일
```
┌─────────────────────┐
│ 내보내기/연결         │
│                     │
│ Export Target       │
│ [GitHub bundle]     │ ← RadioGroup
│ [Webhook]           │
│                     │
│ 규칙 강도            │
│ [Relaxed][Standard] │ ← SegmentedControl
│                     │
│ 첫 태스크 선호       │
│ [API][DB][UI]       │ ← Chip.Toggle (다중)
│                     │
│ [템플릿 생성]       │
│ [내보내기]          │
└─────────────────────┘
```

### SEED 컴포넌트 매핑
- `RadioGroup` → Export Target 선택
- `SegmentedControl` → 규칙 강도 선택
- `Chip.Toggle` → 첫 태스크 선호 다중 선택
- `List` → 생성될 산출물 목록
- `ActionButton` → 템플릿 생성 / 내보내기

### 협업 흐름
```
Leader:
  ──→ Export 방식 선택 ──→ 규칙 강도 설정
  ──→ [템플릿 생성] ──→ [내보내기]

Member:
  ──→ 생성될 산출물 미리보기
  ──→ 첫 태스크 선호 입력 (내가 먼저 맡을 일)

Observer:
  ──→ read-only preview
```

### 산출물
`handoff_bundle` (README, templates, CONTRIBUTING, etc.)

---

## 1.12 Screen 10 — Kickoff Summary / Contract Gate

### 보여주고 싶은 것
"팀의 모든 결정을 고정하고, 각자가 서명으로 책임을 진다. 이것이 팀 계약이다."

### Batch 구조

**Batch A — 프로젝트 계약**
- Out of Scope 정의
- Success Criteria
- Collaboration Rules
- Sprint Config

**Batch B — 팀원 합의**
- 역할 수락/조정 (Screen 5 반응 기반)
- Concern 제출/해결

**Batch C — 첫 실행 준비**
- First Issues 생성 (AI)
- First Agenda 생성 (AI)
- Mini ADR 생성 (AI)

**Batch D — 서명**
- 전원 서명
- Finalize

### 화면 구성 — 웹
```
┌─────────────────────────────┬─────────────────────────┐
│   Summary 본문 (스크롤)      │   남은 항목 패널 (Sticky)  │
│                             │                          │
│   ▼ Batch A: 프로젝트 계약   │   ⚠ 역할 미수락 2명       │
│     - Out of Scope          │   ⚠ Concern 1건          │
│     - Success Criteria      │   ⚠ Artifact 미생성      │
│     - Collab Rules          │   ⚠ 서명 미완료 3명       │
│     - Sprint Config         │                          │
│                             │   [역할 합의로 이동]       │
│   ▼ Batch B: 팀원 합의       │   [산출물 생성]           │
│     - 역할 수락 상태         │                          │
│     - concern 리스트         │                          │
│                             │                          │
│   ▼ Batch C: 첫 실행 준비    │                          │
│     - first issues          │                          │
│     - first agenda          │                          │
│     - mini ADR              │                          │
│                             │                          │
│   ▼ Batch D: 서명            │                          │
│     - 서명 상태              │                          │
│                             │                          │
│   [최종 확정하기] (Leader)   │                          │
└─────────────────────────────┴─────────────────────────┘
```

### 화면 구성 — 모바일
```
┌─────────────────────┐
│ 킥오프 서약          │
│ 남은 항목 4개        │ ← Callout (경고)
│                     │
│ [남은 역할 수락 2명] │ ← 탭하면 해당 섹션
│ [Concern 1건]       │
│ [산출물 생성 필요]   │
│ [서명 미완료 3명]    │
│                     │
│ ──────────────────  │
│ [프로젝트 계약] ▶   │ ← 각 Batch는
│ [팀원 합의] ▶       │   별도 화면으로 이동
│ [첫 실행 준비] ▶    │   (스택 네비게이션)
│ [서명] ▶            │
│                     │
│ ──────────────────  │
│ [최종 확정하기]      │ ← Leader 전용
└─────────────────────┘
```

### SEED 컴포넌트 매핑
- `Callout` (variant="warning") → 남은 항목 경고
- `List` → Batch별 항목 리스트
- `Badge` → 상태 표시 (완료/미완료/차단)
- `BottomSheet` → Concern 입력, 역할 조정 (모바일)
- `AlertDialog` → Finalize 확인
- `Switch` → 서명 토글
- `ActionButton` → 최종 확정
- `Avatar` + `Badge` → 서명 상태

### 협업 흐름 (가장 복잡한 화면)
```
Leader:
  ──→ Batch A 검토/편집
  ──→ Batch B: 팀원 역할 조정 요청 확인, concern 해결
  ──→ Batch C: [산출물 생성] 클릭 → AI가 first issues/agenda/ADR 생성
  ──→ Batch D: 전원 서명 확인
  ──→ 모든 blocker 해결 시 [최종 확정하기] 활성화
  ──→ Finalize ──→ Screen 11

Member:
  ──→ Batch A 읽기
  ──→ Batch B: 역할 수락/조정, concern 제출
  ──→ Batch C: 산출물 확인
  ──→ Batch D: 서명
  ──→ 대기

Observer:
  ──→ 전체 요약 열람
  ──→ 상태 확인
```

### 게이트 규칙
- Finalize 조건: **리더 + non-observer 75% 서명 + blocker concern 0건**

### 산출물
`kickoff_contract` + `first_execution_set` + `export_bundle`

---

## 1.13 Screen 11 — First Meeting / First-week Execution

### 보여주고 싶은 것
"킥오프가 끝나도 이 제품에 다시 돌아올 이유를 만든다."

### 화면 구성 — 웹/모바일 동일
```
┌─────────────────────┐
│ 첫 회의 안건         │ ← Screen 10의 first_agenda
│                     │
│ ☐ 역할 최종 확인    │ ← Checkbox
│ ☐ 첫 이슈 배분      │
│ ☐ 다음 만남 일정    │
│                     │
│ 회의 기록            │
│ [기록 시작] [요약]   │
│                     │
│ 액션 아이템          │
│ ☐ API 세팅 - 김팀장 │
│ ☑ DB 스키마 - 박팀원 │ ← 완료 표시
│                     │
│ [다음 안건 생성] (AI)│
└─────────────────────┘
```

### SEED 컴포넌트 매핑
- `Checkbox` → 안건 체크, 액션 아이템 완료
- `List` → 안건 리스트, 액션 아이템 리스트
- `Avatar` + `Badge` → 담당자 표시
- `TextField` → 회의 기록
- `ActionButton` → 기록 시작/요약/다음 안건

### 협업 흐름
```
Leader:
  ──→ 첫 회의 시작 ──→ 안건 기반 진행 ──→ 기록 저장
  ──→ AI 요약 요청 ──→ 액션 아이템 확인

Member:
  ──→ 안건 확인 ──→ 액션 아이템 수락/완료

Observer:
  ──→ 요약만 열람
```

### 산출물
`first_meeting_log` + `action_items`

---

# Part 2. 사이트 구조 설계

---

## 2.1 URL 구조

```
/                           → 랜딩 (Screen 1 Login)
/auth/callback              → OAuth 콜백
/role-select                → Screen 2
/team/create                → Screen 3 (Leader)
/team/join                  → Screen 3 (Member/Observer)
/team/[teamId]/survey       → Screen 4
/team/[teamId]/result       → Screen 5
/team/[teamId]/dashboard    → Screen 6
/team/[teamId]/topic        → Screen 7
/team/[teamId]/structure    → Screen 8-A
/team/[teamId]/stack        → Screen 8-B
/team/[teamId]/handoff      → Screen 9
/team/[teamId]/contract     → Screen 10
/team/[teamId]/meeting      → Screen 11

/observer/[teamId]          → Observer 전용 대시보드
```

## 2.2 레이아웃 구조

### 웹 (Desktop ≥ 1024px)
```
┌─────────────────────────────────────────────┐
│  AppBar (로고, 팀명, 현재 Phase, 프로필)      │
├──────────┬──────────────────────────────────┤
│ Sidebar  │  Main Content                    │
│ (Phase   │  (Screen별 컨텐츠)                │
│  Nav)    │                                  │
│          │  ┌────────────┬─────────────┐    │
│          │  │ 본문       │ 보조 패널    │    │
│          │  │            │ (채팅/상태)  │    │
│          │  └────────────┴─────────────┘    │
└──────────┴──────────────────────────────────┘
```

### 모바일 (< 768px)
```
┌─────────────────────┐
│ AppBar (최소화)       │
├─────────────────────┤
│ Phase Indicator     │ ← SegmentedControl
├─────────────────────┤
│                     │
│  Main Content       │
│  (단일 스택)         │
│                     │
├─────────────────────┤
│ Bottom Nav          │
│ [대시보드][채팅][내정보] │
└─────────────────────┘
```

### SEED 컴포넌트 기반 레이아웃
- `AppBar` (AppBarMain, AppBarLeft, AppBarRight) → 상단 네비게이션
- `SegmentedControl` → Phase 전환 (모바일)
- `BottomSheet` → 모바일에서 보조 패널 대체
- `VStack`, `HStack`, `Box` → 레이아웃 구성
- `Divider` → 섹션 구분

## 2.3 웹 vs 모바일 핵심 차이

| 패턴 | 웹 | 모바일 |
|------|-----|--------|
| 2패널 레이아웃 | Sidebar + Main | 단일 스택 + BottomSheet |
| Phase 네비게이션 | 좌측 Sidebar | 상단 SegmentedControl |
| 보조 정보 | 우측 Sticky 패널 | BottomSheet 또는 별도 화면 |
| 반응 입력 | 인라인 버튼 | BottomSheet 내 입력 |
| 차트 | 인라인 표시 | 터치로 확대 가능 |
| CTA | 컨텐츠 하단 | 하단 고정 (sticky bottom) |
| 알림 | Snackbar (상단) | Snackbar (하단) |

---

# Part 3. 기술 아키텍처

---

## 3.1 기술 스택

| 레이어 | 기술 | 이유 |
|--------|------|------|
| Frontend | Next.js 14+ (App Router) | SSR/SSG, API Routes, 풍부한 생태계 |
| UI | @seed-design/react + Tailwind CSS | SEED 컴포넌트 기본, 커스텀은 Tailwind |
| 상태 관리 | Zustand + TanStack Query | 클라이언트 상태 + 서버 상태 분리 |
| 실시간 | Socket.IO (client) | 합류 알림, 반응 실시간 반영 |
| Backend | FastAPI (Python 3.11+) | 파이썬 메인 언어, 비동기 지원, AI 통합 용이 |
| ORM | SQLAlchemy 2.0 + Alembic | 비동기 ORM, 마이그레이션 |
| Database | PostgreSQL 16 | JSONB 지원, 복잡 쿼리, 확장성 |
| Cache | Redis | 세션, 실시간 상태, 게이트 체크 캐싱 |
| AI | OpenAI API / Anthropic API | 스킬 분석, 브레인스톰, 산출물 생성 |
| Auth | NextAuth.js | Google/GitHub/Kakao OAuth |
| Deploy | Vercel (FE) + Railway/Render (BE) | 학부 프로젝트 수준 비용 |
| File Storage | Supabase Storage 또는 S3 | 이력서 PDF 업로드 |

## 3.2 시스템 아키텍처

```
                    ┌──────────────┐
                    │   Client     │
                    │  (Next.js)   │
                    └──────┬───────┘
                           │ HTTPS
                    ┌──────▼───────┐
                    │  Next.js     │
                    │  API Routes  │──── NextAuth (OAuth)
                    └──────┬───────┘
                           │ HTTP/WebSocket
                    ┌──────▼───────┐
                    │   FastAPI    │
                    │   Backend    │
                    └──┬───┬───┬──┘
                       │   │   │
              ┌────────┘   │   └────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │PostgreSQL│ │  Redis   │ │ AI APIs  │
        │          │ │          │ │(OpenAI/  │
        │          │ │          │ │Anthropic)│
        └──────────┘ └──────────┘ └──────────┘
```

### 왜 Next.js API Routes + FastAPI 분리?

Next.js API Routes는 인증, BFF(Backend for Frontend) 역할만 수행하고,
무거운 로직(AI 호출, 스킬 벡터 계산, 산출물 생성)은 FastAPI가 담당한다.
파이썬이 메인 언어이므로 핵심 로직을 파이썬으로 작성하면서도
프론트엔드와의 연동은 Next.js가 프록시 역할을 한다.

## 3.3 API 설계 (주요 엔드포인트)

```
# Auth
POST   /api/auth/[...nextauth]       → NextAuth 처리

# Team
POST   /api/teams                     → 팀 생성
GET    /api/teams/:teamId             → 팀 정보
POST   /api/teams/:teamId/join        → 팀 합류
GET    /api/teams/:teamId/members     → 팀원 목록

# Survey
POST   /api/teams/:teamId/survey      → 설문 제출
PATCH  /api/teams/:teamId/survey/draft → 설문 임시 저장
GET    /api/teams/:teamId/survey/status → 설문 완료 현황

# AI Analysis
POST   /api/teams/:teamId/analyze     → 스킬 분석 트리거
GET    /api/teams/:teamId/result/:userId → 개인 결과
GET    /api/teams/:teamId/readiness   → 팀 readiness

# Kickoff Flow
POST   /api/teams/:teamId/topic       → 주제 후보 생성
POST   /api/teams/:teamId/topic/react  → 주제 반응
POST   /api/teams/:teamId/topic/confirm → 주제 확정

POST   /api/teams/:teamId/structure    → 구조 블록 제안
POST   /api/teams/:teamId/structure/react → 구조 반응
POST   /api/teams/:teamId/structure/confirm → 구조 확정

POST   /api/teams/:teamId/stack        → 기술 추천
POST   /api/teams/:teamId/stack/react   → 기술 반응
POST   /api/teams/:teamId/stack/confirm → 기술 확정

# Handoff
POST   /api/teams/:teamId/handoff/generate → 템플릿 생성
POST   /api/teams/:teamId/handoff/export   → 내보내기

# Contract
GET    /api/teams/:teamId/contract     → 계약 상태
POST   /api/teams/:teamId/contract/concern → concern 제출
POST   /api/teams/:teamId/contract/role-accept → 역할 수락
POST   /api/teams/:teamId/contract/sign → 서명
POST   /api/teams/:teamId/contract/finalize → 최종 확정

# Meeting
POST   /api/teams/:teamId/meeting      → 회의 기록
POST   /api/teams/:teamId/meeting/summarize → AI 요약
PATCH  /api/teams/:teamId/meeting/actions/:actionId → 액션 아이템 상태 변경

# WebSocket
WS     /ws/teams/:teamId              → 실시간 이벤트
```

---

# Part 4. 데이터베이스 ERD

---

## 4.1 핵심 테이블 구조

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│    users     │     │    teams     │     │  team_members    │
├──────────────┤     ├──────────────┤     ├──────────────────┤
│ id (PK)      │     │ id (PK)      │     │ id (PK)          │
│ email        │     │ name         │     │ user_id (FK)     │
│ name         │     │ description  │     │ team_id (FK)     │
│ avatar_url   │     │ invite_code  │     │ role (enum)      │
│ provider     │     │ max_members  │     │ joined_at        │
│ provider_id  │     │ phase (enum) │     │ status (enum)    │
│ created_at   │     │ created_at   │     └──────────────────┘
│ updated_at   │     │ updated_at   │
└──────────────┘     │ leader_id(FK)│
                     └──────────────┘

┌──────────────────┐     ┌──────────────────┐
│  survey_responses│     │  skill_profiles  │
├──────────────────┤     ├──────────────────┤
│ id (PK)          │     │ id (PK)          │
│ member_id (FK)   │     │ member_id (FK)   │
│ section (int)    │     │ skill_vector     │
│ answers (JSONB)  │     │   (JSONB)        │
│ status (enum)    │     │ recommended_roles│
│   draft/submitted│     │   (JSONB)        │
│ created_at       │     │ strengths (JSONB)│
│ updated_at       │     │ growth_areas     │
└──────────────────┘     │   (JSONB)        │
                         │ created_at       │
                         └──────────────────┘

┌──────────────────┐     ┌──────────────────┐
│  role_reactions  │     │  topic_candidates│
├──────────────────┤     ├──────────────────┤
│ id (PK)          │     │ id (PK)          │
│ member_id (FK)   │     │ team_id (FK)     │
│ recommended_role │     │ title            │
│ reaction (enum)  │     │ description      │
│   accept/concern/│     │ platform         │
│   prefer_other   │     │ features (JSONB) │
│ prefer_text      │     │ complexity       │
│ created_at       │     │ is_confirmed     │
└──────────────────┘     │ created_at       │
                         └──────────────────┘

┌──────────────────┐     ┌──────────────────┐
│ topic_reactions  │     │ structure_blocks │
├──────────────────┤     ├──────────────────┤
│ id (PK)          │     │ id (PK)          │
│ candidate_id(FK) │     │ team_id (FK)     │
│ member_id (FK)   │     │ block_name       │
│ reaction (enum)  │     │ category (enum)  │
│   like/concern/  │     │   required/      │
│   hold           │     │   optional/skip  │
│ concern_text     │     │ status (enum)    │
│ created_at       │     │   accepted/      │
└──────────────────┘     │   rejected/hold  │
                         │ created_at       │
                         └──────────────────┘

┌──────────────────┐     ┌──────────────────┐
│ block_reactions  │     │ stack_selections │
├──────────────────┤     ├──────────────────┤
│ id (PK)          │     │ id (PK)          │
│ block_id (FK)    │     │ team_id (FK)     │
│ member_id (FK)   │     │ block_id (FK)    │
│ reaction (enum)  │     │ technology       │
│   approve/reject/│     │ rationale        │
│   hold/concern   │     │ is_confirmed     │
│ concern_text     │     │ created_at       │
│ created_at       │     └──────────────────┘
└──────────────────┘

┌──────────────────┐     ┌──────────────────┐
│ stack_reactions  │     │ contracts        │
├──────────────────┤     ├──────────────────┤
│ id (PK)          │     │ id (PK)          │
│ selection_id(FK) │     │ team_id (FK)     │
│ member_id (FK)   │     │ out_of_scope     │
│ reaction (enum)  │     │   (JSONB)        │
│   agree/concern/ │     │ success_criteria │
│   need_learning  │     │   (JSONB)        │
│ concern_text     │     │ collab_rules     │
│ created_at       │     │   (JSONB)        │
└──────────────────┘     │ sprint_config    │
                         │   (JSONB)        │
                         │ status (enum)    │
                         │   draft/finalized│
                         │ finalized_at     │
                         │ created_at       │
                         └──────────────────┘

┌──────────────────┐     ┌──────────────────┐
│ contract_signs   │     │ concerns         │
├──────────────────┤     ├──────────────────┤
│ id (PK)          │     │ id (PK)          │
│ contract_id (FK) │     │ team_id (FK)     │
│ member_id (FK)   │     │ member_id (FK)   │
│ signed_at        │     │ content          │
│ role_accepted    │     │ status (enum)    │
│ role_adjusted    │     │   open/resolved/ │
│ adjusted_to      │     │   blocked        │
└──────────────────┘     │ resolved_by (FK) │
                         │ resolved_at      │
                         │ created_at       │
                         └──────────────────┘

┌──────────────────┐     ┌──────────────────┐
│ artifacts        │     │ meetings         │
├──────────────────┤     ├──────────────────┤
│ id (PK)          │     │ id (PK)          │
│ team_id (FK)     │     │ team_id (FK)     │
│ type (enum)      │     │ agenda (JSONB)   │
│   first_issue/   │     │ notes            │
│   first_agenda/  │     │ summary          │
│   mini_adr/      │     │ created_at       │
│   handoff_bundle │     │ ended_at         │
│ content (JSONB)  │     └──────────────────┘
│ status (enum)    │
│   generated/     │     ┌──────────────────┐
│   confirmed      │     │ action_items     │
│ created_at       │     ├──────────────────┤
└──────────────────┘     │ id (PK)          │
                         │ meeting_id (FK)  │
                         │ assignee_id (FK) │
                         │ title            │
                         │ status (enum)    │
                         │   open/done      │
                         │ created_at       │
                         │ completed_at     │
                         └──────────────────┘
```

## 4.2 Enum 정의

```python
class TeamRole(str, Enum):
    LEADER = "leader"
    MEMBER = "member"
    OBSERVER = "observer"

class TeamPhase(str, Enum):
    FORMING = "forming"           # Screen 3
    ASSESSING = "assessing"       # Screen 4
    READY = "ready"               # Screen 6
    TOPIC_DECIDING = "topic"      # Screen 7
    STRUCTURING = "structuring"   # Screen 8-A
    STACKING = "stacking"         # Screen 8-B
    HANDING_OFF = "handoff"       # Screen 9
    CONTRACTING = "contracting"   # Screen 10
    EXECUTING = "executing"       # Screen 11

class SurveyStatus(str, Enum):
    NOT_STARTED = "not_started"
    DRAFT = "draft"
    SUBMITTED = "submitted"

class MemberStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
```

## 4.3 JSONB 활용 전략

JSONB를 쓰는 이유: 설문 답변, 스킬 벡터, 프로젝트 브리프 등은
스키마가 자주 변경될 수 있고, 중첩 구조가 깊다.
PostgreSQL의 JSONB는 인덱싱이 가능하면서도 유연한 스키마를 제공한다.

```python
# skill_vector 예시
{
    "backend": 4.2,
    "frontend": 2.8,
    "database": 3.9,
    "devops": 1.5,
    "design": 0.8,
    "ai_ml": 2.1
}

# survey_answers 예시
{
    "experience_level": "intermediate",
    "languages": ["python", "javascript", "sql"],
    "frameworks": ["fastapi", "react"],
    "proficiency": {"python": 4, "javascript": 3},
    "project_count": "3-5",
    "git_level": "branch_merge",
    "available_hours": 20,
    "preferred_times": ["evening", "weekend"]
}
```

---

# Part 5. 핵심 플로우 상세

---

## 5.1 Phase 전이 플로우

```
FORMING ──────────────────→ ASSESSING
  조건: 리더 포함 2명 이상 합류

ASSESSING ────────────────→ READY
  조건: 리더 포함 60% 이상 설문 완료

READY ────────────────────→ TOPIC_DECIDING
  조건: 리더가 "킥오프 시작" 클릭

TOPIC_DECIDING ───────────→ STRUCTURING
  조건: 리더 + 2명 이상 반응 + 주제 확정

STRUCTURING ──────────────→ STACKING
  조건: non-observer 과반 반응 + 구조 확정

STACKING ─────────────────→ HANDING_OFF
  조건: 핵심 블록 과반 반응 + 기술 확정

HANDING_OFF ──────────────→ CONTRACTING
  조건: 템플릿 생성 완료

CONTRACTING ──────────────→ EXECUTING
  조건: 75% 서명 + blocker 0건 + finalize
```

## 5.2 리마인드 / 타임아웃 흐름

비동기 운영에서 가장 중요한 것은 "멈춤 방지"이다.

```
[멤버 미응답 24시간]
  → 리더에게 "리마인드 보내기" CTA 활성화
  → 리마인드 전송 (이메일/앱 내 알림)

[멤버 미응답 48시간]
  → 리더에게 "스킵하고 진행" 옵션 표시
  → 스킵 시 해당 멤버의 반응은 "보류"로 자동 처리

[리더 미활동 72시간]
  → 팀원에게 "리더에게 알림 보내기" CTA 표시
  → Observer에게 상태 알림
```

## 5.3 Observer 동선

```
Login → Role Select (Observer) → Team Join
  → Team Dashboard (read-only)
    ├→ 팀 진행 상태 확인
    ├→ 위험 신호 확인 (concern 미해결, 미응답 팀원)
    ├→ 산출물 열람 (계약서, first issues 등)
    └→ Review Request 전송 (리더에게)

접근 가능한 화면:
  ✅ Screen 6 (Dashboard) — 팀 상태, 스킬 분포
  ✅ Screen 7~8 — 주제/구조/기술 결정 열람
  ✅ Screen 10 — 계약 요약 열람
  ✅ Screen 11 — 회의 요약 열람

접근 불가:
  ❌ Screen 4 — 개인 설문 원문
  ❌ Screen 5 — 개인 결과
  ❌ 개인 confidence 세부 수치
```

---

# Part 6. 시장 평가

---

## 6.1 타겟 시장 정의

### 1차 타겟: 한국 대학 팀 프로젝트
- 한국 4년제 대학 약 190개교
- SW 관련 학과 팀 프로젝트: 학기당 약 2~4회
- 한 학과당 30~50명 → 8~12팀
- 연간 접근 가능 인원: 수만~수십만 명

### 2차 타겟: 부트캠프
- 2026년 기준 첨단산업 부트캠프 88개교 (교육부 지원)
- 민간 부트캠프: 멋쟁이사자처럼, 내일배움캠프, 우아한테크코스, 삼성 SSAFY 등
- 교당 100~300명 규모
- 팀 프로젝트가 교육의 핵심 요소

### 3차 타겟: 해커톤/사이드 프로젝트
- 해커톤 참가자들의 즉석 팀 빌딩
- 사이드 프로젝트 커뮤니티 (디프만, SOPT, YAPP 등)

## 6.2 핵심 Pain Point

| Pain Point | 심각도 | TeamForge 해결 방식 |
|------------|--------|-------------------|
| 팀원 역량을 모르는 상태에서 시작 | ★★★★★ | AI 스킬 분석 + 역할 추천 |
| 누가 뭘 할지 모호한 채로 진행 | ★★★★★ | 역할 수락/조정 + 계약 서명 |
| kickoff가 구두 합의로 끝남 | ★★★★ | 구조화된 계약서 생성 |
| 기술 스택 결정에 시간 낭비 | ★★★★ | AI 기반 기술 추천 |
| 무임승차자 관리 어려움 | ★★★ | 참여 흔적 강제 + 반응 기록 |
| 첫 주에 뭘 해야 할지 모름 | ★★★★ | First Issues + First Agenda 자동 생성 |

## 6.3 경쟁 도구 비교

| 도구 | 역할 | kickoff 지원 | 역량 분석 | 계약 | 비용 |
|------|------|-------------|----------|------|------|
| **Notion** | 문서/위키 | 템플릿 수동 | ❌ | ❌ | 무료~$10/월 |
| **GitHub Projects** | 이슈 관리 | ❌ | ❌ | ❌ | 무료 |
| **Jira** | 프로젝트 관리 | ❌ | ❌ | ❌ | 무료~$8/월 |
| **Linear** | 이슈 트래킹 | ❌ | ❌ | ❌ | 무료 |
| **Miro** | 화이트보드 | 템플릿 수동 | ❌ | ❌ | 무료~$8/월 |
| **Monday.com** | 워크 OS | 부분 | ❌ | ❌ | $8/월 |
| **TeamForge** | **kickoff 전문** | **✅ AI 자동화** | **✅** | **✅** | **무료(계획)** |

### 핵심 차별점

기존 도구들은 모두 **"프로젝트가 이미 시작된 이후"**를 다룬다.
TeamForge는 **"프로젝트가 시작되기 전"**의 공백을 채운다.

```
기존 도구가 다루는 영역:
                    ├─── 개발 ───── 배포 ───── 유지보수 ──→
                    
TeamForge가 다루는 영역:
├─── 팀 구성 ─── kickoff ─── 첫 주 ───┤
                                      ↓
                              기존 도구로 handoff
```

## 6.4 시장 크기 추정 (Bottom-up)

### 한국 대학 시장
- 대상: SW 관련 학과 팀 프로젝트
- 접근 가능 팀 수: 약 5,000~10,000팀/년
- 초기 무료, 이후 프리미엄 (AI 분석 고급 기능)

### 부트캠프 시장
- 88개교 (교육부) + 민간 20+개
- 교당 50~100팀/년
- B2B 라이선스 가능: 교육 기관에 일괄 제공
- 가격: 팀당 $5~10/월 또는 기관당 정액제

### TAM/SAM/SOM
```
TAM (전체 시장): 전 세계 팀 프로젝트 kickoff 도구 시장
  → 프로젝트 관리 SaaS 시장의 부분 집합
  → 추정: $1B+ (2026 기준)

SAM (접근 가능 시장): 한국 대학 + 부트캠프 + 해커톤
  → 연간 약 10,000~30,000팀
  → 팀당 $5~10/월 기준: $600K~$3.6M/년

SOM (초기 목표): 파일럿 100~150명 (25~35팀)
  → 무료 운영으로 PMF 검증
  → 첫 해 목표: 500팀 사용
```

## 6.5 비즈니스 모델 방향

| 단계 | 모델 | 수익원 |
|------|------|--------|
| 파일럿 | 무료 | 없음 (PMF 검증) |
| 초기 성장 | Freemium | AI 고급 분석, 무제한 팀 |
| 기관 판매 | B2B SaaS | 대학/부트캠프 기관 라이선스 |
| 확장 | API/플랫폼 | LMS 연동, 외부 도구 통합 |

## 6.6 리스크와 대응

| 리스크 | 심각도 | 대응 |
|--------|--------|------|
| kickoff 후 이탈 (Handoff 이후 안 돌아옴) | ★★★★★ | Screen 11 retention loop + 주간 요약 리포트 |
| 무료 사용자의 유료 전환 어려움 | ★★★★ | 기관 B2B에 집중 (교수/운영자가 결정권) |
| AI 추천 품질 불신 | ★★★ | 추천은 참고, 최종 결정은 인간이 한다는 원칙 |
| 대학생 개인정보 민감도 | ★★★ | Observer에게 개인 데이터 비공개 정책 |
| Notion/GitHub에 이미 익숙함 | ★★★★ | 대체가 아닌 보완: "kickoff를 하고 Notion으로 넘긴다" |

---

# Part 7. 결론 및 권장사항

---

## 7.1 즉시 실행 가능한 MVP 범위

전체 11개 Screen을 한 번에 완성하는 것은 비현실적이다.
다음 순서로 점진적 구축을 권장한다.

### Sprint 1 (2주): 핵심 루프
Screen 1~6 (Login → Dashboard)
→ "팀 구성 + 스킬 분석 + 역할 추천"만으로도 가치 검증 가능

### Sprint 2 (2주): kickoff 핵심
Screen 7 + 8-A/8-B (Topic → Stack)
→ "무엇을, 어떻게 만들지" 결정 흐름

### Sprint 3 (2주): 계약 + handoff
Screen 9 + 10 (Handoff → Contract)
→ "합의를 고정하고 외부로 넘기기"

### Sprint 4 (1주): retention
Screen 11 (First Meeting)
→ "첫 주 운영"

## 7.2 SEED Design 채택 권장사항

SEED Design을 "그대로" 쓰되 다음을 보충한다:

1. **차트 라이브러리**: recharts (SEED 토큰 색상 적용)
2. **2패널 레이아웃**: Tailwind CSS로 커스텀 (SEED에 없는 패턴)
3. **실시간 알림**: Socket.IO + SEED Snackbar 조합
4. **다이어그램**: Mermaid.js 또는 React Flow (SEED에 없는 패턴)

## 7.3 성장 관점 조언

이 프로젝트는 학부생 포트폴리오로서 다음을 증명할 수 있다:

1. **제품 사고력**: "kickoff"라는 공백을 발견하고 구조화한 것
2. **시스템 설계력**: 역할 기반 접근 제어, 비동기 협업, 게이트 규칙
3. **기술 통합력**: Next.js + FastAPI + PostgreSQL + AI API + 실시간
4. **디자인 시스템 활용력**: SEED Design 기반 일관된 UI

가장 중요한 것은 **100~150명 파일럿을 실제로 돌려보는 것**이다.
문서가 아무리 완벽해도 실제 사용자 피드백 없이는 PMF를 알 수 없다.

---

*끝.*
