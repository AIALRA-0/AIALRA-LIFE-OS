# Plan 01 - Bootstrap And Data Model

## Objective

Create the runnable Next.js foundation for Aialra Life OS and establish the complete Prisma/Postgres data model required by the first version.

## Inputs

- Uploaded initial package at `/tmp/aialra-lifeos-package/aialra-lifeos-initial-package`
- Required stack: Next.js App Router, TypeScript, Tailwind CSS, shadcn-compatible primitives, lucide-react, Supabase, Prisma, OpenAI SDK, Zod, Recharts, Vitest
- Required core entities from the provided Prisma schema

## Execution Steps

1. Initialize a Node/Next.js project with TypeScript scripts and Vercel-compatible defaults.
2. Add dependency declarations for the required stack.
3. Create base framework files: `app/layout.tsx`, `app/page.tsx`, Tailwind/PostCSS/TypeScript config, global styles, and Next config.
4. Copy the user-provided source materials into `docs/`, `prompts/`, `schema/`, and `seed/`.
5. Convert `schema/prisma.schema` into the active `prisma/schema.prisma`, adjusting only where needed for valid Prisma syntax and runtime ergonomics.
6. Add `.env.example` with required environment variables only; do not persist sensitive default credentials.
7. Run dependency installation and Prisma validation/generation.

## Acceptance Checks

- `package.json` includes all required stack dependencies and scripts.
- `prisma/schema.prisma` contains every required core model.
- Uploaded seed files exist under `seed/` unchanged in intent.
- Sensitive default credentials are not written to the repository.
- `npx prisma validate` succeeds.
