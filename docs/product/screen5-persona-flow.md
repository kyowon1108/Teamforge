# Screen 5 — Personal Result: Persona-Differentiated View & Role Assignment Flow

> Status: defined
> Created: 2026-04-07
> Route: `/team/[teamId]/result`
> Linked decisions: KF-025, KF-029 (신규 — 역할 확정 흐름)
> Feeds into: Screen 6 Team Dashboard, Screen 10 Contract Gate

---

## 1. 설계 목적

현재 Screen 5는 단일 뷰로 구현되어 있다. 팀장/팀원/옵저버 간 역할 차이가 없는 상태다.
이 문서는 다음 세 가지를 확정한다:

1. 페르소나(role)별로 어떤 컴포넌트가 렌더되는지
2. 팀장이 팀원 결과를 열람하는 URL 구조와 데이터 흐름
3. 역할 확정(role finalization) 흐름 — 팀장 액션 → 팀원 화면 반영

---

## 2. 진입 조건 (Entry Conditions)

```
GET /team/[teamId]/result
  -> 인증 확인 (미인증: /login)
  -> teamId 멤버십 확인 (미가입: /dashboard)
  -> role 분기:
      observer → redirect /team/[teamId]/dashboard
      member / leader → SurveyResponse.submitted 확인
        미제출 → redirect /team/[teamId]/survey (배너: "설문을 먼저 완료해야 결과를 볼 수 있어요")
        제출 완료 → 결과 페이지 렌더
```

---

## 3. 뷰 분기 다이어그램 (컴포넌트 수준)

```
/team/[teamId]/result
  [myRole = 'leader']
  ├── MyResultPanel            ✅ (레이더 차트, 강점/성장, AI 역할 제안, roleReaction)
  ├── TeamMemberSidebar        ⬜ NEW — 팀원 목록 + 각 팀원 결과 링크
  ├── RoleFinalizationPanel    ⬜ NEW — 역할 확정 섹션 (KF-029)
  └── LeaderNoteArea           ⬜ NEW — 비공개 코멘트 (팀장 전용, DB 저장)

  [myRole = 'member']
  ├── MyResultPanel            ✅ (레이더 차트, 강점/성장, AI 역할 제안)
  ├── RoleReactionBlock        ✅ (ok / burden / prefer_other — KF-025 완료)
  ├── FinalizedRoleBadge       ⬜ NEW — 팀장이 역할 확정 후 표시되는 배지
  └── AIPairingGuide           ⬜ NEW — "이 역할에서 AI를 이렇게 활용하세요" 카드

  [myRole = 'observer']
  └── redirect /team/[teamId]/dashboard   ✅ (현재 구현됨)
```

---

## 4. URL 구조 — 팀장의 팀원 결과 열람

### MVP: 쿼리 파라미터 방식

```
/team/[teamId]/result                   ← 본인 결과 (기본)
/team/[teamId]/result?view=member&userId=[memberId]   ← 팀장만 접근 가능, 팀원 결과 열람
```

**접근 제어:**
- `?view=member&userId=...` 쿼리는 `role === 'leader'` 확인 후에만 렌더
- 팀원이 직접 위 URL을 입력해도 서버 컴포넌트에서 role 확인 후 본인 결과로 redirect

**데이터 흐름 — 본인 결과 (`/result` 기본):**
```
Server Component (page.tsx)
  -> getMyResult(teamId, session.userId)
     API: GET /api/teams/:teamId/survey/result/me
     반환: { scores, suggestedRole, strengths, gaps, reaction }
  -> ResultClient 렌더 (myRole에 따라 컴포넌트 분기)
```

**데이터 흐름 — 팀원 결과 열람 (`?view=member&userId=X`, leader only):**
```
Server Component (page.tsx)
  -> role 확인: leader가 아니면 ?view 무시하고 본인 결과 렌더
  -> getMemberResult(teamId, targetUserId)
     API: GET /api/teams/:teamId/survey/result/:userId   ← 신규 엔드포인트 (KF-029)
     반환: { scores, suggestedRole, strengths, gaps, reaction, preferOtherNote }
  -> MemberResultViewer 렌더 (읽기 전용, 팀원의 roleReaction 표시)
```

**TeamMemberSidebar 동작:**
```
팀장이 /result 접속
  -> GET /api/teams/:teamId/members?withSurveyStatus=true
  -> 사이드바: 팀원 목록 (이름, 제출 상태, 확정된 역할 or 미확정)
  -> 각 팀원 카드 클릭 → ?view=member&userId=[id] URL 전환 (클라이언트 사이드 router.push)
  -> 본인 카드 항상 맨 위, "내 결과" 배지 표시
```

---

## 5. 역할 확정 흐름 (Role Finalization Flow)

> KF-029에서 확정 예정. 이 섹션은 설계 제안이며, 구현 전 ADR 또는 decisions.md 업데이트 필요.

### 5-1. 전체 흐름

```
[팀장] /team/[teamId]/result (본인 또는 팀원 결과 열람)
  -> RoleFinalizationPanel (팀장 전용)
     -> 팀원 목록 + 드롭다운: 역할 선택 (FE / BE / PM / Designer / Fullstack / AI / 기타)
     -> 팀원의 roleReaction (ok / burden / prefer_other) + preferOtherNote 참고 표시
     -> "역할 확정" 버튼 (개별 팀원별)
        -> POST /api/teams/:teamId/roles/finalize
           Body: { userId, finalRole }
     -> 확정 후: 해당 팀원 카드에 "확정됨" 배지, 역할명 표시

[팀원] /team/[teamId]/result (본인 결과 열람)
  -> FinalizedRoleBadge 컴포넌트
     -> GET /api/teams/:teamId/roles/me
        응답: { finalRole: string | null, finalizedAt: string | null }
     -> finalRole 있으면: "확정된 역할: 백엔드 개발자" 배지 표시 (green, prominent)
     -> finalRole 없으면: 배지 비표시 (roleReaction만 보임)
```

### 5-2. 상태 전이 다이어그램

```
팀원 상태:
  [미확정]
    roleReaction: null / ok / burden / prefer_other
    finalRole: null
    -> FinalizedRoleBadge: 미표시

  [역할 확정됨]
    roleReaction: 유지 (변경 불가)
    finalRole: "backend" 등
    finalizedAt: timestamp
    -> FinalizedRoleBadge: 표시
    -> AIPairingGuide: finalRole 기반 AI 활용 가이드 활성화

  [역할 재확정] (팀장이 변경 시)
    finalRole: 새 값으로 덮어씀 (last-write-wins)
    -> 팀원 화면: 폴링 또는 다음 접속 시 반영
```

### 5-3. 역할 확정 실시간 반영

- Socket.io 미도입 시기(ADR-004 확정 전): **폴링 방식**
  - 팀원이 /result 페이지에 있을 때 30초 간격으로 `GET /api/teams/:teamId/roles/me` 폴링
  - FinalizedRoleBadge가 null → 값 변경 시 토스트: "팀장이 역할을 확정했어요: OO 개발자"
- Socket.io 도입 후(ADR-004): `role:finalized` 이벤트 → 즉시 반영

---

## 6. 페르소나별 전체 컴포넌트 표

| 컴포넌트 | leader | member | 구현 상태 | 비고 |
|---------|--------|--------|---------|------|
| MyResultPanel (레이더 차트) | O | O | ✅ | SVG 6축 (KF-016) |
| RoleReactionBlock (ok/burden/prefer_other) | O | O | ✅ | KF-025 완료 |
| TeamMemberSidebar | O | - | ⬜ | leader only |
| MemberResultViewer (팀원 결과 읽기) | O | - | ⬜ | ?view=member 쿼리 시 |
| RoleFinalizationPanel | O | - | ⬜ | 역할 드롭다운 + 확정 버튼 |
| LeaderNoteArea (비공개 코멘트) | O | - | ⬜ | Later (Phase 2) |
| FinalizedRoleBadge | - | O | ⬜ | 팀장 확정 후 표시 |
| AIPairingGuide | - | O | ⬜ | finalRole 기반 (Later) |
| "팀 현황 보기" CTA | O | O | ✅ | /dashboard로 이동 |

---

## 7. API 의존성 정리

### 현재 구현된 엔드포인트

| 메서드 | 경로 | 설명 | 상태 |
|--------|------|------|------|
| GET | `/api/teams/:teamId/survey/result` | 본인 설문 결과 (scores, suggestedRole) | ✅ |
| POST | `/api/teams/:teamId/survey/reaction` | roleReaction 저장 (KF-025) | ✅ |

### 신규 필요 엔드포인트 (KF-029로 등록 예정)

| 메서드 | 경로 | 설명 | 접근 권한 |
|--------|------|------|---------|
| GET | `/api/teams/:teamId/survey/result/:userId` | 특정 팀원 결과 열람 | leader only |
| GET | `/api/teams/:teamId/members?withSurveyStatus=true` | 팀원 목록 + 제출 상태 + finalRole | leader only for finalRole |
| GET | `/api/teams/:teamId/roles/me` | 본인 확정 역할 조회 | member, leader |
| POST | `/api/teams/:teamId/roles/finalize` | 팀원 역할 확정 (덮어쓰기 가능) | leader only |

### DB 스키마 변화 (KF-029 확정 후 tf-db 구현)

```
TeamMemberRole 테이블 (신규) 또는 TeamMember 테이블 컬럼 추가:
  userId       String
  teamId       String
  finalRole    String?   // "frontend" | "backend" | "pm" | "designer" | "fullstack" | "ai" | "etc"
  finalizedAt  DateTime?
  finalizedBy  String?   // 팀장 userId

  unique: [userId, teamId]
```

> 주의: 기존 TeamMember / membership 테이블 구조 확인 후 tf-db가 결정. 컬럼 추가 vs 별도 테이블은 DB 설계 시 판단.

---

## 8. 에러 상태

| 상황 | 처리 |
|------|------|
| 팀원이 ?view=member 직접 입력 | 서버 컴포넌트에서 role 확인 후 본인 결과로 silently redirect |
| 팀장이 미제출 팀원 결과 요청 | API 404 → "아직 설문을 제출하지 않은 팀원입니다" 빈 상태 |
| 역할 확정 API 실패 | 인라인 에러: "역할 확정에 실패했어요. 다시 시도해 주세요." |
| finalRole 폴링 중 네트워크 오류 | 폴링 중단, 다음 수동 새로고침 시 재시도 (silent fail) |
| 팀원이 결과 미제출 상태에서 /result 진입 | redirect /survey + 배너 메시지 (현재 구현됨) |

---

## 9. MVP vs Later 분류

### MVP (현재 킥오프 범위, Screen 5 기능 보완)

우선순위 기준: 역할 확정은 Screen 10 Contract Gate의 선행 조건으로 설계됨.
역할 확정 흐름 없이 Screen 10 구현 시 역할 데이터 공백이 발생함.

| 기능 | 우선순위 | 전제 조건 |
|------|---------|---------|
| TeamMemberSidebar (팀장 화면) | P1 | 신규 API: GET /members?withSurveyStatus=true |
| MemberResultViewer (?view=member) | P1 | 신규 API: GET /result/:userId |
| RoleFinalizationPanel | P1 | DB 스키마 확정 (KF-029), POST /roles/finalize |
| FinalizedRoleBadge (팀원 화면) | P1 | GET /roles/me + 폴링 |
| AIPairingGuide | P2 | finalRole 데이터 있을 때만, 카드 콘텐츠 별도 작성 필요 |

### Later — Phase 2 (활동 기록 단계)

| 기능 | 설명 |
|------|------|
| LeaderNoteArea | 팀장의 팀원별 비공개 코멘트. Screen 12~14 Direction Tracker와 연동 예정. |
| 역할 변경 이력 추적 | finalRole 변경 이력 audit log. Backlog (Screen 13 Change Management 참고). |
| 팀원별 성장 비교 | 킥오프 전/후 프로필 diff. Phase 3 이후. |

### Later — Phase 3 (최종 평가 리포트)

| 기능 | 설명 |
|------|------|
| 최종 평가 리포트 변환 | 킥오프 완료 후 개인 결과 + 실제 기여 데이터 기반 PDF 리포트. Screen 9/10 이후 별도 화면 필요. |
| 옵저버 수치 중심 뷰 | Screen 14 Observer Dashboard (backlog) 에서 처리. Screen 5 접근은 현재도 redirect로 막혀 있음. |
| AI 페어링 성과 측정 | AIPairingGuide 추천 vs 실제 활용 비교. 별도 데이터 수집 인프라 필요. |

---

## 10. 현재 screen-flow.md 와의 차이 및 보완 필요 사항

현재 `screen-flow.md`의 Screen 5 Role differences 표:

```
| | leader | member | observer |
|-|--------|--------|----------|
| View result | rw | rw | redirect to dashboard |
| Save reaction | yes | yes | n/a |
| CTA to dashboard | yes | yes | n/a |
```

위 표는 단일 뷰 기준이다. 이 문서의 설계가 확정되면 screen-flow.md Screen 5 Role differences를 아래로 교체해야 한다:

```
| | leader | member | observer |
|-|--------|--------|----------|
| 본인 결과 열람 | rw | rw | redirect |
| 팀원 결과 열람 | rw (팀원 전체) | - | - |
| roleReaction 저장 | yes | yes | n/a |
| 역할 확정 (finalRole) | yes (타인 확정) | - | - |
| FinalizedRoleBadge 표시 | - | yes (본인 확정 시) | n/a |
| 팀원 사이드바 | yes | - | - |
| 비공개 코멘트 (Later) | yes | - | - |
| "팀 현황 보기" CTA | yes | yes | n/a |
```

---

## 11. 결정 키 등록 필요 사항

이 설계 문서에서 파생되는 신규 결정 키:

**KF-029 (미등록 — tf-docs 또는 다음 세션에서 등록):**
- 내용: 팀장의 팀원 결과 열람 URL 구조를 `?view=member&userId=` 쿼리 파라미터 방식으로 확정. 역할 확정(`finalRole`)은 별도 `TeamMemberRole` 테이블 또는 기존 TeamMember 테이블 컬럼 확장으로 처리. Screen 10 Contract Gate에서 finalRole 데이터를 참조.
- 차단 조건: DB 스키마 변경이 필요하므로 tf-db 작업 선행 필요. 신규 엔드포인트 2개 (GET /result/:userId, POST /roles/finalize).
- 연관: KF-025 (roleReaction), KF-015 (Screen 10 Contract Gate)
