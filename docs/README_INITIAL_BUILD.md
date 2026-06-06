# Aialra Life OS 初始系统实现计划

## 0. 仓库建议

- 推荐仓库名：`aialra-lifeos`
- 产品名：`Aialra Life OS`
- 域名占位：`https://<SUBDOMAIN>.aialra.online`
- 视觉参考：`DeeeeeepWiki.aialra.online` 的深色知识库/DeepWiki 风格；MVP 不做完全复刻，做“暗色知识操作系统”：左侧导航 + 中央时间轴 + 右侧技能树/资源/Agent状态 + 顶部命令栏。

## 1. 第一版只做什么

第一版必须能让用户每天形成闭环：

1. 登录进入个人 dashboard。
2. 输入今日临时事项、必须完成节点、身体/精神状态、可用时间。
3. 系统读取长期核心框架、资源库、技能树、过去执行记录。
4. 调用 OpenAI Deep Research API 或普通 Responses API 生成今日半小时级计划。
5. 用户按 block 打卡，每个 block 记录完成状态、能量、专注、备注、产出物。
6. 晚上 18:30-19:30 生成日结：完成度、技能树变化、明日建议、风险提示。
7. 资源库可以手动增补 URL/资料/备注。
8. 技能树能显示当前水平、目标水平、证据缺口。

第一版不做：移动端复杂适配、多人协作、自动爬虫、复杂文件解析、自动购买课程、全功能知识图谱、完全自动治疗/医疗建议。

## 2. 技术栈

- 前端：Next.js App Router + TypeScript + React Server/Client Components
- UI：Tailwind CSS + shadcn/ui + lucide-react + recharts + react-hook-form + zod
- 后端：Next.js Route Handlers + Server Actions
- 数据库/Auth/Storage：Supabase Postgres + Supabase Auth + Supabase Storage
- ORM：Prisma for normal relational tables; raw SQL for pgvector extension if needed
- AI：OpenAI API, especially Responses API and Deep Research models
- 部署：Vercel connected to GitHub, custom domain under `aialra.online`
- 版本管理：GitHub main/dev branch; GitHub Actions for lint/typecheck/test

## 3. 页面结构

### Public

- `/login`：登录页
- `/`：登录后 redirect 到 `/dashboard`

### App Shell

- `/dashboard`：今日总览：锚点、计划进度、技能热力图、Agent状态
- `/plan/today`：今日半小时计划，逐块打卡
- `/plan/new`：今日输入表单，生成计划
- `/review/daily`：日结、风险、技能树更新
- `/skills`：技能树面板
- `/resources`：资源库列表/搜索/新增
- `/resources/[id]`：资源详情、笔记、关联技能节点
- `/agents`：Agent run 列表、Deep Research进度、日志
- `/journal`：日记/复盘/决策记录
- `/settings`：个人配置、API Key状态提示、锚点设置

## 4. 核心用户流

### Morning Flow

1. 用户 03:00 起床。
2. 打开 `/plan/new`。
3. 输入：
   - 今日必须完成事项
   - 临时事项/约会
   - 身体状态：睡眠、疼痛、体重、精力
   - 精神状态：焦虑、专注、冲动风险
   - 今日是否需要新资源研究
4. 点击 `Generate Today Plan`。
5. 系统调用 `/api/plan/generate`。
6. 生成 plan + blocks，保存到数据库。
7. 跳转 `/plan/today`。

### Execution Flow

1. 每个时间块显示：任务、方法、资源、产出物。
2. 点击 block → 记录完成/部分/错过。
3. 输入：能量、专注、备注、产出物链接。
4. 系统保存 ExecutionLog。
5. block 状态更新。

### Evening Flow

1. 18:30 进入 `/review/daily`。
2. 系统聚合当天 logs。
3. AI 生成日结：完成度、风险、技能树更新建议、明日重点。
4. 用户确认后写入 SkillEvidence / MetricSnapshot / JournalEntry。

## 5. AI生成逻辑

### Planner Pipeline

`/api/plan/generate`

Input:
- DailyInput
- CoreFramework active version
- anchors
- daily template
- skill tree summary
- resource library relevant top 20
- last 7 days completion summary
- active backlog

Steps:
1. Preflight：判断风险和过载。
2. Context Builder：压缩上下文，避免一次输入过长。
3. Research Decision：若 today_input.requires_research=true 或用户要求新资源，则调用 Deep Research；否则普通 Responses API。
4. Plan Compiler：要求输出严格 JSON，符合 daily_plan_schema。
5. Validator：检查半小时段、锚点、必需领域、睡眠约束、资源ID、技能节点ID。
6. Persist：写入 DailyPlan、PlanBlock、关联 Resource/Skill。

### 推荐模型策略

- 标准日程：Responses API + 强结构化输出，低成本快速。
- 资源研究/课程审查/行业扫描：`o3-deep-research` 或 `o4-mini-deep-research`，`background=true`，工具包含 web_search_preview；V2 加 file_search 和 code_interpreter。
- 输出必须保存 AgentRun，不允许“生成完就丢”。

## 6. 数据种子

本包包含：

- `seed/resources.seed.json`：48个初始资源，覆盖芯片/EDA、AI agent、声乐、舞蹈、音乐、商业管理、部署技术栈。
- `seed/core-framework.seed.json`：长期核心框架、锚点、硬约束、过载规则。
- `seed/skill-tree.seed.json`：初始技能树。
- `seed/daily-template.seed.json`：03:00-20:00 半小时模板。
- `seed/ai-output-schemas.seed.json`：AI输出schema。

## 7. MVP完成定义

MVP 只有达到以下条件才算完成：

1. 本地 `npm run dev` 正常启动。
2. Supabase Auth 能登录。
3. seed 数据可导入。
4. `/dashboard` 能显示今日锚点、技能树、资源数量。
5. `/plan/new` 能输入今日信息并生成计划。
6. `/plan/today` 能显示半小时计划并打卡。
7. `/review/daily` 能聚合当天完成度。
8. `/resources` 能展示并新增资源。
9. `/skills` 能显示树状技能节点。
10. `/agents` 能看到AI生成记录。
11. Vercel 部署成功，域名可访问。
12. README 写清楚环境变量、部署步骤、seed导入步骤。

