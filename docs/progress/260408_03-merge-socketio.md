# 260408_03-merge-socketio

## 작업 요약

- 브레인스토밍 아이디어의 multi-parent merge 기능을 전체 스택으로 구현했다. 최대 5개 부모 아이디어를 선택해 하나의 새 아이디어로 합칠 수 있다.
- Socket.io 실시간 동기화 인프라를 도입했다. ADR-004(Screen 11 지연 도입)를 supersede하고, 브레인스토밍 실시간성을 위해 조기 도입을 결정했다.
- `/team` namespace WebSocket 게이트웨이를 구축하고, 30초 유효 ws-token 인증과 멤버십 검증을 적용했다.
- 브레인스토밍(5곳)과 킥오프(3곳)의 기존 HTTP 응답 흐름에 `emitToTeam` 실시간 이벤트를 추가했다.
- FinalizedRoleBadge의 30초 폴링을 소켓 기반으로 전환하고, 클라이언트 전반에 폴링 fallback을 유지했다.

## 구현된 기능

### Multi-parent Build-on Merge

| 파일 | 변경 |
| --- | --- |
| `packages/contracts/src/brainstorm/idea-submit.schema.ts` | `MergeIdeasBodySchema` 추가 |
| `apps/api/src/brainstorm/brainstorm.service.ts` | `mergeIdeas()` 메서드 추가 |
| `apps/api/src/brainstorm/brainstorm.controller.ts` | `POST /ideas/merge` 엔드포인트 |
| `apps/web/components/brainstorm/MergeModal.tsx` | 신규 -- 두 부모 카드 나란히 표시 + 합치기 폼 |
| `apps/web/components/brainstorm/IdeaCard.tsx` | 체크박스 선택 + merge type 표시 |
| `apps/web/components/brainstorm/IdeaCardWall.tsx` | 선택 상태 관리 + 플로팅 합치기 버튼 |

### Socket.io 실시간 동기화

| 파일 | 변경 |
| --- | --- |
| `apps/api/src/gateways/team.gateway.ts` | 신규 -- `/team` namespace, JWT 인증, 멤버십 검증 |
| `apps/api/src/gateways/gateways.module.ts` | 신규 -- 게이트웨이 모듈 등록 |
| `apps/api/src/auth/auth.controller.ts` | `GET /api/auth/ws-token` 추가 (30초 유효) |
| `apps/api/src/brainstorm/brainstorm.service.ts` | 5곳에 `emitToTeam` 추가 |
| `apps/api/src/kickoff/kickoff.service.ts` | 3곳에 `emitToTeam` 추가 |
| `apps/web/lib/socket.ts` | 신규 -- socket.io-client 싱글톤 |
| `apps/web/hooks/useTeamSocket.ts` | 신규 -- WebSocket 훅, 폴링 fallback |
| `apps/web/app/team/[teamId]/topic/brainstorm/brainstorm-client.tsx` | 폴링에서 소켓으로 전환 |
| `apps/web/app/team/[teamId]/topic/topic-client.tsx` | 투표 실시간 반영 |
| `apps/web/components/result/FinalizedRoleBadge.tsx` | 30초 폴링에서 소켓으로 전환 |

### 보안 수정

- `IdeaCard.tsx` comment maxLength 200에서 50으로 수정 (서버 스키마와 일치)
- `team.gateway.ts` `join:team` 이벤트에 PrismaService 주입을 통한 멤버십 검증 추가

## 설계 결정

- `KF-034`: Socket.io 조기 도입. ADR-004를 supersede하고 Screen 11 이전에 도입. 브레인스토밍의 실시간 아이디어 공유가 핵심 UX이기 때문. `/team` namespace, ws-token 인증, `team:teamId` room, 폴링 fallback 구조.
- `KF-035`: Multi-parent merge는 `POST /ideas/merge` 별도 엔드포인트, `type:'merge'`, 최대 5개 부모. Build-on(1:1)과 merge(N:1)를 분리해 API 의미론을 명확히 함.

## 미완료 항목

- 없음. 모든 에이전트 검증 통과.

## 다음 시작 포인트

- Screen 8 `/team/[teamId]/structure` + `/stack` 아키텍처/스택 선택 구현 시작
- Socket.io 이벤트를 Screen 6 `survey:submitted`에도 backfill
- merge된 아이디어의 시각적 계보(lineage) 표시 개선 검토
