---
date: 2026-04-05
seq: 05
area: db, backend, frontend
screens: [9]
tags: [dashboard, multi-team, integrations, screen9, ux-refactor, oauth, webhook]
decision_keys: [KF-009, KF-010]
---

# 260405_05 — 대시보드 중심 리팩토링 + Screen 9 (협업 도구 세팅) 기초

## 한 줄 요약

선형 위저드 → 대시보드 중심 아키텍처 전환, `/dashboard` 신규 + `integrations` 테이블 + Screen 9 기초 UI 구현.

---

## 이번에 본 사실

- `apps/web/app/page.tsx`: `TeamMember.findFirst({ orderBy: { joinedAt: "desc" } })` 기반으로 최근 1개 팀만 처리 → 복수 팀 불가
- `apps/web/app/onboarding/role/page.tsx`: 기존 팀 있어도 역할 선택 화면 + "이어서 진행" 배너 표시 → 단일 팀 가정 위에 설계된 버그
- `apps/api/prisma/schema.prisma`: `TeamMember`에 `team` 릴레이션 있음, DB 설계는 이미 multi-team 지원 구조
- `KickoffSession`의 관계명은 `kickoffSessions` (복수) — 단수로 접근 시 타입 오류
- `Integration.meta` JSON 필드: `Record<string, unknown> as object` 캐스팅 필요 (Prisma NullableJsonNullValueInput 타입 이슈)

---

## 결정사항

| 결정 키 | 채택 | 이유 | 대안 | 영향 |
|---------|------|------|------|------|
| KF-009 | 대시보드 중심 아키텍처 | DB는 이미 multi-team 지원. 세션/라우팅만 맞추면 됨. Linear, Notion 등 SaaS 표준 UX | 선형 위저드 + 팀 스위처 추가 | app/page.tsx, onboarding/role, team layout |
| KF-010 | 협업 도구 Webhook URL 직접 입력 우선 | 사이트 이탈 없이 완결 가능. OAuth는 추후 TeamForge App 등록 후 추가 | OAuth 팝업 방식 먼저 | integrations 테이블 구조 |

---

## 구현 상세

### DB 스키마 (tf-db)
- `Integration` 모델 신규 추가: `team_id`, `tool`, `status`, `webhook_url`, `access_token`, `meta` 등
- `Team.integrations` 릴레이션 추가
- 마이그레이션: `20260405045601_add_integrations_table`

### API 엔드포인트 (tf-backend)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/teams` | 내 모든 팀 목록 (kickoff 상태 포함) |
| GET | `/integrations/:teamId` | 팀 연동 목록 |
| POST | `/integrations/:teamId/webhook` | Webhook URL 연결 |
| DELETE | `/integrations/:teamId/:tool` | 연결 해제 |
| POST | `/integrations/:teamId/:tool/test` | 테스트 메시지 발송 |

### 라우팅 변경 (tf-frontend)
- `app/page.tsx`: `/` → `/dashboard` 리다이렉트 (팀 상태 상관없이)
- `app/dashboard/page.tsx`: 모든 팀 카드 그리드 + empty state
- `app/team/[teamId]/layout.tsx`: 팀 헤더 + TeamSwitcher 드롭다운
- `components/TeamSwitcher.tsx`: 모든 팀 간 전환 드롭다운

### onboarding/role 수정
- 기존 팀 있으면 → `/dashboard` 즉시 리다이렉트
- "이어서 진행" 배너 제거
- 팀 없는 신규 유저만 역할 선택 화면 표시

### Screen 9 (tf-frontend)
- `app/team/[teamId]/tools/page.tsx`: 카테고리 + 카드 그리드 대시보드
  - 핵심 도구: GitHub, Slack, Notion
  - 알림: Discord
  - 개발 도구: Linear, Jira
- 카드 상태: 연결됨(초록) / 미연결(회색) / 오류(빨강)
- 인라인 step guide + URL 입력 폼 (확장 패널)
- 팀장만 연결/해제 가능, 팀원은 상태 조회만

---

## 보류/미구현

| 항목 | 왜 미룸 | 재개 조건 |
|------|---------|----------|
| Slack/GitHub/Notion OAuth 팝업 | TeamForge App 등록 필요 (Slack App, GitHub App) | App 등록 후 |
| `/team/[teamId]` 내비게이션 탭 | 팀 페이지에 Tools 링크 추가 필요 | 다음 세션 |
| Webhook 수신 엔드포인트 | GitHub/Discord에서 TeamForge로 오는 이벤트 처리 | Phase 5 |
| 배치 A/B/C/D Screen 10 UI | 이번 세션 범위 외 | 다음 배치 |

---

## 다음 시작점 (Next Start)

**다음 작업:** Screen 10 배치 A/B/C/D UI 구현 + `/team/[teamId]` 내비게이션에 Tools 탭 추가

시작 파일:
- `apps/web/app/team/[teamId]/page.tsx` — Tools 링크 추가 (헤더 또는 사이드바)
- `apps/web/app/team/[teamId]/kickoff/summary/page.tsx` — 배치 A/B/C/D UI

Open Questions:
- TeamSwitcher가 `[teamId]` 레이아웃 외부 페이지(survey, result)에서도 보여야 하는가?
- `/onboarding/role`을 완전히 삭제하고 `/team/create`에 역할 선택을 embed해야 하는가?

---

## 참조 소스

- 수정 파일:
  - `apps/web/app/page.tsx`
  - `apps/web/app/onboarding/role/page.tsx`
  - `apps/api/src/modules/teams/teams.service.ts`
  - `apps/api/src/modules/teams/teams.controller.ts`
  - `apps/api/src/app.module.ts`
  - `apps/api/prisma/schema.prisma`
- 신규 파일:
  - `apps/web/app/dashboard/page.tsx`
  - `apps/web/app/team/[teamId]/layout.tsx`
  - `apps/web/app/team/[teamId]/tools/page.tsx`
  - `apps/web/components/TeamSwitcher.tsx`
  - `apps/api/src/modules/integrations/` (service, controller, module)
- ADR: `docs/adr/ADR-003-dashboard-centric-multi-team-architecture.md`
- 리서치: Playwright 조사 결과 (Discord/Slack/GitHub/Notion/Linear UX 패턴)
- 마이그레이션: `apps/api/prisma/migrations/20260405045601_add_integrations_table/`
