# TeamForge — Claude Code Project Instructions

## 핵심 문서 위치

| 문서 | 경로 | 설명 |
|------|------|------|
| 제품 스펙 | `docs/product/system-spec.md` | 화면 14개, 전체 UX/기능 명세 |
| 구현 보완 | `docs/api/implementation-supplement-v1.0.md` | API 계약, AI 에이전트 스키마, 보안, DB 보완 |
| ADR | `docs/adr/` | 아키텍처 결정 기록 |
| 진행 일지 | `docs/progress/` | 주차별 개발 현황 |
| 프롬프트 | `tooling/prompts/` | AI 에이전트 10개 프롬프트 템플릿 |
| Human approval | `docs/reviews/ai-artifacts/` | AI 생성 파일 검토 대기 목록 |

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

---

### 1. 작업 시작 전 (Before starting any significant task)

5줄 이상의 변경이 예상되는 작업을 시작하기 전:

1. **내가 먼저 계획을 세운다** — 구현 방향, 영향받는 파일, 잠재적 리스크 정리
2. **Codex에게 계획을 설명하고 피드백 요청**
   - "이 방향으로 구현할 예정인데 놓친 부분 있으면 알려줘"
   - Codex 피드백이 오면 **내가 추가로 고려**해서 최종 접근법 확정
3. **확정된 방향으로 내가 직접 구현**

**실행:** Agent 도구로 `codex:codex-rescue` 호출 (연구/분석 요청, 코드 작성 요청 아님)

---

### 2. 에러 발생 시 (On any error)

빌드 에러, 런타임 에러, 타입 에러 등 발생 시:

1. **내가 먼저 에러를 읽고 원인 파악 시도**
2. **2회 시도 후에도 해결 안 되면 Codex에 에러 + 컨텍스트 전달해 원인 분석 요청**
3. **Codex 분석 결과를 참고하되, 내가 추가로 판단해서 최종 수정 방법 결정**
4. **내가 직접 수정**

---

### 3. Git commit 전 (Before every git commit)

코드 변경 완료 후:

1. **내가 변경사항 전체 self-review** — 스펙 준수, 보안(G29~G30), 타입 안전성
2. **Codex에게 diff 전달해 최종 검토 요청**
   - "이 변경사항 커밋해도 될까? 문제 있으면 알려줘"
3. **Codex + 나의 판단이 모두 OK면 커밋**
4. **문제 발견 시 수정 후 재검토**

---

## 기술 스택

```
Frontend : Next.js 14 (App Router) + shadcn/ui + Tailwind CSS
Backend  : NestJS + Prisma + PostgreSQL (pgvector)
Auth     : NextAuth.js v5 (Google, GitHub; Kakao는 준비 중)
Realtime : Socket.io
AI       : Claude API (Sonnet 4.6 / Haiku 4.5) + OpenAI Whisper + text-embedding-3-small
Storage  : Supabase Storage
Monorepo : Turborepo + pnpm
```

환경변수: `.env.example` 참조. `KAKAO_CLIENT_ID` 비어있음 → UI disabled 처리.

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

scope 예시: `auth`, `survey`, `meeting`, `changes`, `ai/agent1`, `db/migration`

---

## Human Intervention Checkpoints

| 시점 | 위치 | 필요 승인 |
|------|------|---------|
| AI 생성 파일 배포 | `docs/reviews/ai-artifacts/` | 팀장 UI 승인 |
| 워크스페이스 프로비저닝 | Screen 10 확인 모달 | 팀장 클릭 |
| DB 마이그레이션 실행 | `ops/migrations/` 노트 | 개발자 리뷰 |
| 프롬프트 변경 배포 | `tooling/prompts/` PR | 코드 리뷰 |
| write-back 실행 | dry-run 결과 모달 | 팀장 클릭 |

---

## 현재 진행 Phase

**Phase 1 MVP** (Screen 1~5: 로그인 → 설문 → 개인 결과)

Week 0 사전 작업 (`implementation-supplement-v1.0.md` Part 13 참조):
1. `packages/contracts/` Zod 스키마 셋업
2. 누락 DB 테이블 추가 (`auth_accounts`, `uploads`, `ai_run_logs`)
3. Feature flag 시스템
4. `tooling/prompts/agent1-onboarding.md` 작성
