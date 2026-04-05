---
date: 2026-04-05
seq: 04
area: backend
screens: []
tags: [openai, typecheck, verification]
decision_keys: [KF-008]
---

# 260405_04 — OpenAI SDK 전환 검증 + 타입 체크 통과

## 한 줄 요약

이전 세션에서 Anthropic SDK → OpenAI SDK 전환이 완료된 상태를 확인하고, `pnpm typecheck` api/web 모두 통과 검증.

---

## 이번에 본 사실

- `apps/api/package.json`: `"openai": "^6.33.0"` 있음, `@anthropic-ai/sdk` 없음 — 전환 완료 상태
- `apps/api/src/modules/kickoff/kickoff.service.ts`: `import OpenAI from "openai"` + `new OpenAI({ apiKey })` 정상 사용 중
- `_callChat`, `_classifyTopic`, `_generateFirstIssues`, `_generateFirstAgenda`, `_generateMiniAdrs` — 전부 `this.openai.chat.completions.create()` (gpt-4o-mini)로 구현
- `.env.example`: `OPENAI_API_KEY=` 존재, `ANTHROPIC_API_KEY=` 잔재 (미삭제이나 무해)
- `pnpm --filter @teamforge/api typecheck` → 오류 없음
- `pnpm --filter @teamforge/web typecheck` → 오류 없음

---

## 결정사항

| 결정 키 | 채택 | 이유 | 대안 | 영향 |
|---------|------|------|------|------|
| KF-008 | AI 백엔드 → OpenAI gpt-4o-mini | 초기 비용 절감, API 안정성, 팀 내 OpenAI 키 보유 | Anthropic Claude API | kickoff.service.ts 전체, .env.example |

---

## 구현 상세

### 검증 항목

- Anthropic SDK 제거 완료 (package.json 확인)
- OpenAI SDK `^6.33.0` 사용 중
- 모든 AI 호출 경로: `chat.completions.create()` with `response_format: { type: "json_object" }` (구조화 출력)
- graceful fallback: `this.openai === null` 시 빈 결과 반환 (OPENAI_API_KEY 미설정 대응)

---

## 보류/미구현

| 항목 | 왜 미룸 | 재개 조건 |
|------|---------|----------|
| `.env.example`에서 `ANTHROPIC_API_KEY` 제거 | 무해, 낮은 우선순위 | 정리 시 |
| Screen 10 E2E 실제 테스트 | 서버 미기동 상태 | 서버 기동 후 |

---

## 다음 시작점 (Next Start)

**다음 작업:** Screen 10 킥오프 Summary 페이지 E2E 검증 (서버 기동 후)

시작 파일:
- `apps/web/app/team/[teamId]/kickoff/summary/page.tsx` — 서명 → 완료 플로우 테스트
- `apps/api/src/modules/kickoff/kickoff.service.ts:679` — `generateArtifacts()` OpenAI 연동 실제 호출 테스트

Open Questions:
- Artifact `confirmed` 상태로 업데이트하는 별도 엔드포인트 필요한가?
- 팀원이 `declined` 했을 때 팀장이 역할 재배정할 수 있어야 하는가?
- `ANTHROPIC_API_KEY` 를 `.env.example`에서 완전히 제거할지?

---

## 참조 소스

- 검증 파일:
  - `apps/api/package.json`
  - `apps/api/src/modules/kickoff/kickoff.service.ts`
  - `.env.example`
- 이전 일지: `docs/progress/260405_03-kickoff-batch-abcd-implementation.md`
