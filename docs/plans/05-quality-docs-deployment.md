# Plan 05 - Quality Docs And Deployment

## Objective

Finalize the first version with root documentation, local/Supabase/seed/Vercel instructions, and verification commands.

## Execution Steps

1. Write root `README.md` with:
   - Local install/run commands.
   - Supabase project creation and migration commands.
   - Seed import commands.
   - Vercel deployment and domain setup.
   - Feature checklist and known TODOs.
2. Confirm `.env.example` contains only required variable names.
3. Run:
   - `npm run test`
   - `npm run typecheck`
   - `npm run lint`
   - `npm run build`
   - Prisma validation with dummy URLs
4. Fix any issues from quality gates.
5. Start a local dev server and report the URL.

## Acceptance Checks

- README is actionable and does not contain sensitive default credentials.
- Required commands are documented.
- Quality commands either pass or any remaining failure is explicitly documented.
- Dev server is running with a local URL for manual trial.
