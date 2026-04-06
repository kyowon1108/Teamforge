---
name: tfo
description: TeamForge Orchestrator — 작업을 분류하고 전문 에이전트에게 할당하는 마스터 오케스트레이터
---

# /tfo — TeamForge Orchestrator

TeamForge 프로젝트의 모든 작업 진입점. Codex에 먼저 계획을 검토받고, 도메인별 에이전트에게 할당한 후 감시·보안·문서화·커밋까지 조율한다.

## 실행 흐름

```
/tfo [작업 설명]
  │
  ▼
1. [분류] 작업 도메인 파악
   - db, backend, frontend, design, flow, docs, security, mixed
  │
  ▼
2. [Codex 사전 검토] codex:codex-rescue 호출
   - "이 작업을 구현하기 전에 접근법 검토해줘: {작업 설명}"
   - Codex 피드백 → 최종 구현 방향 확정
  │
  ▼
3. [구현 에이전트 할당] 도메인 순서대로 실행
   DB 변경 있으면: tf-db 먼저
   Backend 변경 있으면: tf-backend (DB 완료 후)
   Frontend 변경 있으면: tf-frontend (Backend 완료 후)
   UI 설계 포함 시: tf-design (frontend 전에)
   Flow 설계 포함 시: tf-flow (전체 전에)
  │
  ▼
4. [병렬 검증]
   tf-supervisor + tf-security 동시 실행
  │
  ▼
5. [문서화] tf-docs 호출
   - 진행 일지 업데이트, 결정 키 신규 등록 여부 판단
  │
  ▼
6. [커밋] tf-commit 호출
   - supervisor/security 모두 done이어야만 실행
   - blocked 상태면 중단 후 사용자에게 보고
```

## 도메인 분류 규칙

| 키워드/파일 패턴 | 도메인 |
|----------------|--------|
| prisma/, packages/contracts/src/jsonb/ | db |
| apps/api/src/ | backend |
| apps/web/ | frontend |
| components/, page.tsx, tailwind | frontend + design |
| 화면 설계, UX, 플로우, 아키텍처, 폴더 구조 | flow |
| auth, CORS, injection, XSS | security |

## 오케스트레이터 동작 규칙

1. **Codex 우선** — 5줄 이상 변경이 예상되면 반드시 Codex 사전 검토
2. **순서 강제** — DB → Backend → Frontend 순서 위반 금지
3. **blocked 전파** — 어느 에이전트든 `blocked` 상태 반환 시 이후 단계 중단
4. **도메인 침범 차단** — 각 에이전트는 자신의 owned path만 수정
5. **문서화 필수** — 모든 작업 완료 후 tf-docs 호출 생략 불가

## 사용 예시

```
/tfo "integrations 테이블 추가하고 Screen 10에 연결"
/tfo "Survey Section 2 UI 개선"
/tfo "AI 에이전트 응답 파싱 에러 수정"
/tfo "킥오프 배치 A 구현"
```

## 에이전트 상태 보고 형식

각 에이전트는 다음 형식으로 완료 보고:
```
AGENT: tf-{name}
STATUS: done | skipped | blocked
REASON: (blocked/skipped 시 필수)
CHANGED_FILES: [파일 목록]
DECISIONS: [신규 결정 키 있으면 목록]
```
