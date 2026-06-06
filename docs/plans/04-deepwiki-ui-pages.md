# Plan 04 - DeepWiki UI Pages

## Objective

Build the first-version Aialra Life OS interface as a dark, dense, knowledge-operating-system workspace rather than a generic todo app.

## Visual Thesis

A black-blue command surface with violet knowledge edges, terminal-like density, and restrained green/yellow/red operational signals.

## Content Plan

- Primary workspace: daily timeline, plan generation, review, resource wiki, skill tree, and agent audit logs.
- Left navigation: stable system map.
- Top command bar: date, active route, quick actions.
- Right panel: anchors, risk flags, skills, and agent state.

## Interaction Thesis

- Fast block check-in via modal with minimal fields.
- Resource/search pages update by query/filter without heavy navigation.
- Operational hover/focus states emphasize active work blocks and status without decorative clutter.

## Execution Steps

1. Add `AppShell`, sidebar, command bar, anchor strip, timeline, check-in dialog, skill tree, resource card, agent panel, daily input form, review summary card, and risk badge components.
2. Add login flow with Supabase email/password.
3. Implement all required app pages:
   - `/dashboard`
   - `/plan/new`
   - `/plan/today`
   - `/review/daily`
   - `/resources`
   - `/resources/[id]`
   - `/skills`
   - `/agents`
   - `/settings`
4. Use real Prisma-backed server data for authenticated pages.
5. Keep every route dynamic and auth-protected where appropriate.
6. Preserve dark knowledge OS layout with sidebar, command bar, central workspace, and right panel.

## Acceptance Checks

- Every required page/component file exists.
- Forms call real API routes.
- Timeline blocks can open check-in dialog and submit execution logs.
- UI is dark, structured, dense, and not a white table/todo layout.
- `npm run typecheck` passes after page/component implementation.
