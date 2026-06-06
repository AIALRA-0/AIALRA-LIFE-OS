# Aialra Life OS v0.1 全量初始项目构建包

## 1. 唯一推荐实现路线

构建一个 Next.js + Supabase + OpenAI Deep Research API 的私人个人操作系统网站，仓库名推荐：`aialra-lifeos`。

第一版不追求做成万能知识库，而是先完成“每日闭环”：

- 03:00 起床后输入当天临时事项/状态。
- 系统基于长期框架、资源库、技能树、历史执行记录，生成 03:00-20:00 半小时计划。
- 用户按 block 执行并打卡。
- 系统晚上生成日结、更新技能树、记录风险和明日建议。
- 资源库和技能树持续增长。

## 2. 为什么这样做

你的核心需求不是固定机器人计划，而是“长期框架固定 + 每日计划动态生成”。因此系统必须有三层：

1. 核心宪法层：锚点、硬约束、主线/副线权重、过载规则。
2. 知识资源层：资源库、技能树、历史记录、执行证据。
3. 动态调度层：每日输入 -> AI生成计划 -> 执行记录 -> 晚间复盘 -> 次日调整。

## 3. 系统模块

### 3.1 Long-Term Core Framework

负责保存：
- 20:00睡、03:00起
- 每日锚点
- 每日必须领域
- 主线优先级
- 过载保护规则

### 3.2 Resource Library

保存所有资源：
- URL
- 语言
- 价格
- 学习深度
- 实操性
- 岗位匹配度
- 完成门槛
- 替换风险
- 访问渠道
- 使用阶段

### 3.3 Skill Tree

记录目标能力结构：
- currentLevel
- targetLevel
- evidenceRequired
- skill evidence
- 对应资源和计划块

### 3.4 Daily Planning Engine

输入：
- 今日必须事项
- 临时事项
- 身体/精神状态
- 核心框架
- 资源库
- 技能树
- 历史执行记录

输出：
- 半小时计划
- 每块训练方法
- 每块产出物
- 每块关联资源/技能节点
- rescue plan

### 3.5 Execution and Audit

每个 block 都要记录：
- 完成状态
- 实际开始/结束
- 能量/专注
- 备注
- 产出物链接
- 冲动触发/过载原因

### 3.6 Review Engine

晚上生成：
- 完成率
- 技术主线产出
- 身体状态
- 技能树变化
- 风险点
- 明日建议

## 4. 第一版目录结构

```txt
aialra-lifeos/
  app/
  components/
  lib/
  prisma/
  seed/
  scripts/
  public/
  docs/
  .env.example
  README.md
  AGENTS.md
```

## 5. 技术选型理由

- Next.js：适合前后端一体、快速部署、App Router 和 Route Handlers 适合做私人操作系统。
- Supabase：一次性解决 Auth、Postgres、Storage 和后续 pgvector。
- Prisma：关系表开发效率高，类型安全强。
- OpenAI Responses/Deep Research API：可直接做每日计划、深度资源研究、背景任务。
- Vercel：最适合 GitHub 自动部署和自定义域名。

## 6. 必须实现顺序

1. 初始化 Next.js 项目。
2. 接 Supabase Auth。
3. 建 Prisma schema。
4. 写 seed import。
5. 做 dashboard/resource/skill 页面。
6. 做 daily input form。
7. 做 plan generator route。
8. 做 timeline + checkin。
9. 做 daily review。
10. 接 Deep Research run。
11. 部署 Vercel。

## 7. 不能做的事

- 不要先做复杂知识图谱。
- 不要先做自动爬虫。
- 不要把 AI agent 做成主线。
- 不要让计划超过 20:00。
- 不要让用户晚上再做复杂决策。
- 不要只生成静态页面。

## 8. 关键验收

一天从 03:00 到 20:00 能被系统完整记录，才算第一版成立。
