# apps/api

Primary backend application boundary for the repository.

Current implementation baseline:

- NestJS for domain API, auth-facing BFF responsibilities, and realtime gateways
- Prisma for database access and schema management
- Shared contract validation through `packages/contracts/`

Suggested internal ownership:

- `src/` modules, services, controllers, gateways
- `test/` backend integration tests
- `prisma/` Prisma schema and migrations

If Python AI execution is extracted later, document that decision first and add a dedicated runtime boundary rather than mixing it into this app ad hoc.
