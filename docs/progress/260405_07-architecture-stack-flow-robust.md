---
date: 2026-04-05
seq: 07
area: backend, frontend
screens: [8]
tags: [architecture, stack, ai-prompt, team-level, applicable-categories]
decision_keys: [KF-012, KF-013]
---

# 260405_07 — 아키텍처 스택 선택 플로우 강화 (블록별 추천 + 팀 수준 말투)

## 한 줄 요약

프로젝트 유형에 맞는 카테고리만 선별해 팀 스킬 수준에 맞는 말투로 한 번에 하나씩 추천하는 아키텍처 스택 결정 플로우를 구현했다.

---

## 이번에 본 사실

- `packages/contracts/src/presets/platform-presets.ts`: 18개 preset에 `applicableCategories: string[]` 필드 추가 완료 (이전 세션)
- `apps/api/src/modules/kickoff/kickoff.service.ts`: `_computeTeamLevel`, `_computeApplicableCategories`, `_architectureSystemPrompt(options?)` 이미 구현됨 (이전 세션)
- `apps/web/app/team/[teamId]/kickoff/architecture/page.tsx`: `ARCH_CATEGORIES` 8개 고정 배열을 상태 기반 `applicableCategories`로 전환 필요

---

## 결정사항

| 결정 키 | 채택 | 이유 | 대안 | 영향 |
|---------|------|------|------|------|
| KF-012 | 블록별(1개 카테고리) AI 추천 | 전체 8개 한 번에 나열하면 팀이 압도됨. 한 단계씩 선택하는 UX가 더 명확 | 전체 한 번에 추천 | `chatBrainstorm`, `seedArchitectureChat`, `_buildOptionCards` |
| KF-013 | `applicableCategories` 서버 결정, 클라이언트 수신 | preset + features로 결정 가능, DB 변경 불필요. `/architecture/plan` 엔드포인트로 새로 고침 후 복원 | 클라이언트에서 matchPlatformPreset 직접 호출 | 컨트롤러 신규 엔드포인트, 프론트 plan fetch 추가 |

---

## 구현 상세

### 1. `platform-presets.ts` — `applicableCategories` (이전 세션 완료)

모든 18개 preset에 `applicableCategories: string[]` 추가.
- `web_portfolio`: `["framework", "styling"]` (서버/DB/Auth 불필요한 정적 사이트)
- `mobile_fitness`: `["framework", "db", "auth", "api", "state", "styling"]` (전용 서버 불필요)
- `crawling_tool`: `["framework", "server", "db", "api", "styling"]`
- 나머지: 프로젝트 특성에 맞는 서브셋, `framework → server → db → auth → api → realtime → state → styling` 순서

### 2. `kickoff.service.ts` — `_computeTeamLevel` (이전 세션 완료)

```typescript
private async _computeTeamLevel(teamId): Promise<"beginner"|"intermediate"|"advanced"|"unknown"> {
  const assessments = await this.prisma.skillAssessment.findMany({
    where: { teamId, status: "completed" }, select: { experienceScore: true }
  });
  const avg = scores.reduce((a,b) => a+b, 0) / scores.length;
  if (avg < 2) return "beginner";
  if (avg <= 3.5) return "intermediate";
  return "advanced";
}
```

### 3. `_architectureSystemPrompt(options?)` — 3가지 신규 블록 (이전 세션 완료)

- `<tone_instruction>`: 팀 수준(beginner/intermediate/advanced)에 맞는 설명 방식
- `<current_step>`: 현재 추천할 카테고리 1개만 지시, 나머지 언급 금지
- `<confirmed_stack>` + `<applicable_categories>`: 이미 결정된 항목 및 이 프로젝트에 필요한 카테고리 목록

### 4. `seedArchitectureChat()` — 첫 카테고리만 seed

```typescript
// 이전: "팀 스킬을 고려해서 8가지 아키텍처 영역 전체를 추천해줘."
// 이후:
const firstCategory = applicableCategories[0] ?? null;
seedText = `먼저 **${firstCategory.toUpperCase()}** 카테고리부터 추천해줘.`;
systemPrompt = this._architectureSystemPrompt(ctx, session, summary, {
  teamLevel, applicableCategories, confirmedCategories: {}, currentCategory: firstCategory
});
// 응답에 applicableCategories, teamLevel 포함
return { seeded: true, applicableCategories, teamLevel, message: {...} };
```

### 5. `chatBrainstorm()` — 다음 미결 카테고리 자동 추적

```typescript
const confirmedCategories = session.architecture ?? {};
const currentCategory = applicableCategories.find(cat => !confirmedCategories[cat]) ?? null;
systemPrompt = this._architectureSystemPrompt(ctx, session, summary, {
  teamLevel, applicableCategories, confirmedCategories, currentCategory
});
// optionCards: 다음 미결 카테고리 1개만 빌드
const nextCategory = applicableCategories.find(cat => !decidedAfterUpdate[cat]) ?? null;
optionCards = this._buildOptionCards(session.platformType, decidedAfterUpdate, nextCategory);
```

### 6. `_buildOptionCards(platformType, decidedCategories, targetCategory?)` — 단일 카테고리 모드

```typescript
const categoriesToBuild = targetCategory
  ? undecidedCategories.filter(cat => cat === targetCategory)
  : undecidedCategories;
```

### 7. `getArchitecturePlan(teamId)` — 신규 메서드

```typescript
async getArchitecturePlan(teamId: string) {
  const session = await this.getSession(teamId);
  const features = ...;
  const [teamLevel, applicableCategories] = await Promise.all([
    this._computeTeamLevel(teamId),
    Promise.resolve(this._computeApplicableCategories(session.platformType, features)),
  ]);
  return { applicableCategories, teamLevel };
}
```

### 8. `kickoff.controller.ts` — 신규 엔드포인트

```typescript
@Get(":teamId/architecture/plan")
async getArchitecturePlan(@Request() req, @Param("teamId") teamId: string) {
  await this.kickoffService.verifyMember(req.user.userId, teamId);
  return this.kickoffService.getArchitecturePlan(teamId);
}
```

### 9. `architecture/page.tsx` — 프론트엔드 반영

- `applicableCategories: string[]` 상태 추가 (기본값: 전체 8개)
- `teamLevel` 상태 추가
- 초기 로드 시 `/architecture/plan` 병렬 fetch
- seed 응답에서 `applicableCategories`, `teamLevel` 수신 및 setState
- 카테고리 칩바, 스택 결정 목록, 모바일 요약 모두 `applicableCategories` 기반으로 변경
- "확정 (X/8)" → "확정 (X/{applicableCategories.length})"
- "나머지 N개 추천받기" 버튼도 applicable 카테고리 기준
- `ArchitectureProgressRail` 신규 인라인 컴포넌트: 적용 카테고리 단계별 진행 표시 (done/current/pending)
- 왼쪽 패널에 `TeamLevelBadge` (beginner/중급/고급) 추가

---

## 보류/미구현

| 항목 | 왜 미룸 | 재개 조건 |
|------|---------|----------|
| 팀 수준별 preset 재정렬 | 현재 preset 순서가 적절, advanced 팀도 무리 없음 | 사용자 피드백 수집 후 |
| Observer에게도 진행 상황 rail 표시 | 현재 ReadOnly 뷰에 이미 적용됨 | — |

---

## 다음 시작점 (Next Start)

**다음 작업:** Screen 8 실사용 검증 (dev 서버 기동 후 architect flow 전체 테스트)

시작 파일:
- `apps/api/src/modules/kickoff/kickoff.service.ts` — `_computeApplicableCategories` 에지 케이스(platformType=null, features=[]) 테스트
- `apps/web/app/team/[teamId]/kickoff/architecture/page.tsx` — ArchitectureProgressRail 모바일 레이아웃 확인

Open Questions:
- `applicableCategories`가 2~3개인 경우(예: web_portfolio) "나머지 추천" 버튼이 너무 일찍 사라지는 UX 괜찮은지?
- 팀원이 채팅 중에 preset 외 카테고리(e.g. CI/CD)를 요청하면 AI가 적절히 응답하는지?

---

## 참조 소스

- 수정 파일: `packages/contracts/src/presets/platform-presets.ts`, `apps/api/src/modules/kickoff/kickoff.service.ts`, `apps/api/src/modules/kickoff/kickoff.controller.ts`, `apps/web/app/team/[teamId]/kickoff/architecture/page.tsx`
- 스펙: `docs/product/system-spec.md` §Screen 8
