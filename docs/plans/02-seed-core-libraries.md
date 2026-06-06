# Plan 02 - Seed Import And Core Libraries

## Objective

Wire the shared backend helpers and seed import path so the app can talk to Supabase Auth, Supabase server/client APIs, Prisma, OpenAI, and local JSON seed files without relying on mock-only behavior.

## Inputs

- `prisma/schema.prisma`
- `seed/resources.seed.json`
- `seed/core-framework.seed.json`
- `seed/skill-tree.seed.json`
- `seed/daily-template.seed.json`
- `seed/ai-output-schemas.seed.json`
- Required library paths under `lib/`

## Execution Steps

1. Create shared utility helpers for class names, JSON parsing, and time-slot calculations.
2. Create Prisma singleton and Supabase browser/server clients.
3. Create an auth helper that maps the current Supabase user to `UserProfile`.
4. Create OpenAI SDK helper with a deterministic fallback plan generator for missing API keys or background research mode.
5. Implement seed importer script:
   - Upsert active `CoreFramework` and `Anchor` records.
   - Upsert all `Resource` records.
   - Upsert nested `SkillNode` records.
   - Upsert planner/review/schema `PromptTemplate` and `SystemSetting` records.
6. Add focused Vitest coverage for time helpers and plan validation inputs prepared in this phase.

## Acceptance Checks

- `scripts/import-seed.ts` can run against a real database once env vars are set.
- `lib/` contains all required helper files for later API routes.
- Seed importer preserves every required initial resource by name.
- Utility tests can execute without a database.
