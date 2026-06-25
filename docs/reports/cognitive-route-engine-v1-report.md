# LifeOS Cognitive Route Engine v1 + Body Routes Patch v1 执行报告

日期：2026-06-25

## 总览

本轮把 LifeOS 从普通日程/资源库/技能树，升级为确定性路线驱动的每日执行系统：

- 新增 Cognitive Route / Route Stage / Route Week / Fixed Slot / Course Slot / Open Agent Slot。
- 新增 Route Evidence Node、Codex Sidecar Task、BodyCheckin。
- 新增 `/routes`、`/routes/current`、课程槽、今日变动 Repair Plan、Sidecar 队列。
- 每日 fallback plan 已改为根据固定时间片和当前路线周生成。
- 今日执行页显示路线、阶段、周主题、protected/flexible、route topic。
- 打卡支持一键完成和完整弹窗，身体 block 写入 BodyCheckin。
- 日结会重算 SkillEvidence 和 RouteEvidenceNode。

## 数据库与 Seed

迁移：

- `prisma/migrations/202606250001_cognitive_route_engine_body_patch_v1/migration.sql`
- 生产库是既有非空库，因此本轮使用 `prisma db execute --file` 执行 add-only SQL，再用 `prisma migrate resolve --applied` 标记迁移。

Seed 执行结果：

- `npm run seed:import`：48 resources，24 skill nodes，8 anchors。
- `npm run seed:routes`：7 routes，20 stages，162 route weeks，9 route evidence nodes，20 fixed slots。
- `npm run seed:body-routes`：2 body routes，12 stages，48 route weeks，15 evidence nodes，15 body skill nodes。

数据库核验：

- CognitiveRoute：9
- RouteStage：32
- RouteWeek：210
- FixedTimeSlotTemplate：20
- RouteEvidenceNode：24

## 本地端到端测试

质量门：

- `npm run lint`：通过
- `npm run typecheck`：通过
- `npm run test`：7 files / 17 tests 通过
- `npm run build`：通过

API E2E：

- 登录：通过
- `/api/routes/current`：9 routes，20/21 slots
- `/api/plan/generate`：无 API key fallback 生成成功
- 今日计划：34 blocks，覆盖 03:00-20:00
- 必需领域：health、diet、vocal、dance、music、chip_eda、ai_agent、business、external_feedback、review
- Route-bound blocks：21
- Protected blocks：14
- Body check-in：写入 1 条 BodyCheckin
- Repair Plan：插入 1 个 OpenAgentSlot，修复 1 个 block
- Sidecar task：创建 QUEUED 任务成功
- Daily review：生成 JournalEntry，创建 4 条 SkillEvidence，更新 10 次 RouteEvidenceNode

浏览器 E2E：

- `/routes/current`：固定槽、9 条路线、Body 面板、课程槽、Repair、Sidecar 可见。
- `/plan/today`：34 个半小时 block、路线标签、一键完成按钮、完整打卡弹窗可见。
- `/skills`：显示路线证据、next gate、confidence。
- `/agents`：显示 PlannerAgent、RepairPlan、ReviewAgent、ManualPlannerPrompt。
- 已登录页面 console：0 errors。

本地压测：

- 210 requests
- concurrency 15
- ok 210
- failed 0
- p50 314ms
- p95 2036ms
- max 2949ms

## 线上部署与验证

部署方式：

- `npm run build`
- `systemctl restart aialra-lifeos.service`
- nginx/Cloudflare 继续代理 `lifeos.aialra.online`

线上 smoke：

- `https://lifeos.aialra.online/`：307 到 `/dashboard`
- 未登录 `/routes/current`：307 到 `/login`
- 登录 API：200
- `/api/routes/current`：9 routes，21 slots
- `/api/plan/today`：34 blocks，status COMPLETED

线上浏览器 E2E：

- `/routes/current`：可见 Chip/EDA Main Cognitive Route、Body Activation Route、Movement Training Route、Codex Sidecar。
- `/plan/today`：可见今日执行、身体激活、Chip/EDA route、打卡 UI。
- console：0 errors。

线上压测：

- 100 requests
- concurrency 10
- ok 100
- failed 0
- p50 290ms
- p95 1264ms
- max 1846ms

## 安全审计

已检查：

- `.env` / cookie / Playwright 截图未进入 git。
- secret 扫描未发现真实 `sk-proj`、数据库 URL、账号密码。
- 仅 `.env.example` 和 README 保留空环境变量占位。

## 已知限制

- Sidecar Task 当前是队列和审计记录，不自动调用 Codex 执行外部命令。
- Deep Research background 完成后的轮询/webhook 尚未实现。
- Supabase Storage artifact upload UI 尚未实现。
- 当前路线周从 seed start date 计算，未来可增加 UI 来调整 route start date。
