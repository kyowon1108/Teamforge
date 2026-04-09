# Screen 7 — Topic Decision: Pre-Implementation Design Review

- Date: 2026-04-06
- Status: historical design review (core implementation now partially exists)
- Covers: API structure, DB schema, phase state machine, security/permission, edge cases, frontend routing
- Relates to: KF-018, KF-019, KF-020, KF-021, KF-022, ADR-003, ADR-004

---

## 1. API Structure Review

### 현행 초안 vs. screen-flow.md 명세 비교

최신 repo 기준 screen-flow.md는 다음 3개 엔드포인트를 기준으로 본다:

```
GET  /api/teams/:teamId/topic              — AI 주제 목록 조회 (job poll)
POST /api/teams/:teamId/topic/react        — 반응 저장
POST /api/teams/:teamId/topic/confirm      — 리더 주제 확정
```

요청 초안은 4개 엔드포인트를 제안했다:

```
POST /api/teams/:teamId/kickoff/topic/generate  — AI 주제 생성 시작 (202)
GET  /api/teams/:teamId/kickoff/topic            — 주제 목록 + 상태 조회
POST /api/teams/:teamId/kickoff/topic/react      — 반응 저장
POST /api/teams/:teamId/kickoff/topic/confirm    — 주제 확정
```

### 결론: 경로 및 엔드포인트 수 조정 필요

**경로 정정 (screen-flow.md Route Table 우선):**
screen-flow.md는 `/team/[teamId]/kickoff/` prefix를 제거하고 `/team/[teamId]/topic`으로 플래튼했다. API 경로도 동일 규칙을 따라야 한다.

올바른 경로: `/api/teams/:teamId/topic/...`
초안 경로(`/api/teams/:teamId/kickoff/topic/...`)는 screen-flow.md와 불일치한다.

**엔드포인트 수 검토:**
`generate`를 분리하는 것은 ADR-003의 polling 패턴과 맞지 않는다. ADR-003은 "첫 요청 시 캐시 없으면 job 시작 후 202 반환, 이후 동일 GET으로 폴링"을 명시했다. `generate`와 `GET` 두 엔드포인트로 분리하면 "generate를 언제 호출하나"는 클라이언트 책임이 생긴다. 단일 `GET` 진입점이 이 판단을 서버에 위임한다.

**확정 API 구조:**

```
GET  /api/teams/:teamId/topic           — 주제 목록 + 생성 상태 조회
                                          캐시 없으면 job 시작 → 202 {status:'pending', jobId}
                                          생성 완료 → 200 {status:'done', topics:[...]}
                                          생성 실패 → 200 {status:'failed'}
POST /api/teams/:teamId/topic/react     — 반응 저장 (upsert)
POST /api/teams/:teamId/topic/confirm   — 리더 주제 확정 + phase 전이
```

3개 엔드포인트로 충분하다. `generate`를 별도로 두지 않는다.

**누락 엔드포인트 검토:**
커스텀 주제 입력(리더가 AI 추천 외 주제 직접 입력)이 screen-flow.md 스펙에 포함되어 있다. 이 경우 `confirm`에 `customTopic` 필드를 포함시키는 것이 가장 단순하다. 별도 POST가 필요하지 않다.

---

## 2. DB 스키마 검토

### 제안 스키마 분석

```
KickoffTopic: generationStatus String vs Enum
```

**`tags String[]` (PostgreSQL array) vs Json:**
PostgreSQL 배열 타입이 적합하다. 이유: tags는 단순 string 목록이며 중첩 구조가 없다. `@db.Text[]`로 선언하면 Prisma에서 직접 `string[]`으로 타입이 매핑된다. Json으로 관리하면 Zod 스키마로 파싱하는 추가 단계가 생기고, `packages/contracts/src/jsonb/`에 별도 스키마 파일이 필요해진다. 태그 조회 쿼리(특정 태그로 필터링)가 향후 필요할 경우 배열 타입이 더 유리하다(`@> ARRAY['react']` 인덱스 활용 가능).

**`generationStatus String` vs Enum:**
String보다 Prisma Enum이 더 강하다. `pending | processing | completed | failed` 4개 상태는 확정적이며 확장 가능성이 낮다. Enum으로 선언하면 Prisma 타입에서 자동 유니온 타입으로 노출되어 서비스 코드의 타입 안전성이 올라간다.

```prisma
enum GenerationStatus {
  pending
  processing
  completed
  failed
}
```

**`@@unique([topicId, userId])` — upsert 처리:**
적합하다. Prisma의 `upsert` 메서드가 `where: { topicId_userId: { topicId, userId } }`로 직접 적용된다. 반응 변경(좋아요→고민돼요) 시 별도 PATCH가 필요 없고, `POST /react`에서 upsert로 처리하면 충분하다. HTTP 메서드는 POST 유지가 맞다(자원 생성/갱신 의미를 내포하며, REST 순수주의보다 클라이언트 단순성 우선).

**`confirmedAt` vs `isConfirmed` 이중 관리:**
`isConfirmed Boolean`은 제거해야 한다. KF-018에서 "phase는 데이터 상태 기반으로 서비스 계층에서 계산"을 확정했다. `isConfirmed`는 `confirmedAt IS NOT NULL`과 동일한 정보를 중복 저장한다. 단일 진실원천 위반. `confirmedAt DateTime?` 하나만 유지한다.

**`generationJobId` 필드:**
ADR-003이 "job 상태는 DB 테이블에 저장해 서버 재시작 후 복구 가능해야 한다"고 명시했다. 따라서 이 필드는 필수다. 단, KickoffTopic 테이블에 직접 두기보다 team 단위 job 레코드를 분리하는 것이 더 나을 수 있다. 이유: 주제가 3~5개 생성되는데 각각에 동일한 jobId를 복사하면 정규화 위반이다.

**권장 스키마 수정:**

```prisma
enum GenerationStatus {
  pending
  processing
  completed
  failed
}

model KickoffTopicJob {
  id        String           @id @default(cuid())
  teamId    String
  team      Team             @relation(fields: [teamId], references: [id], onDelete: Cascade)
  status    GenerationStatus @default(pending)
  failReason String?
  topics    KickoffTopic[]
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt

  @@index([teamId])
}

model KickoffTopic {
  id          String           @id @default(cuid())
  teamId      String
  team        Team             @relation(fields: [teamId], references: [id], onDelete: Cascade)
  jobId       String?
  job         KickoffTopicJob? @relation(fields: [jobId], references: [id])
  title       String
  rationale   String
  tags        String[]
  aiGenerated Boolean          @default(true)
  confirmedAt DateTime?
  reactions   KickoffReaction[]
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  @@index([teamId])
}

model KickoffReaction {
  id        String       @id @default(cuid())
  topicId   String
  topic     KickoffTopic @relation(fields: [topicId], references: [id], onDelete: Cascade)
  userId    String
  reaction  String       // "agree" | "concern"
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt

  @@unique([topicId, userId])
  @@index([topicId])
}
```

`KickoffTopicJob`을 분리하면: (1) job 상태를 team 단위로 한 곳에서 관리, (2) 주제 카드 여러 개가 같은 job을 참조, (3) 서버 재시작 후 orphan job 탐지가 단순해진다.

`KickoffReaction`에서 `teamId` 제거 여부: `topicId`를 통해 `teamId`를 역참조할 수 있으므로 `KickoffReaction`에 직접 `teamId`를 두는 것은 중복이다. 단, 팀 단위 반응 집계 쿼리(`WHERE teamId = ?`) 성능이 필요하면 denormalization 허용. 현 단계에서는 제거 권장.

---

## 3. Phase State Machine 검토

### 현재 Phase 계산 범위 (kickoff.service.ts 실제 구현)

현재 `getKickoffStatus`는 `survey_in_progress | survey_complete` 두 phase만 계산한다. Screen 7 이후 phase가 추가되면 이 메서드를 확장해야 한다.

### 확정된 Phase Sequence

KF-018 및 screen-flow.md를 기준으로:

```
idle
  → survey_in_progress   (하나 이상 설문 시작됨)
  → survey_complete      (모든 leader/member 설문 제출)
  → topic_confirmed      (리더가 주제 확정)
  → structure_accepted   (리더가 아키텍처 블록 수락)
  → stack_confirmed      (리더가 스택 확정)
  → handoff_accepted     (리더가 아티팩트 수락) [needs-adr]
  → contract_signed      (리더가 계약 서명) [needs-adr]
```

### Screen 7 진입 조건 명확성

`survey_complete` → Screen 7 진입. 조건: `모든 leader/member의 SurveyResponse.submitted === true`. 이 조건은 kickoff.service.ts의 `canProceed` 로직에 이미 존재한다. Screen 7 서버 컴포넌트에서 `getKickoffStatus()`를 호출해 `phase !== 'survey_complete'`이면 `/team/[teamId]/dashboard`로 redirect한다. 단, phase가 `topic_confirmed` 이상이면 Screen 7을 read-only로 렌더링해야 한다(phase lock 상태 표시). `topic_confirmed` 이상에서는 redirect하지 않는다.

### Phase 역행 (주제 변경 가능 여부)

screen-flow.md는 "Phase lock indicator: once confirmed, topic cannot be changed without leader re-edit"라고 적고 있다. 이 표현은 변경 가능성을 암시하나, 구체적 재편집 흐름은 미정의 상태다.

**결정 필요 항목 (KF-023으로 등록 권장):**
- `topic_confirmed` 이후 리더가 주제를 다시 변경할 수 있는가?
- 변경 시 하위 phase(structure, stack)는 초기화되는가?

현 단계 구현 방향: phase lock 후 re-edit은 허용하지 않는다. 화면에 "확정됨" 배지와 CTA("다음: 아키텍처 설계")만 노출. 재편집 기능은 별도 ADR 후 추가.

### `canProceed` 연동

Screen 6의 `canProceed` 플래그가 `true`일 때 "킥오프 시작하기" CTA가 노출된다. 이 CTA는 `/team/[teamId]/topic`으로 라우팅한다. Screen 7 서버 컴포넌트에서 phase를 재검증하므로, Screen 6의 `canProceed`는 UI 힌트 용도이고 Screen 7이 실제 게이트다.

---

## 4. 보안/권한 검토

### `generate` (GET /api/teams/:teamId/topic)

누가 호출 가능한가: leader, member, observer 모두 조회 가능. 단 내부적으로 job을 시작하는 부작용은 leader만 트리거해야 하는가?

**결론:** job 시작 자동화는 역할 무관하게 허용. 이유: 페이지에 진입하는 모든 역할이 주제 목록을 봐야 한다. "누가 처음 진입하느냐"에 따라 생성이 달라지는 것은 UX상 문제가 있다. 팀 멤버 중 누구라도 page load 시 job을 시작할 수 있고, 이미 생성된 job이 있으면 캐시 반환. 악용 방어: 팀 멤버십 검증(`requireMembership`) + 24시간 내 재생성 제한(같은 팀의 `KickoffTopicJob`이 `processing | completed` 상태면 신규 생성 차단).

### `react` (POST /api/teams/:teamId/topic/react)

- observer 차단: service layer에서 멤버십 role 검증. observer이면 `ForbiddenException`. DB 레벨 제약이 아닌 service 레벨이 적합. 이유: DB 외래키로는 role 조건을 강제할 수 없고, service가 단일 책임 원칙상 권한 판단의 적절한 위치다.
- phase lock 이후 반응 차단: `confirmedAt IS NOT NULL`인 topic에 react 시도 시 `409 Conflict` 반환. 메시지: "주제가 이미 확정되었습니다."

### `confirm` (POST /api/teams/:teamId/topic/confirm)

- leader 전용: 서비스에서 `membership.role === 'leader'` 검증. NestJS `@Roles('leader')` 데코레이터 사용.
- 이미 confirmed된 경우 재호출: 멱등성 보장 — `confirmedAt`이 이미 설정되어 있으면 200 반환(재확정 아님). 에러가 아닌 이유: 네트워크 재시도 시 안전하게 처리되어야 한다.

### 팀 멤버십 검증 (teamId + userId 복합)

`requireMembership(teamId, userId)` 패턴이 kickoff.service.ts에 이미 구현되어 있다. topic.service.ts도 동일 패턴을 상속한다. 주의: `teamId`는 URL 파라미터에서 오므로, 다른 팀의 topicId를 react 요청에 포함하는 공격을 방어해야 한다. `react` 엔드포인트에서 `topic.teamId === request.teamId` 교차 검증이 필요하다.

---

## 5. Error/Edge Cases

### AI 생성 중 팀원 추가 합류 (미제출 새 멤버)

상황: topic job이 이미 `completed` 상태인데, 새 멤버가 합류해 설문을 미제출 상태.

문제: `getKickoffStatus`의 `canProceed`가 새 멤버 합류 후 `false`로 돌아간다. Screen 7는 진입 가능한 상태인가?

**결론:** phase는 서비스 계층에서 "현재 데이터"로 계산하므로, 새 멤버 합류 후 `survey_complete`가 `survey_in_progress`로 역행한다. 그러나 이미 생성된 `KickoffTopicJob`과 `KickoffTopic` 데이터는 유지한다. 진입 조건을 엄격하게 적용하면 Screen 7 접근이 차단된다.

실용적 처리:
- phase가 `topic_confirmed` 이상이면 새 멤버 합류에 관계없이 Screen 7는 read-only로 유지.
- phase가 `survey_complete`에서 역행하는 경우는 `topic_confirmed` 이전에만 발생한다. 이 경우 Screen 6에 "새 팀원이 합류했습니다. 전원 설문 완료 후 킥오프를 진행하세요" 배너를 노출하고 Screen 7 접근을 다시 차단.
- 팀 합류 시점 정책 (초대코드 유효 범위)은 현재 스펙에 미정의. Screen 7 구현 범위 밖으로 분류.

### 리더가 주제 확정 후 다른 팀원이 react 시도

위 보안 섹션에서 처리: `confirmedAt IS NOT NULL` 토픽에 react 시 409 반환. 프론트엔드는 이 응답을 받아 반응 버튼을 비활성화하고 "주제가 확정되었습니다" 배지로 전환.

### 서버 재시작 중 AI job 진행 중 (orphan job)

ADR-003: "job 상태는 DB에 저장해 서버 재시작 후 복구 가능해야 한다."

처리 방법:
1. 서버 재시작 시 `KickoffTopicJob`의 `status === 'processing'`인 레코드를 스캔.
2. `updatedAt`이 5분 이상 경과한 job은 `failed`로 전환 (NestJS `OnApplicationBootstrap` hook).
3. 클라이언트 폴링이 `failed` 상태를 받으면 fallback UI 활성화.
4. 주의: `OnApplicationBootstrap`에서 DB 접근이 발생하므로, Prisma 연결이 완전히 초기화된 후 실행되어야 한다.

### 팀 전원이 observer인 경우 (canProceed 계산 오류)

kickoff.service.ts의 현재 코드:
```typescript
const total = surveyableUserIds.length;  // observer 제외
const canProceed = total > 0 && total === submitted;
```

`total === 0`이면 `canProceed === false`가 보장된다. Screen 6에는 이미 "팀원이 없어 킥오프를 진행할 수 없어요" 에러 상태가 screen-flow.md에 정의되어 있다. 추가 처리 불필요.

### AI 응답 스키마 파싱 실패 (3회 재시도)

ADR-003: "파싱 실패 3회 시 job을 failed 처리."

`packages/contracts/src/ai/topic-suggestions.schema.ts`에 `TopicSuggestionsSchema`를 정의하고, Claude API 응답을 이 스키마로 파싱한다. 파싱 실패 시 즉시 재시도하지 않고 job 상태를 `failed`로 전환 후 클라이언트에 fallback UI를 표시한다. "3회 재시도"는 Claude API 자체 에러(네트워크, rate limit)에 적용하며, 스키마 파싱 실패는 별개 처리다(동일 프롬프트를 재시도해도 같은 실패가 반복될 가능성이 높으므로).

---

## 6. Frontend 흐름 검토

### Screen 6 → Screen 7 진입

Screen 6 per-team dashboard (`/team/[teamId]/dashboard`)의 "킥오프 시작하기" CTA → `router.push('/team/[teamId]/topic')`.

Screen 7 서버 컴포넌트 진입 시:
1. `getKickoffStatus(teamId, userId)` 호출
2. `phase === 'survey_in_progress'` → `redirect('/team/[teamId]/dashboard')`
3. `phase === 'survey_complete' | 'topic_confirmed'` → 렌더링 계속

### Screen 7 내부 상태 분기

| phase | 렌더링 상태 |
|-------|------------|
| `survey_complete`, topic job 없음 | 로딩 시작, GET /topic 호출 → 202 → polling |
| `survey_complete`, topic job `pending/processing` | 로딩 UI ("AI가 팀 프로필을 분석하고 있어요") |
| `survey_complete`, topic job `completed` | 주제 카드 목록, 반응 버튼 활성화 |
| `survey_complete`, topic job `failed` | fallback: 수동 주제 입력 폼 |
| `topic_confirmed` | 주제 카드 read-only, 확정 배지, "다음: 아키텍처 설계" CTA |

### 주제 확정 후 Screen 8a 이동

`POST /topic/confirm` 성공 후 → `router.push('/team/[teamId]/structure')`.

`redirect()`(서버 함수)가 아닌 `router.push()`(클라이언트 함수) 사용이 적합하다. 이유: confirm은 Server Action에서 수행하므로 `redirect()`도 기술적으로 가능하나, Screen 7은 Client Component가 mutation을 처리하는 패턴(KF-006: Server Actions 경유)이다. Server Action에서 `redirect()`를 호출하면 React 상태가 초기화되기 전에 이동이 발생한다. confirm 성공 응답 후 클라이언트에서 `router.push()`를 호출하는 것이 더 안전하다.

### 폴링 구현 위치

Client Component에서 `useEffect` + `setTimeout` (또는 `setInterval`) 패턴. Server Component가 아닌 이유: 폴링은 클라이언트 측 주기적 재요청이므로 서버에서 처리할 수 없다. Server Action을 경유해 `GET /topic` 상태를 재조회하는 방식으로 구현 (KF-006, KF-007 원칙 준수).

polling 구현 예시 흐름:
```
진입 시 초기 조회 (Server Action)
  status === 'pending' | 'processing'
    → 5초 후 재조회 (반복, 최대 5회)
  status === 'done'
    → 주제 카드 렌더링
  status === 'failed' | 폴링 5회 초과
    → fallback UI
```

---

## 7. 설계 결정 요약 (KF-023 등록 필요)

이 검토에서 새로 확인된 미결 항목:

### KF-023 (신규 등록 권장): topic_confirmed 이후 주제 재편집 허용 여부

- 현재 결론: 허용하지 않음. 확정 후 하위 phase 역행 흐름 전체가 미설계 상태.
- 영향 범위: Screen 7 confirm 이후 UI, structure/stack 데이터 초기화 정책
- 결정 전까지: 재편집 버튼 비노출, 확정 후 read-only 렌더링

---

## 8. 구현 시작 전 필수 체크리스트

| 항목 | 상태 | 비고 |
|------|------|------|
| ADR-003 (AI polling pattern) | proposed | 구현 착수 전 accepted로 전환 필요 (KF-020 차단 조건) |
| ADR-004 (Socket.io defer) | proposed | 내용 확정. accepted 전환 필요 |
| `packages/contracts/src/ai/topic-suggestions.schema.ts` | ⬜ | TopicSuggestionsSchema 정의 선행 |
| `KickoffTopicJob`, `KickoffTopic`, `KickoffReaction` Prisma 모델 | ⬜ | tf-db 에이전트 담당 |
| `apps/api/src/topic/topic.service.ts` | ⬜ | KF-021 원칙 기반 |
| Screen 7 entry guard (server component redirect) | ⬜ | phase 검증 로직 |
| Fallback UI (수동 주제 입력 폼) | ⬜ | AI 실패 시 필수, AI path와 동시 구현 |
| KF-023 등록 | ⬜ | decisions.md 업데이트 |

---

## 9. 초안 API 구조와 최종 확정 구조 차이 요약

| 항목 | 초안 | 확정 |
|------|------|------|
| 엔드포인트 수 | 4개 (generate 분리) | 3개 (GET이 generate 내포) |
| API 경로 prefix | `/kickoff/topic/` | `/topic/` (screen-flow.md 기준) |
| `isConfirmed` 필드 | 있음 | 제거 (confirmedAt으로 통합) |
| generationStatus | String | Enum (GenerationStatus) |
| job 추적 | KickoffTopic.generationJobId | KickoffTopicJob 테이블 분리 |
| react HTTP 메서드 | POST (제안) | POST + upsert 유지 |
| confirm 후 이동 | 미정 | router.push (Client) |
| 반응 변경 | 미정 | upsert로 허용 |
