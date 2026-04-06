# 260406_01-repo-docs-structure-bootstrap

## 작업 요약

- 기존 `docs/`의 연구 문서와 `.claude` 오케스트레이션 문서를 읽고 현재 저장소의 기준점을 정리했다.
- 전체 저장소 폴더 구조와 `docs/` 정보 구조를 협업 가능한 형태로 분리했다.
- 제품, API, 아키텍처, ADR, 진행 일지, 리뷰 대기, 런북 템플릿을 생성했다.

## 구현된 기능

- `apps/`, `packages/`, `tooling/`, `infra/`, `tests/` 기본 디렉터리 생성
- `docs/product/`, `docs/api/`, `docs/architecture/`, `docs/adr/`, `docs/progress/`, `docs/reviews/ai-artifacts/`, `docs/runbooks/`, `docs/research/` 구조 생성
- 기존 연구 문서를 구조화된 위치로 재배치
- 진행 이력과 결정 원장 시작

## 설계 결정

- `KF-001`: 문서 우선순위를 명시적으로 둔다.
- `KF-002`: TeamForge는 협업 중심 모노레포 구조로 시작한다.
- `KF-003`: 리서치의 FastAPI 서술은 보존하되, 현재 저장소 구현 기준은 NestJS BFF로 고정한다.

## 미완료 항목

- 실제 패키지 매니저 워크스페이스 파일(`package.json`, `pnpm-workspace.yaml`, `turbo.json`)은 아직 없다.
- `apps/api` 외에 별도 Python AI 런타임을 둘지 여부는 아직 결정되지 않았다.
- Screens 12~14는 제품 설명 수준까지만 정리되어 있고 상세 스펙은 없다.

## Next Start

- 워크스페이스 초기화 파일을 만들고 `apps/web`, `apps/api`, `packages/contracts`의 최소 실행 스캐폴드를 올린다.
- Screen 1~6을 우선순위로 두고 `docs/product/system-spec.md`를 더 세분화한다.
- `.claude` 에이전트 체계에 맞춘 실제 구현 순서 문서를 추가한다.
