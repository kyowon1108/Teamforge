# ADR-004: Socket.io Introduction Timing and Scope

- Status: proposed
- Date: 2026-04-06
- Relates to: KF-022, Screen 7 Topic Decision, Screen 11 Meeting Hub

## Context

The screen-flow spec calls for real-time events at multiple screens:

- Screen 6: `survey:submitted` — refreshes member status without full page reload
- Screen 7: `topic:reaction` — updates reaction counts live; `topic:confirmed` — locks topic for all clients
- Screen 8a/8b: reaction updates (lower urgency)
- Screen 11: `meeting:update` — live sync of agenda and notes during an active meeting

Socket.io is not yet set up in the codebase. `apps/api/src/main.ts` uses a plain NestJS HTTP server.

Two timing options are being evaluated:

**Option A — Introduce at Screen 7:**
Set up Socket.io server and `team:{teamId}` room infrastructure when implementing Screen 7. Emit `topic:reaction` and `topic:confirmed` events. Client connects on page mount, falls back to polling on connection failure.

Benefit: Real-time feedback for the reaction feature; Socket.io infrastructure available for Screen 11 reuse.
Cost: Adds infrastructure work to Screen 7, which is already the first Claude API integration point. Two new concerns in one sprint.

**Option B — Defer to Screen 11:**
Implement Screen 7 and Screen 8a/8b using polling only (10-second interval). Add Socket.io when Screen 11's meeting editing requires true real-time collaboration.

Benefit: Screen 7 scope is tighter and more predictable.
Cost: Reaction counts in Screen 7 are delayed by up to 10 seconds. Screen 6 `survey:submitted` also stays polling until Screen 11.

## Decision

**Defer Socket.io to Screen 11 (Option B).**

Rationale:

- Screen 7's reaction feature works acceptably with 10-second polling. The reaction result is informational and does not gate any user action.
- Screen 7 already introduces the first Claude API integration. Combining AI job handling with Socket.io setup in the same sprint increases risk.
- Screen 11 meeting editing has a genuine real-time requirement (concurrent note editing) where polling is impractical. That is the right forcing function for the infrastructure work.
- The `survey:submitted` event in Screen 6 can be replaced by a page refresh after the user submits their own survey. Other team members seeing the update is a "nice to have," not a blocking UX gap.

When Socket.io is introduced at Screen 11:
- Set up the NestJS WebSocket gateway in `apps/api/src/gateways/`.
- Implement `team:{teamId}` rooms with membership-based join authorization.
- Backfill Screen 6 `survey:submitted` and Screen 7 `topic:reaction` / `topic:confirmed` event emissions at that time, so all event contracts are unified before Screen 11 ships.

## Consequences

- Screen 7, 8a, 8b will use polling for reaction count updates. Loading interval: 10 seconds.
- Screen 7 `topic:confirmed` propagation will rely on polling (client re-fetches phase on interval). There is a window of up to 10 seconds where a non-leader client does not yet see the lock state. This is acceptable since the confirm action does not require simultaneous awareness.
- `screen-flow.md` Socket.io event entries for Screen 6 and 7 are marked `⚠️ polling fallback` until Screen 11 ships.
- No Socket.io code is written before Screen 11 planning begins.
