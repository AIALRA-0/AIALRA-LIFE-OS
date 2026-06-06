# Agent Spec

## 1. Agents

### PlannerAgent

Purpose: generate a daily plan from today's input, core framework, skill tree, resources and history.

Inputs:
- DailyInput
- active CoreFramework
- anchor list
- daily template
- skill tree summary
- last 7 days execution summary
- active resources filtered by phase/domain
- backlog items

Output:
- DailyPlan JSON matching `daily_plan_schema`

Guardrails:
- Must preserve 20:00 sleep and 03:00 wake.
- Must include all daily required domains.
- Must not schedule high-stimulation tasks after 19:00.
- Must include rescue plan.
- Must not add paid resource unless linked to active skill node and deliverable.

### ResearchAgent

Purpose: run deeper source-backed research for resources, courses, company access, or weekly roadmap updates.

Implementation:
- Use OpenAI Responses API with `model=o3-deep-research` or `o4-mini-deep-research`.
- Use `background=true`.
- Tools: start with `web_search_preview`; V2 adds `file_search` vector stores and `code_interpreter`.
- Store every request in AgentRun.
- Store report in ResearchReport.

### ReviewAgent

Purpose: nightly synthesis.

Inputs:
- DailyPlan
- PlanBlocks
- ExecutionLogs
- MetricSnapshot

Output:
- completion summary
- skill delta suggestions
- risk flags
- tomorrow focus

### SkillTreeAgent

Purpose: convert execution evidence into skill updates.

Rules:
- Only update level if there is evidence.
- Failed/missed blocks do not reduce skill unless repeated pattern appears.
- Add evidence record with artifact URL or note.

### ResourceAgent

Purpose: maintain resource library.

Rules:
- New resource status = REVIEW.
- Agent can enrich metadata, but human must confirm ACTIVE.
- Every resource must have completion_threshold and replacement_risk.

## 2. Prompt Hierarchy

1. System policy prompt: never break sleep/body anchors, never moralize, keep plan executable.
2. Core framework context: anchors, required domains, overload rules.
3. Skill context: top gaps and active skill nodes.
4. Resource context: relevant resources only, not all 48 every day.
5. User daily input.
6. Output schema.

## 3. Validation Rules

`validatePlan(plan)` must check:

- date/timezone exists.
- blocks cover 03:00-20:00 without overlap.
- every start/end aligned to 30 min.
- no block after 20:00.
- anchors A0-A7 present.
- required domains have >= minimum minutes.
- every resource_id exists.
- every skill_node_id exists.
- each block has expected_output.
- rescue_plan exists.

If validation fails:

- Save AgentRun as FAILED with errors.
- Show errors in `/agents`.
- Allow user to regenerate.

## 4. API Endpoints

- `POST /api/plan/generate`
- `GET /api/plan/today`
- `POST /api/plan/block/:id/checkin`
- `POST /api/review/daily`
- `POST /api/resources`
- `GET /api/resources`
- `POST /api/resources/import-seed`
- `GET /api/skills`
- `POST /api/skills/recompute`
- `GET /api/agents`
- `GET /api/agents/:id`

## 5. Security

- Service role key only server-side.
- Never expose OpenAI API key to client.
- Use Supabase Auth session on all app routes.
- All route handlers must check user identity.
- Log AI inputs/outputs but redact secrets.
