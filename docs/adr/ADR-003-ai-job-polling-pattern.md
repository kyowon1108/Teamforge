# ADR-003: AI Job Processing Uses Polling Pattern (202 / 200)

- Status: proposed
- Date: 2026-04-06
- Relates to: KF-020, Screen 7 Topic Decision, Screen 8a System Framing

## Context

Screen 7 (Topic Decision) and Screen 8a (System Framing) both require Claude API calls to generate AI suggestions before the user can interact with the screen.

Claude API response times for these prompts are estimated at 5–15 seconds depending on team size and prompt length. Three options exist:

1. **Synchronous HTTP** — caller waits for the full response before the server returns. Simple but risks client-side timeout (default Next.js fetch timeout is 30s; network hops add latency) and blocks the NestJS event loop for the duration.

2. **Polling (202 Accepted + job status)** — server starts the AI job and immediately returns a job token. Client polls a status endpoint until complete or failed.

3. **Server-Sent Events (SSE) or WebSocket streaming** — server streams partial results as they arrive. Best UX, but requires streaming support from the Claude SDK and additional infrastructure for job persistence.

The implementation supplement (`docs/api/implementation-supplement-v1.0.md`) explicitly states: "Long-running AI work must expose job state or websocket events, not silent fire-and-forget behavior."

## Decision

Use the **polling pattern** for all AI generation jobs in Screen 7 and Screen 8a.

Specific rules:

- On first request, if no cached result exists, start the AI job and return `{ status: 'pending', jobId }` with HTTP 202.
- If a cached result already exists (e.g., page refresh after generation), return the result immediately with HTTP 200.
- The client polls the same endpoint every 5 seconds, up to 5 attempts (25 seconds total).
- If the job completes, return `{ status: 'done', data: <suggestions> }` with HTTP 200.
- If the job fails after 3 internal retries (Claude API error or schema parse failure), return `{ status: 'failed' }` with HTTP 200 (not 5xx — the client must handle this gracefully).
- If the client exhausts 5 poll attempts without a terminal status, it activates the fallback UI without further server requests.

Job state is stored in the relevant DB table (`KickoffTopic.generationJob`, `KickoffStructure.generationJob`) so it survives server restarts.

SSE or streaming is deferred. It may be re-evaluated when Screen 9 artifact generation is designed (which generates multiple artifacts and may benefit from incremental display).

## Consequences

- AI generation UX has a loading state of up to 25 seconds before fallback activates. A loading screen with a progress message is required on the frontend.
- A fallback UI (manual input form for Screen 7, preset default blocks for Screen 8a) must be implemented alongside the AI path — not as a post-launch addition.
- The `KickoffTopic` and `KickoffStructure` tables must include a `generationJob` field to track in-flight jobs.
- AI response schemas (`TopicSuggestionsSchema`, `StructureSuggestionsSchema`) must be defined in `packages/contracts/src/ai/` before any Claude API call is made.
- Screen 5 (Personal Result) already uses a similar AI role suggestion pattern with 3-second polling. If that pattern diverges from this ADR, it should be reconciled.
