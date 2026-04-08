# Screen 7 -- 브레인스토밍 흐름 설계

> 작성일: 2026-04-08
> 상태: 설계 확정 (구현 전)
> 관련 결정 키: KF-031, KF-032, KF-033

---

## 1. 설계 목적

기존 Screen 7은 AI가 설문 데이터만으로 주제 3~5개를 추천하고 리더가 확정하는 구조였다. 이 구조에는 두 가지 문제가 있다.

1. **앵커링 효과**: AI가 먼저 주제를 제시하면 팀원의 사고가 해당 주제에 고정된다. 발산적 사고가 차단되고, 팀원은 AI 추천에 반응만 하는 수동적 참여자가 된다.
2. **팀원 참여 부족**: member 역할은 이모지 반응만 가능했다. 주제 생성 과정에 실질적으로 기여하는 경로가 없었다.

브레인스토밍 이론(Electronic Brainstorming, Brainwriting 6-3-5, Diverge-Converge 프레임워크)을 반영해 **"팀원 발산 -> AI 수렴"** 구조로 리팩토링한다.

**핵심 원칙:**
- AI는 발산 단계에서 개입하지 않는다 (정리자 역할만 수행)
- 모든 팀원이 아이디어를 직접 제출한다 (실명제)
- Build-on 메커니즘으로 아이디어를 발전시킨다
- Dot voting으로 민주적 수렴 후 리더가 최종 확정한다

---

## 2. 화면 분리

| 기존 | 변경 | 경로 | 역할 |
|------|------|------|------|
| Screen 7 Topic Decision | Screen 7a Brainstorm | `/team/[teamId]/topic/brainstorm` | 발산 + 공유 + AI 정리 |
| (동일 화면) | Screen 7b Topic Decision | `/team/[teamId]/topic` | 투표 + 확정 |

Screen 7a는 7b의 선행 단계다. 7a가 완료되어야 7b에 진입할 수 있다.

---

## 3. 진입 조건

### Screen 7a (`/team/[teamId]/topic/brainstorm`)

- 인증 완료, 팀 멤버십 존재
- 팀 phase가 `survey_complete` 이상 (모든 leader/member가 설문 제출 완료)
- observer: 읽기 전용 접근 허용

### Screen 7b (`/team/[teamId]/topic`)

- 인증 완료, 팀 멤버십 존재
- 브레인스토밍 Stage 3(AI 클러스터링) 완료 상태
- observer: 읽기 전용 접근 허용

---

## 4. 4단계 흐름

```text
Screen 6 (Team Dashboard)
  [gate: ALL members submitted survey]
  |
  v
Screen 7a — Brainstorm (/team/[teamId]/topic/brainstorm)
  |
  |  Stage 1: Ideation (개별 발산)
  |    - 7분 가이드 타이머 (권장, 강제 아님)
  |    - 각 팀원이 아이디어 카드 작성 (제목 + 설명)
  |    - 본인 아이디어만 보임 (다른 팀원 아이디어 비공개)
  |    - 팀 역량 요약만 사이드바에 표시 (AI 주제 제안 없음 — 앵커링 방지)
  |    - leader가 "공유 단계로 넘어가기" 버튼 클릭
  |
  |  Stage 2: Sharing + Build-on (전체 공개)
  |    - 모든 아이디어 카드가 전체 공개됨 (실명 표시)
  |    - 각 아이디어에 공감 버튼 (하트)
  |    - Build-on 버튼: 기존 아이디어를 기반으로 발전 아이디어 작성
  |      - single-parent: 하나의 원본 아이디어에만 연결 가능
  |      - Build-on 카드에 원본 참조 배지 표시
  |    - leader가 "AI 정리 요청" 버튼 클릭
  |
  |  Stage 3: AI Clustering (자동)
  |    - GPT-4o가 전체 아이디어를 분석
  |    - 3~5개 주제 클러스터로 정리
  |    - 각 클러스터: 주제명 + 요약 + 포함된 원본 아이디어 목록
  |    - 202/200 polling 패턴 (KF-020)
  |    - 완료 시 자동으로 Screen 7b로 전환
  |
  v
Screen 7b — Topic Decision (/team/[teamId]/topic)
  |
  |  Stage 4: Dot Voting + 확정
  |    - AI가 정리한 3~5개 클러스터가 투표 카드로 표시
  |    - 인당 2표 Dot voting (중복 투표 가능: 같은 클러스터에 2표 허용)
  |    - 실시간 투표 현황 표시 (폴링 기반, 10초 간격)
  |    - leader: "이 주제로 확정" 버튼 (투표 결과 참고, 강제 아님)
  |    - leader: 커스텀 주제 직접 입력 옵션 유지
  |    - 확정 후 read-only 전환 (KF-023)
  |    - CTA: "다음: 아키텍처 설계" -> /team/[teamId]/structure
  |
  v
Screen 8a — System Framing (/team/[teamId]/structure)
```

---

## 5. 역할별 분기

### Stage 1: Ideation (개별 발산)

| 액션 | leader | member | observer |
|------|--------|--------|----------|
| 아이디어 카드 작성 | rw | rw | - |
| 본인 아이디어 수정/삭제 | rw | rw | - |
| 팀 역량 요약 보기 | r | r | r |
| "공유 단계로 넘어가기" 버튼 | yes | no | no |
| 타이머 시작/리셋 | yes | no | no |

### Stage 2: Sharing + Build-on

| 액션 | leader | member | observer |
|------|--------|--------|----------|
| 전체 아이디어 열람 | r | r | r |
| 공감 (하트) 토글 | yes | yes | no |
| Build-on 작성 | yes | yes | no |
| "AI 정리 요청" 버튼 | yes | no | no |

### Stage 3: AI Clustering

| 액션 | leader | member | observer |
|------|--------|--------|----------|
| 클러스터링 결과 열람 | r | r | r |
| 재생성 요청 | yes (최대 2회) | no | no |

### Stage 4: Dot Voting + 확정

| 액션 | leader | member | observer |
|------|--------|--------|----------|
| 클러스터 카드 열람 | r | r | r |
| Dot voting (인당 2표) | yes | yes | no |
| 주제 확정 | yes | no | no |
| 커스텀 주제 입력 | yes | no | no |

---

## 6. API 의존성

### Stage 1

| 메서드 | 경로 | 설명 | 호출 시점 |
|--------|------|------|----------|
| POST | `/api/teams/:teamId/brainstorm/ideas` | 아이디어 카드 생성 | 팀원이 아이디어 작성 완료 시 |
| PATCH | `/api/teams/:teamId/brainstorm/ideas/:ideaId` | 아이디어 수정 | 본인 아이디어 수정 시 |
| DELETE | `/api/teams/:teamId/brainstorm/ideas/:ideaId` | 아이디어 삭제 | 본인 아이디어 삭제 시 |
| GET | `/api/teams/:teamId/brainstorm/ideas/mine` | 본인 아이디어 목록 | Stage 1 페이지 로드 시 |
| GET | `/api/teams/:teamId/kickoff/status` | 팀 역량 요약 (teamInsight) | Stage 1 사이드바 렌더링 시 |
| POST | `/api/teams/:teamId/brainstorm/advance` | Stage 1 -> 2 전환 | leader "공유 단계로 넘어가기" 클릭 시 |

### Stage 2

| 메서드 | 경로 | 설명 | 호출 시점 |
|--------|------|------|----------|
| GET | `/api/teams/:teamId/brainstorm/ideas` | 전체 아이디어 목록 (실명 포함) | Stage 2 페이지 로드 시 |
| POST | `/api/teams/:teamId/brainstorm/ideas/:ideaId/empathy` | 공감 토글 | 하트 버튼 클릭 시 |
| POST | `/api/teams/:teamId/brainstorm/ideas/:ideaId/buildon` | Build-on 아이디어 생성 | Build-on 작성 완료 시 |
| POST | `/api/teams/:teamId/brainstorm/cluster` | AI 클러스터링 요청 (202 반환) | leader "AI 정리 요청" 클릭 시 |

### Stage 3

| 메서드 | 경로 | 설명 | 호출 시점 |
|--------|------|------|----------|
| GET | `/api/teams/:teamId/brainstorm/cluster` | 클러스터링 결과 + job 상태 | 5초 간격 폴링 (최대 5회, KF-020) |
| POST | `/api/teams/:teamId/brainstorm/cluster/retry` | 재생성 요청 (leader only, 최대 2회) | 재생성 버튼 클릭 시 |

### Stage 4

| 메서드 | 경로 | 설명 | 호출 시점 |
|--------|------|------|----------|
| GET | `/api/teams/:teamId/topic` | 클러스터 기반 주제 목록 | Stage 4 페이지 로드 시 |
| POST | `/api/teams/:teamId/topic/vote` | Dot voting (인당 2표) | 투표 클릭 시 |
| GET | `/api/teams/:teamId/topic/votes` | 투표 현황 집계 | 10초 폴링 |
| POST | `/api/teams/:teamId/topic/confirm` | 주제 확정 (leader only) | 확정 버튼 클릭 시 |

---

## 7. Build-on 인터랙션 설계

### 동작 방식

1. Stage 2에서 아이디어 카드 하단에 "발전시키기" 버튼 표시
2. 버튼 클릭 시 해당 아이디어 카드 아래에 인라인 입력 폼 확장
3. 제목 + 설명 입력 후 "등록" 클릭
4. Build-on 카드가 원본 카드 바로 아래에 들여쓰기(indent) 형태로 표시
5. Build-on 카드에 "원본: [원본 작성자] - [원본 제목]" 참조 배지 표시

### 제약 조건

- **single-parent MVP**: 하나의 Build-on은 하나의 원본에만 연결된다. 다중 참조(multi-parent)는 Later 항목이다.
- Build-on에 대한 Build-on은 허용하지 않는다 (깊이 1단계 고정). 이는 UI 복잡도와 AI 클러스터링 품질을 위한 결정이다.
- Build-on도 Stage 3 AI 클러스터링 입력에 포함된다.

### 데이터 모델 (개념)

```
BrainstormIdea {
  id          String
  teamId      String
  authorId    String
  title       String (최대 100자)
  description String (최대 500자)
  parentId    String? (null = 원본, non-null = Build-on)
  stage       Int (1 = ideation, 2 = sharing)
  empathyCount Int (공감 수)
  createdAt   DateTime
}
```

---

## 8. AI 클러스터링 설계

### 입력

- 팀의 모든 아이디어 카드 (원본 + Build-on)
- 팀 역량 요약 (teamInsight: 6축 평균, 블록 커버리지, 역할 분포)
- 팀 설문 데이터 요약 (기술 스택 선호, 협업 스타일)

### 출력

AI는 아이디어를 3~5개 주제 클러스터로 정리한다.

```
TopicCluster {
  clusterId   String
  title       String        // 클러스터 주제명
  summary     String        // 1~2문장 요약
  keywords    String[]      // 기술 키워드 태그
  ideaIds     String[]      // 포함된 원본 아이디어 ID 목록
  rationale   String        // 이 클러스터가 팀에 적합한 이유
}
```

### 처리 패턴

- KF-020 202/200 polling 패턴 준수
- GPT-4o JSON 모드 (KF-024)
- 응답 스키마: `BrainstormClusterSchema` (Zod, `packages/contracts/src/ai/`)
- 파싱 실패 3회 시 job FAILED 처리
- FAILED 시 leader에게 재생성 또는 수동 주제 입력 안내

### AI 프롬프트 경계

- 팀원 아이디어 데이터는 XML 태그로 경계 분리 (prompt injection 방어, CLAUDE.md 규칙)
- AI 역할: "주어진 아이디어를 유사성 기준으로 그룹화하고 주제명을 붙이는 정리자" (새로운 주제 생성 금지)

---

## 9. Dot Voting 설계

### 규칙

- 인당 2표 고정
- 같은 클러스터에 2표 중복 투표 허용
- 투표 변경 가능 (기존 투표 철회 후 재투표)
- observer는 투표 불가, 결과만 열람

### 투표 현황 표시

- 클러스터 카드에 현재 투표 수 표시
- 10초 폴링으로 갱신 (Socket.io 미도입 상태, KF-022)
- 본인이 투표한 클러스터에 "내 투표" 배지 표시

### 리더 확정

- 투표 결과는 참고 사항이며, 리더가 투표 1위가 아닌 클러스터를 선택할 수 있다
- 커스텀 주제 직접 입력 옵션 유지 (기존 Screen 7 기능 보존)
- 확정 시 phase가 `topic_confirmed`로 전이 (KF-018, KF-021)

---

## 10. 에러 상태 처리

| 상태 | 조건 | 표시 | 복구 방법 |
|------|------|------|----------|
| 설문 미완료 | phase < `survey_complete` | Screen 6로 리다이렉트 + "팀원 모두가 설문을 완료해야 해요" | 미제출 팀원이 설문 완료 |
| 아이디어 없음 | Stage 2 진입 시 아이디어 0개 | "아직 아이디어가 없어요. Stage 1으로 돌아가서 아이디어를 작성해주세요" | leader가 Stage 1로 되돌리기 |
| AI 클러스터링 실패 | job FAILED | "AI 분석에 실패했어요" + 재생성 버튼 (leader) | leader 재생성 (최대 2회) 또는 수동 주제 입력 |
| AI 클러스터링 타임아웃 | 5회 폴링 초과 | "분석이 오래 걸리고 있어요. 잠시 후 다시 확인해주세요" | 페이지 새로고침 시 재폴링 |
| 투표 수 초과 | 인당 2표 초과 시도 | "투표는 최대 2개까지 가능해요" 토스트 | 기존 투표 철회 후 재투표 |
| 확정 후 재진입 | topic_confirmed 이후 7a/7b 접근 | 전체 read-only 렌더링 + "주제가 확정되었습니다" 배너 | 재편집 불가 (KF-023) |
| 네트워크 오류 | API 호출 실패 | "네트워크 오류가 발생했습니다. 다시 시도해 주세요" | 재시도 버튼 |
| 빈 팀 | member 0명 (observer만) | "팀원이 없어 브레인스토밍을 진행할 수 없어요" | member 추가 필요 |

---

## 11. MVP vs Later 분류

### MVP (Screen 7a/7b 초기 구현)

- Stage 1~4 전체 흐름
- 7분 가이드 타이머 (시각적 가이드, 강제 잠금 아님)
- 아이디어 카드 CRUD
- Build-on (single-parent, 깊이 1단계)
- 공감 토글
- AI 클러스터링 (GPT-4o, 202/200 polling)
- Dot voting (인당 2표)
- 리더 확정 + 커스텀 주제 입력
- 폴링 기반 실시간 갱신

### Later

- Build-on multi-parent (여러 아이디어 참조)
- Build-on 깊이 2단계 이상
- Socket.io 실시간 갱신 (ADR-004 확정 후)
- 익명 모드 옵션
- 아이디어 카드 드래그 앤 드롭 정렬
- AI 클러스터 수동 편집 (병합/분할)
- 투표 결과 시각화 (차트)
- 타이머 강제 잠금 모드

---

## 12. screen-flow.md 와의 관계

이 문서는 `docs/product/screen-flow.md`의 Screen 7 섹션을 상세 확장한다.

- screen-flow.md의 Flow Table에서 Screen 7은 7a + 7b로 분리 표기
- screen-flow.md의 Role Access Matrix에서 7a/7b 각각 별도 행 추가
- screen-flow.md의 Full Flow Diagram에서 7a -> 7b -> 8a 순서로 갱신
- 기존 Screen 7 API 엔드포인트(`GET /api/teams/:teamId/topic` 등)는 Stage 4(7b)에서 그대로 사용
- 신규 API 엔드포인트(`/api/teams/:teamId/brainstorm/*`)는 Stage 1~3(7a)에서 사용

---

## 13. 결정 키 등록 필요 사항

### KF-031 -- Screen 7 분리: 7a(Brainstorm) + 7b(Topic Decision) 2단계 구조 확정

**결론:** 기존 Screen 7을 7a(`/topic/brainstorm`)와 7b(`/topic`)로 분리한다. 7a는 팀원 발산(Ideation) + 공유(Sharing + Build-on) + AI 클러스터링 단계를 담당하고, 7b는 Dot voting + 리더 확정 단계를 담당한다.

**이유:** AI가 먼저 주제를 제시하는 구조는 팀원 사고를 앵커링한다. "팀원 발산 -> AI 수렴" 순서로 전환해 팀원의 능동적 참여를 보장하고, AI를 정리자 역할로 제한한다.

### KF-032 -- Build-on은 single-parent MVP, 깊이 1단계 고정

**결론:** Build-on 아이디어는 하나의 원본 아이디어에만 연결(single-parent)하며, Build-on에 대한 Build-on은 허용하지 않는다(깊이 1단계 고정).

**이유:** multi-parent와 깊이 2+ 트리 구조는 AI 클러스터링 입력 복잡도를 급증시키고, 모바일 UI에서 트리 렌더링이 어려워진다. MVP에서는 단순 구조로 검증 후 확장한다.

### KF-033 -- Dot voting 인당 2표, 폴링 기반 갱신

**결론:** Stage 4 투표는 인당 2표 고정, 같은 클러스터 중복 투표 허용, 10초 폴링으로 현황 갱신한다. 투표 결과는 리더 확정의 참고 사항이며 자동 확정 로직은 없다.

**이유:** 인당 1표는 선호 표현이 제한적이고, 3표 이상은 클러스터 3~5개 대비 변별력이 떨어진다. 2표는 "1순위 + 2순위" 또는 "강력 지지(2표 집중)" 두 전략을 허용해 표현력과 단순성의 균형점이다.

---

## 14. DB 테이블 신규 필요 (개념)

기존 KF-019의 `KickoffTopic`, `KickoffReaction` 테이블에 추가로 다음이 필요하다.

| 테이블 | 용도 | 비고 |
|--------|------|------|
| `BrainstormIdea` | 아이디어 카드 저장 (원본 + Build-on) | parentId로 Build-on 관계 표현 |
| `BrainstormEmpathy` | 공감 토글 기록 | userId + ideaId unique |
| `BrainstormClusterJob` | AI 클러스터링 job 상태 | KF-020 패턴 |
| `BrainstormCluster` | 클러스터링 결과 | JSONB로 ideaIds, summary 등 저장 |
| `TopicVote` | Dot voting 기록 | userId + teamId, 최대 2표 |

> 상세 스키마는 tf-db 에이전트가 `apps/api/prisma/schema.prisma` 설계 시 확정한다.

---

## 15. BrainstormModule 분리

브레인스토밍 관련 로직은 기존 `topic` 모듈과 분리해 `brainstorm` 모듈로 독립 구성한다.

```
apps/api/src/
  brainstorm/
    brainstorm.module.ts
    brainstorm.controller.ts
    brainstorm.service.ts
  topic/
    topic.module.ts        (기존 유지, Stage 4 투표/확정 담당)
    topic.controller.ts
    topic.service.ts
```

**이유:** Stage 1~3(발산/공유/클러스터링)과 Stage 4(투표/확정)는 데이터 모델과 비즈니스 로직이 다르다. 모듈 분리로 각 단계의 테스트와 유지보수가 독립적으로 가능하다.
