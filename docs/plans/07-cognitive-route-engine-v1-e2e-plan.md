# 07 LifeOS Cognitive Route Engine v1 全量端到端执行计划

## 目标

把当前 LifeOS 从“普通日程 / 资源库 / 技能树”升级为：

- 确定性认知路线
- 动态课程槽
- Open Agent 插槽
- 证据技能树
- Codex sidecar 执行器

核心原则：

- 用户每天不是重新规划人生。
- 用户每周有确定性认知路线。
- 每个固定时间片对应固定主题。
- 课程作为动态输入插入 `CourseSlot`。
- Agent 只填 `OpenSlot` 和处理冲突，不改变长期路线。
- 技能树不是概念百科，而是证据树。
- 项目只是认知证据，不是主线本身。
- Codex 是 sidecar 执行器，不是路线制定者。
- 不删除现有功能，不做无关大重构。

## 执行边界

- 保留现有 Next.js App Router、Prisma、PostgreSQL、Tailwind、Radix UI、OpenAI/手动提示包链路。
- 使用现有 `npm` 脚本；需求中的 `pnpm lint/typecheck` 在本仓库映射为 `npm run lint` 和 `npm run typecheck`。
- 每个阶段必须包含真实网页测试，不只做接口或单元测试。
- 每个阶段完成后必须记录：修改文件、迁移、seed 数量、网页测试结果、已知问题。
- 不把课程、路线、个人上下文写死进客户端 secret。
- 不泄露 `.env`、API key、登录凭据。

## 阶段 0：基线审计与可回滚点

### 实施步骤

1. 检查工作区：
   - `git status --short`
   - `git rev-parse --short HEAD`
2. 记录当前线上状态：
   - `systemctl is-active aialra-lifeos.service`
   - `curl -I https://lifeos.aialra.online/`
3. 运行当前质量基线：
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test`
   - `npm run build`
4. 建立执行日志：
   - 新建本轮完成报告草稿：`docs/reports/cognitive-route-engine-v1-report.md`
   - 记录基线 commit、当前 DB 计数、线上服务状态。

### 网页测试

使用 Playwright 或等价浏览器测试：

1. 登录 `https://lifeos.aialra.online/login`。
2. 访问并截图：
   - `/dashboard`
   - `/plan/new`
   - `/plan/today`
   - `/resources`
   - `/skills`
   - `/agents`
   - `/settings`
3. 确认所有页面无 500、无白屏、基础导航可点。

### 阻断条件

- 基线 lint/typecheck/test/build 不通过时，先修复基线问题，不进入路线引擎开发。
- 线上登录不可用时，先修复部署或 auth。

## 阶段 1：Prisma 数据模型

### 新增枚举

在 `prisma/schema.prisma` 中新增或等价实现：

- `RouteStatus`: `ACTIVE | PAUSED | COMPLETED`
- `RouteStageMode`: `SERIAL | PARALLEL`
- `FixedSlotType`: `ANCHOR | FIXED_ROUTE | PARALLEL_ROUTE | COURSE_SLOT | OPEN_AGENT_SLOT | ART_SLOT | MEAL | SHUTDOWN`
- `OpenAgentSlotSource`: `USER_CONFLICT | AGENT_REPAIR | COURSE_OVERFLOW | LIFE_ADMIN | NETWORKING`
- `CodexSidecarStatus`: `QUEUED | RUNNING | DONE | FAILED | REVIEWED`

如 Body Routes Patch 后续需要扩展，可预留：

- `BODY_ACTIVATION`
- `MOVEMENT_TRAINING`

### 新增模型

#### `CognitiveRoute`

字段：

- `id`
- `userId`
- `name`
- `description`
- `domain`
- `status`
- `startDate`
- `endDate`
- `createdAt`
- `updatedAt`

关系：

- belongs to `UserProfile`
- has many `RouteStage`
- has many `RouteWeek`
- has many `RouteEvidenceNode`

#### `RouteStage`

字段：

- `id`
- `routeId`
- `order`
- `name`
- `weeks`
- `objective`
- `completionStandard`
- `serialOrParallel`
- `createdAt`
- `updatedAt`

#### `RouteWeek`

字段：

- `id`
- `routeId`
- `stageId`
- `weekIndex`
- `title`
- `theme`
- `concreteTopics Json`
- `primaryResources Json`
- `expectedEvidence Json`
- `createdAt`
- `updatedAt`

#### `FixedTimeSlotTemplate`

字段：

- `id`
- `userId`
- `dayOfWeek nullable`
- `startTime`
- `endTime`
- `slotType`
- `title`
- `routeDomain nullable`
- `protected Boolean default false`
- `flexible Boolean default true`
- `defaultRule Text`
- `createdAt`
- `updatedAt`

#### `CourseSlot`

字段：

- `id`
- `userId`
- `courseName`
- `courseCode`
- `instructor`
- `dayOfWeek`
- `startTime`
- `endTime`
- `location`
- `term`
- `source`
- `locked Boolean default true`
- `active Boolean default true`
- `createdAt`
- `updatedAt`

#### `OpenAgentSlot`

字段：

- `id`
- `userId`
- `date`
- `startTime`
- `endTime`
- `insertedTitle`
- `reason`
- `source`
- `createdAt`

#### `RouteEvidenceNode`

字段：

- `id`
- `userId`
- `skillNodeId nullable`
- `routeId`
- `stageId nullable`
- `routeWeekId nullable`
- `name`
- `domain`
- `track`
- `currentLevel Int default 0`
- `nextGate String`
- `requiredArtifact String`
- `linkedResourceUrls Json`
- `confidence Int default 0`
- `lastEvidenceAt DateTime?`
- `createdAt`
- `updatedAt`

#### `CodexSidecarTask`

字段：

- `id`
- `userId`
- `planBlockId nullable`
- `routeWeekId nullable`
- `title`
- `prompt`
- `status`
- `repoUrl nullable`
- `outputSummary nullable`
- `artifactUrl nullable`
- `createdAt`
- `updatedAt`

### 调整现有模型

#### `DailyPlan`

建议新增：

- `routeSnapshotJson Json?`
- `routeWeekIds String[]` 或单独关联表

#### `PlanBlock`

建议新增：

- `routeId String?`
- `routeStageId String?`
- `routeWeekId String?`
- `fixedSlotTemplateId String?`
- `courseSlotId String?`
- `openAgentSlotId String?`
- `protected Boolean default false`
- `flexible Boolean default true`
- `routeTopic String?`
- `slotSource String?`

### 命令

1. `npx prisma format`
2. `npx prisma migrate dev --name cognitive_route_engine_v1`
3. `npm run typecheck`

### 网页测试

迁移后立即启动本地或线上测试环境：

1. 登录 `/settings`，确认页面无 schema 报错。
2. 打开 `/plan/today`，旧计划仍能显示。
3. 打开 `/skills`，旧技能树仍能显示。
4. 打开 `/resources`，旧资源库仍能显示。

### 迭代规则

- 如果旧页面因为 nullable relation 报错，立即补 `include/select` 或 fallback。
- 不进入 seed 阶段，直到旧页面全部可用。

## 阶段 2：Seed 文件与导入脚本

### 新增文件

- `seed/cognitive-routes.seed.json`
- `scripts/import-cognitive-routes.ts`
- 可选：`lib/routes/seed-schema.ts`

### Route Seed

必须 seed 这些 routes：

1. `Chip/EDA Main Cognitive Route`
2. `AI Systems Parallel Route`
3. `Business/Finance/Management/Expression Parallel Route`
4. `Body Route`
5. `Vocal Route`
6. `Dance Route`
7. `Music Production Route`

### Chip/EDA Main Route

#### Stage 1：CPU 架构认知升级，Weeks 1-4，SERIAL

Week 1:

- title: `RV32I baseline 与 ISA 语义`
- topics:
  - RV32I 指令格式
  - 整数指令
  - load/store
  - branch/jump
  - 当前用户已有 RV32I CPU 覆盖与缺口
- resources:
  - `https://riscv.org/technical/specifications/`
- evidence:
  - `rv32i_architecture_map.md`
  - `rv32i_gap_map.md`

Week 2:

- title: `Pipeline / Hazard`
- topics:
  - 5-stage pipeline
  - data hazard
  - control hazard
  - forwarding
  - stall
  - flush
- resources:
  - `https://inst.eecs.berkeley.edu/~cs152/`
- evidence:
  - `pipeline_hazard_map.md`

Week 3:

- title: `Branch / Cache / Memory hierarchy`
- topics:
  - branch predictor
  - BTB
  - BHT
  - I-cache
  - D-cache
  - miss penalty
  - memory wall
- resources:
  - `https://inst.eecs.berkeley.edu/~cs152/`
- evidence:
  - `branch_cache_memory_map.md`

Week 4:

- title: `OoO / Modern core mental model`
- topics:
  - register renaming
  - reorder buffer
  - issue queue
  - commit
  - load/store queue
  - speculation
  - why OoO verification is hard
- resources:
  - `https://docs.boom-core.org/`
- evidence:
  - `ooo_mental_model.md`

#### Stage 2：Verification and Reliable Digital Systems，Weeks 5-8，SERIAL

Week 5:

- title: `Verification mindset`
- topics: DUT, testbench, monitor, scoreboard, coverage, directed tests, random tests
- resources: `https://verificationacademy.com/`
- evidence: `verification_concept_map.md`

Week 6:

- title: `cocotb / Verilator`
- topics: lint, simulation, Python testbench, regression, CI
- resources:
  - `https://verilator.org/guide/latest/`
  - `https://docs.cocotb.org/en/stable/`
- evidence: `verilator_cocotb_workflow_map.md`

Week 7:

- title: `UVM conceptual model`
- topics: sequence, driver, monitor, scoreboard, env, agent, factory, reuse
- resources:
  - `https://accellera.org/downloads/standards/uvm`
  - `https://www.chipverify.com/`
- evidence: `uvm_concept_map.md`

Week 8:

- title: `DFT / Reliability`
- topics: fault model, test generation, fault simulation, BIST, reliable digital systems
- resources: `EE658 course material if available`
- evidence: `dft_reliability_map.md`

#### Stage 3：EDA/CAD and RTL-to-GDS，Weeks 9-14，SERIAL

Week 9: `Synthesis`

- topics: RTL to netlist, logic optimization, technology mapping, constraints
- resources: `https://yosyshq.readthedocs.io/projects/yosys/en/latest/`
- evidence: `synthesis_flow_map.md`

Week 10: `Physical design flow`

- topics: floorplan, placement, CTS, routing, DRC, congestion
- resources: `https://openroad.readthedocs.io/en/latest/`
- evidence: `physical_design_flow_map.md`

Week 11: `Timing / Power / Area`

- topics: slack, critical path, utilization, power, area, PPA tradeoff, design closure
- resources: OpenROAD docs, EE680 material if available
- evidence: `ppa_tradeoff_map.md`

Week 12: `CAD algorithms`

- topics: partitioning, floorplanning, placement, routing, graph algorithms, optimization
- resources: EE680 material if available
- evidence: `cad_algorithm_map.md`

Week 13: `AI for EDA`

- topics: ML placement, routing prediction, design space exploration, PPA prediction, closure automation
- resources: `https://www.synopsys.com/ai.html`
- evidence: `ai_eda_landscape_map.md`

Week 14: `Commercial EDA landscape`

- topics: Cadence, Synopsys, Siemens, Keysight, open-source EDA gaps, commercial tool value
- resources:
  - `https://www.cadence.com/en_US/home/training.html`
  - `https://training.plm.automation.siemens.com/index.cfm`
- evidence: `commercial_eda_landscape.md`

#### Stage 4：ASIC / Accelerator / SoC，Weeks 15-18，SERIAL

Week 15: `Complex ASIC flow`

- topics: algorithm-to-chip, RTL, accelerator, synthesis, physical design, post-fabrication
- resources: EE524 material if available
- evidence: `complex_asic_flow_map.md`

Week 16: `AI accelerator architecture`

- topics: systolic array, dataflow, memory hierarchy, compute/memory tradeoff
- resources:
  - `https://eyeriss.mit.edu/`
  - `https://github.com/ucb-bar/gemmini`
- evidence: `ai_accelerator_map.md`

Week 17: `SoC generator`

- topics: Rocket, BOOM, TileLink, config, generator thinking
- resources: `https://chipyard.readthedocs.io/en/stable/`
- evidence: `chipyard_soc_map.md`

Week 18: `NoC / Interconnect`

- topics: topology, routing, deadlock, bandwidth, latency, data movement
- resources: NoC surveys
- evidence: `noc_interconnect_map.md`

### AI Systems Parallel Route

Starts Week 1, runs every weekday 14:00-15:00.

- Week 1-4: Context Engineering
  - long context
  - state
  - prompt version
  - retrieval
  - working memory
- Week 5-8: Tool Call / Tool Result
  - tool_call_id
  - tool_result
  - idempotency
  - retry
  - state settlement
- Week 9-12: Trace / Replay / Eval
  - trace
  - replay
  - audit
  - model repair
  - eval harness
- Week 13-16: Codex Sidecar Workflow
  - task spec
  - execution diff
  - human review
  - artifact ingestion
- Week 17-20: Resource Route Engine
  - resource to route
  - route to skill
  - skill to block
  - block to evidence
- Week 21-24: Repair Agent
  - conflict input
  - protected anchor
  - flexible block
  - remaining-day repair

### Business / Finance / Management / Expression Parallel Route

Starts Week 1, runs every weekday 11:30-12:00.

- Week 1-4: Personal cash flow and finance basics
  - resource: `https://pages.stern.nyu.edu/~adamodar/`
- Week 5-8: Semiconductor value chain and company map
- Week 9-12: Startup and product thinking
  - resource: `https://www.ycombinator.com/library`
- Week 13-16: Management and organization
- Week 17-20: Expression and public speaking
  - resource: `https://www.toastmasters.org/`
- Week 21-24: Career network and family resource strategy

### Art Routes

Vocal route:

- daily slot: 17:00-17:40
- resources:
  - `https://estillvoice.com/`
  - `https://completevocal.institute/`
- evidence:
  - 60-second recording
  - clean take
  - phrase analysis

Dance route:

- daily slot: 17:40-18:20
- resources:
  - `https://www.steezy.co/`
  - `https://www.clistudios.com/`
- evidence:
  - 30-second video
  - 60-second routine

Music route:

- daily slot: 18:20-18:50
- resources:
  - `https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/`
  - `https://www.soundgym.co/`
  - `https://online.berklee.edu/`
- evidence:
  - 8-bar loop
  - exported wav
  - ear training record

### Body / Diet Route

Daily structure:

- 03:30-04:00 body activation
- 07:00-08:00 training
- 09:00 first meal
- 16:00 second meal, movable if course conflicts

Diet default:

- romaine lettuce
- boiled eggs
- chicken thigh or beef patty
- bread as main carb
- Greek yogurt + chia seeds + frozen blueberries + small amount of nuts
- boiled broccoli
- fish oil
- magnesium
- creatine
- One A Day
- vitamin C
- vitamin D

Diet check-in fields:

- `protein_ok`
- `vegetable_ok`
- `fruit_ok`
- `carb_ok`
- `supplements_taken`
- `overeating_or_not`

### FixedTimeSlotTemplate Seed

必须 seed 以下固定时间片：

| Time | Title | Type | Domain | Protected | Flexible |
|---|---|---|---|---:|---:|
| 03:00-03:30 | 起床启动 / 今日冲突输入 | ANCHOR | null | true | false |
| 03:30-04:00 | 身体激活 | ANCHOR | Body | true | false |
| 04:00-06:00 | 当前 Stage 主认知主题 A | FIXED_ROUTE | Chip/EDA | true | false |
| 06:00-07:00 | 当前 Stage 主认知主题 B | FIXED_ROUTE | Chip/EDA | true | false |
| 07:00-08:00 | 运动训练 | ANCHOR | Body | true | true |
| 08:00-08:30 | 洗澡整理 | ANCHOR | null | false | true |
| 08:30-09:00 | 当前 Stage 主资料输入 | FIXED_ROUTE | Chip/EDA | false | true |
| 09:00-09:30 | 第一餐 | MEAL | Body/Diet | true | false |
| 09:30-11:30 | 当前 Stage 主认知主题 C | FIXED_ROUTE | Chip/EDA | false | true |
| 11:30-12:00 | 并行 Stage 6 商业/表达 | PARALLEL_ROUTE | Business | false | true |
| 12:00-14:00 | CourseSlot A；无课回落当前 Stage | COURSE_SLOT | null | false | true |
| 14:00-15:00 | 并行 Stage 5 AI Systems | PARALLEL_ROUTE | AI Systems | false | true |
| 15:00-16:00 | OpenSlot 外联/课程/生活事项 | OPEN_AGENT_SLOT | null | false | true |
| 16:00-16:30 | 第二餐 | MEAL | Body/Diet | true | true |
| 16:30-17:00 | 饭后走路 | ANCHOR | Body | false | true |
| 17:00-17:40 | 声乐 | ART_SLOT | Vocal | false | true |
| 17:40-18:20 | 舞蹈 | ART_SLOT | Dance | false | true |
| 18:20-18:50 | 音乐制作/耳训 | ART_SLOT | Music | false | true |
| 18:50-19:20 | LifeOS 日结/技能证据 | ANCHOR | Life Operations | true | false |
| 19:20-20:00 | 下线/洗漱/睡眠准备 | SHUTDOWN | null | true | false |

### Seed 命令

- `tsx scripts/import-cognitive-routes.ts`
- 可集成进 `scripts/import-seed.ts`，但需要保持可单独运行。

### 网页测试

1. 登录 `/settings`，确认 route seed 统计显示数量。
2. 打开 `/routes`，确认 7 条 route 均出现。
3. 打开 `/routes/current`，确认当前周主题有 Chip/EDA、AI Systems、Business、Body、Vocal、Dance、Music。
4. 打开 `/plan/new`，生成提示包，确认 prompt context 包含 route snapshot。
5. 打开 `/plan/today`，旧计划不报错，新计划 block 能显示 route 信息。

### 迭代规则

- 如果 seed 重跑产生重复数据，修 upsert key。
- 如果 `/routes/current` 周计算错误，优先修 `lib/routes/current-week.ts`。

## 阶段 3：Route 编译服务

### 新增文件

- `lib/routes/current-week.ts`
- `lib/routes/compile-route-context.ts`
- `lib/routes/fixed-slots.ts`
- `lib/routes/course-slots.ts`
- `lib/routes/open-agent-slots.ts`
- `lib/routes/route-evidence.ts`

### 逻辑

1. 根据 `CognitiveRoute.startDate` 计算当前 week index。
2. 读取 active routes。
3. 对每条 route 找到当前 `RouteStage` 与 `RouteWeek`。
4. 读取 `FixedTimeSlotTemplate`。
5. 按日期与 dayOfWeek 匹配 `CourseSlot`。
6. CourseSlot 覆盖对应固定时间片。
7. `OpenAgentSlot` 只插入开放槽，不允许覆盖 protected slot。
8. 生成 `RouteContextSnapshot`，供 prompt、fallback、页面共同使用。

### 单元测试

新增：

- `lib/routes/current-week.test.ts`
- `lib/routes/fixed-slots.test.ts`
- `lib/routes/course-slots.test.ts`

测试点：

- Week 1、Week 4、Week 5 切换正确。
- SERIAL stage 只能按 order 进入。
- PARALLEL route 从 Week 1 同时出现。
- CourseSlot 覆盖 12:00-14:00。
- 第二餐冲突时移动到允许窗口。
- protected slots 不被 OpenAgentSlot 覆盖。

### 网页测试

通过浏览器操作：

1. `/routes/current` 显示当前 week。
2. 手动新增一个 CourseSlot。
3. 刷新 `/routes/current`，确认课程覆盖。
4. 删除或停用 CourseSlot，确认回落到 current stage topic。

## 阶段 4：页面 `/routes` 与 `/routes/current`

### 新增路由

- `app/routes/page.tsx`
- `app/routes/current/page.tsx`
- `app/api/routes/route.ts`
- `app/api/routes/current/route.ts`

### 新组件

- `components/route-card.tsx`
- `components/current-route-board.tsx`
- `components/course-slot-form.tsx`
- `components/fixed-slot-grid.tsx`
- `components/route-week-panel.tsx`

### `/routes`

显示所有 CognitiveRoute：

- route name
- status
- current week
- current stage
- current theme
- resources
- expected evidence
- progress

必须显示：

- Chip/EDA Main Cognitive Route
- AI Systems Parallel Route
- Business Parallel Route
- Body
- Vocal
- Dance
- Music

### `/routes/current`

布局：

- 左侧：本周 Chip/EDA 主路线
- 中间：周一到周五每日时间片
- 右侧：AI Systems、Business、Art route、Diet route

重点：显示“主题”，不是普通 todo。

### 网页测试

每完成一个组件必须实际打开页面：

1. `/routes` 首屏可见 7 routes。
2. route card 点击可展开 current week resources 和 evidence。
3. `/routes/current` 可见本周 Chip/EDA 主题。
4. `/routes/current` 中间周视图有 03:00-20:00 slots。
5. 移动端宽度 390px 下无横向溢出。
6. 桌面 1440px 下右侧并行路线可读。

### 迭代规则

- 页面不允许变成营销页。
- 必须保持 DeepWiki-like 深色知识操作系统风格。
- 如果文本溢出，先调整布局密度，不引入大卡片套卡片。

## 阶段 5：CourseSlot UI 与 API

### 新增 API

- `app/api/course-slots/route.ts`
- `app/api/course-slots/[id]/route.ts`

### 字段

- `courseCode`
- `courseName`
- `instructor`
- `dayOfWeek`
- `startTime`
- `endTime`
- `location`
- `term`
- `source`

### 逻辑

- CourseSlot 导入后，对应时间生成 locked PlanBlock。
- CourseSlot 优先级高于 FixedRouteSlot。
- 如果课程冲突第二餐，第二餐移动到 15:00-15:30 或 18:00-18:30。
- 如果课程冲突艺术，艺术降级但不断。
- 课程不改变长期 route，只作为输入证据。

### UI

- 在 `/routes/current` 添加课程录入表单。
- 在 `/plan/today` block 上显示 course name、course code、location。
- 支持 active/inactive。

### 网页测试

1. 在 `/routes/current` 新增课程：
   - courseCode: `EE_TEST`
   - time: 12:00-13:30
2. 打开 `/plan/new` 生成计划。
3. 导入计划或使用 fallback。
4. 打开 `/plan/today`，确认 12:00-13:30 显示课程 block。
5. 停用该 CourseSlot。
6. 再生成计划，确认 12:00-14:00 回落到 route topic。

## 阶段 6：OpenAgentSlot 与 Repair 约束

### 新增 API

- `app/api/open-agent-slots/route.ts`
- `app/api/plan/repair/route.ts`

### OpenAgentSlot 用途

只允许：

- temporary conflict
- professor meeting
- course overflow
- life admin
- networking
- Codex review

不允许改变：

- current Stage
- weekly topic
- sleep boundary
- body anchors
- art continuity

### 计划修复规则

1. 只修复当前时间之后的 blocks。
2. 已完成或已打卡 blocks 不改。
3. `protected=true` blocks 不改。
4. CourseSlot 不改。
5. OpenAgentSlot 只填可开放时间。
6. AI Systems 与 Business 只能压缩，不得删除。
7. Art continuity 必须保留最小版本。
8. 20:00 sleep boundary 不可破坏。

### 网页测试

1. `/plan/today` 输入“15:00 有教授 meeting”。
2. 点击 Repair。
3. 确认 15:00-16:00 OpenAgentSlot 变化。
4. 确认 04:00-07:00 Chip/EDA protected blocks 不动。
5. 确认 19:20-20:00 shutdown 不动。
6. 确认页面显示 repair reason。

## 阶段 7：Plan Generation / Manual Prompt / Fallback 接入 Route Engine

### 修改文件

- `lib/plan/compile-context.ts`
- `lib/plan/manual-prompt.ts`
- `lib/plan/prompt.ts`
- `lib/openai.ts`
- `lib/plan/persist-plan.ts`
- `app/api/plan/prompt-package/route.ts`
- `app/api/plan/import-json/route.ts`
- `app/api/plan/generate/route.ts`

### 新规则

1. 先确定今天属于哪一周。
2. 读取 active CognitiveRoute。
3. 读取当前 RouteWeek。
4. 生成当日日程时，固定时间片必须使用该 RouteWeek 的主题。
5. CourseSlot 覆盖对应时间。
6. OpenAgentSlot 只能被临时事项填充。
7. Agent 不得更改当前周主题。
8. 当天有课程时，课程自动视为对应 route 的外部输入。
9. 没有课程时，CourseSlot 回落到当前 Stage topic。
10. 艺术、身体、饮食、AI Systems、Business 并行线每天必须出现。

### Schema 调整

Daily plan JSON schema 建议增加：

- `route_id`
- `route_stage_id`
- `route_week_id`
- `fixed_slot_template_id`
- `course_slot_id`
- `open_agent_slot_id`
- `protected`
- `flexible`
- `route_topic`
- `slot_source`

### 网页测试

1. `/plan/new` 生成提示包。
2. 下载 `lifeos-daily-context.json`，确认包含 current routes 和 route weeks。
3. 使用 DeepSeek E2E 或 ChatGPT 手动 JSON，导入计划。
4. `/plan/today` 每个固定 route block 显示 route/stage/week topic。
5. 尝试导入一个改掉 current week topic 的 JSON，系统必须拒绝或自动标记错误。

## 阶段 8：证据技能树

### 修改页面

- `app/skills/page.tsx`
- `components/skill-tree-panel.tsx`

### 新增文件

- `components/evidence-tree-panel.tsx`
- `app/api/route-evidence/route.ts`

### 顶层只显示 9 个 domain

1. Body
2. Vocal
3. Dance
4. Music Production
5. Chip/EDA
6. AI Systems
7. Business/Finance/Management
8. Expression/Social
9. Life Operations

### 点击 domain 后显示

- tracks
- evidence nodes
- nextGate
- requiredArtifact
- confidence
- lastEvidenceAt

### 迁移逻辑

- 保留现有 `SkillNode`。
- 新建 `RouteEvidenceNode` 作为证据树展示核心。
- `SkillEvidence` 与 `RouteEvidenceNode` 通过 route/stage/week 绑定或映射。
- 不把所有概念塞进技能树。

### 网页测试

1. 打开 `/skills`。
2. 确认首屏只出现 9 个 domain。
3. 点击 `Chip/EDA`，看到当前 week expected evidence。
4. 点击 `Body`，看到 Body/Diet evidence node。
5. 生成日结后，证据节点 `lastEvidenceAt` 更新。

## 阶段 9：Codex Sidecar Task

### 新增页面/API

- `app/sidecar/page.tsx` 或集成 `/agents`
- `app/api/sidecar-tasks/route.ts`
- `components/codex-sidecar-task-panel.tsx`

### 绑定字段

每个 Codex task 必须绑定：

- routeWeek
- planBlock
- expected artifact
- status
- outputSummary
- artifactUrl

### 逻辑约束

- Codex 不是路线制定者。
- Codex 只能执行 routeWeek/block 派发的 sidecar task。
- Sidecar output 进入 evidence，不重写 route。

### 网页测试

1. 从 `/plan/today` 的 Chip/EDA block 创建 sidecar task。
2. `/sidecar` 或 `/agents` 显示任务。
3. 标记任务 DONE 并填 artifactUrl。
4. `/skills` 对应 evidence node 出现或更新。

## 阶段 10：完整端到端验收

### 数据库验收

1. `npx prisma migrate status`
2. `tsx scripts/import-cognitive-routes.ts`
3. 数据计数：
   - CognitiveRoute >= 7
   - RouteStage >= required stages
   - RouteWeek >= route weeks
   - FixedTimeSlotTemplate >= 20
   - RouteEvidenceNode > 0

### 本地质量

1. `npm run lint`
2. `npm run typecheck`
3. `npm run test`
4. `npm run build`

### 真实网页 E2E

必须使用浏览器逐步测试：

1. 登录。
2. `/routes` 检查 7 routes。
3. `/routes/current` 检查当前周板。
4. 新增 CourseSlot。
5. `/plan/new` 生成提示包。
6. 使用手动 JSON 或 DeepSeek E2E 导入计划。
7. `/plan/today` 检查 route/stage/week topic。
8. 打卡一个 Chip/EDA block。
9. 创建一次 OpenAgentSlot conflict。
10. Repair plan。
11. 打卡一个 art block。
12. 生成日结。
13. `/skills` 检查证据树更新。
14. `/agents` 或 `/sidecar` 检查 AgentRun / SidecarTask 审计记录。

### 线上部署

1. `npm run build`
2. `systemctl restart aialra-lifeos.service`
3. `systemctl is-active aialra-lifeos.service`
4. `curl -I https://lifeos.aialra.online/routes`
5. 浏览器重复关键 E2E：
   - `/routes`
   - `/routes/current`
   - `/plan/new`
   - `/plan/today`
   - `/skills`

### 审计

1. Git 敏感信息扫描：
   - OpenAI key
   - DeepSeek key
   - Supabase service role
   - database password
   - user password
2. AgentRun 审计：
   - inputJson 保存
   - outputJson 保存
   - error 保存
   - startedAt/completedAt 保存
3. Route audit：
   - Agent 不可重写 route topic
   - protected slot 不可移动
   - CourseSlot 覆盖可追踪

### 完成报告

必须输出：

- 修改文件
- migration 名称
- 新增模型
- seed 数据数量
- API route 列表
- 页面 route 列表
- 浏览器测试截图或日志路径
- lint/typecheck/test/build 结果
- 线上部署结果
- 已知问题
- 下一步 PR 建议

## 回滚策略

1. 保留迁移前 commit。
2. 如果页面失败但迁移成功：
   - revert UI commit
   - 保留 DB schema，隐藏新入口
3. 如果迁移失败：
   - 不部署
   - 回滚 Prisma migration
4. 如果线上失败：
   - `git checkout <previous-good-commit>`
   - `npm run build`
   - `systemctl restart aialra-lifeos.service`

## 最终验收标准

必须全部通过：

1. `npm run lint` 通过。
2. `npm run typecheck` 通过。
3. Prisma migration 成功。
4. Seed 成功导入 CognitiveRoute、RouteStage、RouteWeek、FixedTimeSlotTemplate。
5. `/routes` 可显示路线。
6. `/routes/current` 可显示当前周确定性主题板。
7. `/plan/today` 的 block 能显示 route/stage/week topic。
8. CourseSlot 能手动新增，并覆盖对应时间片。
9. 没有课程时，CourseSlot 回落当前 Stage 主题。
10. Skills 页面能以 9 个 domain 展示证据树。
11. Art、Body、Diet 路线被 seed，并在 plan 中每天出现。
12. AI Systems 与 Business route 从 Week 1 并行出现。
13. Agent 不会每天重新生成长期路线。
14. 完成报告列出所有修改、migration、seed、测试结果、已知问题。
