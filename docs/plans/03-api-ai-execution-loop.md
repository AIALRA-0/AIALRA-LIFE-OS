# Plan 03 - API And AI Execution Loop

## Objective

Implement the server API surface that makes Aialra Life OS operational: seed import, daily input capture, OpenAI/fallback plan generation, today plan retrieval, block check-in, daily review, resources, skills, skill recompute, and agent run audit logs.

## Inputs

- Plan 02 shared libraries and seed importer logic
- Prisma models and generated client
- OpenAI Responses API docs:
  - Responses create supports `text.format` JSON schema structured output.
  - Deep research uses Responses with `o3-deep-research` / `o4-mini-deep-research`, `background: true`, and at least one tool such as `web_search_preview`.

## Execution Steps

1. Add route handlers under all required `app/api/**` paths.
2. Protect app APIs with Supabase Auth via `requireUserProfile`, except seed import still records audit state and can be run via CLI.
3. Implement `/api/plan/generate` pipeline:
   - Save `DailyInput`.
   - Compile planner context.
   - Create `AgentRun`.
   - Use OpenAI structured output when available.
   - Start deep research background run when requested, then save a fallback executable plan immediately.
   - Validate plan.
   - Archive prior plan for same date.
   - Persist `DailyPlan`, `PlanBlock`, resource links, and skill links.
4. Implement block check-in and execution logging.
5. Implement daily review summary and skill recompute routes.
6. Implement resource, skill, and agent list endpoints for UI pages.

## Acceptance Checks

- Every required API route file exists.
- Route handlers return JSON and use real Prisma/Supabase/OpenAI integration points.
- Planner fallback creates a valid 03:00-20:00 plan.
- `npm run typecheck` still passes after route implementation.
