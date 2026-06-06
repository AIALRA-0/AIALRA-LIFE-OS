# AGENTS.md for Codex

You are building Aialra Life OS.

## Mission

Build a private, single-user-first personal operating system for daily planning, execution logging, skill-tree tracking, resource management, and AI-driven daily scheduling. The user wakes at 03:00 and sleeps at 20:00. The system must enforce daily anchors, generate half-hour plans, and preserve health/body/art/business/chip-EDA/AI-agent requirements.

## Hard Constraints

- Never expose secrets client-side.
- Never break 20:00 sleep and 03:00 wake in generated plans.
- Every generated plan must include运动、饮食、声乐、舞蹈、音乐制作、芯片/EDA、AI agent、商业金融管理表达、复盘.
- Every AI output must be stored and auditable.
- Use TypeScript everywhere.
- Prefer simple working implementation over clever architecture.
- Implement seed import from files in `/seed`.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase Auth/Postgres/Storage
- Prisma
- OpenAI SDK
- Zod validation
- Recharts for analytics
- Vitest for utility tests

## Required Pages

- `/login`
- `/dashboard`
- `/plan/new`
- `/plan/today`
- `/review/daily`
- `/resources`
- `/resources/[id]`
- `/skills`
- `/agents`
- `/settings`

## Required API Routes

- `POST /api/seed/import`
- `POST /api/plan/generate`
- `GET /api/plan/today`
- `POST /api/plan/block/[id]/checkin`
- `POST /api/review/daily`
- `GET /api/resources`
- `POST /api/resources`
- `GET /api/skills`
- `POST /api/skills/recompute`
- `GET /api/agents`

## UI Style

Dark DeepWiki-like command center:
- left nav
- dense cards
- timeline center
- right-side skill/resource/agent panels
- glass panels
- subtle neon accents
- no bright wellness-app aesthetic

## Quality Bar

Before final answer, ensure:
- `npm run lint` passes
- `npm run typecheck` passes
- seed import compiles
- no placeholder pages without content
- README has local setup, env vars, migration and deployment steps
