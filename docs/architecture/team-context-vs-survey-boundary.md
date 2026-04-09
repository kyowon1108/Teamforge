# Team Context ↔ Survey 데이터 경계

> Status: canonical
> Added: 2026-04-09
> Related: `docs/product/system-spec.md`, `docs/product/screen-flow.md` Screen 3a / 6 / 7a, `packages/contracts/src/team/team-context.ts`, `packages/contracts/src/survey/` (SurveyAnswersSchema)

## 배경

Screen 3a에서 `POST /api/teams`가 팀 이름만 받던 구조에서는, 킥오프 단계에서 GPT-4o가 주제를 제안할 때 "이 팀이 어떤 상황에서 무엇을 만들려고 모였는가"를 알 수 없었다. 프롬프트 입력은 전적으로 개인 설문 응답의 통계였다. 이 구조는 두 가지 문제를 만든다.

첫째, 팀이 스스로 선언한 방향과 AI 제안 사이의 괴리가 커진다. 예를 들어 "1일 해커톤 · DEMO 목표"인 팀과 "3개월 · PRODUCTION 목표"인 팀이 동일한 설문 점수 분포를 가지더라도 필요한 주제의 규모와 복잡도는 완전히 다르다. 둘째, 설문에 없는 팀 단위 제약(비개발자 포함 여부, 바이브코딩 도구 활용 계획, 스킬 편차)은 개인 답변만으로는 안정적으로 복원되지 않는다.

해결책은 Team 모델에 운영 컨텍스트 필드 7개(`teamType`, `projectDuration`, `completionTarget`, `hasNonDeveloper`, `usesVibeCoding`, `hasSkillGap`, `domainHints`)를 추가하고, 이를 **Survey와 별개의 입력**으로 AI 프롬프트에 주입하는 것이다. 본 문서는 두 데이터의 책임 분리와 향후 사용 시나리오를 정리한다.

## 책임 분리 원칙

두 데이터는 **레벨이 다른 입력**이다. 같은 질문에 대해 두 곳 모두에서 답이 나올 수 있지만, 그 답의 의미와 권한, 적용 범위가 다르다.

| 구분 | Survey | Team Context |
|------|--------|--------------|
| 단위 | 개인 (팀원 1인당 1건) | 팀 (Team 1건) |
| 입력 주체 | 각 팀원 본인 | 팀장 단독 |
| 입력 시점 | Screen 4 (팀 합류 후) | Screen 3a (팀 생성 시점) |
| 저장 위치 | `SurveyResponse.answers` (JSONB, `SurveyAnswersSchema`) | `Team.teamType`, `Team.projectDuration`, ... (Prisma 컬럼) |
| 스키마 소스 | `packages/contracts/src/survey/` | `packages/contracts/src/team/team-context.ts` |
| 의미 | 개인의 기술 스택, 협업 습관, AI 활용 프로필, 경험 계층, 시스템 블록 신뢰도 | 팀의 운영 형태, 목표 완성도, 기간, 팀 구성 특성, 관심 도메인 |
| 수정 권한 | 본인 (submitted 이전) | 팀장 (향후 팀 정보 페이지에서) |
| 집계 방식 | 팀 내 모든 개인 응답을 평균/분포로 요약 | 단일 팀 레코드 그대로 사용 |

### 의미가 겹쳐 보이는 필드의 차이

다음 두 쌍은 표면적으로 의미가 겹쳐 보이지만, 레벨이 다르다. 프롬프트에는 **두 값 모두** 주입한다.

- **`Team.usesVibeCoding` ↔ Survey `aiProfile`**
  - Team Context: "이 팀은 바이브코딩 도구(Cursor/Claude Code)를 주 워크플로우로 사용할 계획인가?" (팀 차원의 방침)
  - Survey: 각 팀원의 AI 도구 활용 능숙도와 선호 (개인 역량)
  - 예시 괴리: 팀 방침은 `usesVibeCoding = true`인데 팀원 대부분의 `aiProfile`이 초보 수준 → GPT-4o는 "AI 도구 온보딩 포함"을 주제 제안에 반영해야 한다.

- **`Team.hasSkillGap` ↔ Survey `experienceTier` 분포**
  - Team Context: 팀장이 주관적으로 선언한 "우리 팀 스킬 편차가 크다" (정성적 인식)
  - Survey: 팀원별 `experienceTier` 수치의 실제 분산 (정량적 분포)
  - 예시 괴리: 팀장은 `hasSkillGap = false`로 입력했지만 실제 `experienceTier` 분산이 큼 → "팀장의 인식과 실제 분포 불일치"라는 신호 자체가 주제 제안과 Screen 10 Contract Gate에서 유효한 단서가 된다.

이 괴리를 **해소하지 않고 보존**하는 것이 중요하다. Team Context를 Survey에서 자동 추론하여 채우면 두 레벨의 정보가 합쳐지면서 위와 같은 신호가 사라진다.

## 향후 사용 시나리오

Team Context는 다음 네 가지 경로에서 소비된다.

### 1. (즉시) GPT-4o 주제 생성 / 브레인스토밍 클러스터링 프롬프트

적용 위치:
- `apps/api/src/kickoff/kickoff.service.ts` — `GET /api/teams/:teamId/topic` 경로에서 사용하는 주제 생성 흐름 (Screen 7b)
- `apps/api/src/brainstorm/brainstorm.service.ts` — `POST /api/teams/:teamId/brainstorm/advance`의 `sharing -> clustering` 전이 시 호출되는 클러스터링 흐름 (Screen 7a Stage 3)

두 지점 모두 프롬프트에 XML 경계 블록을 주입한다. 순서는 다음과 같이 고정한다.

```
<team_context>
  teamType, projectDuration, completionTarget,
  hasNonDeveloper, usesVibeCoding, hasSkillGap,
  domainHints
</team_context>
<survey_data>
  팀원별 SurveyResponse.answers 집계 (현재 9섹션 입력)
</survey_data>
<ideas>           ← brainstorm.service.ts에서만 존재
  Stage 1~2 아이디어 원문 + build-on/merge 관계
</ideas>
```

Team Context가 `<survey_data>` 앞에 오는 이유: 팀 단위 운영 맥락이 상위 제약으로 작용해야 개인 답변의 통계가 맥락 안에서 해석되기 때문이다. 반대 순서로 주입하면 GPT-4o가 설문 통계에 먼저 앵커링되어 팀의 선언된 방향을 후순위 필터로 취급할 수 있다.

legacy 팀(Team Context 도입 이전 생성된 팀)은 `<team_context>` 블록을 아예 생략하고 과거 동작으로 fallback한다. Boolean nullable 정책이 이 fallback을 안전하게 만든다 — null과 false를 구분할 수 있기 때문에 "입력 안 함"을 "명시적 false"로 잘못 읽지 않는다.

다만 현재 repo의 `/team/create` 폼은 boolean 3종을 2-state 체크박스로 수집한다. 따라서 신규 생성 팀은 기본적으로 `false`가 저장되고, `null`은 legacy 데이터 또는 비폼 입력 경로에서만 남는다. nullable 설계 자체는 유지되지만, 현재 웹 UI는 tri-state 입력을 아직 제공하지 않는다.

### 2. (즉시) Screen 6 대시보드 컨텍스트 배너

`/team/[teamId]/dashboard` 상단에 팀 운영 컨텍스트를 한 줄 요약 배너로 표시한다. 예시 렌더링:

```
해커톤 · 1–4주 · MVP 목표 · 핀테크 도메인
[비개발자 포함] [바이브코딩] [스킬 편차]
```

데이터 경로는 **기존 `/kickoff/status` 응답을 확장**한다. 별도 엔드포인트를 만들지 않는다. 이유는 두 가지다. 첫째, Screen 6 대시보드는 이미 `/kickoff/status`로 팀 상태를 한 번에 가져오기 때문에 라운드트립을 추가하면 UX가 저하된다. 둘째, Team Context는 팀 생성 이후 거의 변하지 않는 정적 데이터이므로 별도 엔드포인트로 분리할 만한 캐싱/권한 차이가 없다.

null boolean 필드는 배지에서 **생략한다**. "비개발자 포함 여부를 false로 선택한 팀"과 "아직 선택하지 않은 legacy 팀"을 시각적으로 동일하게 취급하지 않기 위함이다. false를 명시한 팀은 배지에서 생략되지만, true를 명시한 팀만 강조 배지로 노출된다는 규칙은 운영상 허용된 단순화다.

### 3. (Screen 10) Contract Gate 체크리스트 분기

Screen 10 Kickoff Summary / Contract Gate에서 팀이 서명해야 할 체크리스트 항목 수는 `completionTarget`에 따라 동적으로 분기된다.

| completionTarget | 체크리스트 항목 수 | 포함 영역 |
|------------------|-------------------|----------|
| `DEMO` | 5개 (축소) | 핵심 역할 분담, 주제 합의, 첫 마일스톤, 회의 루틴, 단일 데모 deliverable |
| `MVP` | 10개 (표준) | DEMO 항목 + 아키텍처 확정, 스택 확정, 리스크 식별, 외부 의존성, Handoff 아티팩트 |
| `PRODUCTION` | 전체 풀세트 | MVP 항목 + 보안 체크리스트, 배포 루틴, 관측성, 장애 대응, 사용자 피드백 루프 |

체크리스트가 적은 팀이 덜 진지하다는 뜻이 아니다. 1일 해커톤에 10개 항목을 강제하면 의례화되어 내용 없이 서명만 진행되는 역효과가 발생한다. 목표 완성도 수준에 맞는 최소 필수 항목만 강제하는 것이 Contract Gate의 실효성을 높인다. 세부 항목 구성은 Screen 10 구현 시 별도 ADR로 확정한다.

`hasNonDeveloper`, `usesVibeCoding`, `hasSkillGap`도 Screen 10 체크리스트에서 추가 항목을 트리거할 수 있다. 예: `hasNonDeveloper = true`인 팀은 "비개발자 팀원과의 협업 언어 합의" 항목이 체크리스트에 추가된다. 단, 이 분기 로직은 Screen 10 ADR에서 최종 확정한다.

### 4. (향후) Survey Section 7 시스템 블록 가중치 보정

Survey Section 7(시스템 블록 신뢰도)은 팀원이 각 시스템 블록(Frontend / Backend / Database / Infra / AI-ML / External)에 대해 자기 역량을 표시하는 섹션이다. 현재는 블록별 lead/partial/gap 분류를 단순 평균낸다.

Team Context 도입 이후, `domainHints`에 따라 블록 가중치를 보정할 수 있다.

- `AI_ML` 도메인 힌트 → AI-ML 블록 가중치 증가, 해당 블록의 gap이 다른 블록보다 치명적으로 취급됨
- `FINTECH` 도메인 힌트 → Backend + External(결제/인증 API) 블록 가중치 증가
- `ECOMMERCE` 도메인 힌트 → Database + External 블록 가중치 증가

이 가중치 보정은 Survey 결과 계산 로직(`apps/api/src/survey/survey.service.ts`)의 확장이며, 즉시 적용 대상은 아니다. 현재 단계에서는 `domainHints`를 Team Context에 저장만 하고, 가중치 보정은 Screen 10 Contract Gate 구현 이후에 결정한다.

## 결정 배경 (관련 KF 키)

- Team Context boolean 필드 nullable 정책 — 결정 키 신규 등록 (decisions.md 참조)
- Team Context enum 단일 소스 — 결정 키 신규 등록
- Team Context AI 프롬프트 주입 범위(kickoff + brainstorm 양쪽) — 결정 키 신규 등록
- Team Context Dashboard 배너 데이터 경로(`/kickoff/status` 확장) — 결정 키 신규 등록
- Team Context UI 아이콘(Lucide React만) — 결정 키 신규 등록

## 영향 범위 요약

Team Context 도입은 다음 파일·레이어에 영향을 준다. 본 문서는 경계만 기술하고, 실제 구현은 각 소유자 에이전트가 담당한다.

- `apps/api/prisma/schema.prisma` — Team 모델 필드 7개 + enum 3종 추가 (tf-db)
- `packages/contracts/src/team/team-context.ts` — Zod enum 단일 소스 (tf-db)
- `apps/api/src/teams/teams.service.ts`, `teams.controller.ts` — `POST /teams` body 확장 (tf-backend)
- `apps/api/src/kickoff/kickoff.service.ts` — `/kickoff/status` 응답에 `teamContext` 포함, `GET /topic` 기반 주제 생성 흐름에 `<team_context>` 블록 주입 (tf-backend)
- `apps/api/src/brainstorm/brainstorm.service.ts` — clustering async path에 `<team_context>` 블록 주입 (tf-backend)
- `apps/web/app/team/create/` — 6개 입력 그룹 UI, enum 옵션은 `packages/contracts`에서 import (tf-frontend)
- `apps/web/app/team/[teamId]/dashboard/` — Team Context 배너 컴포넌트 (tf-frontend)
- Lucide React 아이콘만 사용, 이모지 금지 — CLAUDE.md 디자인 시스템 규칙
