# UI Spec: DeepWiki-like Aialra Life OS

## 1. 视觉原则

关键词：dark, dense, structured, knowledge-graph, command-center, terminal-like, not cute, not wellness-app.

## 2. 颜色

- background: #070A0F / #0B0F16
- panel: rgba(255,255,255,0.04)
- panel-border: rgba(255,255,255,0.08)
- text-primary: #E6EDF3
- text-secondary: #9BA8B7
- accent-blue: #7AA2FF
- accent-green: #4ADE80
- accent-purple: #A78BFA
- danger: #FB7185
- warning: #FBBF24

## 3. 布局

```
┌──────────────────────────────────────────────┐
│ Top Command Bar: date / search / generate     │
├──────────────┬────────────────┬──────────────┤
│ Left Nav      │ Main Content    │ Right Panel  │
│ Dashboard     │ Today Timeline  │ Skill Tree   │
│ Plan          │ Resource Wiki   │ Agent Runs   │
│ Resources     │ Review          │ Risk Flags   │
│ Skills        │                 │              │
└──────────────┴────────────────┴──────────────┘
```

## 4. 必要组件

- `AppShell`
- `SidebarNav`
- `CommandBar`
- `AnchorStrip`
- `TodayTimeline`
- `PlanBlockCard`
- `ExecutionCheckinDialog`
- `SkillTreePanel`
- `ResourceCard`
- `AgentRunPanel`
- `DailyInputForm`
- `ReviewSummaryCard`
- `RiskFlagBadge`
- `ArtifactLinkInput`

## 5. 页面细节

### Dashboard

- 顶部：今日日期、睡眠锚点、当前时间块。
- 中间：今日进度 ring + 时间轴预览。
- 右侧：技能树变化、Agent状态、风险提示。

### Today Plan

- 时间轴按 30 分钟一行。
- 当前 block 高亮。
- 已完成绿色，部分完成黄色，错过红色，未开始灰色。
- 每行显示：时间、domain、任务、expected_output、关联资源、关联技能节点。

### Resource Wiki

- 左侧分类：Chip/EDA, AI Agent, Business, Arts, Infrastructure。
- 中间卡片：名称、语言、价格、深度、岗位匹配度、替换风险。
- 右侧详情：完成门槛、使用阶段、访问渠道、笔记。

### Skill Tree

- MVP 可用 nested accordion，不强行做图谱。
- 每个节点显示 current/target、证据数量、最近更新时间。

## 6. 交互原则

- 每个 block 的完成记录必须少于 30 秒填写。
- 用户永远不需要在晚上做复杂决策。
- 任何 AI 输出都必须可编辑、可回滚、可审计。
- 新资源默认 status=REVIEW，人工确认后 ACTIVE。
