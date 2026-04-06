# apps/web

User-facing Next.js application.

Suggested internal ownership:

- `app/` route handlers and pages
- `components/` page-level and reusable UI
- `components/ui/` shadcn/ui owned code
- `hooks/` UI and data hooks
- `lib/` API client, auth helpers, feature flags
- `types/` app-local types only
- `public/` static assets

Keep product decisions in `docs/product/`, not in page files.
