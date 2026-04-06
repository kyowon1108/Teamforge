# TeamForge — AI Agent 설계 문서

> 상태: 개념 설계 문서
> 구현 기준: 실제 저장소 경계와 실행 기준은 `docs/architecture/repo-structure.md`, `docs/product/system-spec.md`, `docs/api/implementation-supplement-v1.0.md`를 우선한다.
> 참고: 이 문서에는 리서치 단계의 FastAPI 중심 표현이 남아 있다. 현재 저장소의 구현 기준은 NestJS BFF 우선이며, Python AI 런타임은 추후 분리 대상이다.

> 기본 모델: `gpt-4o-mini` (비용 효율)
> 업그레이드 대상: 복잡한 추론이 필요한 에이전트는 차후 `gpt-4o` 또는 `claude-sonnet`으로 전환
> 호출 방식: FastAPI 백엔드에서 OpenAI API 호출 → 결과를 DB 저장 → 프론트에 반환

---

# 1. AI 개입 지점 전체 맵

| Screen | Agent 이름 | 호출 방식 | 사용자 경험 | 모델 우선순위 |
|--------|-----------|----------|------------|-------------|
| 4 | Parsing Agent | 백엔드 비동기 | 로딩 → 결과 표시 | 4o-mini (충분) |
| 5 | Role Insight Agent | 백엔드 동기 | 즉시 결과 | 4o-mini |
| 6 | Team Insight Agent | 백엔드 동기 | 대시보드 로드 시 | 4o-mini |
| 7 | Topic Agent | **채팅 UI** | 대화형 브레인스톰 | 4o-mini → 4o 검토 |
| 8-A | Structure Agent | 백엔드 동기 | 제안 → 반응 | 4o-mini → 4o 검토 |
| 8-B | Stack Agent | 백엔드 동기 | 제안 → 반응 | 4o-mini |
| 9 | Collab File Agent | 백엔드 비동기 | 생성 → 미리보기 | 4o-mini (충분) |
| 10 | Contract Agent | 백엔드 비동기 | 생성 → 확인 | 4o-mini → 4o 검토 |
| 11 | Meeting Agent | **채팅 UI** | 실시간 요약 | 4o-mini |

**호출 방식 구분:**
- **백엔드 동기**: 프론트가 API 호출 → FastAPI가 OpenAI 호출 → 결과 즉시 반환 (2~5초)
- **백엔드 비동기**: 프론트가 API 호출 → FastAPI가 백그라운드 태스크로 OpenAI 호출 → 완료 시 WebSocket/폴링으로 알림 (5~30초)
- **채팅 UI**: 프론트에 채팅 인터페이스 → 사용자 입력마다 FastAPI → OpenAI 스트리밍 응답

---

# 2. Screen 4 — Parsing Agent

## 역할
이력서 PDF 또는 GitHub URL에서 기술 정보를 추출하여 설문을 보강한다.

## 호출 방식: 백엔드 비동기

```
[사용자가 PDF 업로드 or GitHub URL 입력]
  → 프론트: POST /api/teams/:teamId/survey/enrich
  → FastAPI: 백그라운드 태스크 시작
    → PDF: PyPDF2로 텍스트 추출 → OpenAI에 전달
    → GitHub: GitHub API로 repo/language 데이터 수집 → OpenAI에 전달
  → OpenAI 응답 → DB 저장
  → WebSocket으로 프론트에 "보강 완료" 알림
  → 프론트: 추출된 태그를 설문 폼에 프리필 (사용자가 확인/수정)
```

## DB 저장

```sql
-- survey_responses 테이블의 answers JSONB에 병합
UPDATE survey_responses
SET answers = answers || jsonb_build_object(
    'ai_extracted_skills', '["python", "fastapi", "postgresql"]'::jsonb,
    'ai_extracted_projects', '[{"name": "...", "role": "backend"}]'::jsonb,
    'ai_source', 'resume_pdf',  -- 또는 'github'
    'ai_enriched_at', now()
)
WHERE member_id = :member_id;
```

저장되는 JSONB 구조:
```json
{
  "ai_extracted_skills": ["python", "fastapi", "react", "postgresql"],
  "ai_extracted_experience_level": "intermediate",
  "ai_extracted_projects": [
    {
      "name": "쇼핑몰 API",
      "role": "backend",
      "tech": ["django", "mysql"],
      "duration_months": 3
    }
  ],
  "ai_source": "resume_pdf",
  "ai_raw_response": "...(원본 응답 보관, 디버깅용)",
  "ai_enriched_at": "2026-04-06T12:00:00Z"
}
```

## 프롬프트 설계

### 이력서 파싱 프롬프트

```python
RESUME_PARSE_SYSTEM = """
당신은 소프트웨어 개발 팀 프로젝트를 위한 역량 분석 도우미입니다.
주어진 이력서 텍스트에서 기술 정보만 정확하게 추출하세요.

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.

{
  "skills": ["기술명1", "기술명2"],
  "experience_level": "beginner" | "intermediate" | "advanced",
  "projects": [
    {
      "name": "프로젝트명",
      "role": "backend" | "frontend" | "fullstack" | "data" | "devops" | "design" | "pm",
      "tech": ["사용 기술"],
      "duration_months": 숫자
    }
  ],
  "git_level": "none" | "commit_only" | "branch_merge" | "pr_review"
}

규칙:
- skills는 프로그래밍 언어, 프레임워크, 도구만 포함 (소프트 스킬 제외)
- 확실하지 않은 정보는 포함하지 말 것
- 프로젝트가 없으면 빈 배열
- experience_level은 프로젝트 수와 기간으로 판단:
  - 0~1개: beginner
  - 2~4개: intermediate
  - 5개 이상: advanced
"""

RESUME_PARSE_USER = """
아래 이력서에서 기술 정보를 추출하세요.

---
{resume_text}
---
"""
```

### GitHub 분석 프롬프트

```python
GITHUB_ANALYZE_SYSTEM = """
당신은 GitHub 프로필 데이터를 분석하여 개발 역량을 평가하는 도우미입니다.
주어진 데이터에서 기술 정보를 추출하세요.

반드시 아래 JSON 형식으로만 응답하세요.

{
  "primary_languages": ["언어1", "언어2"],
  "frameworks_detected": ["프레임워크1"],
  "contribution_level": "low" | "medium" | "high",
  "collaboration_indicators": {
    "has_pr_experience": true/false,
    "has_code_review": true/false,
    "has_ci_cd": true/false
  }
}

규칙:
- primary_languages: 커밋 비율 10% 이상인 언어만
- contribution_level: total commits 기준
  - ~50: low, 51~200: medium, 201+: high
- collaboration_indicators: repo 설정과 PR 이력 기반으로 판단
"""

GITHUB_ANALYZE_USER = """
GitHub 사용자 데이터:

언어 분포: {languages}
공개 레포 수: {public_repos}
총 커밋 수 (최근 1년): {total_commits}
PR 생성 수: {pr_count}
최근 활동 레포: {recent_repos}
"""
```

### 왜 4o-mini로 충분한가
- 구조화된 텍스트에서 키워드 추출은 단순 작업
- JSON 포맷 강제 출력은 4o-mini가 안정적으로 수행
- 추론이 필요 없고, 패턴 매칭에 가까움

---

# 3. Screen 5 — Role Insight Agent

## 역할
개인의 skill_vector를 기반으로 추천 역할과 강점/성장 포인트를 생성한다.

## 호출 방식: 백엔드 동기

```
[Screen 4 설문 제출 완료]
  → FastAPI: skill_vector 계산 (규칙 기반, AI 아님)
  → FastAPI: OpenAI 호출 (역할 추천 + 설명 생성)
  → DB 저장
  → 프론트: Screen 5 로드 시 결과 표시
```

## skill_vector 계산 (규칙 기반, AI 아님)

```python
def calculate_skill_vector(answers: dict) -> dict:
    """설문 답변을 6차원 벡터로 변환. AI가 아닌 규칙 기반."""
    
    # 기술 태그 → 카테고리 매핑
    CATEGORY_MAP = {
        "backend": ["python", "java", "fastapi", "django", "spring", "nestjs", "express"],
        "frontend": ["react", "vue", "next.js", "html", "css", "typescript"],
        "database": ["postgresql", "mysql", "mongodb", "redis", "sql"],
        "devops": ["docker", "kubernetes", "aws", "gcp", "ci/cd", "github-actions"],
        "design": ["figma", "sketch", "css", "tailwind", "ui/ux"],
        "ai_ml": ["tensorflow", "pytorch", "pandas", "numpy", "scikit-learn"]
    }
    
    vector = {}
    selected_skills = answers.get("languages", []) + answers.get("frameworks", [])
    proficiency = answers.get("proficiency", {})
    
    for category, techs in CATEGORY_MAP.items():
        matched = [s for s in selected_skills if s.lower() in techs]
        if not matched:
            vector[category] = 0.0
            continue
        
        # 해당 카테고리의 평균 숙련도
        scores = [proficiency.get(s, 2) for s in matched]
        base = sum(scores) / len(scores)  # 1~5
        
        # 프로젝트 경험 보너스
        project_count = {"0": 0, "1-2": 0.3, "3-5": 0.6, "6+": 1.0}
        bonus = project_count.get(answers.get("project_count", "0"), 0)
        
        vector[category] = round(min(base + bonus, 5.0), 1)
    
    return vector
```

## AI 호출: 역할 추천 설명 생성

```python
ROLE_INSIGHT_SYSTEM = """
당신은 소프트웨어 개발 팀의 역할 배치를 돕는 코치입니다.
주어진 스킬 벡터와 설문 정보를 바탕으로 추천 역할과 설명을 생성하세요.

반드시 아래 JSON 형식으로만 응답하세요.

{
  "recommended_roles": [
    {
      "role": "역할명 (예: Backend Lead, Frontend Developer, PM/Coordinator)",
      "confidence": 0.0~1.0,
      "reason": "이 역할을 추천하는 구체적 근거 (한국어, 2문장)"
    }
  ],
  "strengths": ["강점1 (한국어, 1문장)", "강점2"],
  "growth_areas": ["성장 포인트1 (한국어, 1문장)", "성장 포인트2"]
}

규칙:
- recommended_roles는 최대 2개
- confidence는 스킬 벡터의 해당 영역 점수 기반
- 강점은 벡터에서 3.0 이상인 영역 기반
- 성장 포인트는 벡터에서 2.0 이하인 영역 기반
- 학부생 눈높이에 맞는 친근한 톤
- 부정적 표현 대신 성장 관점으로 표현
  (예: "DB가 약합니다" → "DB 경험을 쌓으면 풀스택으로 성장할 수 있어요")
"""

ROLE_INSIGHT_USER = """
스킬 벡터:
{skill_vector}

설문 정보:
- 경험 수준: {experience_level}
- Git 수준: {git_level}
- 선호 협업 스타일: {collab_style}
- 주간 가용 시간: {available_hours}시간
- 최근 프로젝트 역할: {recent_roles}
"""
```

## DB 저장

```sql
INSERT INTO skill_profiles (member_id, skill_vector, recommended_roles, strengths, growth_areas)
VALUES (
    :member_id,
    :skill_vector,      -- {"backend": 4.2, "frontend": 2.8, ...}
    :recommended_roles, -- [{"role": "Backend Lead", "confidence": 0.85, "reason": "..."}]
    :strengths,         -- ["API/DB 경험이 일관되게 확인됨", ...]
    :growth_areas       -- ["DevOps는 보조 수준에서 시작하는 것을 권장해요", ...]
);
```

---

# 4. Screen 6 — Team Insight Agent

## 역할
전체 팀원의 skill_vector를 집계하여 팀 수준의 분석을 제공한다.

## 호출 방식: 백엔드 동기

```
[Dashboard 로드 시, 모든 멤버 프로필이 있으면]
  → FastAPI: 전체 팀원 skill_vector 집계
  → FastAPI: OpenAI 호출 (팀 분석 + 역할 배치 제안)
  → DB 저장 (team readiness에 캐시)
  → 프론트: Dashboard에 표시
```

## 프롬프트 설계

```python
TEAM_INSIGHT_SYSTEM = """
당신은 소프트웨어 개발 팀의 구성을 분석하는 코치입니다.
팀원들의 스킬 벡터와 개인 정보를 기반으로 팀 수준의 분석을 제공하세요.

반드시 아래 JSON 형식으로만 응답하세요.

{
  "team_skill_summary": {
    "strongest_areas": ["영역1", "영역2"],
    "weakest_areas": ["영역1"],
    "overall_level": "beginner" | "intermediate" | "advanced"
  },
  "role_assignments": [
    {
      "member_name": "이름",
      "suggested_role": "역할명",
      "fit_score": 0.0~1.0,
      "reason": "배치 근거 (1문장)"
    }
  ],
  "team_risks": ["위험 요소 (예: 프론트엔드 경험자가 없음)"],
  "recommendations": ["팀 운영 제안 (예: DB 경험자가 API도 겸임 가능)"]
}

규칙:
- role_assignments에서 한 사람에게 여러 역할을 주지 말 것
- 역할이 겹칠 경우 fit_score가 높은 사람에게 우선 배정
- team_risks는 벡터 평균이 1.5 이하인 영역 기반
- 4~5명 팀 기준으로 현실적인 역할 분배
  (예: 5명 팀에 PM, Backend, Frontend, Fullstack, DB/Infra)
"""

TEAM_INSIGHT_USER = """
팀원 정보:

{members_json}

예시:
[
  {
    "name": "김팀장",
    "skill_vector": {"backend": 4.2, "frontend": 2.8, "database": 3.9, ...},
    "experience_level": "intermediate",
    "git_level": "pr_review",
    "available_hours": 25,
    "role_reaction": "accept"  // Screen 5에서의 반응
  },
  ...
]
"""
```

## DB 저장

```sql
-- teams 테이블에 readiness 캐시
UPDATE teams
SET readiness_data = :readiness_json,
    readiness_calculated_at = now()
WHERE id = :team_id;
```

readiness_data JSONB:
```json
{
  "team_skill_summary": { ... },
  "role_assignments": [ ... ],
  "team_risks": [ ... ],
  "recommendations": [ ... ],
  "survey_completion_rate": 0.8,
  "calculated_at": "2026-04-06T12:00:00Z"
}
```

---

# 5. Screen 7 — Topic Agent ⭐ 채팅 UI

## 역할
팀의 역량을 기반으로 프로젝트 주제를 브레인스톰하고, 구조화된 프로젝트 브리프를 생성한다.

## 호출 방식: 채팅 UI (스트리밍)

이 Agent만 사용자와 직접 대화한다.
나머지 Agent는 모두 백엔드에서 1회 호출 → 결과 반환 구조이지만,
Topic Agent는 여러 턴의 대화를 통해 주제를 좁혀나간다.

```
[사용자가 채팅 입력]
  → 프론트: POST /api/teams/:teamId/topic/chat (스트리밍)
  → FastAPI: 대화 히스토리 + 팀 컨텍스트를 포함하여 OpenAI 호출
  → 스트리밍 응답 → 프론트에 실시간 표시
  → 대화 종료 시: 후보 확정 → DB 저장
```

## 채팅 구현 구조

```python
# FastAPI 엔드포인트
@router.post("/teams/{team_id}/topic/chat")
async def topic_chat(
    team_id: str,
    request: TopicChatRequest,  # {"message": "...", "conversation_id": "..."}
    db: AsyncSession = Depends(get_db)
):
    # 1. 팀 컨텍스트 로드
    team_context = await get_team_context(db, team_id)
    
    # 2. 대화 히스토리 로드
    history = await get_conversation_history(db, request.conversation_id)
    
    # 3. 시스템 프롬프트 + 히스토리 + 새 메시지 조합
    messages = build_topic_messages(team_context, history, request.message)
    
    # 4. 스트리밍 응답
    return StreamingResponse(
        stream_openai_response(messages),
        media_type="text/event-stream"
    )
```

## 대화 히스토리 DB 저장

```sql
-- 새 테이블: topic_conversations
CREATE TABLE topic_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE topic_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES topic_conversations(id),
    role VARCHAR(20) NOT NULL,     -- 'system' | 'user' | 'assistant'
    content TEXT NOT NULL,
    message_type VARCHAR(20),      -- 'chat' | 'candidate_proposal' | 'brief_generation'
    metadata JSONB,                -- 후보 제안 시 구조화 데이터
    created_at TIMESTAMPTZ DEFAULT now()
);
```

message_type별 metadata 예시:
```json
// message_type: "candidate_proposal"
{
  "candidates": [
    {
      "id": "c1",
      "title": "팀 협업 자동화 도구",
      "platform": "web",
      "features": ["스킬 분석", "킥오프 계약"],
      "complexity": "medium",
      "team_fit_reason": "백엔드/DB에 강한 팀 구성에 적합"
    }
  ]
}

// message_type: "brief_generation"
{
  "brief": {
    "title": "팀 협업 자동화 도구",
    "platform": "web",
    "core_features": [...],
    "out_of_scope": [...],
    "complexity": "medium",
    "estimated_duration": "6주"
  }
}
```

## 프롬프트 설계

```python
TOPIC_AGENT_SYSTEM = """
당신은 소프트웨어 개발 팀의 프로젝트 주제를 함께 결정하는 브레인스톰 파트너입니다.

## 당신의 역할
- 팀의 기술 역량에 맞는 프로젝트 주제를 제안하고 토론합니다
- 사용자의 아이디어를 구체화하고 실현 가능성을 평가합니다
- 최종적으로 구조화된 프로젝트 브리프를 생성합니다

## 팀 컨텍스트
{team_context}

## 대화 규칙
1. 처음에는 팀의 관심사를 물어보세요
2. 아이디어가 나오면 팀 역량 기준으로 실현 가능성을 평가하세요
3. 후보가 2~3개 모이면 각각의 장단점을 정리하세요
4. 사용자가 선택하면 프로젝트 브리프를 생성하세요

## 후보 제안 시
후보를 제안할 때는 반드시 아래 형식을 포함하세요:

---CANDIDATES---
[JSON 형식의 후보 배열]
---END---

## 브리프 생성 시
최종 브리프를 만들 때는 반드시 아래 형식을 포함하세요:

---BRIEF---
[JSON 형식의 브리프]
---END---

## 톤
- 학부생 눈높이에 맞는 친근한 톤
- 기술적으로 과한 제안 금지 (6주 안에 가능한 범위)
- "이건 어려울 수 있어요" 대신 "이건 도전적이지만, 이렇게 줄이면 가능해요"
"""
```

```python
# team_context 생성 함수
def build_team_context(team_data: dict) -> str:
    return f"""
팀 이름: {team_data['name']}
팀 인원: {team_data['member_count']}명
팀 전체 스킬 분포:
  - Backend: {team_data['avg_skills']['backend']}/5
  - Frontend: {team_data['avg_skills']['frontend']}/5
  - Database: {team_data['avg_skills']['database']}/5
  - DevOps: {team_data['avg_skills']['devops']}/5
  - Design: {team_data['avg_skills']['design']}/5
  - AI/ML: {team_data['avg_skills']['ai_ml']}/5
팀 강점: {', '.join(team_data['strongest_areas'])}
팀 약점: {', '.join(team_data['weakest_areas'])}
팀 전체 수준: {team_data['overall_level']}
"""
```

## 프론트에서 후보/브리프 파싱

```typescript
// AI 응답에서 구조화 데이터 추출
function parseTopicResponse(text: string) {
  const candidateMatch = text.match(/---CANDIDATES---\n([\s\S]*?)\n---END---/);
  const briefMatch = text.match(/---BRIEF---\n([\s\S]*?)\n---END---/);
  
  return {
    chatText: text
      .replace(/---CANDIDATES---[\s\S]*?---END---/, '')
      .replace(/---BRIEF---[\s\S]*?---END---/, '')
      .trim(),
    candidates: candidateMatch ? JSON.parse(candidateMatch[1]) : null,
    brief: briefMatch ? JSON.parse(briefMatch[1]) : null,
  };
}
```

## 모델 업그레이드 기준
- 4o-mini로 시작: 대부분의 브레인스톰 대화는 충분
- 4o로 업그레이드 고려: 복잡한 기술 제약 조건이 있는 주제 (예: "실시간 + AI + 모바일")
- 판단 기준: 후보 제안의 실현 가능성 정확도가 70% 이하일 때

---

# 6. Screen 8-A — Structure Inference Agent

## 역할
확정된 프로젝트 브리프를 기반으로 서비스 구조 블록을 제안한다.

## 호출 방식: 백엔드 동기

```
[Topic 확정 직후 자동 호출]
  → FastAPI: project_brief + team_skill_summary 로드
  → OpenAI 1회 호출
  → 결과 → structure_blocks 테이블에 저장
  → 프론트: Screen 8-A 로드 시 표시
```

## 프롬프트 설계

```python
STRUCTURE_AGENT_SYSTEM = """
당신은 소프트웨어 아키텍트입니다.
주어진 프로젝트 브리프와 팀 역량을 기반으로 필요한 시스템 구성요소를 제안하세요.

반드시 아래 JSON 형식으로만 응답하세요.

{
  "blocks": [
    {
      "name": "블록명 (예: Client UI, API Server, Database)",
      "category": "required" | "optional" | "skip",
      "reason": "이 블록이 필요한/불필요한 이유 (1문장)",
      "description": "이 블록이 하는 일 (비개발자도 이해할 수 있게, 1문장)"
    }
  ],
  "architecture_summary": "전체 구조를 한 문장으로 요약",
  "diagram_description": "User → Client UI → API Server → Database 형태의 흐름 설명"
}

규칙:
- 블록 수는 4~8개 (학부 프로젝트 규모)
- 다음 블록을 기본 후보로 항상 고려:
  Client UI, API Server, Database, Authentication,
  File Storage, Realtime, Admin Panel, External API, Cache
- required: 이 서비스에 반드시 필요
- optional: 있으면 좋지만 없어도 MVP 가능
- skip: 이 서비스에는 불필요
- 팀 역량이 부족한 영역의 블록은 optional로 낮추거나 skip 사유 설명
- description은 "DB가 뭔지 모르는 사람"도 이해할 수 있는 수준
"""

STRUCTURE_AGENT_USER = """
프로젝트 브리프:
- 제목: {title}
- 플랫폼: {platform}
- 핵심 기능: {features}
- 복잡도: {complexity}

팀 역량:
- 강점: {strongest_areas}
- 약점: {weakest_areas}
- 전체 수준: {overall_level}
- 인원: {member_count}명
"""
```

## DB 저장

```sql
-- 각 블록을 개별 row로 저장
INSERT INTO structure_blocks (team_id, block_name, category, reason, description, status)
VALUES
    (:team_id, 'Client UI', 'required', '...', '...', 'proposed'),
    (:team_id, 'API Server', 'required', '...', '...', 'proposed'),
    (:team_id, 'Database', 'required', '...', '...', 'proposed');

-- 전체 구조 메타데이터는 teams 테이블에
UPDATE teams
SET structure_metadata = :metadata_json
WHERE id = :team_id;
```

structure_metadata JSONB:
```json
{
  "architecture_summary": "사용자 → 웹 UI → REST API → PostgreSQL 구조",
  "diagram_description": "User → Next.js Client → FastAPI Server → PostgreSQL",
  "generated_at": "2026-04-06T12:00:00Z",
  "ai_model": "gpt-4o-mini"
}
```

---

# 7. Screen 8-B — Stack Recommendation Agent

## 역할
승인된 구조 블록에 맞는 기술 스택을 추천한다.

## 호출 방식: 백엔드 동기

```
[구조 확정 직후 자동 호출]
  → FastAPI: accepted_blocks + team_skill_summary 로드
  → OpenAI 1회 호출
  → 결과 → stack_selections 테이블에 저장
  → 프론트: Screen 8-B 로드 시 표시
```

## 프롬프트 설계

```python
STACK_AGENT_SYSTEM = """
당신은 학부생 팀 프로젝트의 기술 스택을 추천하는 멘토입니다.
승인된 시스템 블록과 팀 역량을 기반으로 기술 조합을 추천하세요.

반드시 아래 JSON 형식으로만 응답하세요.

{
  "recommended_stack": [
    {
      "block_name": "승인된 블록명",
      "technology": "추천 기술 (예: Next.js, FastAPI, PostgreSQL)",
      "alternatives": ["대안1", "대안2"],
      "reason": "이 기술을 추천하는 이유 (1문장)",
      "learning_curve": "low" | "medium" | "high",
      "team_fit": 0.0~1.0
    }
  ],
  "overall_rationale": "이 조합을 추천하는 전체적인 이유 (2문장)",
  "warnings": ["주의사항 (예: NextAuth 설정이 처음이면 시간이 걸릴 수 있어요)"]
}

규칙:
- 팀 skill_vector에서 해당 영역 점수가 3.0 이상이면 해당 기술 우선
- 팀 전체 수준이 beginner면 learning_curve가 low인 기술 우선
- 학부 프로젝트 6주 기준으로 현실적인 조합만 추천
- 유행하는 기술보다 문서가 풍부하고 커뮤니티가 큰 기술 우선
- alternatives는 항상 1~2개 포함
- warnings는 실제로 학부생이 자주 막히는 포인트 기반
"""

STACK_AGENT_USER = """
승인된 시스템 블록:
{accepted_blocks_json}

팀 스킬 벡터 (팀 평균):
{team_avg_skills}

팀원별 주요 기술:
{member_skills_summary}

팀 수준: {overall_level}
"""
```

## DB 저장

```sql
INSERT INTO stack_selections (team_id, block_id, technology, rationale, is_confirmed)
VALUES
    (:team_id, :block_id_ui, 'Next.js', '팀의 React 경험 활용', false),
    (:team_id, :block_id_api, 'FastAPI', '파이썬 메인 언어 + 비동기 지원', false),
    (:team_id, :block_id_db, 'PostgreSQL', '복잡 쿼리 + JSONB 지원', false);
```

---

# 8. Screen 9 — Collaboration File Agent

## 역할
확정된 스택과 협업 규칙을 기반으로 GitHub 템플릿/문서를 생성한다.

## 호출 방식: 백엔드 비동기

```
[리더가 "템플릿 생성" 클릭]
  → FastAPI: 백그라운드 태스크
  → OpenAI 여러 번 호출 (파일별 1회씩)
  → 각 파일 → artifacts 테이블에 저장
  → 완료 시 WebSocket 알림
  → 프론트: 미리보기 표시
```

## 생성하는 파일들

| 파일 | 용도 | 프롬프트 복잡도 |
|------|------|--------------|
| README.md | 프로젝트 소개 | 낮음 |
| team-profile.md | 팀원 역할/기술 정리 | 낮음 |
| stack-decisions.md | 기술 선택 근거 | 낮음 |
| CONTRIBUTING-lite.md | 기여 규칙 (경량) | 중간 |
| ISSUE_TEMPLATE/feature.md | 기능 이슈 템플릿 | 낮음 |
| ISSUE_TEMPLATE/bug.md | 버그 이슈 템플릿 | 낮음 |
| PULL_REQUEST_TEMPLATE.md | PR 템플릿 | 낮음 |
| docs/adr/001-initial.md | 초기 아키텍처 결정 | 중간 |

## 프롬프트 설계 (대표: CONTRIBUTING-lite)

```python
CONTRIBUTING_SYSTEM = """
당신은 학부생 팀을 위한 CONTRIBUTING 가이드를 작성하는 도우미입니다.
팀의 협업 규칙과 기술 스택에 맞는 경량 가이드를 Markdown으로 작성하세요.

규칙:
- 학부생이 처음 보고도 따라할 수 있는 수준
- 브랜치 전략: Git Flow 대신 간단한 feature branch 방식
- PR 규칙: 최소한의 체크리스트
- 커밋 메시지: Conventional Commits 간소화 버전
- 전체 길이: 100줄 이내
- 규칙 강도에 따라 조절:
  - relaxed: 최소한의 규칙만 (브랜치 네이밍 + PR 필수)
  - standard: 브랜치 + PR + 커밋 메시지 + 코드 리뷰 1명
  - strict: standard + 테스트 필수 + CI 통과 필수

Markdown 형식으로만 응답하세요. 코드 블록 없이 순수 Markdown입니다.
"""

CONTRIBUTING_USER = """
팀 정보:
- 팀명: {team_name}
- 기술 스택: {selected_stack}
- 규칙 강도: {rule_strength}
- 팀 Git 수준 분포: {git_levels}
- 팀원 수: {member_count}명
"""
```

## DB 저장

```sql
INSERT INTO artifacts (team_id, type, content, status)
VALUES
    (:team_id, 'contributing', :markdown_content, 'generated'),
    (:team_id, 'readme', :markdown_content, 'generated'),
    (:team_id, 'pr_template', :markdown_content, 'generated'),
    (:team_id, 'issue_template_feature', :markdown_content, 'generated'),
    (:team_id, 'issue_template_bug', :markdown_content, 'generated'),
    (:team_id, 'adr_initial', :markdown_content, 'generated');
```

artifacts.content는 TEXT (Markdown 원문 저장).
JSONB가 아닌 이유: 이 데이터는 그대로 파일로 export되므로 원문 보존이 중요.

---

# 9. Screen 10 — Contract / Artifact Agent

## 역할
킥오프 과정의 모든 결정을 요약하고, first issues / first agenda / mini ADR을 생성한다.

## 호출 방식: 백엔드 비동기

이 Agent는 3개의 서브 태스크를 순차 실행한다:

```
[리더가 Batch C "산출물 생성" 클릭]
  → FastAPI: 백그라운드 태스크 시작
  
  (1) First Issues 생성
    → 프로젝트 브리프 + 기술 스택 + 역할 배치 → OpenAI
    → 5~8개 초기 이슈 생성
    
  (2) First Agenda 생성
    → 역할 배치 + 미해결 concern + first issues → OpenAI
    → 첫 회의 안건 3~5개 생성
    
  (3) Mini ADR 생성
    → 구조 블록 + 기술 선택 + rationale → OpenAI
    → 아키텍처 결정 기록 1개 생성
  
  → 모두 artifacts 테이블에 저장
  → WebSocket 알림
```

## 프롬프트 설계

### First Issues

```python
FIRST_ISSUES_SYSTEM = """
당신은 프로젝트 초기 이슈를 만드는 PM 도우미입니다.
팀이 첫 주에 바로 시작할 수 있는 GitHub 이슈를 생성하세요.

반드시 아래 JSON 형식으로만 응답하세요.

{
  "issues": [
    {
      "title": "이슈 제목 (명확한 행동 동사로 시작)",
      "body": "이슈 본문 (Markdown, 목적 + 할 일 체크리스트)",
      "labels": ["enhancement" | "setup" | "docs" | "bug"],
      "assignee_role": "이 이슈를 맡을 역할 (예: Backend Lead)",
      "priority": "high" | "medium" | "low",
      "estimated_hours": 숫자
    }
  ]
}

규칙:
- 이슈 수: 5~8개
- 첫 주(~20시간/인)에 완료 가능한 범위
- 반드시 포함할 이슈:
  1. 프로젝트 초기 세팅 (레포 생성, 의존성 설치)
  2. DB 스키마 초안 설계
  3. API 기본 구조 세팅
  4. UI 기본 레이아웃
- 각 이슈의 body에는 반드시 체크리스트 포함
- assignee_role은 팀 역할 배치 기반으로 배정
- 의존 관계가 있으면 body에 "선행 이슈: #N" 표기
"""

FIRST_ISSUES_USER = """
프로젝트: {project_title}
기술 스택: {selected_stack}
팀원 역할 배치:
{role_assignments_json}
핵심 기능: {core_features}
"""
```

### First Agenda

```python
FIRST_AGENDA_SYSTEM = """
당신은 팀의 첫 회의 안건을 준비하는 PM입니다.
킥오프 계약 내용과 미해결 사항을 기반으로 첫 회의 안건을 만드세요.

반드시 아래 JSON 형식으로만 응답하세요.

{
  "agenda_items": [
    {
      "title": "안건 제목",
      "duration_minutes": 숫자,
      "description": "이 안건에서 결정해야 할 것 (1문장)",
      "owner": "진행 담당 역할",
      "type": "discussion" | "decision" | "update" | "action"
    }
  ],
  "total_duration_minutes": 숫자,
  "pre_meeting_tasks": ["회의 전 준비할 것"]
}

규칙:
- 안건 수: 3~5개
- 총 회의 시간: 30~60분
- 반드시 포함할 안건:
  1. 역할/이슈 최종 확인
  2. 첫 주 작업 분배
  3. 소통 채널/시간 합의
- concern이 있으면 별도 안건으로 포함
"""

FIRST_AGENDA_USER = """
팀: {team_name}
역할 배치: {role_assignments}
미해결 concern: {unresolved_concerns}
첫 이슈 목록: {first_issues_titles}
"""
```

### Mini ADR

```python
MINI_ADR_SYSTEM = """
당신은 아키텍처 결정 기록(ADR)을 작성하는 도우미입니다.
팀의 기술 선택을 ADR 형식으로 문서화하세요.

Markdown 형식으로 응답하세요.

형식:
# ADR-001: {제목}

## Status
Accepted

## Context
{왜 이 결정이 필요했는지 2~3문장}

## Decision
{무엇을 결정했는지}

## Consequences
### 장점
- ...

### 단점/위험
- ...

### 추후 검토 필요
- ...

규칙:
- 학부생이 읽어도 이해할 수 있는 수준
- 기술 선택의 "왜"에 집중
- 50줄 이내
"""

MINI_ADR_USER = """
프로젝트: {project_title}
선택한 기술 스택:
{stack_with_rationale}

팀이 고려했던 대안:
{alternatives}

팀 수준: {overall_level}
"""
```

## DB 저장

```sql
-- artifacts 테이블에 저장
INSERT INTO artifacts (team_id, type, content, status)
VALUES
    (:team_id, 'first_issues', :issues_json::text, 'generated'),
    (:team_id, 'first_agenda', :agenda_json::text, 'generated'),
    (:team_id, 'mini_adr', :adr_markdown, 'generated');

-- first_issues는 별도 테이블에도 분해 저장 (액션 추적용)
INSERT INTO first_issues (team_id, artifact_id, title, body, labels, assignee_role, priority)
SELECT
    :team_id,
    :artifact_id,
    issue->>'title',
    issue->>'body',
    (issue->>'labels')::jsonb,
    issue->>'assignee_role',
    issue->>'priority'
FROM jsonb_array_elements(:issues_json::jsonb->'issues') AS issue;
```

## 모델 업그레이드 기준
- First Issues / Agenda: 4o-mini 충분 (템플릿 기반 생성)
- Mini ADR: 4o 검토 권장 (기술적 맥락 이해가 중요)

---

# 10. Screen 11 — Meeting Agent ⭐ 채팅 UI

## 역할
회의 기록을 실시간으로 요약하고, 액션 아이템을 추출한다.

## 호출 방식: 채팅 UI (반구조화)

Screen 7과 달리, 이 Agent는 "자유 대화"보다 "구조화된 입력 → 요약" 패턴이다.

```
[리더가 "기록 시작" 클릭]
  → 회의 기록 모드 활성화
  → 사용자가 텍스트로 회의 내용 입력 (자유 형식)
  → "요약" 클릭 시: OpenAI 호출 → 요약 + 액션 아이템 추출
  → DB 저장
```

## 프롬프트 설계

```python
MEETING_SUMMARY_SYSTEM = """
당신은 팀 회의를 요약하고 액션 아이템을 추출하는 비서입니다.

반드시 아래 JSON 형식으로만 응답하세요.

{
  "summary": "회의 핵심 내용 요약 (3~5문장)",
  "decisions": ["결정된 사항1", "결정된 사항2"],
  "action_items": [
    {
      "title": "할 일 제목",
      "assignee_hint": "담당자 이름 또는 역할 (텍스트에서 추론)",
      "deadline_hint": "마감 힌트 (텍스트에서 추론, 없으면 null)",
      "priority": "high" | "medium" | "low"
    }
  ],
  "unresolved": ["아직 결정되지 않은 사항"],
  "next_agenda_suggestions": ["다음 회의에서 다룰 안건 제안"]
}

규칙:
- action_items에서 assignee를 확실히 알 수 없으면 "미정"
- 텍스트에서 명시적으로 언급된 내용만 추출 (추론으로 만들지 말 것)
- summary는 참석하지 않은 사람이 읽어도 맥락을 이해할 수 있게
- unresolved는 "나중에", "다음에", "더 논의" 등의 표현에서 추출
"""

MEETING_SUMMARY_USER = """
회의 안건:
{agenda_json}

회의 기록 (원문):
---
{meeting_notes}
---

팀원 목록:
{member_names_and_roles}
"""
```

## DB 저장

```sql
-- meetings 테이블
INSERT INTO meetings (team_id, agenda, notes, summary)
VALUES (:team_id, :agenda_json, :raw_notes, :summary_text);

-- action_items 테이블
INSERT INTO action_items (meeting_id, title, assignee_id, status, priority)
VALUES
    (:meeting_id, 'API 엔드포인트 설계', :assignee_id, 'open', 'high'),
    (:meeting_id, 'DB 스키마 리뷰', :assignee_id, 'open', 'medium');
```

---

# 11. AI 호출 공통 인프라

## FastAPI에서 OpenAI 호출 패턴

```python
# app/services/ai_service.py

from openai import AsyncOpenAI
import json

client = AsyncOpenAI()

DEFAULT_MODEL = "gpt-4o-mini"

async def call_ai_json(
    system_prompt: str,
    user_prompt: str,
    model: str = DEFAULT_MODEL,
    temperature: float = 0.3,  # 구조화 출력은 낮은 temperature
) -> dict:
    """JSON 응답을 기대하는 AI 호출. 파싱 실패 시 재시도."""
    
    for attempt in range(3):
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=temperature,
            response_format={"type": "json_object"},  # JSON 모드 강제
        )
        
        text = response.choices[0].message.content
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            if attempt == 2:
                raise
            continue


async def stream_ai_chat(
    messages: list[dict],
    model: str = DEFAULT_MODEL,
    temperature: float = 0.7,  # 채팅은 약간 높은 temperature
):
    """스트리밍 채팅 응답. SSE 형식으로 yield."""
    
    stream = await client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        stream=True,
    )
    
    async for chunk in stream:
        if chunk.choices[0].delta.content:
            yield f"data: {json.dumps({'text': chunk.choices[0].delta.content})}\n\n"
    
    yield "data: [DONE]\n\n"
```

## 에러 처리 및 폴백

```python
async def call_ai_with_fallback(
    system_prompt: str,
    user_prompt: str,
    primary_model: str = "gpt-4o-mini",
    fallback_model: str = "gpt-4o-mini",  # 동일 모델로 재시도
) -> dict:
    """AI 호출 실패 시 폴백 처리."""
    
    try:
        return await call_ai_json(system_prompt, user_prompt, model=primary_model)
    except Exception as e:
        # 로깅
        logger.error(f"AI call failed with {primary_model}: {e}")
        
        # Rate limit인 경우 잠시 대기 후 재시도
        if "rate_limit" in str(e).lower():
            await asyncio.sleep(5)
            return await call_ai_json(system_prompt, user_prompt, model=fallback_model)
        
        # 그 외 에러: 사전 정의된 기본값 반환
        return get_default_response(system_prompt)
```

## AI 응답 로깅 (디버깅/개선용)

```sql
CREATE TABLE ai_call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id),
    agent_type VARCHAR(50) NOT NULL,  -- 'parsing', 'role_insight', 'topic_chat', etc.
    model VARCHAR(50) NOT NULL,
    system_prompt TEXT,
    user_prompt TEXT,
    response TEXT,
    tokens_used INTEGER,
    latency_ms INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

이 테이블의 목적:
1. 프롬프트 품질 개선을 위한 데이터 수집
2. 비용 추적 (tokens_used 집계)
3. 모델 업그레이드 판단 근거 (특정 agent의 실패율이 높으면 상위 모델 전환)

---

# 12. 프롬프트 품질 관리 체크리스트

## JSON 출력 안정성

| 기법 | 설명 | 적용 여부 |
|------|------|----------|
| `response_format: json_object` | OpenAI JSON 모드 강제 | ✅ 모든 백엔드 호출 |
| 시스템 프롬프트에 JSON 예시 | 형식 고정 | ✅ 모든 Agent |
| "다른 텍스트는 포함하지 마세요" | 잡담 방지 | ✅ 모든 Agent |
| 3회 재시도 | 파싱 실패 대비 | ✅ |
| Pydantic 검증 | 응답 스키마 검증 | ✅ 권장 |

## 프롬프트 작성 원칙

1. **역할 → 규칙 → 형식 → 입력** 순서로 구성
2. **부정형보다 긍정형**: "X하지 마세요" 대신 "Y만 포함하세요"
3. **구체적 수치 제공**: "적절한 수"가 아니라 "5~8개"
4. **학부생 컨텍스트 명시**: "6주 프로젝트", "4~5명 팀"
5. **톤 명시**: "친근하되 전문적인 톤"

## 비용 추정 (gpt-4o-mini 기준)

| Agent | 호출 횟수/팀 | 입력 토큰 | 출력 토큰 | 비용/팀 |
|-------|------------|----------|----------|--------|
| Parsing | 4~5회 | ~1,000 | ~500 | ~$0.002 |
| Role Insight | 4~5회 | ~800 | ~400 | ~$0.001 |
| Team Insight | 1회 | ~2,000 | ~800 | ~$0.001 |
| Topic Chat | 5~15턴 | ~1,500/턴 | ~500/턴 | ~$0.015 |
| Structure | 1회 | ~1,000 | ~600 | ~$0.001 |
| Stack | 1회 | ~1,200 | ~600 | ~$0.001 |
| Collab Files | 6~8회 | ~800 | ~1,000 | ~$0.005 |
| Contract Artifacts | 3회 | ~1,500 | ~1,000 | ~$0.004 |
| Meeting Summary | 1~3회 | ~2,000 | ~800 | ~$0.003 |
| **합계** | | | | **~$0.03/팀** |

100팀 기준 월 비용: 약 $3 (4o-mini의 가격 효율성)

---

# 13. 모델 업그레이드 의사결정 매트릭스

| 조건 | 현재 모델 | 업그레이드 대상 | 트리거 |
|------|----------|--------------|--------|
| Topic 후보 실현 가능성 부정확 | 4o-mini | gpt-4o | 사용자 피드백 "비현실적" 30%+ |
| Structure 블록 누락 빈번 | 4o-mini | gpt-4o | 팀에서 수동 추가 비율 40%+ |
| ADR 품질 불만 | 4o-mini | gpt-4o | 리더 수정 비율 50%+ |
| First Issues가 너무 추상적 | 4o-mini | gpt-4o | 이슈 재작성 비율 40%+ |
| 전체 AI 비용이 $50/월 초과 | gpt-4o | 4o-mini (재최적화) | 비용 모니터링 |

---

*끝.*
