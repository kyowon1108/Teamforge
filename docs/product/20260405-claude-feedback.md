# TeamForge — Screen 1~10 플로우 정의 (스펙 + 구현 현황)

> **스펙 문서와 실제 구현 코드를 대조**하여 작성.
> 각 항목에 구현 상태 표시: ✅ 구현 완료 / ⚠️ 부분 구현 / ⬜ 미구현
> 역할: **팀장(Leader)** / **팀원(Member)** / **옵저버(Observer)**

---

## 전체 플로우 (구현 기준)

```
[1] 로그인                                          ✅
    ↓ isNewUser=true
[2] 역할 선택                                       ✅
    ↓ leader             ↓ member/observer
[3a] 팀 생성       [3b] 팀 참가 (코드 입력)          ✅
    ↓                    ↓ member         ↓ observer
[4] 스킬 설문            [4] 설문         [6] 대시보드  ✅
    ↓
[5] 개인 결과                                       ✅
    ↓
[6] 팀 대시보드                                     ⚠️
    ↓ (팀장이 킥오프 시작)
[7] 킥오프 — 주제 결정 (topic)                       ✅
    ↓
[8] 킥오프 — 아키텍처 (architecture)                 ✅
    ↓
[9] 킥오프 — 도구 세팅                              ⬜ 전체 미구현
    ↓
[10] 킥오프 — 최종 요약 (summary)                    ⚠️
```

> **Screen 9:** 페이지 파일 미존재. 현재 킥오프는 `architecture → summary`로 직접 연결됨.

---

## Screen 1 — 소셜 로그인 ✅

**파일:** `app/login/page.tsx`

### 스펙

- **OAuth 제공자:** Google / GitHub / Kakao
- **Kakao 비활성화:** `KAKAO_CLIENT_ID` 환경변수 비어있으면 버튼 `disabled` + "준비 중" 뱃지
- **Kakao 이메일 처리:** 비즈앱 미승인 시 이메일 미제공 → `kakao_{providerAccountId}@kakao.teamforge.dev` 합성
- **백엔드 세션 교환:** `/auth/session-exchange` 호출 → accessToken + refreshToken 발급
- **JWT 전략:** accessToken 15분, refreshToken 7일 (HttpOnly cookie)
- **토큰 자동 갱신:** `lib/api-client.ts`에서 401 감지 시 `/auth/refresh` 자동 호출

### 구현 현황

| 기능 | 상태 | 비고 |
|------|------|------|
| OAuth 3종 (Google, GitHub, Kakao) | ✅ | |
| Kakao 환경변수 기반 활성화/비활성화 | ✅ | |
| callbackUrl 쿼리 파라미터 지원 | ✅ | 초대 URL 진입 시 로그인 후 복귀 |
| 에러 메시지 (`api_unavailable`) | ✅ | "서버에 연결할 수 없어요" |
| 서비스 소개 bullet | ✅ | 하단 3개 |
| 백엔드 세션 교환 | ✅ | `/auth/session-exchange` |
| JWT 전략 (access 15분 / refresh 7일) | ✅ | |
| 토큰 자동 갱신 (401 → refresh) | ✅ | `lib/api-client.ts` |

### 루트 리다이렉트 로직 (`app/page.tsx`)

```
비로그인                     → /login
로그인, teamforgeToken 없음  → /login (재인증)
/auth/me 호출 성공:
  observer + teamId 있음    → /team/{teamId}
  leader + survey 완료      → /team/{teamId}
  survey 완료 (member)      → /result
  팀 있음 + survey 미완료   → /survey
  팀 없음                   → /onboarding/role
API 연결 실패               → /login?error=api_unavailable
```

### 역할별 차이

로그인 화면은 역할 무관 동일. 이후 분기는 루트 리다이렉트가 처리.

---

## Screen 2 — 역할 선택 ✅

**파일:** `app/onboarding/role/page.tsx`

### 스펙

- 카드 3종: Leader / Member / Observer
- 각 역할 설명 + 특징 bullet
- 선택 시: `border: 2px solid var(--tf-stroke-brand)` + `bg: var(--tf-bg-info)` + 체크 아이콘
- Observer 강조: 회색 톤, "읽기 전용" 제한 표현
- 서비스 튜토리얼: 첫 진입 시 tooltip walkthrough 3~4단계 (모바일: Bottom Sheet)
- CTA: "역할 선택하고 시작하기" — 선택 전 disabled

### 구현 현황

| 기능 | 상태 | 비고 |
|------|------|------|
| 역할 카드 3개 (Crown/User/Eye 아이콘) | ✅ | |
| 각 카드 설명 + 특징 bullet | ✅ | |
| 선택 시 하이라이트 + 버튼 활성화 | ✅ | |
| 이미 팀 있는 경우 "이어서 진행하기" 배너 | ✅ | `/auth/me`로 기존 상태 감지 |
| 역할 저장 (localStorage) | ✅ | `userRole` |
| 서비스 튜토리얼 (tooltip walkthrough) | ⬜ | 미구현 |

### 선택 후 라우팅

- Leader → `/team/create`
- Member / Observer → `/team/join`

---

## Screen 3a — 팀 생성 (Leader 전용) ✅

**파일:** `app/team/create/page.tsx`

### 스펙

- 입력: 팀 이름(필수), 한 줄 소개(선택), 예상 인원 2~6명 버튼 그룹
- 초대 코드: 6자리 숫자, DB unique index
- 초대 URL: `https://teamforge.app/join/{inviteCode}`
- 복사 버튼: 코드 복사 / 링크 복사 각각
- 실시간 합류 현황: Socket.io broadcast → "1/4명 대기 중" pulse 애니메이션
- API: `POST /teams` → `{ name, description?, expectedSize }`
- 에러: 팀명 중복 → `TEAM_NAME_DUPLICATE` (409)

### 구현 현황

| 기능 | 상태 | 비고 |
|------|------|------|
| 입력 폼 (이름, 소개, 인원) | ✅ | 기본값 4명 |
| 초대 코드 6자리 표시 | ✅ | |
| "코드 복사" / "링크 복사" 버튼 별도 | ✅ | |
| 실시간 합류 현황 (Socket.io `member:joined`) | ✅ | pulse 애니메이션 |
| 최근 합류 팀원 목록 (이름+역할) | ✅ | |
| "설문 시작하기" 버튼 | ✅ | → `/survey` |
| API `POST /teams` | ✅ | |
| teamId localStorage 저장 | ✅ | |
| 팀 생성 후 정보 수정 | ⬜ | 이름/소개/인원 편집 불가 |
| 초대 코드 만료 설정 | ⬜ | |

---

## Screen 3b — 팀 참가 (Member / Observer) ✅

**파일:** `app/team/join/page.tsx`, `app/team/join/[code]/page.tsx`

### 스펙

- 6자리 개별 Input 박스 (자동 포커스 이동)
- 붙여넣기 감지: 6자리 한 번에 붙여넣기 → 자동 분배
- `inputmode="numeric"` (모바일 숫자 키패드)
- 팀 이름 미리보기: 유효 코드 입력 시 표시 (`GET /teams/validate-code/{code}`)
- 에러: `INVITE_CODE_NOT_FOUND` / `INVITE_CODE_EXPIRED` / `ALREADY_TEAM_MEMBER`
- Observer: 합류 후 설문 없이 팀 대시보드로

### 구현 현황

| 기능 | 상태 | 비고 |
|------|------|------|
| 6자리 개별 Input + 자동 포커스 | ✅ | |
| 붙여넣기 감지 (6자리 자동 분배) | ✅ | |
| 에러 처리 (NOT_FOUND, EXPIRED, ALREADY_MEMBER) | ✅ | |
| `TEAM_FULL` 에러 처리 | ✅ | 스펙에 없던 추가 구현 |
| URL 직접 진입 (`/team/join/[code]`) | ✅ | 미로그인 시 callbackUrl 처리 |
| `ALREADY_TEAM_MEMBER` 시 실제 상태 확인 후 라우팅 | ✅ | `/auth/me` 호출 |
| 합류 후 라우팅 (member→설문, observer→대시보드) | ✅ | |
| 팀 이름 미리보기 | ⬜ | `teamPreview` state 존재하나 값 세팅 로직 없음 |

---

## Screen 4 — 스킬 설문 ✅

**파일:** `app/survey/page.tsx`

### 스펙 — 6섹션 15문항, ~5분

#### 섹션 1: 기본 정보 + 경험 수준 (~30s, 2Q)

| # | 질문 | 유형 | Output |
|---|------|------|--------|
| Q1 | 개발을 시작한 지 얼마나 되었나요? | 5-radio | `experience_tier` (1~5) |
| Q2 | 현재 본인을 가장 잘 설명하는 것은? | 5-radio | `background_type` |

Q1 선택지: 6개월 미만 / 6개월~1년 / 1~2년 / 2~4년 / 4년 이상
Q2 선택지: CS/SW 전공 학부생 / 비전공이지만 개발 학습 중 / 부트캠프 수료 / 현업 개발자(인턴 포함) / PM·디자이너(개발 경험 있음)

#### 섹션 2: 기술 스택 + 숙련도 (~90s, 3Q)

| # | 질문 | 유형 | Output |
|---|------|------|--------|
| Q3 | 경험해 본 기술을 모두 선택하세요 | multi-select (카테고리별) | `tech_stack_list[]` |
| Q4 | 선택한 기술별 숙련도 | slider 1~5 (Q3 기반 동적) | `skill_ratings{}` |
| Q5 | 자신 있는 영역 Top 2 순서 선택 | rank | `top_strengths[2]` |

Q3 기술 목록:
```
LANGUAGE:  JavaScript/TS, Python, Java, C/C++, Go, Kotlin, Rust, Dart
FRONTEND:  React, Next.js, Vue, Svelte, Flutter, React Native
BACKEND:   NestJS, Express, Spring Boot, Django, FastAPI, Go Fiber
DATABASE:  PostgreSQL, MySQL, MongoDB, Redis, Firebase, Supabase
INFRA:     Docker, GitHub Actions, AWS, GCP, Vercel, Kubernetes
AI/DATA:   PyTorch, TensorFlow, LangChain, Pandas, scikit-learn, Hugging Face
DESIGN:    Figma, Photoshop, Blender, Unity
```

Q4 숙련도 기준: 1(튜토리얼) / 2(간단한 프로젝트) / 3(팀 프로젝트 기여) / 4(주도적 설계) / 5(멘토링 가능)

#### 섹션 3: 프로젝트 경험 (~60s, 3Q)

| # | 질문 | 유형 | Output |
|---|------|------|--------|
| Q6 | 완성한 프로젝트 수 | 4-radio | `project_count` |
| Q7 | 최근 프로젝트 역할 (Q6≥1) | multi-select | `actual_roles[]` |
| Q8 | Git 협업 경험 레벨 | 5-radio (계단식) | `git_collab_level` (0~4) |

Q8 Git 레벨 + 자동 제공 가이드:
- 0: Git 안 써봄 → Git 기초 튜토리얼
- 1: 혼자 add/commit/push → 브랜칭 가이드
- 2: branch + merge → 기본 워크플로우
- 3: PR 기반 코드 리뷰 → GitHub Flow
- 4: 전략적 브랜칭 → 고급 옵션

#### 섹션 4: 협업 스타일 (~45s, 3Q)

| # | 질문 | 유형 | Output |
|---|------|------|--------|
| Q9 | 팀에서 나는 주로... | 5-radio (Archetype) | `work_archetype` |
| Q10 | 선호 작업 방식 | 양극 슬라이더 3개 | `work_style_vector[3]` |
| Q11 | 맡고 싶은 역할 | 1순위+2순위 선택 | `desired_roles[1~2]` |

Q9 Archetype: Initiator / Architect / Executor / Coordinator / Documenter
Q10 축: 혼자↔함께, 프로토타입↔설계, 새기술↔익숙한기술 (각 0~100)

#### 섹션 5: 가용 시간 (~30s, 2Q)

| # | 질문 | 유형 | Output |
|---|------|------|--------|
| Q12 | 주당 투입 가능 시간 | 4-radio | `weekly_hours` |
| Q13 | 팀원들이 알았으면 하는 것 | textarea (선택) | `free_text` → AI 키워드 추출 |

#### 섹션 6: 포트폴리오 (~30s, 2Q, optional)

| # | 질문 | 유형 | Output |
|---|------|------|--------|
| Q14 | 이력서 PDF 업로드 | file upload | `resume_data{}` (AI 파싱) |
| Q15 | GitHub URL | text input | `github_data{}` (API 수집) |

#### 교차 검증 + 스킬 벡터

```
교차 검증:
  Q4 vs Q5 → 불일치 플래그
  Q5 vs Q7 → 경험 증거 검증
  Q4 vs Q14/Q15 → 겸손 보정 (+1)

skill_vector[6] = [backend, frontend, database, devops, ai_ml, design]
experience_score = experience_tier × log(project_count + 1) × (git_level + 1)
reliability_score = match_rate(자기평가, 행동 증거, 외부 데이터)
```

### 구현 현황

| 기능 | 상태 | 비고 |
|------|------|------|
| 6섹션 다단계 폼 | ✅ | Section 컴포넌트 별도 |
| Progress bar (섹션 기반) | ✅ | |
| 자동 저장 (debounce → `POST /survey/draft`) | ✅ | 500ms debounce (스펙 300ms → 구현 500ms) |
| 저장 상태 표시 (우상단) | ✅ | "저장 중..." / "저장됨" / "저장 실패" |
| 섹션별 유효성 검사 | ✅ | 필수 필드 전부 검증 |
| 자동 스크롤 (섹션 이동 시) | ✅ | |
| 제출 → SSE 폴링 → AI 계산 | ✅ | `POST /survey/submit` → `GET /survey/result-status/{jobId}` |
| "분석 중..." 상태 화면 | ✅ | status="done" → `/result` |
| 팀 없는 경우 fallback | ✅ | → `/onboarding/role` |
| AI 온보딩 어시스턴트 (Agent 1) | ⬜ | 설문 중 용어 질문 → Haiku 응답 |
| 이력서 업로드 처리 | ⬜ | Section6에 teamId 전달은 되나 업로드 확인 불가 |

### 역할별 차이

| | 팀장 | 팀원 | 옵저버 |
|---|---|---|---|
| 접근 | ✅ | ✅ | ❌ (대시보드로 redirect) |

---

## Screen 5 — 개인 결과 ✅

**파일:** `app/result/page.tsx`

### 스펙

- 레이더 차트 6축 (Recharts): backend / frontend / database / devops / ai_ml / design
- 추천 역할 카드 (cosine similarity)
- 강점 + 성장 포인트
- Reliability score 색상: ≥80% positive / 60~79% warning / <60% negative
- CTA: "팀 대시보드 보기"

### 구현 현황

| 기능 | 상태 | 비고 |
|------|------|------|
| 레이더 차트 6축 (Recharts, 값 0~5) | ✅ | |
| 추천 역할 카드 (순위 + 설명) | ✅ | |
| 강점 + 성장 포인트 섹션 | ✅ | 아이콘 포함 |
| 포지션 예측 + confidence | ✅ | "높음" / "보통" / "데이터 부족" |
| 에러 상태 처리 (no_team, no_result, api_error) | ✅ | |
| CTA: "설문 다시하기" + 팀 이동 | ✅ | leader→"대시보드 보기", member→"팀 현황 보기" |
| Reliability score 색상 시각화 | ⬜ | confidence 높/보통/낮음으로만 표시 |

---

## Screen 6 — 팀 대시보드 ⚠️

**파일:** `app/team/[teamId]/page.tsx`

### 스펙

- 팀 헤더: 이름, 비옵저버/expectedSize명, 옵저버 별도
- 팀 스킬 오버레이 바 차트 (모바일: 텍스트 요약 카드)
- 팀원 목록 + 역할 + 포지션 뱃지
- 역할 제안 (Hungarian algorithm, 드래그/탭)
- 설문 미완료 처리 ("일단 진행하기")
- 초대 코드 재공유 (팀장만)
- 킥오프 시작 버튼 (팀장만)

### 구현 현황

| 기능 | 상태 | 비고 |
|------|------|------|
| 팀 헤더 (이름, 인원, 옵저버 서브텍스트) | ✅ | |
| 대시보드 상태 4종 (survey_incomplete / partial_ready / ready / restricted) | ✅ | |
| 팀원 목록 (이름, 역할, 포지션 뱃지, 완료 여부) | ✅ | |
| 스킬 분포 차트 | ✅ | teamSkillDistribution 기반 |
| 역할 추천 (Hungarian) | ✅ | |
| 킥오프 시작 버튼 (팀장) | ✅ | "킥오프 시작" / "킥오프 이어서" |
| 미완료 인원 "일단 진행하기" 다이얼로그 | ✅ | |
| 초대 코드 재공유 (팀장) | ✅ | 다이얼로그 |
| 비리더 대기 화면 (킥오프 시작 전) | ✅ | "팀장이 준비하고 있어요" |
| 킥오프 진행 중 콜아웃 + "같이 보기" | ✅ | |
| 실시간 업데이트 (Socket.io) | ✅ | useTeamChannel |
| "다음 할 일" 카드 | ⬜ | TODO 주석 stub |
| 회의 카운트 | ⬜ | `noMeetings = true // TODO` 하드코딩 |
| 팀원 kick/제거 UI | ⬜ | |
| 팀 설정 편집 (이름, 소개, 인원) | ⬜ | |
| 멤버 상세 모달 | ⬜ | |

### 역할별 차이

| | 팀장 | 팀원 | 옵저버 |
|---|---|---|---|
| 팀 스킬 차트 (집계) | ✅ | ✅ | ✅ |
| 개별 팀원 상세 (reliability 등) | ✅ (전원) | 본인만 | ❌ |
| 킥오프 시작 버튼 | ✅ | ❌ | ❌ |
| 초대 코드 재공유 | ✅ | ❌ | ❌ |
| 킥오프 전 화면 | 대시보드 전체 | 대기 화면 | 대시보드 (제한) |

---

## Screen 7 — 킥오프: 주제 결정 ✅

**파일:** `app/team/[teamId]/kickoff/topic/page.tsx`

### 스펙

- Yes Path: 문서 업로드 또는 직접 입력 → AI 분류 → 아키텍처로
- No Path 1: AI 브레인스톰 채팅 → 방향 3개 → 구체화
- No Path 2: 팀 화이트보드 (데스크톱 전용)
- AI 프롬프트 컨텍스트: 팀 스킬 벡터 + archetype + 경험 + 제약 조건
- 주제 확정 시 초기 Mermaid 다이어그램 자동 생성 → **고정** (Screen 8에서 명시적 업데이트만)

### 구현 현황

| 기능 | 상태 | 비고 |
|------|------|------|
| **Branch 1 — 직접 입력** ("주제 있음") | ✅ | 제목 + 설명(10자↑) |
| API: `POST /kickoff/{teamId}/topic/direct` | ✅ | |
| **Branch 2 — AI 브레인스톰** ("주제 없음") | ✅ | |
| AI 채팅: `POST /kickoff/{teamId}/chat` (phase: topic_brainstorm) | ✅ | |
| 이전 대화 로드: `GET /kickoff/{teamId}/chat/topic_brainstorm` | ✅ | |
| AI 응답 mermaidCode → 다이어그램 표시 | ✅ | |
| "다이어그램으로 정리하기" 버튼 (팀장) | ✅ | 사전정의 프롬프트 자동 전송 |
| 채팅 초기화: `DELETE /kickoff/{teamId}/chat/topic_brainstorm` | ✅ | |
| 주제 확정 모달: `POST /kickoff/{teamId}/topic/confirm` | ✅ | 제목(필수)+설명(선택) |
| 레이아웃: 데스크톱 좌측 다이어그램(44%) + 우측 채팅 | ✅ | |
| 레이아웃: 모바일 채팅만 (다이어그램 인라인) | ✅ | |
| 실시간 WebSocket (chat_updated, chat_reset, phase_changed) | ✅ | |
| 문서 업로드 (PDF/DOCX/PPT) 파싱 | ⬜ | |
| 팀 화이트보드 (데스크톱 전용 공동편집) | ⬜ | |
| Markdown 렌더링 (채팅 AI 응답) | ⬜ | |

### 역할별 차이

| | 팀장 | 팀원 | 옵저버 |
|---|---|---|---|
| 채팅 참여 | ✅ | ✅ | ❌ |
| "다이어그램으로 정리하기" | ✅ | ❌ | ❌ |
| 주제 확정 | ✅ | ❌ | ❌ |
| 채팅 초기화 | ✅ | ❌ | ❌ |
| 팀장 시작 전 | 워크샵 화면 | "팀장이 준비 중" 대기 | "팀장이 준비 중" 대기 |

---

## Screen 8 — 킥오프: 아키텍처 빌더 ✅

**파일:** `app/team/[teamId]/kickoff/architecture/page.tsx`

### 스펙

- 8단계: Framework → Styling → Realtime → API → Server → DB/ORM → Auth → State
- AI 채팅 (Agent 2, Sonnet + RAG): 팀 스킬 기반 2~4개 선택지 + 장단점
- Nudge: 팀원이 잘 아는 스택 상위 정렬
- 다이어그램 상태: `mermaidCode` (현재) + `pendingMermaidCode` (대기) + 명시적 업데이트 버튼
- 스택 갈등 감지 → 팀장 알림
- 데스크톱: 좌측 채팅 + 우측 다이어그램. 모바일: 채팅만.

### 구현 현황

| 기능 | 상태 | 비고 |
|------|------|------|
| `GET /kickoff/{teamId}/summary`로 기존 스택+다이어그램+채팅 로드 | ✅ | |
| 8개 스택 카테고리 | ✅ | framework, styling, realtime, api, server, db, auth, state |
| 플랫폼 프리셋 (PLATFORM_PRESETS) | ✅ | 플랫폼별 기본 스택 묶음 |
| 옵션 카드 UI (AI 응답 optionCards) | ✅ | isPrimary 강조 |
| AI 채팅: `POST /kickoff/{teamId}/chat` (phase: architecture) | ✅ | |
| Markdown 렌더링 (react-markdown + remarkGfm) | ✅ | |
| 스택 칩 + popover 직접 변경 | ✅ | |
| 다이어그램: mermaidCode + pendingMermaidCode | ✅ | |
| "다이어그램 업데이트" 버튼 (pending → 적용) | ✅ | |
| "새 제안 있음" 뱃지 (animate-pulse) | ✅ | |
| 자동 시드: `POST /kickoff/{teamId}/architecture/seed` | ✅ | 메시지 없을 시 자동 |
| 아키텍처 저장: `POST /kickoff/{teamId}/architecture` | ✅ | → summary 이동 |
| 실시간 WebSocket (chat_updated, phase_changed) | ✅ | |
| 스택 갈등(mismatch) 감지 및 팀장 알림 | ⬜ | |
| 모바일 다이어그램 숨김 | ⬜ | 레이아웃 처리 불명확 |

### 역할별 차이

| | 팀장 | 팀원 | 옵저버 |
|---|---|---|---|
| 채팅 참여 | ✅ | ✅ | ❌ (읽기 전용) |
| 옵션 카드 선택 | ✅ | ✅ | ❌ |
| 다이어그램 업데이트 버튼 | ✅ | ✅ | ❌ |
| "아키텍처 확정" 저장 | ✅ | ❌ | ❌ |

---

## Screen 9 — 협업 도구 세팅 ⬜ 전체 미구현

**파일:** 없음 (페이지 미존재)

### 스펙 (구현 시 참조)

킥오프 플로우에서 현재 생략됨 (`architecture → summary` 직접 연결).

**3개 서브시스템:**

**[1] 도구 선택 + 연동 토글:**
- 지원 도구: GitHub, Slack, Notion, Google Meet, Zoom, Discord
- 도구별 ON/OFF → ON: OAuth → API 자동 세팅 / OFF: 수동 가이드
- 팀 Git Level 기반 추천 복잡도 조절
- API 실패 시: 개별 성공/실패 + 재시도 + 실패 항목 수동 가이드

**[2] AI 파일 빌더 (Agent 4, Sonnet, 데스크톱 전용):**
- 생성: CONTRIBUTING.md, PR 템플릿, CI 파이프라인, Issue 템플릿, AGENTS.md
- 엄격도: Relaxed / Standard / Strict

**[3] Git 온보딩 (Q8 레벨 기반):**
- Level 0~4별 적응형 튜토리얼
- 실제 팀 레포를 예시로 사용
- 팀장: 팀원별 온보딩 진행률 확인

**구현 시 필수 추가 — `integrations` 테이블:**
```sql
CREATE TABLE integrations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       UUID REFERENCES teams(id),
  provider      VARCHAR(20) NOT NULL,
  access_token  TEXT NOT NULL,           -- 암호화 저장
  refresh_token TEXT,
  scopes        TEXT[],
  token_expires TIMESTAMPTZ,
  status        VARCHAR(20) DEFAULT 'active',
  metadata      JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### 역할별 차이

| | 팀장 | 팀원 | 옵저버 |
|---|---|---|---|
| 도구 연동 ON/OFF | ✅ | ❌ | ❌ |
| AI 파일 빌더 | ✅ (데스크톱) | 결과 열람만 | ❌ |
| Git 온보딩 | ✅ | ✅ | ❌ |
| 팀원 온보딩 진행률 | ✅ | ❌ | ❌ |
| 다음 단계 진행 | ✅ | ❌ | ❌ |

---

## Screen 10 — 킥오프 최종 요약 ⚠️

**파일:** `app/team/[teamId]/kickoff/summary/page.tsx`

### 스펙

- 전체 결정사항 1페이지 요약
- 워크스페이스 자동 프로비저닝 (Agent 5, GitHub + Slack MCP)
- PDF/PPT 내보내기
- GitHub export: `docs/teamforge/` 자동 커밋
- 스프린트 설정 입력 (기간, 목표)

### 구현 현황

| 기능 | 상태 | 비고 |
|------|------|------|
| `GET /kickoff/{teamId}/summary` 전체 데이터 로드 | ✅ | |
| 프로젝트 주제 (제목, 설명, platform, complexity, features) | ✅ | |
| 기술 스택 8개 카테고리 2열 그리드 | ✅ | 미선택 시 "미정" |
| 팀 구성 (멤버 수, 이니셜 아바타, 역할) | ✅ | |
| Mermaid 아키텍처 다이어그램 | ✅ | |
| 확정 전: 팀장 "수정하기" 버튼 (topic/architecture로) | ✅ | |
| 확정 전: 팀장 "킥오프 확정하기" (`POST /kickoff/{teamId}/finalize`) | ✅ | |
| 확정 전: 팀원 "팀장이 최종 확인 중" 메시지 | ✅ | |
| 확정 후: 축하 화면 (PartyPopper) + 요약 카드 + "팀 대시보드로" CTA | ✅ | |
| 실시간: `kickoff:completed` WebSocket → 팀원 자동 전환 | ✅ | |
| PDF/PPT 내보내기 | ⬜ | |
| GitHub `docs/teamforge/` 자동 커밋 | ⬜ | |
| 워크스페이스 자동 프로비저닝 (Agent 5) | ⬜ | GitHub 레포, branch protection, Slack 채널 |
| 확정 후 편집 | ⬜ | "수정 가능" 문구 있으나 동작 없음 |
| `platform_type` 레이블 매핑 | ⬜ | raw key 그대로 표시되는 케이스 |
| 스프린트 설정 (기간, 목표, 시작일) | ⬜ | Screen 7~10 어디에도 입력 UI 없음 |

### 역할별 차이

| | 팀장 | 팀원 | 옵저버 |
|---|---|---|---|
| 요약 열람 | ✅ | ✅ | ✅ |
| 섹션 수정 버튼 | ✅ | ❌ | ❌ |
| "킥오프 확정하기" | ✅ | ❌ | ❌ |
| 확정 전 메시지 | 확정 폼 | "팀장이 확인 중" | "팀장이 확인 중" |

---

## 구현 현황 전체 요약

| Screen | 상태 | 핵심 미구현 |
|--------|------|------------|
| 1. 로그인 | ✅ | — |
| 2. 역할 선택 | ✅ | 서비스 튜토리얼 |
| 3a. 팀 생성 | ✅ | 팀 정보 편집 |
| 3b. 팀 참가 | ✅ | 팀 이름 미리보기 |
| 4. 설문 | ✅ | AI 온보딩 어시스턴트, 이력서 업로드 |
| 5. 개인 결과 | ✅ | Reliability score 시각화 |
| 6. 팀 대시보드 | ⚠️ | "다음 할 일", 회의 카운트, 팀원 관리, 멤버 모달 |
| 7. 주제 결정 | ✅ | 문서 업로드, 화이트보드, Markdown 렌더링 |
| 8. 아키텍처 빌더 | ✅ | 스택 갈등 감지, 모바일 다이어그램 |
| 9. 도구 세팅 | ⬜ | **전체 미구현** (integrations 테이블 포함) |
| 10. 킥오프 요약 | ⚠️ | 프로비저닝, PDF, GitHub 커밋, 스프린트 설정 |

---

## 역할별 전체 접근 범위

| 화면 | 팀장(Leader) | 팀원(Member) | 옵저버(Observer) |
|------|------------|-------------|----------------|
| 1. 로그인 | ✅ | ✅ | ✅ |
| 2. 역할 선택 | ✅ (Leader) | ✅ (Member) | ✅ (Observer) |
| 3a. 팀 생성 | ✅ | ❌ | ❌ |
| 3b. 팀 참가 | ❌ | ✅ | ✅ |
| 4. 설문 | ✅ | ✅ | ❌ |
| 5. 개인 결과 | ✅ | ✅ | ❌ |
| 6. 팀 대시보드 | ✅ (전체 권한) | ✅ (제한) | ✅ (집계만) |
| 7. 주제 결정 | ✅ (최종 결정) | ✅ (참여) | 읽기 전용 |
| 8. 아키텍처 빌더 | ✅ (최종 확정) | ✅ (참여) | ❌ |
| 9. 도구 세팅 | ✅ (전체) | 온보딩만 | ❌ |
| 10. 킥오프 요약 | ✅ (프로비저닝) | ✅ (열람) | ✅ (열람) |

---

## AI 에이전트 매핑 (Screen 1~10)

| 에이전트 | 화면 | 모델 | 구현 | 역할 |
|---------|------|------|------|------|
| #1 Onboarding assistant | Screen 4 | Haiku | ⬜ | 기술 용어 설명 |
| #2 Stack recommender | Screen 8 | Sonnet+RAG | ✅ | 스택 추천 + 옵션 카드 |
| #3 Collab advisor | Screen 9 | Haiku | ⬜ | 채널/워크플로우 추천 |
| #4 File builder | Screen 9 | Sonnet | ⬜ | CONTRIBUTING.md 등 생성 |
| #5 Workspace provisioner | Screen 10 | Sonnet+MCP | ⬜ | GitHub+Slack API 실행 |

---

## 다음 구현 우선순위

Screen 9 전체 미구현 + Screen 10 부분 미구현이 Phase 4~5의 전제조건입니다.

| 우선순위 | 항목 | 이유 |
|---------|------|------|
| **P0** | Screen 9 도구 세팅 + `integrations` 테이블 | Screen 11 auto-import, Screen 14 write-back의 전제 |
| **P0** | Screen 10 워크스페이스 프로비저닝 (Agent 5) | GitHub webhook 등록 = Direction tracker의 전제 |
| **P1** | Screen 10 스프린트 설정 UI | Direction tracker baseline 필요 |
| **P1** | Screen 6 "다음 할 일" + 회의 카운트 | Phase 5 진입 후 팀 대시보드 활용도 |
| **P2** | Screen 7 문서 업로드 파싱 | Yes Path 강화 |
| **P2** | Screen 8 스택 갈등 감지 | 팀 UX 개선 |
| **P3** | Screen 4 AI 온보딩 어시스턴트 | 설문 UX 보완 |
| **P3** | Screen 10 PDF/PPT 내보내기 | 포트폴리오 용도 |

---

*작성 기준: 스펙 문서 + `apps/web/app/` 실제 코드 분석*
*작성일: 2026-04-05*