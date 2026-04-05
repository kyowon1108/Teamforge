# TeamForge — 문서 인덱스

> 모든 문서의 최상위 탐색 지점. 어디서 뭘 찾을지 모를 때 여기서 시작.

---

## 개발 작업 시작점 — `/tfo`

**모든 개발 작업은 `/tfo [작업 설명]`으로 시작합니다.**

```
/tfo "integrations 테이블 추가하고 Screen 10 연결"
/tfo "Survey Section 2 UI 개선"
/tfo "킥오프 배치 A 구현"
```

오케스트레이터가 자동으로: Codex 사전 검토 → 도메인별 에이전트 할당 → 감시/보안 검증 → 진행 일지 업데이트 → 커밋까지 조율합니다.

| 에이전트 | 역할 | 소유 경로 |
|---------|------|---------|
| `tf-flow` | 화면/UX 설계 | docs/product/, docs/adr/ |
| `tf-design` | UI/UX 품질 검토 | — (가이드 제공) |
| `tf-db` | Prisma 스키마 + 계약 | apps/api/prisma/, packages/contracts/ |
| `tf-backend` | NestJS 서비스/컨트롤러 | apps/api/src/ |
| `tf-frontend` | Next.js 페이지/컴포넌트 | apps/web/ |
| `tf-supervisor` | 도메인 침범 감시 | 읽기 전용 |
| `tf-security` | 보안 취약점 감사 | 읽기 전용 |
| `tf-docs` | 진행 일지 + ADR 자동화 | docs/ |
| `tf-commit` | 검증 완료 후 커밋 | git 작업만 |

에이전트 파일: `.claude/agents/tf-*.md` / 커맨드: `.claude/commands/tfo.md`

---

## 폴더 구조 & 용도

```
docs/
├── _templates/   ← 문서 템플릿 (/teamforge-docs 스킬이 사용)
├── adr/          ← 아키텍처 결정 기록 (ADR-NNN)
├── api/          ← API 계약 + 구현 보완 문서
├── product/      ← 제품 스펙, 화면 플로우, 분석
├── progress/     ← 날짜별 개발 일지 + 결정 키 원장
├── reviews/      ← AI 생성 파일 검토 대기
└── runbooks/     ← 운영 절차서
```

---

## 빠른 탐색

| 찾는 것 | 경로 |
|--------|------|
| 제품 전체 스펙 (화면 14개) | [`docs/product/system-spec.md`](./product/system-spec.md) |
| Screen 1~10 구현 현황 | [`docs/product/screen-flow.md`](./product/screen-flow.md) |
| API 계약 + 보안/DB 보완 | [`docs/api/implementation-supplement-v1.0.md`](./api/implementation-supplement-v1.0.md) |
| 현재 유효한 설계 결정 | [`docs/progress/decisions.md`](./progress/decisions.md) |
| 개발 진행 일지 목록 | [`docs/progress/README.md`](./progress/README.md) |
| 아키텍처 결정 기록 (ADR) | [`docs/adr/`](./adr/) |

---

## 작업 상황별 참조 문서

| 상황 | 문서 |
|------|------|
| 새 기능 설계 전 스펙 확인 | `docs/product/system-spec.md` §7~8 |
| API 엔드포인트 계약 확인 | `docs/api/implementation-supplement-v1.0.md` Part 1~2 |
| 이전에 내린 결정 확인 | `docs/progress/decisions.md` |
| 오늘 세션 시작 (컨텍스트 복원) | `docs/progress/README.md` → 최근 일지 Next Start 섹션 |
| DB 스키마 변경 전 | `docs/runbooks/migration-*.md` |
| AI 파일 생성 후 검토 전 | `docs/reviews/ai-artifacts/` |

---

## 문서 작성

`/tfo` 사용 시 `tf-docs` 에이전트가 자동으로 진행 일지·ADR을 작성합니다.
수동으로 문서만 작성할 때는 `/teamforge-docs` 스킬을 직접 사용합니다.

```
/teamforge-docs progress       # 세션 진행 일지 생성
/teamforge-docs adr "제목"     # ADR 초안
/teamforge-docs api 모듈명     # API 계약 초안
/teamforge-docs runbook type   # 운영 절차서
/teamforge-docs review agentN  # AI 파일 검토 요청
/teamforge-docs status         # 전체 현황 요약
```
