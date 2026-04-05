# TeamForge — 킥오프 보완 항목 흐름도 (KF-003)

> 결정 키: KF-003 (`docs/progress/decisions.md` 참조)
> 대상 화면: Screen 10 킥오프 최종 요약 (`/team/[teamId]/kickoff/summary`)
> 작성일: 2026-04-05

---

## 1. 전체 흐름도

```
[Screen 8 아키텍처 확정]
        ↓
[Screen 10 진입 — 기존 요약 표시]
        ↓
┌─────────────────────────────────┐
│  배치 A: 의사결정 입력           │
│  - Out of Scope                 │
│  - 성공 기준 / 데모 기준         │
│  - 협업 규칙 4개                │
│  - 팀원 우려 수집                │
└────────────────┬────────────────┘
                 │ 팀장 "다음으로" (배치 A 완료 조건 충족)
                 ↓
┌─────────────────────────────────┐
│  배치 B: 역할 합의               │
│  - 각 팀원 역할 수락 / 조정 요청 │
│  - 팀장 조정 요청 수락/거절      │
│  - 전원 수락 완료 감지           │
└────────────────┬────────────────┘
                 │ 비옵저버 전원 수락 완료 자동 감지
                 ↓
┌─────────────────────────────────┐
│  배치 C: 산출물 자동 생성        │
│  - 첫 Issue 3~5개              │
│  - 첫 회의 agenda              │
│  - Mini ADR 1~3개             │
└────────────────┬────────────────┘
                 │ 팀장 "산출물 생성" 트리거 + 결과 확인
                 ↓
┌─────────────────────────────────┐
│  배치 D: 서명 게이트             │
│  - 비옵저버 전원 서명            │
│  - 팀장 최종 확정 버튼 활성화    │
└────────────────┬────────────────┘
                 │ POST /kickoff/{teamId}/finalize
                 ↓
[킥오프 완료 — 축하 화면 → 팀 대시보드]
```

---

## 2. 배치별 상세

### 배치 A — 의사결정 입력

#### 진입 조건
- architecture 단계 완료 (`kickoffSession.architectureConfirmed = true`)
- Screen 10 summary 페이지 진입 후 배치 A 탭/섹션 활성화

#### 완료 조건
- Out of Scope 항목 1개 이상 입력
- 성공 기준 1개 이상 입력 (권장 3개, 최소 1개)
- 협업 규칙 4개 중 기본값 유지 또는 커스텀 완료
- 팀원 우려 수집은 선택 사항 (미입력 허용)

#### 역할별 참여 포인트

| 역할 | 참여 내용 |
|------|----------|
| 팀장 | Out of Scope / 성공 기준 최종 입력·수정. 협업 규칙 최종 결정. |
| 팀원 | 성공 기준 제안 (팀장이 반영 여부 결정). 팀원 우려 익명/기명 입력. |
| 옵저버 | 읽기 전용. 팀원 우려 입력 불가. |

#### 데이터 모델 (KickoffSession 확장 필요)
```typescript
outOfScope:      string[]          // 항목 배열
successCriteria: string[]          // 항목 배열 (min 1)
collabRules: {
  branchStrategy: string           // e.g. "main + feature/*"
  prReview:       string           // e.g. "1인 이상 approve 필수"
  issueLabel:     string           // e.g. "feat / fix / docs"
  meetingCycle:   string           // e.g. "매주 월요일 오후 8시"
}
memberConcerns: {
  userId:    string | "anonymous"
  content:   string
  category:  "stack" | "role" | "schedule" | "other"
}[]
```

---

### 배치 B — 역할 합의

#### 진입 조건
- 배치 A 완료 (`batchA.completed = true`)
- 팀장이 "다음: 역할 수락 받기" 버튼 클릭

#### 완료 조건
- 비옵저버 팀원 전원의 `roleStatus`가 `"accepted"` 또는 팀장이 `"force_assign"` 처리
- 거절/조정 요청이 모두 해소된 상태

#### 역할 응답 상태 머신
```
미응답(pending)
  → 수락(accepted)                    ← 완료
  → 조정 요청(adjustment_requested)
      → 팀장 수락 → accepted          ← 완료
      → 팀장 거절 → pending (재응답 대기)
  → 거절(rejected)
      → 팀장 재배정 → 새 역할로 pending
```

#### 역할별 참여 포인트

| 역할 | 참여 내용 |
|------|----------|
| 팀장 | 본인 역할 수락. 타인 조정 요청 처리. 미응답자 催促 알림 전송. 역할 재배정. |
| 팀원 | 본인 역할에 수락 / 조정 요청 (대안 역할 선택) / 거절 응답. |
| 옵저버 | 역할 수락 불필요. 현황 열람 불가. |

#### 데이터 모델 (TeamMember 확장 필요)
```typescript
roleStatus: "pending" | "accepted" | "adjustment_requested" | "rejected"
roleAdjustmentNote: string | null    // 조정 요청 시 사유
alternativeRole:    string | null    // 조정 요청 시 대안
```

---

### 배치 C — 산출물 자동 생성

#### 진입 조건
- 배치 B 완료 (`batchB.allAccepted = true`)
- 팀장이 "산출물 자동 생성" 버튼 클릭 (Human Intervention Checkpoint)

#### 완료 조건
- AI 생성 완료 (`generationStatus = "done"`)
- 팀장이 생성 결과 확인 후 "다음" 클릭

#### AI 생성 파이프라인
```
입력값:
  - topic (프로젝트 주제, 설명, features)
  - successCriteria (배치 A)
  - teamMembers (역할, 배정된 포지션)
  - stack (선택된 기술 스택)
  - memberConcerns (배치 A — 팀원 우려)

생성 산출물:
  1. Issues (Agent 4 — File Builder, Sonnet)
     - MVP 카테고리: 핵심 기능 구현 이슈
     - infra 카테고리: 개발 환경/CI 이슈
     - design 카테고리: UI/디자인 이슈
     - 각 이슈: title, body, assignee(userId), labels, priority

  2. 첫 회의 Agenda (Agent 6 — Meeting Analyzer, Haiku)
     - 팀원 우려 논의 안건
     - 역할 조정 결과 공유 안건
     - 1주차 목표 설정 안건

  3. Mini ADR 1~3개 (Agent 4 — File Builder, Sonnet)
     - 기술 스택 선택 이유
     - 협업 규칙 선택 이유
     - 주요 아키텍처 결정 이유
```

#### AI 생성 파일 처리 (CLAUDE.md 규칙 준수)
- `reviewRequired: true` 파일 → `docs/reviews/ai-artifacts/` 저장
- 팀장 UI 승인 전 GitHub commit 불가
- `/teamforge-docs review agent4` 즉시 실행 필요

#### 역할별 참여 포인트

| 역할 | 참여 내용 |
|------|----------|
| 팀장 | 생성 트리거. 생성 결과 전체 편집. 이슈 담당자 변경. |
| 팀원 | 본인이 assignee인 이슈 내용 편집. ADR 열람. |
| 옵저버 | 생성 결과 전체 열람. |

#### 데이터 모델 (신규 테이블 필요)
```typescript
// KickoffArtifact
id:         uuid
teamId:     uuid
type:       "issue" | "agenda" | "adr"
title:      string
content:    JSONB   // Zod 스키마: packages/contracts/src/jsonb/kickoff-artifact.ts
assigneeId: uuid | null
status:     "draft" | "approved" | "exported"
createdAt:  timestamp
```

---

### 배치 D — 서명 게이트

#### 진입 조건
- 배치 C 완료 (`batchC.artifactsReviewed = true`)
- 서명 UI 활성화

#### 완료 조건
- 비옵저버 팀원 전원 서명 완료
- 팀장 "최종 확정" 버튼 클릭 → `POST /kickoff/{teamId}/finalize`

#### 서명 플로우
```
서명 UI 노출
  → 팀원 "내 역할과 계획에 동의합니다" 체크박스 + 서명 버튼 클릭
  → PATCH /kickoff/{teamId}/members/{userId}/sign
  → WebSocket kickoff:signature_updated 이벤트 → 전원 서명 현황 실시간 업데이트
  → 전원 서명 완료 → 팀장 "최종 확정" 버튼 활성화
  → POST /kickoff/{teamId}/finalize
  → kickoff:completed 이벤트 → 전원 확정 화면 전환
```

#### 역할별 참여 포인트

| 역할 | 참여 내용 |
|------|----------|
| 팀장 | 본인 서명 (필수). 타인 서명 현황 열람. 최종 확정 버튼 (전원 서명 후 활성화). |
| 팀원 | 본인 서명 (필수). 전체 서명 완료 여부 열람. |
| 옵저버 | 서명 불필요. 현황 열람 불가. |

#### 데이터 모델 (TeamMember 확장 필요)
```typescript
signedAt:  timestamp | null
signedBy:  uuid | null    // userId (자기 자신)
```

---

## 3. API 의존성

### 신규 엔드포인트

| 메서드 | 경로 | 설명 | 배치 |
|--------|------|------|------|
| `PATCH` | `/kickoff/{teamId}/decisions` | Out of Scope, 성공 기준, 협업 규칙 저장 | A |
| `POST` | `/kickoff/{teamId}/concerns` | 팀원 우려 제출 (익명 포함) | A |
| `GET` | `/kickoff/{teamId}/concerns` | 팀원 우려 목록 (팀장만 전체 열람) | A |
| `PATCH` | `/kickoff/{teamId}/members/{userId}/role-status` | 역할 수락/조정/거절 응답 | B |
| `POST` | `/kickoff/{teamId}/members/{userId}/role-adjust` | 조정 요청 (대안 역할 + 사유) | B |
| `PATCH` | `/kickoff/{teamId}/members/{userId}/role-assign` | 팀장 역할 재배정 | B |
| `POST` | `/kickoff/{teamId}/artifacts/generate` | 산출물 자동 생성 트리거 | C |
| `GET` | `/kickoff/{teamId}/artifacts` | 생성 산출물 목록 | C |
| `PATCH` | `/kickoff/{teamId}/artifacts/{artifactId}` | 산출물 편집 (담당자 본인 또는 팀장) | C |
| `PATCH` | `/kickoff/{teamId}/members/{userId}/sign` | 서명 | D |
| `GET` | `/kickoff/{teamId}/signatures` | 서명 현황 | D |

### 기존 엔드포인트 변경

| 메서드 | 경로 | 변경 내용 |
|--------|------|----------|
| `POST` | `/kickoff/{teamId}/finalize` | finalize 조건 강화: 비옵저버 전원 서명 완료 여부 검증 추가 |
| `GET` | `/kickoff/{teamId}/summary` | 배치 A/B/C/D 데이터 포함하여 응답 확장 |

### WebSocket 이벤트 (신규)

| 이벤트 | 발생 시점 | 수신자 |
|--------|----------|--------|
| `kickoff:batch_a_updated` | 배치 A 데이터 변경 시 | 팀 전원 |
| `kickoff:role_status_updated` | 팀원 역할 응답 시 | 팀장 + 해당 팀원 |
| `kickoff:all_roles_accepted` | 전원 수락 완료 시 | 팀 전원 |
| `kickoff:artifacts_generated` | AI 산출물 생성 완료 시 | 팀 전원 |
| `kickoff:signature_updated` | 서명 제출 시 | 팀 전원 |
| `kickoff:all_signed` | 전원 서명 완료 시 | 팀 전원 |

---

## 4. UI 컴포넌트 목록

### 배치 A 컴포넌트

| 컴포넌트 | 설명 | shadcn/ui 기반 |
|---------|------|---------------|
| `OutOfScopeInput` | 항목 추가/삭제 가능한 태그 리스트 | Input + Badge + Button |
| `SuccessCriteriaInput` | 3개 항목 카드 (추가/삭제, 최소 1개 필수) | Card + Input + Button |
| `CollabRulesForm` | 4개 규칙 필드 (기본값 + 커스텀 입력) | Form + Input + Select |
| `ConcernSubmitModal` | 팀원 우려 제출 다이얼로그 (익명 토글) | Dialog + RadioGroup + Textarea |
| `ConcernListCard` | 팀원 우려 목록 (팀장 전용, 익명 처리) | Card + ScrollArea |

### 배치 B 컴포넌트

| 컴포넌트 | 설명 | shadcn/ui 기반 |
|---------|------|---------------|
| `RoleAcceptanceCard` | 본인 역할 표시 + 수락/조정/거절 버튼 3개 | Card + Button (variant별) |
| `RoleAdjustmentModal` | 대안 역할 선택 + 사유 입력 다이얼로그 | Dialog + Select + Textarea |
| `RoleStatusBoard` | 팀원 전체 역할 수락 현황 (팀장 전용) | Table + Badge (상태별 색상) |
| `PendingReminderButton` | 미응답 팀원에게 催促 알림 전송 (팀장) | Button + Tooltip |

### 배치 C 컴포넌트

| 컴포넌트 | 설명 | shadcn/ui 기반 |
|---------|------|---------------|
| `ArtifactGenerationTrigger` | "산출물 자동 생성" 버튼 + 생성 중 스피너 | Button + Spinner |
| `IssueCardList` | 생성된 Issue 카드 목록 (카테고리별 그룹) | Card + Badge + ScrollArea |
| `IssueEditModal` | Issue 제목/내용/담당자 편집 다이얼로그 | Dialog + Form + Select |
| `AgendaPreviewCard` | 첫 회의 agenda 미리보기 | Card + Collapsible |
| `MiniADRList` | Mini ADR 목록 + 내용 접기/펼치기 | Accordion + Card |

### 배치 D 컴포넌트

| 컴포넌트 | 설명 | shadcn/ui 기반 |
|---------|------|---------------|
| `SignaturePrompt` | "동의합니다" 체크박스 + 서명 버튼 | Checkbox + Button |
| `SignatureStatusList` | 전원 서명 현황 (완료/대기 배지) | Avatar + Badge |
| `FinalizeGateButton` | "최종 확정" 버튼 (전원 서명 전 disabled) | Button (disabled 상태 명확히) |

### 공통 레이아웃 컴포넌트

| 컴포넌트 | 설명 |
|---------|------|
| `BatchProgressStepper` | 배치 A→B→C→D 진행 상황 스텝 표시기 |
| `RoleGateWrapper` | 역할(팀장/팀원/옵저버)에 따라 읽기전용/편집 분기 래퍼 |
| `BatchLockOverlay` | 이전 배치 미완료 시 잠금 오버레이 |

---

## 5. 구현 우선순위 및 의존 관계

```
백엔드 우선:
  KickoffSession 스키마 확장 (outOfScope, successCriteria, collabRules)
  TeamMember 스키마 확장 (roleStatus, signedAt)
  KickoffArtifact 신규 테이블
  API 엔드포인트 구현
  WebSocket 이벤트 추가

프론트엔드 (백엔드 완료 후):
  배치 A 컴포넌트 (의존성 없음 — 독립 구현 가능)
  배치 B 컴포넌트 (배치 A UI 완료 후)
  배치 C 컴포넌트 (배치 B UI + Agent 4 연동 필요)
  배치 D 컴포넌트 (배치 C UI 완료 후)
  finalize 조건 강화 (배치 D 완료 후 마지막에 적용)
```

---

*작성 기준: KF-003 결정 키, 2026-04-05*
*참조: `docs/progress/decisions.md` KF-003*
