# 90-Day Roadmap

## Day 0-3: Repo and Skeleton

- Create GitHub repo `aialra-lifeos`.
- Create Next.js app with TypeScript, Tailwind, App Router.
- Install shadcn/ui, Supabase, Prisma, OpenAI SDK, zod, recharts, lucide-react.
- Configure ESLint, Prettier, Vitest.
- Add `.env.example`.
- Add app shell, sidebar, command bar.

Definition of done:
- `npm run dev` works.
- `/login`, `/dashboard`, `/resources`, `/skills`, `/plan/new`, `/plan/today` exist.

## Day 4-7: Database/Auth/Seed

- Configure Supabase Auth.
- Add Prisma schema and migration.
- Add seed import script.
- Import resources, skill tree, framework.
- Build protected routes.

Definition of done:
- User can log in.
- Dashboard displays seed counts.
- Resource list and skill tree render.

## Day 8-14: Daily Plan MVP

- Implement DailyInput form.
- Implement AI prompt builder.
- Implement `/api/plan/generate`.
- Implement plan validator.
- Save DailyPlan/PlanBlocks.
- Render TodayTimeline.

Definition of done:
- User enters daily input and gets plan.
- Plan is editable enough for MVP.
- All blocks aligned to 30 minutes.

## Day 15-21: Check-ins and Review

- Implement check-in dialog.
- Save ExecutionLog.
- Calculate completion rate.
- Implement daily review page.
- Create ReviewAgent prompt.

Definition of done:
- A full day can be executed and reviewed.

## Day 22-30: Agent Runs and Deep Research

- Implement AgentRun table display.
- Add deep research endpoint with background mode.
- Store OpenAI response ID.
- Poll run status or store async result.
- Save ResearchReport.

Definition of done:
- User can launch a research-backed resource scan.
- Reports are stored and visible.

## Day 31-45: Resource Wiki and Skill Evidence

- Resource detail page.
- Add/edit resources.
- Link resources to skill nodes.
- Add SkillEvidence from completed blocks.
- Skill level recompute endpoint.

Definition of done:
- Skill tree changes based on logged evidence.

## Day 46-60: Analytics and Risk

- Trend charts for completion, sleep, exercise, focus.
- Risk flags for missed anchors, fatigue, urge triggers.
- Rescue plan generator.

Definition of done:
- The system detects overload and proposes a lower-intensity day.

## Day 61-75: Retrieval and Files

- Add Supabase Storage upload.
- Add semantic_chunks table.
- Add embeddings pipeline for resources/notes.
- Use internal retrieval in daily prompt.

Definition of done:
- User can upload a PDF/MD note and retrieve relevant chunks.

## Day 76-90: Harden and Deploy

- Vercel deployment.
- Custom domain.
- Better mobile layout.
- Error handling.
- Audit logs.
- README and operating manual.

Definition of done:
- The system is usable daily without developer intervention.
