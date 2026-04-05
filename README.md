# TeamForge

**팀 프로젝트의 전체 생명주기를 한 곳에서 운영하는 control plane.**

Slack/GitHub/Notion을 대체하는 게 아니라, 그 위에서 팀의 결정·회의·변경·진행 상태를 묶는 운영 레이어입니다. 대학 캡스톤, 부트캠프, 액셀러레이터 팀 프로젝트에 최적화되어 있습니다.

---

## 주요 기능

| 단계 | 기능 |
|------|------|
| **팀 구성** | OAuth 로그인 → 역할 선택(팀장/팀원/옵저버) → 6자리 초대 코드로 팀 합류 |
| **스킬 진단** | 6섹션 15문항 설문 → 팀원별 스킬 레이더 차트 + 역할 추천 |
| **킥오프** | AI 브레인스토밍으로 주제 결정 → 아키텍처 스택 선택(블록별 AI 추천) → 킥오프 서약 |
| **협업 도구 연동** | Discord·Slack·GitHub·Notion Webhook URL 등록 |
| **미팅 허브** *(예정)* | 회의록 AI 분석 → 액션 아이템 자동 추출 |
| **방향 추적** *(예정)* | 의사결정 이력 + drift 감지 |

---

## 기술 스택

```
Frontend  Next.js 14 (App Router) + shadcn/ui + Tailwind CSS
Backend   NestJS + Prisma + PostgreSQL (pgvector)
Auth      NextAuth.js v5 (Google, GitHub, Kakao)
Realtime  Socket.io
AI        OpenAI gpt-4o-mini + Whisper + text-embedding-3-small
Storage   Supabase Storage
Monorepo  Turborepo + pnpm
```

---

## 로컬 실행

### 사전 조건

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+ (pgvector 확장 필요)
- Docker (선택)

### 빠른 시작

```bash
# 저장소 클론
git clone https://github.com/kyowon1108/Teamforge.git
cd Teamforge

# 의존성 설치
pnpm install

# 환경변수 설정
cp .env.example .env
# .env 파일을 열어 OAuth 키, DB URL, AI API 키 등을 채워 넣으세요

# DB 마이그레이션
cd apps/api
npx prisma migrate deploy
npx prisma generate
cd ../..

# 개발 서버 시작 (API :3001 + Web :3000 동시 실행)
pnpm dev
```

### Docker로 DB만 실행

```bash
docker-compose up -d   # PostgreSQL + pgvector
```

### 환경변수

`.env.example` 파일을 참조하세요. 주요 항목:

| 변수 | 설명 |
|------|------|
| `AUTH_SECRET` | NextAuth.js 서명 키 (openssl rand -base64 32) |
| `GOOGLE_CLIENT_ID/SECRET` | Google OAuth App 자격증명 |
| `GITHUB_CLIENT_ID/SECRET` | GitHub OAuth App 자격증명 |
| `OPENAI_API_KEY` | OpenAI API 키 (킥오프 AI 브레인스토밍) |
| `DATABASE_URL` | PostgreSQL 연결 문자열 |
| `SESSION_EXCHANGE_SECRET` | Web → API 서버 간 세션 교환 키 |

> **Kakao 로그인:** `KAKAO_CLIENT_ID`가 비어 있으면 UI에서 자동으로 비활성화됩니다.

---

## 프로젝트 구조

```
Teamforge/
├── apps/
│   ├── api/          # NestJS 백엔드 (포트 3001)
│   │   ├── prisma/   # DB 스키마 + 마이그레이션
│   │   └── src/
│   │       └── modules/
│   │           ├── auth/         # NextAuth 세션 교환
│   │           ├── teams/        # 팀 생성·합류·관리
│   │           ├── survey/       # 스킬 설문 + 벡터 분석
│   │           ├── kickoff/      # 킥오프 플로우 (AI 포함)
│   │           ├── integrations/ # 협업 도구 연동
│   │           └── meetings/     # 회의 관리
│   └── web/          # Next.js 프론트엔드 (포트 3000)
│       └── app/
│           ├── login/
│           ├── onboarding/
│           ├── survey/ + result/
│           ├── dashboard/
│           └── team/[teamId]/
│               ├── kickoff/     # 주제→아키텍처→요약
│               ├── meetings/
│               └── tools/
├── packages/
│   └── contracts/    # 공유 타입 + Zod 스키마 + 플랫폼 프리셋
└── docs/             # 설계 문서, ADR, 진행 일지
```

---

## 역할별 사용 흐름

**팀장(Leader)**
1. 로그인 → 역할 선택(팀장) → 팀 생성
2. 초대 코드/링크 공유 → 팀원 대기
3. 스킬 설문 완료 → 개인 결과 확인
4. 킥오프 진행: 주제 결정 → 아키텍처 설계 → 협업 도구 등록 → 서약

**팀원(Member)**
1. 초대 링크 클릭 → 로그인 → 자동 합류
2. 스킬 설문 완료 → 개인 결과
3. 킥오프 참여 (팀장 주도, 팀원 동의)

**옵저버(Observer)**
1. 코드 입력으로 합류 → 설문 없음
2. 팀 대시보드 열람 전용

---

## 개발 문서

| 문서 | 위치 |
|------|------|
| 제품 스펙 (화면 14개) | `docs/product/system-spec.md` |
| 화면 플로우 | `docs/product/screen-flow.md` |
| API 계약 | `docs/api/` |
| 아키텍처 결정 기록 (ADR) | `docs/adr/` |
| 개발 진행 일지 | `docs/progress/` |
| 결정 키 원장 | `docs/progress/decisions.md` |

---

## 라이선스

MIT
