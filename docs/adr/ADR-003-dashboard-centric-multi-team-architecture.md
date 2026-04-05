---
id: ADR-003
date: 2026-04-05
status: accepted
tags: [routing, dashboard, multi-team, ux, session]
---

# ADR-003 — 대시보드 중심 아키텍처 전환 및 다중 팀 지원

## 컨텍스트

현재 TeamForge는 **선형 위저드 구조**로 동작한다:

```
/login → /onboarding/role → /team/create 또는 /team/join → /survey → /result → /team/[teamId]
```

이로 인해 발생하는 문제:
1. **마지막 팀 고정**: `/onboarding/role`이 `TeamMember.findFirst({ orderBy: { joinedAt: "desc" } })` 기반으로 최근 가입 팀 1개만 "이어서 진행" 배너로 표시
2. **복수 팀 진입 불가**: 여러 팀에 속해 있어도 팀 간 전환 UX가 없음
3. **대시보드 부재**: 사용자가 자신의 모든 팀을 한눈에 볼 수 있는 화면이 없음
4. **세션 단일 팀**: `session.user.teamId` (단수) 구조로 multi-team 시나리오를 처리하지 못함
5. **협업 도구 진입점 없음**: Screen 9(협업 도구 세팅)가 KF-002로 보류되어 있고, 연결할 UI 홈이 없음

DB `TeamMember` 모델은 이미 복수 팀을 지원하는 구조(userId + teamId 복합 unique)이나, 
세션/라우팅 레이어가 단일 팀 가정 위에 설계되어 있음.

## 고려한 옵션

| 옵션 | 장점 | 단점 |
|------|------|------|
| **A. 선형 위저드 유지 + 팀 스위처 추가** | 변경 최소화 | 근본 문제 미해결, `/onboarding/role` 여전히 어색 |
| **B. 대시보드 중심 전환 + 세션 경량화** | 진정한 multi-team 지원, 확장성 | 구현 범위 큼, 기존 플로우 재작성 필요 |
| **C. 대시보드 + JWT 복수팀 포함** | 초기 로드 빠름 | JWT 크기 증가, 팀 변경 시 token refresh 필수 |

## 결정

**채택: 옵션 B — 대시보드 중심 전환 + 세션 경량화**

이유:
- DB 모델은 이미 복수 팀을 지원하므로 세션/라우팅만 맞추면 됨
- JWT에 팀 정보를 넣는 것(옵션 C)은 팀 추가/이탈 시마다 token 재발급이 필요해 복잡도 증가
- 대시보드 진입점이 있어야 Screen 9(협업 도구 세팅)를 자연스럽게 배치할 수 있음
- Notion, Linear 등 주요 SaaS의 검증된 UX 패턴(팀 목록 대시보드)을 따름

## 결과

### 새 라우팅 구조
```
/login
  ↓
/dashboard ← 새 진입점 (모든 팀 카드 + 팀 생성/참가 CTA)
  ├─ 팀 카드 클릭 → /team/[teamId]
  ├─ "새 팀 만들기" → /team/create
  └─ "팀 참가하기" → /team/join

/team/[teamId] (레이아웃: 헤더 + TeamSwitcher + 팀 내비)
  ├─ /kickoff/...  (기존 플로우 유지)
  ├─ /meetings/... (기존)
  └─ /settings     (신규: 협업 도구 포함)
```

### 세션 변경
- `session.user.teamId` / `session.user.teamRole` 유지 (backward compat, Phase 2에 제거)
- 팀 목록은 `GET /teams` API로 fresh하게 조회
- `auth.service.ts` `getMe()`는 allTeams 포함 응답 추가

### `/onboarding/role` 처리
- 새 사용자(isNewUser=true) + 팀 없음 → `/dashboard` (empty state)에서 팀 생성/참가 유도
- 역할 선택은 `/team/create`, `/team/join` 플로우에 embedded
- `/onboarding/role` 페이지는 deprecated 처리 (즉시 삭제 아님, 점진적 제거)

### 협업 도구 위치
- `/team/[teamId]/settings` 또는 `/team/[teamId]/tools` 하위에 배치
- KF-002(Screen 9 Screen 10 흡수)는 유지하되, 팀 설정 섹션으로 재정의

- **긍정적:**
  - 복수 팀 완전 지원
  - 사용자가 모든 팀을 한눈에 파악
  - Screen 9 협업 도구 세팅을 자연스러운 위치에 배치
  - 실제 SaaS 서비스와 동일한 UX 패턴

- **부정적/트레이드오프:**
  - 구현 범위: `dashboard/page.tsx`, `TeamCard`, `TeamSwitcher`, `GET /teams` API 신규 작성
  - `/team/[teamId]/layout.tsx` 추가로 기존 팀 페이지 수정 필요
  - 기존 E2E 테스트(있다면) 업데이트 필요

- **중립적:**
  - `session.user.teamId` 는 Phase 2까지 유지 (호환성)
  - `/onboarding/role`은 즉시 삭제 대신 점진적 제거

## 구현 주의사항

1. **DB 변경 없음**: `TeamMember` 모델은 이미 multi-team 설계됨
2. **기존 kickoff 플로우 유지**: `/team/[teamId]/kickoff/*` 경로 변경 없음
3. **루트(/) 리다이렉트 변경**: 인증 → `/dashboard`, 미인증 → `/login`
4. **TeamSwitcher**: `useTeams()` hook으로 전체 팀 목록 fetch 후 드롭다운 표시
5. **권한 검증**: `/team/[teamId]` 접근 시 해당 팀 멤버인지 page-level에서 확인 (middleware 대신)
6. **협업 도구 OAuth**: Discord는 Webhook URL 직접 입력, Slack/GitHub/Notion은 `window.open()` 팝업으로 사이트 이탈 최소화

---

*결정자: 개발팀*
*검토: 2026-04-05*
