# ADR-006: Team Context 도메인 도입과 nullable-by-design 설계

- 상태: accepted
- 날짜: 2026-04-09
- 관련: KF-036, KF-037, KF-038, Screen 3a Team Create, Screen 6 Team Dashboard, Screen 7a/7b Brainstorm

> 후속 구현 메모 (2026-04-09 repo audit): 최종 병합본에는 `teamGoal`이 포함되지 않고, Team Context의 선택 필드는 `domainHints`다. 또한 현재 `/team/create` 웹 폼은 boolean 3종을 2-state 체크박스로 수집하므로 신규 생성 팀에서는 `false/null`을 구분해 입력하지 않는다. nullable 저장 구조는 legacy 호환과 향후 tri-state 확장을 위해 유지된다.

## 배경

기존 TeamForge는 개인 단위 설문 데이터(`Survey`)만으로 GPT-4o 주제 제안과 브레인스토밍 클러스터링을 수행했다. 그러나 다음 한계가 반복적으로 관찰됐다.

- 같은 설문 점수 분포라도 "취미로 2주짜리 데모를 만드는 팀"과 "스타트업에서 3개월짜리 MVP를 만드는 팀"에 필요한 주제/클러스터는 전혀 다르다. 개인 설문만으로는 이 맥락을 전달할 수 없다.
- 팀 내 비개발자, vibe coding 의존도, 특정 스킬 공백 같은 팀 단위 특성은 개별 설문 문항으로 수집하기에 부적절하다. 개인별로 값이 다를 수도 있고, 팀 단위 단일 값으로 받는 게 자연스럽다.
- Screen 10 Contract Gate에서 DEMO / MVP / PRODUCTION 분기 로직을 구현하려면, 팀 단위 "완료 기준" 데이터가 팀 생성 시점에 이미 확보되어 있어야 한다.

동시에 다음 제약도 존재했다.

- 이미 생성된 legacy 팀에 대한 호환을 지켜야 한다. 기존 팀을 깨지 않고 새 필드를 추가해야 한다.
- enum 값이 Prisma 스키마, NestJS DTO, Next.js 폼 옵션, GPT-4o 프롬프트에 모두 등장한다. 한 글자만 달라도 프롬프트 결과가 달라지므로 drift를 원천 차단해야 한다.
- 팀장이 "비개발자 있음"과 "비개발자 없음" 중 어느 쪽을 선택했는지와, "선택 자체를 안 한" 상태는 의미론적으로 구분되어야 한다. default false로 뭉뚱그리면 안 된다.

이 제약 아래에서 "팀 단위 운영 맥락"을 별도 도메인 개념으로 승격하는 것이 필요해졌다.

## 결정

**`Team Context`를 팀 생성 시점에 수집하는 1급 도메인 개념으로 도입한다. 구현은 nullable-by-design, contracts 단일 enum 소스, 두 AI 프롬프트 경로 모두 주입의 세 원칙을 따른다.**

### 1. Team 모델에 7개 필드 추가 (KF-036)

- `teamType TeamType?`, `projectDuration ProjectDuration?`, `completionTarget CompletionTarget?` — enum, nullable
- `hasNonDeveloper Boolean?`, `usesVibeCoding Boolean?`, `hasSkillGap Boolean?` — boolean, nullable, **default 값 없음**
- `domainHints String[]` — 최대 2개, 선택 입력

boolean 3종은 Prisma `Boolean?`로 선언하고 `@default`를 두지 않는다. 세 가지 상태 "true / false / null(미입력)"이 명시적으로 구분되며, legacy 팀의 미입력과 팀장이 "아니오"를 선택한 상태가 데이터상 섞이지 않는다.

### 2. Contracts 단일 enum 소스 (KF-037)

- `packages/contracts/src/team/team-context.ts`에 `TeamTypeSchema`, `ProjectDurationSchema`, `CompletionTargetSchema`를 Zod로 선언한다. 이 파일이 **유일한 정본**이다.
- Prisma `schema.prisma`의 enum 값은 이 파일과 **값 단위로 동일**해야 한다. Prisma 특성상 런타임에 공유 불가능하므로 수동 복제를 허용하되, 불일치 시 CI 테스트로 실패시킨다.
- 백엔드 DTO, 프론트엔드 폼 옵션 생성, GPT-4o 프롬프트에 등장하는 값 문자열은 모두 이 파일을 import해서 사용한다. 문자열 리터럴을 재입력하지 않는다.

### 3. AI 프롬프트 주입 지점은 두 곳 모두 (KF-038)

- `apps/api/src/kickoff/kickoff.service.ts`의 GPT-4o 주제 제안 생성 경로에 `<team_context>` XML 블록을 주입한다.
- `apps/api/src/brainstorm/brainstorm.service.ts`의 GPT-4o 브레인스토밍 클러스터링 경로에도 **동일한 블록을 주입**한다.
- 두 프롬프트 모두 `<team_context>`는 `<survey_data>` **앞에** 위치한다. 팀 단위 맥락이 개인 설문 통계의 상위 제약으로 작용해야 앵커링 편향이 없다.
- Legacy 팀(Team Context 필드가 전부 null)은 `<team_context>` 블록 자체를 생략한다. 과거 동작으로 안전하게 fallback한다.

### 4. Dashboard 배너는 별도 엔드포인트 없이 `/kickoff/status` 확장 (KF-039)

- Screen 6 Team Dashboard의 Team Context 배너는 기존 `GET /api/teams/:teamId/kickoff/status` 응답에 `teamContext` 필드를 추가해 제공한다.
- `GET /teams/:teamId/context` 같은 별도 엔드포인트를 만들지 않는다. 팀 생성 이후 거의 변하지 않는 정적 데이터이고 추가 라운드트립이 불필요하다.

### 5. UI 아이콘 규칙 재확인 (KF-040)

- Team Context 관련 UI는 Lucide React만 사용한다. 이모지 금지.
- enum 값 → 한국어 라벨 + Lucide 아이콘 매핑은 `apps/web/lib/team-context-labels.ts` 한 파일로 모은다.

## 대안

### 대안 A: 개인 설문 섹션에 팀 단위 문항을 추가

- 기각 이유: 개인별로 값이 다르게 응답될 수 있다. 팀 내 5명이 `projectDuration`에 서로 다른 값을 쓰면 "팀의 프로젝트 기간"이 무엇인지 재집계해야 하며, 합의 실패 시 AI 프롬프트에 넣을 단일 값이 없다. 팀 단위 결정은 팀 생성자 1인이 확정하는 게 의미론적으로 맞다.

### 대안 B: boolean 필드를 default false로 두기

- 기각 이유: KF-036에서 상세히 서술. "팀에 비개발자 없음"과 "팀장이 아직 응답 안 함"을 데이터상 구분할 수 없게 되어, AI 프롬프트가 false를 사실로 다루고 legacy 팀도 false로 취급하는 위험한 묵시적 가정이 생긴다.

### 대안 C: Prisma enum을 단일 소스로, Zod는 재파생

- 기각 이유: Prisma enum은 런타임에 import할 수 없고 Prisma Client generator 결과물에 강하게 묶여 있다. 프론트엔드 번들에 Prisma Client를 포함할 수 없으므로 Zod enum을 별도로 둘 수밖에 없다. 역방향으로 Zod를 단일 소스로 두고 Prisma를 수동 복제하는 편이 프론트/백/프롬프트 전반의 일관성 확보에 유리하다.

### 대안 D: 두 AI 프롬프트 중 한 곳에만 주입

- 기각 이유: 브레인스토밍 클러스터링과 주제 제안 생성은 서로 다른 시점에 호출되는 별도 경로지만, 팀 입장에서는 "어느 경로를 거쳐도 같은 품질의 결과"를 기대한다. 한 곳만 주입하면 "브레인스토밍 경로로 들어온 팀"과 "주제 제안 직행 경로로 들어온 팀"의 결과 품질이 달라져 디버깅이 거의 불가능해진다.

### 대안 E: `GET /teams/:teamId/context` 별도 엔드포인트

- 기각 이유: KF-039에서 상세히 서술. 라운드트립 증가, 권한 검증 중복, 캐싱 전략 이득 없음.

## 영향

**더 쉬워지는 점:**

- Screen 10 Contract Gate 구현 시 `completionTarget`을 기준으로 DEMO / MVP / PRODUCTION 분기 로직을 명시적으로 작성할 수 있다.
- 브레인스토밍 클러스터링 결과가 팀 단위 맥락을 반영하므로, Stage 4 Dot voting 시점에 제시되는 클러스터가 팀 목표와 정합성을 갖는다.
- Dashboard 배너가 추가 API 호출 없이 바로 렌더된다.
- enum 값 추가/변경 시 `packages/contracts/src/team/team-context.ts` 한 파일만 수정하면 된다 (Prisma enum은 동시 수정 필수지만 CI가 drift를 잡는다).

**더 어려워지는 점:**

- null 처리 로직이 여러 경로에 퍼진다. Dashboard 배너, AI 프롬프트 주입, 폼 pre-fill, 배지 렌더 모두 null을 "정보 없음"으로 조건부 처리해야 한다.
- Prisma enum과 Zod enum이 두 파일로 나뉘어 있어, 값 추가 시 양쪽을 동시에 수정하고 마이그레이션을 돌려야 한다. drift 감지용 CI 테스트가 안전장치다.
- 팀 생성 폼의 입력 필드 수가 늘어나 Screen 3a의 UX 복잡도가 증가한다. 섹션 분할과 optional checkbox groups로 완화했지만, 팀장이 폼을 skip하고 싶은 유인이 생긴다.

**새로 생기는 제약:**

- Team Context enum 값 추가 시 반드시 Zod → Prisma → 마이그레이션 → CI 테스트 순으로 진행해야 한다.
- AI 프롬프트는 반드시 `<team_context>` → `<survey_data>` 순서를 유지해야 한다. 순서를 바꾸면 앵커링 편향이 생긴다.
- Legacy 팀과 신규 팀이 혼재하는 한 AI 프롬프트는 반드시 null 생략 fallback을 유지해야 한다. Team Context를 필수화하려면 기존 팀의 백필 전략이 먼저 확정되어야 한다.
- Team Context 관련 UI는 Lucide React만 사용한다. 이모지 금지 원칙이 Team Context 도메인 전체에 고정된다.
