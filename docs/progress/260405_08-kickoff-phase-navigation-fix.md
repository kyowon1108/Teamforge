---
date: 2026-04-05
seq: 08
area: frontend, backend
screens: [7, 8]
tags: [navigation, phase-guard, ux, error-flow, revert]
decision_keys: [KF-014, KF-015]
---

# 260405_08 — 킥오프 phase 네비게이션 버그 수정 (back 버튼 error flow 제거)

## 한 줄 요약

아키텍처 설계 페이지에서 뒤로가기 클릭 시 topic 페이지에서 400 에러가 발생하던 문제를 해결했다. topic 페이지에 phase guard를 추가하고, 리더가 주제를 재설정할 수 있는 revert 기능을 구현했다.

---

## 이번에 본 사실

- `apps/web/app/team/[teamId]/kickoff/architecture/page.tsx:435`: back 버튼이 `/kickoff/topic`으로 하드코딩
- `apps/web/app/team/[teamId]/kickoff/topic/page.tsx`: phase 체크 없음 → phase=`architecture`여도 렌더링됨
- `apps/api/src/modules/kickoff/kickoff.service.ts`: `topic/direct`, `topic/confirm`, `chat(topic_brainstorm)` 모두 `_assertPhase(["topic_decision"])` guard → architecture 단계에서 접근 시 400
- Codex Q2 확인: summary 단계에서 revert 막는 것이 옳음 (`_assertPhase(["architecture"])`로 자연 처리)
- Codex Q3: soft-delete 권장이나 DB 스키마 변경 필요 → future improvement

---

## 결정사항

| 결정 키 | 채택 | 이유 | 대안 | 영향 |
|---------|------|------|------|------|
| KF-014 | topic 페이지 phase guard + read-only view | URL보다 session phase가 진실. 잘못된 단계 접근 시 명확한 안내 필요 | topic 진입 즉시 architecture bounce | `topic/page.tsx` |
| KF-015 | revert-to-topic은 architecture 단계에서만 허용 | summary 이후는 의사결정 확정 상태. 되돌리면 파생 데이터 정합성 비용 큼 | summary에서도 허용 | `kickoff.service.ts`, `kickoff.controller.ts` |

---

## 구현 상세

### 1. Backend — `revertToTopicPhase(userId, teamId)` 신규 메서드

```typescript
async revertToTopicPhase(userId: string, teamId: string) {
  await this.verifyLeader(userId, teamId);
  const session = await this.getSession(teamId);
  this._assertPhase(session, ["architecture"]); // summary에서는 자동 차단

  // 마지막 topic_brainstorm mermaid 복원
  const lastBrainstormMermaid = await this.prisma.kickoffMessage.findFirst({
    where: { sessionId: session.id, phase: "topic_brainstorm", mermaidCode: { not: null } },
    orderBy: { createdAt: "desc" }, select: { mermaidCode: true },
  });

  await this.prisma.$transaction([
    this.prisma.kickoffMessage.deleteMany({ where: { sessionId: session.id, phase: "architecture" } }),
    this.prisma.kickoffSession.update({
      where: { id: session.id },
      data: { phase: "topic_decision", architecture: Prisma.JsonNull, mermaidDiagram: lastBrainstormMermaid?.mermaidCode ?? null },
    }),
  ]);

  this.realtime.emitToTeam(teamId, "kickoff:phase_changed", { phase: "topic_decision" });
  return { reverted: true, phase: "topic_decision" };
}
```

### 2. Backend — `POST /kickoff/:teamId/revert-to-topic` 엔드포인트 추가

컨트롤러에 신규 endpoint. 리더만 접근 가능 (verifyLeader 내부 호출).

### 3. Frontend — `topic/page.tsx` phase guard

마운트 시 `GET /kickoff/:teamId`로 phase 확인. phase ≠ `topic_decision`이면 locked view 표시:

- **결정된 주제 카드** (title + description read-only)
- **"아키텍처 설계로 이동"** 버튼 (phase=architecture일 때)
- **"킥오프 요약으로 이동"** 버튼 (phase=summary일 때)
- **"주제 변경하기"** 버튼 (리더만, architecture 단계만) → 확인 다이얼로그 → `revertToTopicPhase` 호출
- **"대시보드로 돌아가기"** 버튼

상태:
```typescript
const [sessionPhase, setSessionPhase] = useState<string | null>(null);
const [lockedTopic, setLockedTopic] = useState<{ title: string; description: string } | null>(null);
const [showRevertConfirm, setShowRevertConfirm] = useState(false);
const [reverting, setReverting] = useState(false);
```

### 4. Frontend — `architecture/page.tsx` 리얼타임 핸들러 추가

```typescript
} else if (event.type === "kickoff:phase_changed" && event.phase === "topic_decision") {
  // 리더가 주제 단계로 되돌림 — 멤버들도 이동
  router.push(`/team/${teamId}/kickoff/topic`);
}
```

---

## 전체 error flow 수정 결과

| 시나리오 | 수정 전 | 수정 후 |
|---------|--------|--------|
| architecture → back 클릭 | topic 페이지에서 400 에러 | topic 페이지 read-only view + 명확한 CTA |
| phase=architecture 상태에서 topic 직접 URL 접근 | 빈 form 표시, 제출 시 400 | read-only view + forward 버튼 |
| 리더가 주제 변경 원할 때 | 불가능 (에러만 남) | "주제 변경" → 확인 → revert → topic_decision 단계로 복귀 |
| summary 단계에서 topic으로 이동 시도 | 에러 | read-only view, 되돌리기 버튼 없음 (summary로 이동 버튼만) |
| 멤버가 architecture 페이지 보다가 리더가 revert | 기존 상태 유지 (불일치) | `phase_changed` 이벤트 수신 → topic 페이지로 자동 redirect |

---

## 보류/미구현

| 항목 | 왜 미룸 | 재개 조건 |
|------|---------|----------|
| architecture 채팅 soft-delete | DB 스키마 변경(deletedAt 컬럼) 필요 | Codex 권장, 추후 KickoffMessage 테이블 마이그레이션 시 |
| summary → architecture revert | 합의/서명 상태 정합성 비용 큼 | 명시적 요구사항 발생 시 별도 설계 |

---

## 다음 시작점 (Next Start)

**다음 작업:** Screen 7/8 실사용 E2E 검증

시작 파일:
- `apps/web/app/team/[teamId]/kickoff/topic/page.tsx` — phase guard locked view 모바일 레이아웃 확인
- `apps/api/src/modules/kickoff/kickoff.service.ts:revertToTopicPhase` — $transaction 에러 케이스 테스트

Open Questions:
- architecture 채팅 메시지 하드 삭제 → revert 직후 재시드가 즉시 실행되는가? (seeding useEffect deps 확인 필요)

---

## 참조 소스

- 수정 파일: `apps/api/src/modules/kickoff/kickoff.service.ts`, `apps/api/src/modules/kickoff/kickoff.controller.ts`, `apps/web/app/team/[teamId]/kickoff/topic/page.tsx`, `apps/web/app/team/[teamId]/kickoff/architecture/page.tsx`
- Codex 검토: a821b4891a5835a83
- 스펙: `docs/product/screen-flow.md` §Phase 네비게이션
