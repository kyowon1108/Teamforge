# TeamForge — Claude Code Project Instructions

## 핵심 문서 위치

| 문서 | 경로 | 설명 |
|------|------|------|
| 제품 스펙 | `docs/product/system-spec.md` | 화면 14개, 전체 UX/기능 명세 |
| 화면 플로우 | `docs/product/screen-flow.md` | Screen 1~10 구현 현황 + 역할별 차이 |
| 구현 보완 | `docs/api/implementation-supplement-v1.0.md` | API 계약, AI 에이전트 스키마, 보안, DB 보완 |
| ADR | `docs/adr/` | 아키텍처 결정 기록 (ADR-NNN-slug.md) |
| 진행 일지 | `docs/progress/` | 날짜별 세션 기록 (YYMMDD_NN-brief-english-desc.md) |
| 결정 키 원장 | `docs/progress/decisions.md` | KF-NNN 결정 키 현재 유효한 결론 |
| 문서 템플릿 | `docs/_templates/` | progress, adr, api, runbook, review 템플릿 |
| Human approval | `docs/reviews/ai-artifacts/` | AI 생성 파일 검토 대기 목록 |
| 운영 절차 | `docs/runbooks/` | 배포, 마이그레이션, 장애 대응 절차 |

---

## 사용 가능한 플러그인 / 스킬

### `/teamforge-docs` — 문서화 스킬 (로컬 스킬)

TeamForge `docs/` 구조에 맞게 문서를 생성·배치. **세션 시작/종료, 주요 결정, API 설계, DB 마이그레이션 전 반드시 사용.**

| 명령 | 사용 시점 |
|------|----------|
| `/teamforge-docs progress` | 코딩 세션 종료 시 — 진행 일지 생성 |
| `/teamforge-docs adr "제목"` | 주요 설계 결정 시 — ADR 초안 생성 |
| `/teamforge-docs api 모듈명` | 새 API 설계 시 — 계약 문서 초안 |
| `/teamforge-docs runbook migration` | DB 마이그레이션 전 — 절차서 생성 |
| `/teamforge-docs review agentN` | AI 에이전트가 파일 생성 시 — 검토 요청 |
| `/teamforge-docs status` | 현황 파악 필요 시 — 전체 docs 요약 |

---

### `codex:codex-rescue` — Codex 컨설턴트 (플러그인)

**분석/검토 전용. 코드 작성은 내가 직접.**

| 사용 시점 | 방법 |
|----------|------|
| 5줄 이상 변경 시작 전 계획 검토 | Agent 도구로 `codex:codex-rescue` 호출 |
| 2회 시도 후에도 에러 미해결 | 에러 + 컨텍스트 전달, 원인 분석 요청 |
| Git commit 전 최종 검토 | diff 전달, "커밋해도 될까?" 요청 |

---

### `ui-ux-pro-max:ui-ux-pro-max` — UI/UX 디자인 가이드 (플러그인)

**UI 구조, 컴포넌트, 색상/타이포/레이아웃 결정 시 반드시 사용.**

- 50+ 스타일, 161 색상 팔레트, 99 UX 가이드라인
- 새 페이지 설계, 컴포넌트 제작, 반응형 처리 시 호출

---

### `/seed-web` — SEED 디자인 시스템 문서 (로컬 스킬)

**shadcn/ui 컴포넌트 커스터마이징, SEED 토큰 참조 시 사용.**

```
/seed-web action-button    # 버튼 스펙
/seed-web color            # 색상 토큰
/seed-web spacing          # 스페이싱 토큰
```

---

### `/webapp-testing` — Playwright 프론트엔드 테스트

**UI 구현 완료 후 기능 검증, 회귀 테스트에 사용.**

| TeamForge 활용 시점 | 예시 |
|-------------------|------|
| 킥오프 플로우 E2E 검증 | 로그인 → 팀 생성 → 설문 → 결과 전체 흐름 |
| 실시간 WebSocket 동작 확인 | 팀원 합류 시 대시보드 실시간 업데이트 |
| 역할별 접근 권한 검증 | 옵저버가 설문 접근 시 redirect 확인 |
| UI 버그 재현 | 스크린샷 캡처 + 브라우저 로그 확인 |

```
/webapp-testing   # 로컬 서버 http://localhost:3000 테스트
```

---

### `/changelog-generator` — 릴리즈 노트 자동 생성

**git commit 히스토리 → 사용자 향 changelog 자동 변환.**

```
/changelog-generator   # 최근 커밋 분석 → 릴리즈 노트 초안
```

파일럿 배포 전, 주요 기능 완료 시 사용.

---

### `/meeting-insights-analyzer` — 회의록 분석

**Meeting Hub (Screen 11) 개발 시 AI 분석 파이프라인 설계 참고용.**

회의 트랜스크립트 → 패턴/인사이트/액션 아이템 추출 예시를 확인할 수 있음.
Agent 6 (Meeting Analyzer) 프롬프트 설계 시 참고.

---

### `/mcp-builder` — MCP 서버 설계 가이드

**Agent 5 (Workspace Provisioner) 구현 시 GitHub + Slack MCP 서버 설계에 사용.**

```
/mcp-builder   # MCP 서버 구조 + 툴 설계 가이드
```

Screen 10 워크스페이스 프로비저닝 구현 전 반드시 참고.

---

### `/artifacts-builder` — React/Tailwind/shadcn 아티팩트

**UI 프로토타이핑, 컴포넌트 초안 빠른 확인에 사용.**

새 화면 설계 초안을 실제 코드 작성 전 시각적으로 검증할 때 유용.

---

### `/internal-comms` — 팀 내부 문서 작성

**CONTRIBUTING.md, 팀 공지, 온보딩 가이드 작성 시 사용.**

Screen 9 AI 파일 빌더(Agent 4)가 생성하는 파일 형식 참고용으로도 활용.

---

## 멀티 에이전트 시스템 (`/tfo`)

**모든 개발 작업의 기본 진입점.** `/tfo [작업 설명]`으로 시작하면 Codex 사전 검토 → 도메인별 에이전트 할당 → 감시/보안 검증 → 문서화 → 커밋까지 자동 조율한다.

### 실행 순서

```
/tfo "작업"
  → Codex 사전 검토 (codex:codex-rescue)
  → tf-flow (화면/UX 설계, 필요 시)
  → tf-design (UI/UX 품질 가이드, 필요 시)
  → tf-db (Prisma 스키마 먼저, 필요 시)
  → tf-backend (API 구현, 필요 시)
  → tf-frontend (Next.js 구현, 필요 시)
  → tf-supervisor + tf-security (병렬 검증)
  → tf-docs (진행 일지 + 결정 키 + ADR)
  → tf-commit (blocked 없을 때만 커밋)
```

### 에이전트 목록

| 에이전트 | 소유 경로 | 역할 |
|---------|---------|------|
| `tf-flow` | docs/product/, docs/adr/ | 화면/UX 흐름 설계 |
| `tf-design` | docs/reviews/ai-artifacts/ | UI/UX 품질 검토 (ui-ux-pro-max + seed-web) |
| `tf-db` | apps/api/prisma/, packages/contracts/ | DB 스키마 + Zod 계약 |
| `tf-backend` | apps/api/src/ | NestJS 서비스/컨트롤러 |
| `tf-frontend` | apps/web/ | Next.js 페이지/컴포넌트 |
| `tf-supervisor` | 읽기 전용 | git diff 기반 도메인 침범 감시 |
| `tf-security` | 읽기 전용 | 보안 취약점 감사 (G1~G10) |
| `tf-docs` | docs/ | 진행 일지 + 결정 키 + ADR 자동화 |
| `tf-commit` | git 작업만 | blocked 없을 때만 커밋 실행 |

### 핵심 규칙

- **blocked 전파**: 에이전트 하나라도 `blocked`면 커밋 불가
- **도메인 경계**: 각 에이전트는 소유 경로 외 수정 금지 (자동 blocked)
- **순서 강제**: DB → Backend → Frontend (순서 위반 불가)
- **Codex 선행**: 5줄 이상 변경은 반드시 Codex 사전 검토

에이전트 파일 위치: `.claude/agents/tf-*.md`, 커맨드: `.claude/commands/tfo.md`

---

## Codex 협업 워크플로우 (필수)

**Codex는 구현을 대신하는 도구가 아니다. Claude Code가 직접 코드를 작성하고, Codex는 컨설턴트/검토자로 활용한다.**

### 역할 분담

| 역할 | 담당 |
|------|------|
| 실제 코드 작성 | Claude Code (나) |
| 접근법 사전 검토 | Codex |
| 에러 원인 분석 | Codex (참고용) → Claude Code가 최종 판단 후 수정 |
| 커밋 전 최종 검토 | Codex + Claude Code 함께 판단 |

### 1. 작업 시작 전

5줄 이상의 변경이 예상되는 작업:

1. **내가 먼저 계획을 세운다** — 구현 방향, 영향받는 파일, 잠재적 리스크
2. **Codex에게 계획 설명 + 피드백 요청** → `codex:codex-rescue` 호출
3. **확정된 방향으로 내가 직접 구현**

### 2. 에러 발생 시

1. 내가 먼저 에러 읽고 원인 파악 시도
2. **2회 시도 후 미해결 → Codex에 에러 + 컨텍스트 전달**
3. Codex 분석 참고 후 내가 최종 판단해서 직접 수정

### 3. Git commit 전

1. 내가 변경사항 전체 self-review (스펙 준수, 보안, 타입 안전성)
2. **Codex에게 diff 전달 → "커밋해도 될까?"**
3. Codex + 나의 판단 모두 OK → 커밋

---

## 기술 스택

```
Frontend : Next.js 14 (App Router) + shadcn/ui + Tailwind CSS
Backend  : NestJS + Prisma + PostgreSQL (pgvector)
Auth     : NextAuth.js v5 (Google, GitHub, Kakao)
Realtime : Socket.io
AI       : Claude API (Sonnet 4.6 / Haiku 4.5) + OpenAI Whisper + text-embedding-3-small
Storage  : Supabase Storage
Monorepo : Turborepo + pnpm
```

환경변수: `.env.example` 참조.
- `KAKAO_CLIENT_ID` 있음 → 카카오 로그인 활성화 (비즈앱 미승인: 합성 이메일 처리)
- `KAKAO_CLIENT_ID` 비어있음 → UI disabled + "준비 중" 표시

---

## 디자인 시스템 규칙

- 색상: `var(--tf-*)` 시맨틱 토큰만 사용. raw hex 사용 금지.
- 아이콘: Lucide React만. 이모지 사용 금지.
- 컴포넌트: shadcn/ui copy-paste 방식. `components/ui/` 에 코드 소유.
- 폰트: Pretendard (`font-sans` 클래스).

---

## 코드 작성 규칙

- JSONB 필드는 반드시 `packages/contracts/src/jsonb/` 의 Zod 스키마로 검증 후 저장.
- AI 에이전트 응답은 `packages/contracts/src/ai/` 스키마로 파싱. 실패 시 3회 재시도.
- 파일 업로드: magic bytes 검증 필수 (`file-type` 라이브러리).
- 사용자 입력이 AI 프롬프트에 포함될 때: XML 태그로 경계 분리 (prompt injection 방어).
- AI 생성 파일(`reviewRequired: true`): `docs/reviews/ai-artifacts/` 에 저장 후 승인 전 GitHub commit 불가.
- 새 AI 에이전트 파일 생성 시 → `/teamforge-docs review agentN` 즉시 실행.

---

## 커밋 컨벤션

```
feat(scope):  새 기능
fix(scope):   버그 수정
refactor:     기능 변경 없는 코드 개선
test:         테스트 추가/수정
docs:         문서만 변경
chore:        빌드/설정 변경
```

scope 예시: `auth`, `survey`, `meeting`, `changes`, `ai/agent1`, `db/migration`, `kickoff`

---

## Human Intervention Checkpoints

| 시점 | 위치 | 필요 승인 |
|------|------|---------|
| AI 생성 파일 배포 | `docs/reviews/ai-artifacts/` | 팀장 UI 승인 |
| 워크스페이스 프로비저닝 | Screen 10 확인 모달 | 팀장 클릭 |
| DB 마이그레이션 실행 | `docs/runbooks/migration-*.md` | 개발자 리뷰 후 실행 |
| 프롬프트 변경 배포 | `tooling/prompts/` PR | 코드 리뷰 |
| write-back 실행 | dry-run 결과 모달 | 팀장 클릭 |

---

## 현재 진행 Phase (2026-04-05 기준)

**Phase 1~4 킥오프 플로우 대부분 구현 완료.**

### 구현 완료
- Screen 1 로그인 (Google / GitHub / Kakao OAuth)
- Screen 2 역할 선택
- Screen 3a 팀 생성 / 3b 팀 참가
- Screen 4 스킬 설문 (6섹션 15문항)
- Screen 5 개인 결과 (레이더 차트)
- Screen 6 팀 대시보드 (부분)
- Screen 7 킥오프 주제 결정 (AI 브레인스톰 + 직접 입력)
- Screen 8 킥오프 아키텍처 빌더 (옵션 카드 + pending 다이어그램)
- Screen 10 킥오프 최종 요약 (부분)

### 즉시 해야 할 것 (Now)
1. Screen 7 Markdown 렌더링 누락 수정 (topic 채팅 AI 응답)
2. `integrations` Prisma 스키마 추가
3. Screen 10 스프린트 설정 UI

### 다음 (Next) — 킥오프 보완 항목 (KF-003 배치 A→B→C→D)
- 배치 A: Out of Scope + 성공 기준 + 협업 규칙 + 팀원 우려 입력
- 배치 B: 역할 수락/조정 UI
- 배치 C: 첫 Issue 생성 + 첫 회의 agenda 자동 생성
- 배치 D: Summary 서명 게이트

### 나중 (Later)
- Screen 9 도구 세팅 (KF-002: integrations 모델 + Screen 10 흡수 방식)
- Agent 5 워크스페이스 프로비저닝
- PDF/PPT 내보내기
- Screen 11~14 (회의 허브, 방향 추적, 변경 관리, 대시보드)

---

## 문서 작성 가이드

### 언제 무엇을 작성하는가

| 상황 | 문서 유형 | 명령 |
|------|---------|------|
| 세션 시작/종료 | 진행 일지 | `/teamforge-docs progress` |
| 주요 설계 결정 (DB 구조, 인증 방식 등) | ADR | `/teamforge-docs adr "제목"` |
| 새 API 엔드포인트 추가 | API 계약 | `/teamforge-docs api 모듈명` |
| DB 마이그레이션 실행 전 | Runbook | `/teamforge-docs runbook migration` |
| AI 에이전트가 파일 생성 | 검토 요청 | `/teamforge-docs review agentN` |
| 결정 키 참조 필요 | decisions.md 확인 | `Read docs/progress/decisions.md` |

### 진행 일지 파일명 규칙
- 형식: `docs/progress/YYMMDD_NN-brief-english-desc.md`
- 예: `260405_01-kakao-oauth-fix.md`, `260405_02-screen-flow-docs.md`
- 세션 종료 시 항상 `Next Start` 섹션 작성
