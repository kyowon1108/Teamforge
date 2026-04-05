# TeamForge — Screen 1~10 구현 현황 기반 플로우

> **실제 구현된 코드 기준**으로 작성. 스펙 문서 내용이 아니라 `apps/web/app/` 코드를 직접 분석한 결과.
> 스펙에는 있지만 미구현인 항목은 `⬜ 미구현`으로 표시.

역할: **팀장(Leader)** / **팀원(Member)** / **옵저버(Observer)**

---

## 전체 플로우 (구현 기준)

```
[1] 로그인
    ↓ isNewUser=true
[2] 역할 선택
    ↓ leader             ↓ member/observer
[3a] 팀 생성       [3b] 팀 참가 (코드 입력)
    ↓                    ↓ member         ↓ observer
[4] 스킬 설문            [4] 설문         [6] 팀 대시보드
    ↓
[5] 개인 결과
    ↓
[6] 팀 대시보드
    ↓ (팀장이 킥오프 시작)
[7] 킥오프 — 주제 결정 (topic)
    ↓
[8] 킥오프 — 아키텍처 (architecture)
    ↓
[10] 킥오프 — 최종 요약 (summary)
```

> **Screen 9 (도구 세팅)**: 스펙에만 존재, 페이지 미구현. 킥오프는 `architecture → summary`로 바로 연결됨.

---

## Screen 1 — 소셜 로그인

**파일:** `app/login/page.tsx`

### 구현된 내용
- OAuth 버튼 3개: Google, GitHub, Kakao
- `callbackUrl` 쿼리 파라미터 지원 (초대 URL에서 진입 시 로그인 후 원래 목적지로)
- 에러 메시지: `api_unavailable` → "서버에 연결할 수 없어요" 표시
- 서비스 소개 bullet 3개 (하단)
- Kakao: `KAKAO_CLIENT_ID` 환경변수 있으면 활성화, 없으면 disabled + "준비 중" 표시

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

## Screen 2 — 역할 선택

**파일:** `app/onboarding/role/page.tsx`

### 구현된 내용
- 역할 카드 3개: Leader(Crown 아이콘) / Member(User 아이콘) / Observer(Eye 아이콘)
- 각 카드: 역할명 + 설명 + 특징 bullet 2~3개
- 선택 시 하이라이트 스타일 + 선택 완료 버튼 활성화
- **이미 팀이 있는 경우** → 상단 "이어서 진행하기" 배너 표시:
  - `/auth/me` 호출로 기존 팀 상태 감지
  - 팀 이름 + 상태 메시지 (설문 진행 중 / 설문 완료 / 옵저버 등)
  - 이어가기 버튼 클릭 시 라우팅:
    - Leader + survey 완료 → 팀 대시보드
    - Observer → 팀 대시보드
    - Survey 완료 → `/result`
    - 그 외 → `/survey`
- 역할 저장: localStorage (`userRole`)

### 선택 후 라우팅
- Leader → `/team/create`
- Member / Observer → `/team/join`

### 역할별 차이
모두 동일한 화면을 봄. 선택에 따라 다음 경로 분기.

---

## Screen 3a — 팀 생성

**파일:** `app/team/create/page.tsx`

### 구현된 내용
- **입력 폼:**
  - 팀 이름 (필수)
  - 팀 소개 (선택)
  - 예상 인원: 2~6명 버튼 그룹 (기본값 4)
- **생성 후 화면 (같은 페이지, 상태 전환):**
  - 초대 코드 6자리 크게 표시
  - "코드 복사" 버튼 / "링크 복사" 버튼 별도
  - **실시간 합류 현황:** Socket.io `member:joined` 이벤트 수신 → "X/Y명 합류" pulse 애니메이션
  - 최근 합류한 팀원 목록 (이름 + 역할: 팀원으로/옵저버로)
  - "설문 시작하기" 버튼 → `/survey`
- **API:** `POST /teams` → `{ name, description?, expectedSize }`
- teamId를 localStorage에 저장

### 미구현
- ⬜ 팀 생성 후 이름/소개/인원 수정 불가
- ⬜ 초대 코드 만료 설정

### 역할별 차이
팀장 전용 페이지. 팀원/옵저버는 접근 불가 (redirect됨).

---

## Screen 3b — 팀 참가

**파일:** `app/team/join/page.tsx`, `app/team/join/[code]/page.tsx`

### 구현된 내용
**직접 입력 (`/team/join`):**
- 6자리 개별 Input 박스 (자동 포커스 이동)
- 붙여넣기 감지: 6자리 한 번에 붙여넣기 시 자동 분배
- 오류 처리:
  - `INVITE_CODE_NOT_FOUND` → "존재하지 않는 초대 코드예요"
  - `INVITE_CODE_EXPIRED` → "만료된 초대 코드예요"
  - `ALREADY_TEAM_MEMBER` → "이미 팀에 참가되어 있어요"
  - `TEAM_FULL` → 팀 정원 초과 메시지

**URL 직접 진입 (`/team/join/[code]`):**
- 코드 localStorage에 저장 후 로그인 확인
- 로그인 안 됨 → `/login?callbackUrl=/team/join/{code}`
- 역할 미선택 → `/onboarding/role`
- 로그인 + 역할 있음 → 자동으로 `/teams/join` 호출
- `ALREADY_TEAM_MEMBER` 시: `/auth/me` 호출 → 실제 상태 확인 후 적절한 페이지로 라우팅

**합류 후 라우팅:**
- member → `/survey`
- observer → `/team/{teamId}`

### 미구현
- ⬜ 팀 이름 미리보기 (코드 입력 후): `teamPreview` state가 코드에 존재하지만 실제로 값을 세팅하는 로직 없음

### 역할별 차이
팀원/옵저버만 접근. 역할(localStorage 기준)에 따라 합류 후 이동 경로 다름.

---

## Screen 4 — 스킬 설문

**파일:** `app/survey/page.tsx`

### 구현된 내용
- 6섹션 다단계 폼 (Section 컴포넌트 별도 import)
- **Progress bar** (섹션 기반)
- **자동 저장:** 500ms debounce → `POST /survey/draft`
- **저장 상태 표시 (우상단):** "저장 중..." / "저장됨" / "저장 실패"
- **섹션별 유효성 검사:**
  - experienceTier, backgroundType 필수
  - techStackList 1개 이상 필수
  - topStrengths 1개 이상 필수
  - projectCount, gitCollabLevel 필수
  - workArchetype 필수
  - desiredRoles 1개 이상 필수
  - weeklyHours 필수
- **자동 스크롤:** 섹션 이동 시 상단으로 스크롤
- **제출:** `POST /survey/submit` → SSE `GET /survey/result-status/{jobId}`로 AI 계산 상태 폴링
  - "분석 중..." 상태 화면
  - status="done" → `/result` 리다이렉트
- **팀 없는 경우:** `/onboarding/role`로 fallback

### 섹션 구조 (구현 기준)

| 섹션 | 구성 | 주요 검증 |
|------|------|----------|
| 1 | 경험 수준 + 배경 유형 (radio) | experienceTier, backgroundType 필수 |
| 2 | 기술 스택 multi-select + 숙련도 slider + Top 2 강점 | techStackList ≥1, topStrengths ≥1 |
| 3 | 프로젝트 수 + 실제 역할 + Git 레벨 (radio/multi) | projectCount, gitCollabLevel 필수 |
| 4 | Archetype + 작업 스타일 슬라이더 + 희망 역할 | workArchetype, desiredRoles ≥1 필수 |
| 5 | 주당 시간 + 자유 서술 (optional) | weeklyHours 필수 |
| 6 | 이력서 업로드 + GitHub URL (optional) | 선택 사항 |

### 미구현
- ⬜ AI 온보딩 어시스턴트 (설문 중 기술 용어 질문 → Haiku 응답)
- ⬜ 이력서 업로드 처리 여부 UI에서 불명확 (Section6 컴포넌트에 teamId 전달은 되나 업로드 확인 불가)

### 역할별 차이

| | 팀장 | 팀원 | 옵저버 |
|---|---|---|---|
| 접근 가능 | ✅ | ✅ | ❌ (대시보드로 redirect) |

---

## Screen 5 — 개인 결과

**파일:** `app/result/page.tsx`

### 구현된 내용
- `GET /survey/result/{userId}/{teamId}` 호출
- **레이더 차트 (Recharts):** 6축 — backend, frontend, database, devops, ai_ml, design (값 0~5)
- **추천 역할 카드:** 순위 + 역할명 + 설명 텍스트
- **강점(강점)** 섹션 + **성장 포인트** 섹션 (아이콘 포함)
- **포지션 예측 + confidence 표시:** "높음" / "보통" / "데이터 부족"
- **에러 상태 처리:**
  - `no_team` → 팀 없는 상태 UI
  - `no_result` (404) → 설문 미완료 UI
  - `api_error` (5xx) → 에러 UI
- **CTA 2개:**
  - "설문 다시하기" (항상 표시)
  - 팀 이동 버튼: leader → "팀 대시보드 보기" / member → "팀 현황 보기"

### 미구현
- ⬜ 결과 편집 모드
- ⬜ Reliability score 시각화 (confidence 높음/보통/낮음으로만 표시)

### 역할별 차이

| | 팀장 | 팀원 | 옵저버 |
|---|---|---|---|
| 접근 가능 | ✅ | ✅ | ❌ |
| 팀 이동 버튼 텍스트 | "팀 대시보드 보기" | "팀 현황 보기" | — |

---

## Screen 6 — 팀 대시보드

**파일:** `app/team/[teamId]/page.tsx`

### 구현된 내용
- `GET /teams/{teamId}/dashboard` + `GET /kickoff/{teamId}` (킥오프 진행 상태 감지)
- **팀 헤더:** 팀 이름, 비옵저버/expectedSize명, 옵저버 있을 시 "옵저버 N명 별도"
- **대시보드 상태 4종:**
  - `survey_incomplete`: 설문 미완료 팀원 있음
  - `partial_ready`: 일부 완료
  - `ready`: 전원 완료
  - `restricted`: 비리더 팀원 접근 제한 (킥오프 시작 후)
- **팀원 목록:** 이름, 역할, 포지션 뱃지, 설문 완료 여부
- **스킬 분포 차트:** teamSkillDistribution 기반 바/레이더
- **역할 추천 섹션:** Hungarian algorithm 결과 표시
- **팀장 전용:**
  - 킥오프 시작 버튼 (상태별로 "킥오프 시작" / "킥오프 이어서")
  - 미완료 인원 있을 시 "일단 진행하기" 확인 다이얼로그
  - 초대 코드 재공유 다이얼로그
- **비리더 팀원:** 킥오프 시작 전까지 "팀장이 다음 단계를 준비하고 있어요" 대기 화면 표시
- **킥오프 진행 중:** "킥오프 워크샵 진행 중" 콜아웃 + "같이 보기" 버튼
- **실시간 업데이트:** Socket.io (useTeamChannel)

### 미구현
- ⬜ "다음 할 일" 카드 — 코드에 `TODO` 주석으로 남겨진 stub
- ⬜ 회의 카운트 — 하드코딩 `noMeetings = true; // TODO`
- ⬜ 팀원 kick/제거 UI
- ⬜ 팀 설정 편집 (이름, 소개, 인원 수정)
- ⬜ 멤버 상세 모달

### 역할별 차이

| | 팀장 | 팀원 | 옵저버 |
|---|---|---|---|
| 팀 스킬 차트 | ✅ | ✅ | ✅ |
| 팀원 상세 (reliability 등) | ✅ (전원) | 본인만 | ❌ |
| 킥오프 시작 버튼 | ✅ | ❌ | ❌ |
| 초대 코드 재공유 | ✅ | ❌ | ❌ |
| 킥오프 전 팀원 화면 | 대시보드 전체 | 대기 화면 | 대시보드 (제한) |

---

## Screen 7 — 킥오프: 주제 결정

**파일:** `app/team/[teamId]/kickoff/topic/page.tsx`

### 구현된 내용

**Branch 1 — 직접 입력 ("주제 있음"):**
- 제목 + 설명 (10자 이상) 폼
- `POST /kickoff/{teamId}/topic/direct` → architecture 페이지로 이동

**Branch 2 — AI 브레인스톰 ("주제 없음"):**
- AI 채팅 인터페이스
- `GET /kickoff/{teamId}/chat/topic_brainstorm` (이전 대화 로드)
- 사용자 메시지 → `POST /kickoff/{teamId}/chat` (phase: "topic_brainstorm")
- AI 응답이 mermaidCode 포함 시 → 다이어그램 표시
- **팀장 전용 버튼:** "다이어그램으로 정리하기" (사전 정의된 프롬프트 자동 전송)
- **채팅 초기화:** `DELETE /kickoff/{teamId}/chat/topic_brainstorm`
- **주제 확정 모달:** 제목(필수) + 설명(선택) 입력 → `POST /kickoff/{teamId}/topic/confirm`

**레이아웃:**
- 데스크톱: 좌측 다이어그램 (44%) + 우측 채팅
- 모바일: 채팅만 (다이어그램 인라인 표시)

**실시간 동기화 (WebSocket):**
- `kickoff:chat_updated` → 채팅 기록 갱신
- `kickoff:chat_reset` → 채팅 초기화
- `kickoff:phase_changed` → architecture 페이지로 리다이렉트

### 미구현
- ⬜ 팀 화이트보드 (스펙에만 있음, 데스크톱 전용 공동편집)
- ⬜ 문서 업로드 (PDF/DOCX/PPT) 파싱
- ⬜ Markdown 렌더링 (채팅 AI 응답)

### 역할별 차이

| | 팀장 | 팀원 | 옵저버 |
|---|---|---|---|
| 채팅 참여 | ✅ | ✅ | ❌ |
| "다이어그램으로 정리하기" 버튼 | ✅ | ❌ | ❌ |
| 주제 확정 | ✅ | ❌ | ❌ |
| 채팅 초기화 | ✅ | ❌ | ❌ |
| 팀장 시작 전 팀원/옵저버 화면 | 워크샵 화면 | "팀장이 준비 중" 대기 | "팀장이 준비 중" 대기 |

---

## Screen 8 — 킥오프: 아키텍처 빌더

**파일:** `app/team/[teamId]/kickoff/architecture/page.tsx`

### 구현된 내용
- `GET /kickoff/{teamId}/summary`로 기존 스택 + 다이어그램 + 채팅 로드
- **8개 스택 카테고리:** framework, styling, realtime, api, server, db, auth, state
- **플랫폼 프리셋** (PLATFORM_PRESETS): 플랫폼 유형별 기본 스택 묶음
- **옵션 카드 UI:**
  - AI 채팅 응답에서 `optionCards` 포함 시 → 인터랙티브 선택 카드 렌더링
  - `isPrimary` 카드 강조 표시 (팀 스킬 기반 추천)
  - 선택 시 `POST /kickoff/{teamId}/chat`으로 선택 내용 전송
- **AI 채팅:** `POST /kickoff/{teamId}/chat` (phase: "architecture")
- **Markdown 렌더링:** react-markdown + remarkGfm
- **스택 칩:** 현재 선택된 스택 표시 + popover에서 직접 변경 가능
- **다이어그램 상태:**
  - `mermaidCode`: 현재 표시 중인 다이어그램 (Topic 단계 결과 고정 진입)
  - `pendingMermaidCode`: AI 채팅 응답의 신규 다이어그램 (미적용 대기)
  - "다이어그램 업데이트" 버튼 클릭 시에만 pending → 적용
  - "새 제안 있음" 뱃지 (animate-pulse) 표시
- **자동 시드:** 메시지 없을 시 `POST /kickoff/{teamId}/architecture/seed` 자동 호출
- **아키텍처 저장:** `POST /kickoff/{teamId}/architecture` → summary 페이지로 이동

**실시간 동기화:**
- `kickoff:chat_updated` → 채팅 + pendingMermaidCode 갱신
- `kickoff:phase_changed` → summary 페이지로 이동

### 미구현
- ⬜ 스택 갈등(mismatch) 감지 및 팀장 알림
- ⬜ 모바일 다이어그램 숨김 (현재 레이아웃 처리 불명확)

### 역할별 차이

| | 팀장 | 팀원 | 옵저버 |
|---|---|---|---|
| 채팅 참여 | ✅ | ✅ | ❌ (읽기 전용) |
| 옵션 카드 선택 | ✅ | ✅ | ❌ |
| 다이어그램 업데이트 버튼 | ✅ | ✅ | ❌ |
| "아키텍처 확정" 저장 | ✅ | ❌ | ❌ |

---

## Screen 9 — 협업 도구 세팅

**⬜ 미구현** — 페이지 파일 없음 (`apps/web/app/team/[teamId]/kickoff/` 내 tool-setup 없음)

스펙에는 정의되어 있으나 현재 킥오프 플로우에서 생략됨.
`architecture → summary`로 직접 연결.

---

## Screen 10 — 킥오프 최종 요약

**파일:** `app/team/[teamId]/kickoff/summary/page.tsx`

### 구현된 내용
- `GET /kickoff/{teamId}/summary`로 전체 킥오프 데이터 로드
- **요약 표시 섹션:**
  - 프로젝트 주제: 제목, 설명, platform 태그, complexity 뱃지, features 목록
  - 기술 스택: 8개 카테고리 2열 그리드 (미선택 시 "미정")
  - 팀 구성: 멤버 수, 아바타(이니셜) + 역할 레이블
  - Mermaid 아키텍처 다이어그램
- **확정 전 상태 (confirmed=false):**
  - 팀장: 섹션별 "수정하기" 버튼 → topic/architecture 페이지로 이동
  - 팀장: "킥오프 확정하기" 버튼 → `POST /kickoff/{teamId}/finalize`
  - 팀원: "팀장이 최종 확인 중이에요" 메시지 + 읽기 전용
- **확정 후 상태 (confirmed=true):**
  - 축하 화면 (PartyPopper 아이콘)
  - 요약 카드 표시
  - "팀 대시보드로" CTA
- **실시간:** `kickoff:completed` WebSocket 이벤트 → 팀원 화면도 자동으로 confirmed 상태로 전환

### 미구현 (기존)
- ⬜ PDF/PPT 내보내기
- ⬜ GitHub `docs/teamforge/` 자동 커밋
- ⬜ 워크스페이스 자동 프로비저닝 (GitHub 레포 생성, branch protection, Slack 채널)
- ⬜ 확정 후 편집 (UI에 "완료 후에도 수정 가능" 문구 있으나 동작 없음)
- ⬜ platform_type 레이블 매핑 일부 미완성 (raw key가 그대로 표시되는 케이스 있음)

---

### KF-003 보완 항목 — 배치 A/B/C/D (Screen 10 확장)

> 상세 흐름: [`docs/product/kickoff-enhancement-flow.md`](./kickoff-enhancement-flow.md)

#### 배치 A — 의사결정 입력 (architecture 확정 후, finalize 전)

| 항목 | 상태 | 설명 |
|------|------|------|
| Out of Scope 섹션 | ⬜ 미구현 | "이번 스프린트에 안 하는 것" 자유 입력 (항목 추가/삭제) |
| 성공 기준 / 데모 기준 | ⬜ 미구현 | 최종 발표 때 반드시 보여줄 것 3개 (최소 1개 필수) |
| 협업 규칙 4개 | ⬜ 미구현 | 브랜치 전략 / PR 리뷰 규칙 / Issue 라벨 / 회의 주기 (기본값 제공 + 커스텀) |
| 팀원 우려 수집 | ⬜ 미구현 | 익명 선택 또는 자유 서술 ("이 스택 자신 없음" 등) |

**역할별 참여:**

| | 팀장 | 팀원 | 옵저버 |
|---|---|---|---|
| Out of Scope 입력 | ✅ 입력·수정 | ✅ 제안 가능 | ❌ 읽기 전용 |
| 성공 기준 입력 | ✅ 입력·수정 | ✅ 제안 가능 | ❌ 읽기 전용 |
| 협업 규칙 입력 | ✅ 최종 결정 | ✅ 의견 제출 | ❌ 읽기 전용 |
| 팀원 우려 입력 | ✅ 익명/기명 | ✅ 익명/기명 | ❌ |

> **팀원 참여 강화 포인트:** 팀원도 성공 기준 제안 + 팀원 우려 입력 가능. 팀장이 최종 반영 여부 결정.

---

#### 배치 B — 역할 수락/조정 UI (배치 A 완료 후)

| 항목 | 상태 | 설명 |
|------|------|------|
| 역할 수락/조정/거절 UI | ⬜ 미구현 | 각 팀원이 자신의 AI 추천 역할에 응답 |
| 조정 요청 플로우 | ⬜ 미구현 | 대안 역할 선택 + 팀장 알림 → 팀장이 수락/거절 |
| 거절 플로우 | ⬜ 미구현 | 역할 없음 상태 + 팀장 재배정 모달 |
| 전원 수락 감지 | ⬜ 미구현 | 모든 팀원(옵저버 제외) 수락 시 배치 C 언락 |

**역할별 참여:**

| | 팀장 | 팀원 | 옵저버 |
|---|---|---|---|
| 역할 응답 버튼 노출 | ✅ (본인 역할) | ✅ | ❌ |
| 타인 수락 현황 열람 | ✅ 전체 | 본인만 | ❌ |
| 조정 요청 수락/거절 | ✅ | ❌ | ❌ |
| 역할 재배정 | ✅ | ❌ | ❌ |

> **팀원 참여 강화 포인트:** 모든 비옵저버 팀원이 역할 응답을 완료해야 배치 C 진입 가능. 팀원이 직접 조정 요청을 낼 수 있음.

---

#### 배치 C — 산출물 자동화 (배치 B 완료 후 / 팀장이 팀원 전원 수락 확인 후)

| 항목 | 상태 | 설명 |
|------|------|------|
| 첫 Issue 3~5개 자동 생성 | ⬜ 미구현 | MVP / infra / design 카테고리. AI가 성공 기준 기반 생성 |
| 첫 회의 agenda 자동 생성 | ⬜ 미구현 | 팀원 우려 + 역할 조정 결과 기반 AI 생성 |
| Mini ADR 1~3개 자동 생성 | ⬜ 미구현 | 스택/협업 규칙 선택 이유 기록. Agent 4 (File Builder) 사용 |

**역할별 참여:**

| | 팀장 | 팀원 | 옵저버 |
|---|---|---|---|
| 자동 생성 트리거 버튼 | ✅ | ❌ | ❌ |
| 생성 결과 열람 | ✅ | ✅ | ✅ |
| Issue 내용 편집 | ✅ | ✅ (본인 담당) | ❌ |
| ADR 내용 편집 | ✅ | ❌ | ❌ |

> **팀원 참여 강화 포인트:** 자신이 담당자로 배정된 Issue 내용 편집 가능.

---

#### 배치 D — 게이트 (배치 C 완료 후)

| 항목 | 상태 | 설명 |
|------|------|------|
| Summary 서명 | ⬜ 미구현 | "내 역할과 계획에 동의합니다" — 전원 서명 완료 시 finalize 가능 |
| finalize 조건 강화 | ⬜ 미구현 | 기존: 팀장 단독 클릭. 변경: 비옵저버 전원 서명 필수 |

**현재 finalize 흐름 (미개선):**
```
팀장 "킥오프 확정하기" → POST /kickoff/{teamId}/finalize → confirmed=true
```

**목표 finalize 흐름 (배치 D 적용 후):**
```
배치 A 입력 완료
→ 배치 B 전원 수락
→ 배치 C 산출물 생성
→ 배치 D 전원 서명
→ 팀장 "최종 확정" → POST /kickoff/{teamId}/finalize
```

**역할별 참여:**

| | 팀장 | 팀원 | 옵저버 |
|---|---|---|---|
| 서명 버튼 노출 | ✅ | ✅ | ❌ |
| 서명 현황 열람 | ✅ 전체 | 본인 + 전체 완료 여부 | ❌ |
| 최종 확정 버튼 | ✅ (전원 서명 후) | ❌ | ❌ |

> **팀원 참여 강화 포인트:** 팀원이 서명하지 않으면 finalize 자체가 불가능. 팀원의 동의가 킥오프 확정의 필수 조건이 됨.

---

### 역할별 차이 (전체 요약)

| | 팀장 | 팀원 | 옵저버 |
|---|---|---|---|
| 요약 열람 | ✅ | ✅ | ✅ |
| 섹션 수정 버튼 | ✅ | ❌ | ❌ |
| "킥오프 확정하기" 버튼 | ✅ (배치 D 이후: 전원 서명 필수) | ❌ | ❌ |
| 확정 전 상태 메시지 | 확정 폼 표시 | "팀장이 확인 중" | "팀장이 확인 중" |
| 배치 A 입력 | ✅ 최종 결정 | ✅ 제안·우려 입력 | ❌ |
| 배치 B 역할 수락 | ✅ 본인 + 재배정 | ✅ 본인 응답 | ❌ |
| 배치 C 산출물 | ✅ 트리거 + 편집 | ✅ 담당 Issue 편집 | ✅ 열람 |
| 배치 D 서명 | ✅ 필수 | ✅ 필수 | ❌ |

---

## 구현 현황 요약

| Screen | 구현 상태 | 주요 미구현 항목 |
|--------|----------|----------------|
| 1. 로그인 | ✅ 완료 | — |
| 2. 역할 선택 | ✅ 완료 | — |
| 3a. 팀 생성 | ✅ 완료 | 팀 정보 편집 |
| 3b. 팀 참가 | ✅ 완료 | 팀 이름 미리보기 |
| 4. 설문 | ✅ 완료 | AI 온보딩 어시스턴트 |
| 5. 개인 결과 | ✅ 완료 | — |
| 6. 팀 대시보드 | ⚠️ 부분 | 회의 카운트, "다음 할 일", 팀원 관리 |
| 7. 주제 결정 | ✅ 완료 | 문서 업로드, 화이트보드 |
| 8. 아키텍처 빌더 | ✅ 완료 | 스택 갈등 감지 |
| 9. 도구 세팅 | ⬜ 미구현 | 전체 미구현 |
| 10. 킥오프 요약 | ⚠️ 부분 | KF-003 배치 A~D 전체 미구현, 프로비저닝, PDF 내보내기 |

---

*분석 기준: `apps/web/app/` 실제 파일 직접 읽기*
*작성일: 2026-04-05*
