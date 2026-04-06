# 260406_06-screen4-survey-implementation

## 작업 요약

- CLAUDE.md와 screen-flow.md를 실제 구현 코드 기준으로 현실화했다. Role Select deprecated 처리, tf-figma-sync 에이전트 추가.
- Figma 캡처 워크플로우를 `.claude/agents/tf-figma-sync.md`로 문서화하고 Screen 1~3 desktop/mobile 총 10개 프레임을 Figma에 업데이트했다.
- Screen 4 스킬 설문 전체 스택(DB → API → Frontend)을 구현했다. SurveyResponse Prisma 모델, NestJS survey 모듈, Next.js 6섹션 설문 UI 완성.
- tf-security blocked 사안을 수정 완료했다: layout.tsx capture script 제거, PUT→POST 수정, 재제출 차단 로직 추가, selfIntro 필드 추가.

## 구현된 기능

**문서 현실화**
- `CLAUDE.md`: 구현 완료 목록 수정, tf-figma-sync 에이전트 섹션 추가
- `docs/product/screen-flow.md`: Primary Flow를 Login → Dashboard → Team Create/Join으로 수정, Role Select deprecated 표시
- `.claude/agents/tf-figma-sync.md`: 신규 에이전트 파일 (Figma 캡처 워크플로우)
- `.claude/commands/tfo.md`: figmaSync=true 플래그 추가

**DB**
- `apps/api/prisma/schema.prisma`: `SurveyResponse` 모델 추가 (teamId, userId, answers JSONB, submitted bool)
- `apps/api/prisma/migrations/20260406045443_add_survey_response/migration.sql`: 마이그레이션 신규 적용

**Contracts**
- `packages/contracts/src/jsonb/survey-answers.schema.ts`: 6개 섹션 통합 `SurveyAnswersSchema` Zod 스키마 (신규)
- `packages/contracts/src/jsonb/index.ts`: SurveyAnswersSchema export 추가

**Backend**
- `apps/api/src/survey/survey.service.ts`: `saveDraft`, `submitSurvey` (idempotent last-write-wins, 재제출 차단) 구현
- `apps/api/src/survey/survey.controller.ts`: `GET /survey/:teamId`, `POST /survey/:teamId/draft`, `POST /survey/:teamId/submit`
- `apps/api/src/survey/survey.module.ts`: SurveyModule 신규
- `apps/api/src/app.module.ts`: SurveyModule import 추가

**Frontend**
- `apps/web/app/team/[teamId]/survey/page.tsx`: 설문 Server Component (survey 상태 pre-fetch)
- `apps/web/app/team/[teamId]/survey/survey-client.tsx`: 6섹션 스텝 UI, 드래프트 자동저장, 최종 제출 흐름
- `apps/web/app/team/[teamId]/survey/actions.ts`: `saveDraft`, `submitSurvey` Server Actions
- `apps/web/components/survey/sections/Section1BasicInfo.tsx` ~ `Section6Portfolio.tsx`: 6개 섹션 컴포넌트 신규
- `apps/web/app/dev-preview/page.tsx`: survey 화면 dev-preview 등록

**보안 수정**
- `apps/web/app/layout.tsx`: Figma capture script 완전 제거
- `apps/web/app/team/[teamId]/survey/actions.ts:18`: PUT → POST 수정
- `packages/contracts/src/jsonb/survey-answers.schema.ts`: selfIntro 필드 추가
- `apps/api/src/survey/survey.service.ts`: `existing.submitted` 체크로 재제출 차단

**운영**
- `docs/runbooks/migration-003-add-survey-response.md`: 마이그레이션 runbook 신규

## 설계 결정

- `KF-009`: SurveyResponse JSONB answers 필드를 단일 통합 스키마(SurveyAnswersSchema)로 관리
- `KF-010`: submitSurvey는 idempotent last-write-wins, 단 submitted=true 상태에서 재제출 차단
- `KF-011`: Section 6 PDF 업로드 제거, GitHub URL + selfIntro 텍스트만 보관

## 미완료 항목

- Screen 5 `/team/[teamId]/result`: 개인 결과 레이더 차트 미구현
- Screen 6 `/team/[teamId]/dashboard`: 팀 대시보드 survey 상태 집계 미구현
- SurveyResponse jti 재사용 방지는 현재 인메모리; Redis 교체 미완 (KF-005 연속)
- Figma Screen 4 캡처 미완료 (dev-preview 등록은 됨, 실제 캡처 실행 필요)

## Next Start

1. Screen 5 구현: `GET /survey/:teamId/result` API + `/team/[teamId]/result` 레이더 차트 페이지
2. Screen 6 대시보드에 survey 상태 뱃지 추가 (submitted/in-progress/not-started)
3. figmaSync=true로 Screen 4 Figma 캡처 실행
