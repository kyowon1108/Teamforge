---
id: ADR-001
date: 2026-04-05
status: accepted
supersedes: ~
tags: [kickoff, architecture, diagram, ux]
---

# ADR-001 — 아키텍처 다이어그램 업데이트 전략

## 컨텍스트

킥오프 Topic 단계에서 팀이 주제를 확정하면 AI가 초기 Mermaid 다이어그램을 생성한다. 이후 Architecture 단계로 넘어갈 때, AI 채팅 응답에 포함된 새 mermaidCode가 자동으로 기존 다이어그램을 덮어쓰는 문제가 발생했다.

팀이 Topic 단계에서 합의한 다이어그램이 사라지고, Architecture 단계 진입 직후 AI seed 응답에 의해 새 다이어그램으로 교체되어 사용자 혼란을 유발했다.

## 고려한 옵션

| 옵션 | 장점 | 단점 |
|------|------|------|
| A. 자동 덮어쓰기 (현재) | 항상 최신 AI 제안 표시 | 사용자 의도 무시, Topic 합의 다이어그램 소실 |
| B. 명시적 업데이트만 | 사용자 제어권 보장 | 새 제안이 있을 때 알림 필요 |
| C. 버전 히스토리 | 모든 이력 보존 | 구현 복잡도 높음, MVP 초과 |

## 결정

**채택: 옵션 B — 명시적 업데이트 버튼 클릭 시에만 적용**

- `mermaidCode`: 현재 화면에 표시 중인 다이어그램 (사용자가 명시적으로 확정한 것)
- `pendingMermaidCode`: AI 채팅 응답에서 온 새 다이어그램 (대기 상태)
- `diagramUpdateMode` ref: `true`일 때만 다음 AI 응답의 mermaidCode를 `mermaidCode`에 적용

## 결과

**긍정적:**
- Topic 단계 합의 다이어그램이 보존됨
- "새 제안 있음" 뱃지로 사용자에게 변경 가능성 알림
- 팀원이 원할 때 업데이트 가능

**부정적/트레이드오프:**
- 사용자가 "다이어그램 업데이트" 버튼을 눌러야 하는 추가 액션 필요
- 초기 진입 시 다이어그램이 없으면 pending 다이어그램이 표시 (자동 적용과 동일한 UX)

**중립적:**
- auto-seed, 실시간 sync, 채팅 응답 모두 동일하게 `setPendingMermaidCode` 사용

## 구현 주의사항

- `pendingMermaidCode`가 있고 `mermaidCode`가 없는 경우: pending을 그대로 표시 + "AI 제안 — 업데이트 버튼으로 적용" 안내
- "다이어그램 업데이트" 버튼 클릭 → `diagramUpdateMode.current = true` 설정 후 `sendMessage()` 호출
- 팀원도 다이어그램 업데이트 버튼 사용 가능 (팀장 전용 아님)

---

*결정자: Claude Code + Codex 검토*
*관련 KF 키: KF-001*
*구현 파일: `apps/web/app/team/[teamId]/kickoff/architecture/page.tsx`*
