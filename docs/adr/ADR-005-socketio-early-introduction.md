# ADR-005: Socket.io 조기 도입

- 상태: accepted
- 날짜: 2026-04-08
- Supersedes: ADR-004-socketio-introduction
- 관련: KF-034, Screen 7 Brainstorm, Screen 11 Meeting Hub

## 배경

ADR-004에서는 Socket.io 도입을 Screen 11(Meeting Hub)까지 지연하고, Screen 7은 10초 폴링으로 구현하기로 결정했다. 그러나 Screen 7 브레인스토밍 구현 과정에서 다음 문제가 드러났다.

- 브레인스토밍에서 아이디어 제출, build-on, merge, 리액션, dot voting이 모두 실시간으로 반영되어야 자연스러운 협업 경험이 만들어진다.
- 10초 폴링으로는 아이디어 카드가 늦게 나타나거나, 다른 팀원의 build-on/merge 결과를 즉시 확인할 수 없어 UX가 크게 저하된다.
- Screen 5의 FinalizedRoleBadge도 30초 폴링에 의존하고 있어 역할 확정 알림이 지연되고 있었다.

## 결정

**Socket.io를 Screen 7 브레인스토밍 구현 시점에 조기 도입한다 (ADR-004 Option A 채택).**

구체적인 인프라 구조는 다음과 같다.

- **서버**: NestJS `@WebSocketGateway` 기반, `/team` namespace
- **인증**: `GET /api/auth/ws-token`으로 30초 유효 일회용 토큰 발급. WebSocket handshake 시 이 토큰으로 인증.
- **방(Room)**: `team:{teamId}` room. `join:team` 이벤트 수신 시 PrismaService로 해당 사용자의 팀 멤버십을 검증한 후 room에 참여시킨다.
- **이벤트 발행**: 서비스 레이어에서 `emitToTeam(teamId, eventName, payload)` 호출. 브레인스토밍 5곳, 킥오프 3곳에 적용 완료.
- **클라이언트**: `useTeamSocket` 훅으로 연결 관리. 연결 실패 시 자동으로 폴링 fallback.

## 영향

**더 쉬워지는 점:**
- 브레인스토밍 실시간 협업 경험이 즉각적이다.
- Screen 6 `survey:submitted`, Screen 5 역할 확정 등 기존 폴링 이벤트를 점진적으로 소켓으로 전환할 수 있는 인프라가 확보되었다.
- Screen 11 Meeting Hub 구현 시 게이트웨이를 재사용하면 된다.

**더 어려워지는 점:**
- 운영 환경에서 WebSocket 연결 수 관리, 프록시(nginx/ALB) 설정이 필요하다.
- 수평 확장 시 Redis Adapter(`@socket.io/redis-adapter`) 도입이 필요하다 (현재 단일 인스턴스에서는 불필요).

**새로 생기는 제약:**
- 모든 실시간 이벤트는 `/team` namespace와 `team:{teamId}` room 컨벤션을 따라야 한다.
- ws-token은 30초 유효. 클라이언트는 연결 전 매번 새 토큰을 요청해야 한다.
