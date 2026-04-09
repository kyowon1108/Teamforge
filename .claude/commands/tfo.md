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
   Flow 설계 포함 시: tf-flow (전체 전에)
   UI 설계 포함 시:
     3a. tf-design pre-build (figmaFileKey 있으면 Figma 읽기 포함)
     → STATUS=awaiting_approval이면 사용자에게 디자인 가이드 확인 요청 후 진행
     3b. [사용자 승인 체크포인트 #1] "위 디자인 가이드로 구현할게요. 계속할까요?"
   DB 변경 있으면: tf-db 먼저
   Backend 변경 있으면: tf-backend (DB 완료 후)
   Frontend 변경 있으면: tf-frontend (Backend 완료 후)
   UI 설계 포함 시 (구현 완료 후):
     3c. tf-design post-build (figmaFileKey 있으면 Figma annotation write-back)
     → STATUS=awaiting_approval이면 사용자에게 결과 확인 요청 후 진행
     3d. [사용자 승인 체크포인트 #2] "구현 결과를 Figma에 반영했어요. 다음 단계 진행할까요?"
   Figma 스크린샷 동기화 포함 시 (figmaSync=true 또는 명시적 요청 시):
     3e. tf-figma-sync 호출
         - 구현된 페이지를 desktop(1440) + mobile(390)으로 캡처
         - Figma 파일에 업데이트 (generate_figma_design + Playwright 조합)
         - 완료 후 layout.tsx의 capture script 자동 제거
     → 사용 예시: /tfo "Screen 4 구현" figmaSync=true
  │
  ▼
4. [병렬 검증]
   tf-supervisor + tf-security 동시 실행
  │
  ▼
5. [문서화] tf-docs 호출
   - 진행 일지 업데이트, 결정 키 신규 등록 여부 판단
   - 생성·수정 문서는 `docs/architecture/document-language-policy.md` 준수
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
5. **문서화 필수** — 모든 작업 완료 후 tf-docs 호출 생략 불가, 문서 언어 정책 준수

## 사용 예시

```
/tfo "integrations 테이블 추가하고 Screen 10에 연결"
/tfo "Survey Section 2 UI 개선"
/tfo "AI 에이전트 응답 파싱 에러 수정"
/tfo "킥오프 배치 A 구현"
```

Figma 연동 시 (figmaFileKey 추가)

```
/tfo "Button 컴포넌트 구현" figmaFileKey=vvmx5ls8xftcqB7Cvlse3Q
/tfo "Screen 3a 팀 생성 UI 개선" figmaFileKey=vvmx5ls8xftcqB7Cvlse3Q
```

Figma 스크린샷 동기화 시 (figmaSync=true 추가)

```
/tfo "Figma 전체 스크린샷 업데이트" figmaSync=true
/tfo "Screen 4 구현 후 Figma 동기화" figmaSync=true
```

figmaSync=true 단독 사용 시 tf-figma-sync만 실행 (구현 에이전트 생략 가능)

## 에이전트 상태 보고 형식

각 에이전트는 다음 형식으로 완료 보고:
```
AGENT: tf-{name}
STATUS: done | skipped | blocked
REASON: (blocked/skipped 시 필수)
CHANGED_FILES: [파일 목록]
DECISIONS: [신규 결정 키 있으면 목록]
```
