# packages/contracts

Shared schemas and contracts used across apps.

Suggested structure:

- `src/ai/` AI response/request schemas
- `src/jsonb/` JSONB persistence schemas
- `src/common/` shared primitives and enums

This package should stay dependency-light and become the validation layer between web, API, and AI workflows.
