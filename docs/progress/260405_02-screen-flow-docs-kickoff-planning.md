---
date: 2026-04-05
seq: 02
area: planning, documentation, kickoff-enhancement
screens: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
tags: [screen-flow, kickoff-enhancement, documentation-system, codex-consult]
decision_keys: [KF-002, KF-003]
---

# 20260405(02) — Screen 플로우 문서화 + 킥오프 보완 항목 확정

## 한 줄 요약

Screen 1~10 구현 현황을 실제 코드 기반으로 문서화. 킥오프에서 빠진 합의 장치와 산출물을 Codex와 분석 후 구현 우선순위 확정.

---

## 이번에 본 사실

- `docs/product/20260405-claude-feedback.md`: Screen별 스펙 vs 구현 현황 대조 문서 (이미 외부에서 작성됨)
- `apps/web/app/team/[teamId]/kickoff/` 폴더: `topic/`, `architecture/`, `summary/` 존재. `tool-setup/` 없음 → Screen 9 전체 미구현 확인
- Screen 6 `team/[teamId]/page.tsx`: `noMeetings = true; // TODO` 하드코딩, "다음 할 일" stub
- Screen 10 `kickoff/summary/page.tsx`: finalize는 구현됨. 워크스페이스 프로비저닝/PDF/스프린트 설정 미구현
- `docs/progress/` 폴더: 세션 전까지 존재하지 않았음

### 킥오프에서 빠진 핵심
피드백 문서(`20260405-claude-feedback.md`) 분석 결과:
- 팀원이 역할 추천을 **수락/조정하는 장치** 없음 → 추천만 있고 책임이 생기지 않음
- **Out of Scope** 섹션 없음 → 팀플은 "할 것"보다 "안 할 것"이 없어서 무너짐
- **성공 기준** 없음 → 완성도 기대값이 사람마다 다름
- **협업 규칙** (브랜치/PR/회의) 없음 → Screen 9 미구현으로 인한 공백
- **첫 Issue / 첫 회의 agenda** 없음 → summary 이후 바로 흩어짐
- **팀원 우려 수집** 없음 → 침묵하는 팀원 리스크가 보이지 않음
- **Summary 서명** 없음 → 합의가 명시적으로 남지 않음

---

## 결정사항

| 결정 키 | 채택 | 이유 | 대안 | 영향 |
|---------|------|------|------|------|
| KF-002 | Screen 9 별도 페이지 불필요, integrations 테이블 + Screen 10 흡수 | 막는 것은 화면이 아닌 도메인 모델 부재 | Screen 9 신규 페이지 구현 | integrations 테이블 신규, Screen 10 UI 확장 |
| KF-003 | 4개 배치 순서 (A→B→C→D), 백엔드 먼저 | 배치 C 자동 생성이 A,B 입력값에 의존 | 프론트부터 | KickoffSession 스키마 확장 필요 |

---

## 킥오프 보완 항목 구현 계획 (KF-003 기반)

### 배치 A — 의사결정 입력 (백엔드: KickoffSession 스키마 확장)

| 항목 | 입력 주체 | 저장 위치 | 화면 |
|------|---------|----------|------|
| Out of Scope 목록 | 팀장 + 팀원 | `kickoff_sessions.out_of_scope JSONB` | topic 확정 후 추가 단계 |
| 성공 기준 3개 | 팀장 | `kickoff_sessions.success_criteria JSONB` | topic 확정 후 추가 단계 |
| 협업 규칙 4개 | 팀장 | `kickoff_sessions.collab_rules JSONB` | summary 화면 or 별도 입력 |
| 팀원 우려 | 각 팀원 | `kickoff_participants.concerns JSONB` | summary 열람 시 팀원별 입력 |

### 배치 B — 합의 (프론트: Summary 화면 확장)

| 항목 | 입력 주체 | API | UI |
|------|---------|-----|-----|
| 역할 수락/조정 요청 | 각 팀원 | `PATCH /teams/{teamId}/members/me/role-acceptance` | Summary에서 역할 카드 + 수락/조정/거절 버튼 |

### 배치 C — 산출물 자동화 (백엔드: AI Agent 호출)

| 항목 | 트리거 | Agent | 저장 |
|------|-------|-------|------|
| 첫 Issue 3~5개 생성 | finalize 직전 | Agent 4 (File Builder) | GitHub 또는 DB 임시 저장 |
| 첫 회의 agenda | finalize 직후 | Agent 6 (Meeting Analyzer seed) | `meetings` 테이블 draft |
| Mini ADR 1~3개 | finalize 직후 | Agent 8 (Change Impact) | `docs/adr/` 또는 DB |

### 배치 D — 게이트 (프론트 + 백엔드)

| 항목 | 변경 |
|------|------|
| Summary 서명 | finalize 버튼 클릭 전 "내 역할과 계획에 동의합니다" 체크 추가 |
| finalize 조건 강화 | 역할 수락률 100% 또는 팀장 override 확인 모달 |

---

## 다음에 해야 할 것 (우선순위 기준)

### 즉시 (Now)
1. **`integrations` DB 테이블 생성** + Prisma 스키마 추가
2. **Screen 10 스프린트 설정 UI** — `sprint_config` 입력 (시작일, 기간, 첫 마감)
3. **Screen 7 Markdown 렌더링 누락 수정** — topic 채팅 AI 응답에 `react-markdown` 미적용

### 다음 (Next)
4. **배치 A** — KickoffSession 스키마 확장 (백엔드) + Out of Scope / 성공 기준 입력 UI
5. **배치 B** — 역할 수락/조정 UI (팀원이 Summary에서 수락)
6. **배치 C** — 첫 Issue 생성 + 첫 회의 agenda 자동 생성
7. **Screen 6** "다음 할 일" 카드 구현 (TODO stub 해소)

### 나중 (Later)
- 배치 D 서명 게이트
- Agent 5 워크스페이스 프로비저닝
- PDF/PPT 내보내기
- Screen 4 이력서 업로드 실제 처리

---

## 보류/미구현

| 항목 | 왜 미룸 | 재개 조건 |
|------|---------|----------|
| Agent 1 온보딩 어시스턴트 | UX 보완 요소, 핵심 플로우 블로커 아님 | Phase 5 진입 후 |
| Agent 3/4 (Screen 9) | Screen 9 설계 확정 전 | KF-002 구현 완료 후 |
| 팀 화이트보드 | 데스크톱 전용, 별도 라이브러리 필요 | Phase 5+ |
| Git 온보딩 튜토리얼 | 교육 기능, MVP 블로커 아님 | Phase 5+ |
| 문서 업로드 파싱 (Screen 7) | Claude API 파싱 파이프라인 별도 구현 필요 | Phase 2+ |

---

## 다음 시작점 (Next Start)

**다음 작업:** `integrations` 테이블 Prisma 스키마 추가 + Screen 10 스프린트 설정 UI 구현.

시작 파일:
- `apps/api/prisma/schema.prisma` — `integrations` 모델 추가
- `apps/web/app/team/[teamId]/kickoff/summary/page.tsx` — 스프린트 설정 섹션 추가

Open Questions:
- 스프린트 설정 UI를 summary 내에 인라인으로 넣을 것인가, 별도 모달로 뺄 것인가?
- 첫 Issue 생성을 GitHub 직접 연동으로 갈 것인가, DB 임시 저장 후 나중에 export할 것인가?

---

## 참조 소스

- 분석 파일: `docs/product/20260405-claude-feedback.md`
- 생성 파일: `docs/product/screen-flow.md`
- 생성 파일: `docs/progress/README.md`, `docs/progress/decisions.md`
- 스펙: `docs/product/system-spec.md` §7.9 (Screen 9), §7.10 (Screen 10)
- 보완 기반: `docs/product/20260405-claude-feedback.md` 전체 (킥오프 필수 확정 항목 체크리스트)
