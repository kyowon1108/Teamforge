---
date: 2026-04-05
seq: 06
area: frontend, backend, security
screens: [3b, 4, 9]
tags: [redirect-fix, flow-verification, security-audit, observer-guard, css-tokens, accessibility]
decision_keys: [KF-011]
---

# 260405_06 — ERR_TOO_MANY_REDIRECTS 수정 + 전체 플로우 검증 + 보안 감사

## 한 줄 요약

ERR_TOO_MANY_REDIRECTS 루프 해소, 팀 합류 시 역할 선택 UI 추가, 5개 에이전트 병렬 검증으로 CSS 토큰·옵저버 권한·보안 이슈 전수 수정.

---

## 이번에 본 사실

- `apps/web/middleware.ts`: `/login` 로그인 완료 유저를 `/`로 보내고 있었음 → `app/page.tsx`가 다시 `/login`으로 → 무한 루프
- `apps/web/app/page.tsx`: `try/catch`로 API reachability 체크 → 서버 다운 시 `/login?error=api_unavailable`으로 리다이렉트 → 루프의 원인
- `apps/web/app/team/join/page.tsx`: 역할을 `localStorage.getItem("teamforge_role")`에서만 읽어 stale 가능. 합류 화면에 UI 없음
- `apps/web/app/survey/page.tsx`: 옵저버 역할 검증 없음 → URL 직접 접근 시 설문 진행 가능
- CSS 토큰 오류: `--tf-stroke-default`(미정의), `--tf-bg-danger`/`--tf-fg-danger`(미정의), `--tf-fg-caution`(미정의) 여러 파일에 사용됨
- `apps/web/app/team/[teamId]/layout.tsx`: `--tf-stroke-default` 사용
- `apps/web/app/dashboard/page.tsx`: `--tf-fg-caution` 사용
- JWT `teamRole` 필드: 로그인 시점에만 기록 → 팀 합류 직후 session이 stale할 수 있음 (옵저버 가드에 영향)
- `apps/web/middleware.ts`: callbackUrl에 외부 URL이 설정될 경우 open redirect 가능성 있음
- `apps/api/src/modules/teams/teams.controller.ts`: `@UseGuards(JwtAuthGuard)` 클래스 레벨 적용 → 정상 (보안 에이전트 우려는 오탐)

---

## 결정사항

| 결정 키 | 채택 | 이유 | 대안 | 영향 |
|---------|------|------|------|------|
| KF-011 | 팀 합류 시 역할 선택 페이지 내 명시적 UI | localStorage stale 문제 + 다중 팀 환경에서 역할은 팀마다 다를 수 있음 | `/onboarding/role`에서 1회만 선택 | `team/join/page.tsx`, `team/join/[code]/page.tsx` |

---

## 구현 상세

### ERR_TOO_MANY_REDIRECTS 수정

**원인:**
```
/ → app/page.tsx: API 실패 → /login?error=api_unavailable
/login → middleware: 로그인 사용자 → / (구: "/")
= 무한 루프
```

**수정 1 — `middleware.ts`:**
- `/login` 로그인 사용자 리다이렉트 대상: `/` → `/dashboard`
- `hasApiToken` fallback 추가: `session.teamforgeToken ?? session.user.teamforgeToken`
- `callbackUrl` open redirect 방지: `path.startsWith("/")` 체크

**수정 2 — `app/page.tsx`:**
- API reachability `try/catch` 블록 전체 제거
- 세션 확인 → `teamforgeToken` 확인 → `/dashboard` 리다이렉트만 유지

### 팀 합류 역할 선택 UI

**`/team/join/page.tsx`:**
- 팀원 / 옵저버 카드 선택 UI 추가 (선택 상태 border 강조)
- `localStorage.getItem("teamforge_role")` 의존성 제거, state로 직접 관리

**`/team/join/[code]/page.tsx`:**
- 자동 합류 방식 → 역할 선택 후 "팀에 합류하기" 버튼으로 확정 방식으로 변경
- 비로그인 접근 시 callbackUrl 유지하며 `/login`으로 전송 (기존 동작 유지)

### 옵저버 설문 접근 차단

**`/survey/page.tsx`:**
- `teamRole` 상태 추가
- `/auth/me` API를 항상 호출하여 실시간 role 확인 (JWT stale 대응)
- `teamRole === "observer"` 시 `router.replace("/team/${teamId}")` 즉시 리다이렉트

```typescript
const applyRoleAndTeam = (tid: string | null, role: string | null) => {
  if (role === "observer" && tid) {
    router.replace(`/team/${tid}`);
    return;
  }
  if (role) setTeamRole(role);
  setTeamIdLoading(false);
};
```

### CSS 토큰 전수 수정

| 잘못된 토큰 | 올바른 토큰 | 수정 파일 |
|-----------|-----------|---------|
| `--tf-stroke-default` | `--tf-stroke-neutral` | dashboard/page.tsx, TeamSwitcher.tsx, [teamId]/layout.tsx, tools/page.tsx |
| `--tf-bg-danger` | `--tf-bg-negative` | tools/page.tsx |
| `--tf-fg-danger` | `--tf-fg-negative` | tools/page.tsx |
| `--tf-fg-caution` | `--tf-fg-warning` | dashboard/page.tsx |

### TeamSwitcher 접근성 개선

- `aria-haspopup="listbox"`, `aria-expanded={open}`, `aria-label` 추가
- `role="listbox"` on dropdown
- ESC 키 핸들러 추가
- `focus-visible` ring 스타일 적용

### tools/page.tsx 이모지 위반 수정

- `"⭐ 핵심 도구"`, `"🔔 알림"`, `"🛠 개발 도구"` → Lucide `Star`, `Bell`, `Wrench` 아이콘으로 교체

---

## 5개 에이전트 검증 결과 요약

| 에이전트 | 결과 | 주요 발견 |
|---------|------|---------|
| tf-flow | ⚠️ 3건 수정 | 옵저버 설문 접근(CRITICAL), middleware 경로 분석 |
| tf-backend | ✅ 정상 | 모든 API 엔드포인트 존재·타입 일치 확인 |
| tf-frontend | ⚠️ 4건 수정 | CSS 토큰 오류, `--tf-fg-caution` 미정의 |
| tf-security | ⚠️ 3건 수정 | callbackUrl open redirect, 옵저버 권한 일관성 |
| Codex | 🔄 실행 중 | (백그라운드 분석) |

---

## 보류/미구현

| 항목 | 왜 미룸 | 재개 조건 |
|------|---------|----------|
| kickoff 엔드포인트 옵저버 권한 검증 (`getParticipants`, `getArtifacts`) | 기존 코드 동작 영향 범위 파악 필요 | 다음 킥오프 배치 작업 시 함께 처리 |
| SSRF 방어 (integrations webhook URL allowlist) | 현재 MVP 단계에서 위험도 낮음 | Phase 5 Webhook 수신 엔드포인트 구현 시 |
| Rate limiting (초대코드 brute force) | NestJS throttler 설정 필요 | Phase 5 |
| Screen 10 배치 A/B/C/D UI | 범위 외 | 다음 배치 |

---

## 다음 시작점 (Next Start)

**다음 작업:** Screen 10 킥오프 최종 요약 배치 A/B/C/D UI 구현

시작 파일:
- `apps/web/app/team/[teamId]/kickoff/summary/page.tsx` — 배치 A(Out of Scope, 성공 기준, 협업 규칙, 우려 입력)
- `apps/web/app/team/[teamId]/page.tsx` — Tools 링크 추가 (내비게이션 탭)

Open Questions:
- `session.user.teamRole`이 팀 합류 후 자동 갱신되지 않는 문제 → NextAuth `update()` 호출로 세션 강제 갱신 고려?
- TeamSwitcher가 `[teamId]` 레이아웃 외부 페이지(survey, result)에서도 보여야 하는가?

---

## 참조 소스

- 수정 파일:
  - `apps/web/middleware.ts`
  - `apps/web/app/page.tsx`
  - `apps/web/app/survey/page.tsx`
  - `apps/web/app/team/join/page.tsx`
  - `apps/web/app/team/join/[code]/page.tsx`
  - `apps/web/app/dashboard/page.tsx`
  - `apps/web/app/team/[teamId]/layout.tsx`
  - `apps/web/app/team/[teamId]/tools/page.tsx`
  - `apps/web/components/TeamSwitcher.tsx`
- 결정 키: KF-011
