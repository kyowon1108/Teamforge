# 260406_02-workspace-bootstrap-scaffold

## 작업 요약

- Claude Code가 바로 구현을 시작할 수 있도록 Git/워크스페이스/앱 스캐폴드 기준을 세웠다.
- `apps/web`, `apps/api`, `packages/contracts` 최소 실행 구조를 만들었다.
- 모노레포 실행 파일과 부트스트랩 문서를 추가했다.

## 구현된 기능

- 루트 `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.json` 생성
- `apps/web` Next.js 최소 앱 생성
- `apps/api` NestJS 최소 앱과 Prisma 스키마 생성
- `packages/contracts` 공용 Zod 계약 패키지 생성
- `docs/architecture/workspace-bootstrap.md` 추가
- `git init`, `pnpm install`, `pnpm typecheck`, 웹/API 빌드 검증 완료

## 설계 결정

- 기존 `apps/api` 경계를 유지하면서 실개발 시작점은 NestJS 최소 앱으로 고정했다.
- 공용 계약은 `packages/contracts`를 통해 먼저 형성하고 화면/엔드포인트 구현이 이를 소비하는 방향으로 간다.

## 미완료 항목

- lint 체계와 shared ESLint config는 placeholder만 있다.
- NextAuth, Prisma migration, env validation은 아직 들어가지 않았다.
- Prisma 관련 build script approval은 아직 명시적으로 처리하지 않았다.

## Next Start

- `pnpm install` 후 `pnpm typecheck`를 통과시킨다.
- Screen 1~3 기준으로 auth/team 도메인 계약과 API 골격을 만든다.
- `tf-db -> tf-backend -> tf-frontend` 순서로 첫 실제 기능을 올린다.
