---
date: 2026-04-04
seq: 01
area: planning, product
screens: [5, 6, 11, 14]
tags: [meeting-hub, dashboard, retention, ai-explainability, analytics]
decision_keys: [KF-005, KF-006]
---

# 20260404(01) — MVP 이후 우선순위 분석 + 제품 방향 설정

## 한 줄 요약

설문/결과/팀 대시보드까지 안정된 상태에서, "좋은 onboarding product"에서 "계속 돌아오는 운영 product"로 넘어가기 위한 우선순위 결정.

---

## 이번에 본 사실

- 현재 제품에서 설문 완료 이후 **재방문 이유가 없음** → 첫 번째 retention loop 부재
- 팀 대시보드가 정보 제공은 하지만 **바로 행동하는 화면이 아님** → 팀장 중심 액션 허브 필요
- `reliability score` 명칭이 사용자에게 **사람 자체의 신뢰도 평가**처럼 들릴 수 있음 → 표현 위험
- 파일럿 데이터 없이 기능 추가만으로는 개선 방향 판단 불가 → 이벤트 로깅 체계 필요

---

## 결정사항

| 결정 키 | 채택 | 이유 | 대안 | 영향 |
|---------|------|------|------|------|
| KF-005 | Meeting Hub를 첫 번째 retention loop로 | 회의 후 요약/액션/안건이 재방문 트리거가 됨 | Direction Tracker 먼저 | Screen 11 우선 구현 |
| KF-006 | `reliability score` → `profile confidence` 네이밍 변경 | "신뢰도" = 사람 평가로 오인 가능 | 유지 | result/page.tsx, dashboard UI |

---

## 구현 우선순위 (결정)

| 우선순위 | 작업 | 핵심 목적 |
|---------|------|---------|
| 1 | Meeting Hub 최소 버전 | 주간 재방문 이유 만들기 (retention loop 1) |
| 2 | 팀 대시보드 액션 허브화 | 분석 → 행동 화면으로 전환 |
| 3 | AI 결과 설명 가능성 강화 | 추천 결과 신뢰도 확보 |
| 4 | 점수 체계 / 네이밍 정리 | 사용자 반감 방지 |
| 5 | 파일럿용 이벤트 로깅 | 실사용 데이터 기반 개선 |
| 6 | GitHub 보강 품질 안정화 | AI 결과 객관 신호 품질 |
| 7 | Observer 경험 정교화 | 멘토/교수/운영자 buyer 가치 |
| 8 | Direction Tracker 최소 버전 | Meeting Hub 이후 운영성 강화 |

---

## Meeting Hub 최소 구현 범위 (확정)

| 기능 | 최소 구현 | 나중 |
|------|---------|------|
| 회의 입력 | 텍스트 붙여넣기 | Slack/Notion import, STT |
| AI 요약 | 핵심 논의 3~5줄 | Drift 분석 |
| 액션 아이템 추출 | 누가/무엇을/언제까지 | GitHub issue 연동 |
| 액션 상태 | open/done 토글 | — |
| 회의 히스토리 | 최신순 리스트 | — |
| 다음 안건 생성 | 미완료 액션 기준 자동 생성 | 고급 안건 생성 |

**완료 기준:** 회의록 1개 저장 → AI 요약 + 액션 생성 → 완료 체크 → 다음 안건 반영

---

## 이벤트 로깅 체계 (최소)

```
인증: login_started, login_success, login_failed
팀: team_created, invite_link_copied, join_success
설문: survey_started, section_completed, survey_submitted
결과: result_viewed, role_recommendation_clicked
대시보드: dashboard_viewed, reminder_sent, role_confirmed
회의: meeting_created, ai_summary_generated, action_item_completed
```

구현 방향: DB 로그 테이블 → 추후 PostHog/Amplitude 확장

---

## 보류/미구현

| 항목 | 왜 미룸 | 재개 조건 |
|------|---------|----------|
| Direction Tracker | Meeting Hub 이후 운영성 단계 | Screen 11 구현 완료 후 |
| Observer 경험 정교화 | 팀원/팀장 경험 먼저 | Screen 11~14 안정화 후 |
| Zoom/Meet auto-import | 외부 API 의존성 큼 | Phase 5+ |

---

## 다음 시작점 (Next Start)

→ `docs/progress/20260405(01).md` 로 이어짐 (기술 버그 수정 세션)

Meeting Hub 구현은 킥오프 플로우 완성 후 진행 예정.

---

## 참조 소스

- 원본: `docs/product/20260404-todo.md` (이 파일에서 구조화 이전)
- 스펙: `docs/product/system-spec.md` §8.1 (Screen 11), §8.4 (Screen 14)
