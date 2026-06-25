# Aialra Life OS

Private dark knowledge operating system for a 03:00 wake / 20:00 sleep execution loop.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS + shadcn-compatible primitives + lucide-react
- Supabase Auth/Postgres/Storage-ready env, with local auth/Postgres fallback for self-hosting
- Prisma ORM
- OpenAI SDK Responses API
- Zod validation, Recharts-ready dependency, Vitest utility tests

## Local Setup

```bash
npm install --include=dev
cp .env.example .env
```

Fill `.env`:

```bash
DATABASE_URL=
DIRECT_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Run locally:

```bash
npm run db:generate
npm run dev
```

Open `http://localhost:3000`.

## Current Production

The current `lifeos.aialra.online` deployment is self-hosted:

- Next.js runs behind nginx reverse proxy.
- PostgreSQL runs locally on the server.
- Local auth fallback is enabled so the site can run without Supabase credentials.
- Supabase and Vercel are optional integrations, not required for the current live service.

See `docs/CURRENT_PRODUCTION.zh.md` for the plain Chinese explanation.

## Local or Supabase Database

For the current self-hosted version, a local PostgreSQL database is enough:

```bash
npm run db:push
npm run seed:import
npm run build
npm run start
```

Use Supabase when you want managed auth, managed Postgres, browser-safe storage uploads, or pgvector/file-search infrastructure managed outside this server.

## Supabase Optional Setup

1. Create a Supabase project.
2. In Project Settings > API, copy:
   - Project URL to `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key to `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service role key to `SUPABASE_SERVICE_ROLE_KEY`
3. In Project Settings > Database, copy the pooled connection string to `DATABASE_URL`.
4. Copy the direct database connection string to `DIRECT_URL`.
5. Create the login user in Supabase Auth > Users. Do not store credentials in this repository.

Apply schema:

```bash
npm run db:push
# or for migration history
npm run db:migrate -- --name init
```

Import seed:

```bash
npm run seed:import
npm run seed:routes
npm run seed:body-routes
```

You can also sign in and use `/settings` > Import seed.

## Nginx Deploy

For self-hosting, deploy Next.js behind nginx:

1. Install dependencies and fill server-only environment variables.
2. Run `npm run db:push`.
3. Run `npm run seed:import`.
4. Run `npm run build`.
5. Start Next.js with systemd on a local port.
6. Point nginx `lifeos.aialra.online` to that local port.
7. Install a TLS certificate with certbot.

## Vercel Optional Deploy

The app remains Vercel-compatible, but Vercel is not required for the current production deployment.

1. Push this repository to GitHub.
2. Import the GitHub repo into Vercel.
3. Add all environment variables from `.env.example`.
4. Set the production domain to `lifeos.aialra.online`.
5. In your DNS provider, point `lifeos.aialra.online` to Vercel as instructed by the Vercel Domains UI.
6. Deploy.

The build command is:

```bash
npm run build
```

## Core Flow

1. Sign in.
2. Import seed data.
3. Enter daily input at `/plan/new`.
4. Generate a 03:00-20:00 half-hour plan.
5. Check in each block at `/plan/today`.
6. Generate the evening review at `/review/daily`.
7. Inspect resources, skill tree, and agent runs.

## Cognitive Route Engine

The v1 route engine adds deterministic long-term routes on top of the daily plan loop:

- `/routes` shows all active cognitive routes, stages, current week, and evidence nodes.
- `/routes/current` shows today's fixed time slots, current route weeks, body routes, course slot form, repair form, and Codex sidecar queue.
- `npm run seed:routes` imports Chip/EDA, AI Systems, Business, Body, Vocal, Dance, and Music routes.
- `npm run seed:body-routes` imports Body Activation and Movement Training routes.
- Daily fallback planning uses fixed slots and current route weeks even when no API key is configured.
- Repair Plan converts flexible conflicting blocks into audited OpenAgentSlot blocks without moving protected anchors.
- Body check-ins write `BodyCheckin` rows for activation/training/diet evidence.

## AI Behavior

- Normal planning uses OpenAI Responses structured output with Zod validation.
- Deep research requests start a background `o3-deep-research` run with `web_search_preview`; if that fails, the code falls back to `o4-mini-deep-research`.
- While background research is pending, the system immediately saves a deterministic fallback plan so the day can run.
- If `OPENAI_API_KEY` is missing, fallback planning still works and the `AgentRun` audit trail records the reason.

## Quality Gates

```bash
npm run test
npm run typecheck
npm run lint
npm run build
npx prisma validate
```

Route seed and deployment checks:

```bash
npx prisma migrate deploy
npm run seed:import
npm run seed:routes
npm run seed:body-routes
```

## TODO

- Add Supabase Storage upload UI for artifacts.
- Add background polling/webhook handling for completed deep research responses.
- Add editable AI plan revision history.
- Add pgvector-backed resource retrieval once Supabase vector store is configured.

These TODOs do not block the first-version daily planning, check-in, review, resource, skill, and agent audit loop.
