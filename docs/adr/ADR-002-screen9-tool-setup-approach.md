---
id: ADR-002
date: 2026-04-05
status: accepted
supersedes: ~
tags: [kickoff, screen9, integrations, architecture]
---

# ADR-002 — Screen 9 도구 세팅 구현 방식

## 컨텍스트

킥오프 플로우의 Screen 9 (협업 도구 세팅)는 GitHub/Slack/Notion 등 외부 도구 연동 OAuth 처리, AI 파일 빌더, Git 온보딩 튜토리얼을 포함하는 복합 화면이다.

현재 `apps/web/app/team/[teamId]/kickoff/` 내에 tool-setup 페이지가 존재하지 않으며, 킥오프 플로우가 `architecture → summary`로 직접 연결되어 있다. Screen 9를 별도 페이지로 먼저 구현할지, 아니면 다른 방식으로 접근할지 결정이 필요하다.

## 고려한 옵션

| 옵션 | 장점 | 단점 |
|------|------|------|
| A. Screen 9 별도 페이지 신규 구현 | 스펙 충실, 명확한 화면 경계 | 구현 범위 크고 시간 소요, 아직 integrations 모델 없음 |
| B. integrations 모델만 먼저 + Screen 10 흡수 | 진짜 블로커(도메인 모델) 먼저 해결, 빠른 진행 | Screen 9 UI는 나중에 분리 필요 |
| C. Screen 10 finalize 시 최소 연동 정보만 수집 | 가장 빠름 | 도구 세팅 UX 완전히 생략됨 |

## 결정

**채택: 옵션 B — `integrations` DB 테이블 + Screen 10으로 흡수**

진짜 블로커는 화면 UI가 아니라 **연동 상태를 저장할 도메인 모델의 부재**다.

- `integrations` Prisma 모델 먼저 생성
- GitHub/Slack 연결 처리를 Screen 10 내에서 수행 (간소화된 토글 형태)
- Screen 9는 추후 팀 설정 화면(Phase 5+)으로 분리 가능

## 결과

**긍정적:**
- Phase 5 (방향 추적, 변경 관리)의 전제인 GitHub webhook 등록 가능
- Screen 10 + integrations 모델만으로 Meeting Hub auto-import 기반 마련

**부정적/트레이드오프:**
- Screen 9 AI 파일 빌더 (CONTRIBUTING.md 등) 미구현 상태 지속
- Git 온보딩 튜토리얼 미제공

**중립적:**
- Screen 9를 별도로 만들 경우 `integrations` 모델은 어차피 필요하므로 이 결정으로 인한 기술 부채 없음

## 구현 주의사항

**`integrations` 테이블 필수 필드:**
```sql
CREATE TABLE integrations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       UUID REFERENCES teams(id),
  provider      VARCHAR(20) NOT NULL,  -- 'github' | 'slack' | 'notion'
  access_token  TEXT NOT NULL,          -- 반드시 암호화 저장
  refresh_token TEXT,
  scopes        TEXT[],
  token_expires TIMESTAMPTZ,
  status        VARCHAR(20) DEFAULT 'active',
  metadata      JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

- `access_token`은 평문 저장 금지. AES-256-GCM 또는 Prisma 레벨 암호화 필수.
- Screen 10에서 GitHub 연결 시 `integrations` 레코드 생성 후 webhook 등록 순서 보장.

---

*결정자: Claude Code + Codex 검토*
*관련 KF 키: KF-002*
*다음 구현: `apps/api/prisma/schema.prisma` integrations 모델 추가*
