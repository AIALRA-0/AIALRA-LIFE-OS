import { z } from "zod";
import type { DailyInput } from "@prisma/client";
import type { LifeContext } from "@/lib/life-context";
import type { PlannerContext } from "@/lib/plan/compile-context";
import { GeneratedDailyPlanSchema } from "@/lib/plan/validate-plan";
import { compactJson } from "@/lib/utils/json";

export type PromptUploadFile = {
  filename: string;
  mimeType: string;
  description: string;
  content: string;
};

export function getDailyPlanJsonSchema() {
  return z.toJSONSchema(GeneratedDailyPlanSchema);
}

function getExternalMessageSummary(dailyInput: DailyInput) {
  if (
    typeof dailyInput.availableWindows === "object" &&
    dailyInput.availableWindows &&
    "externalMessageSummary" in dailyInput.availableWindows
  ) {
    return String((dailyInput.availableWindows as Record<string, unknown>).externalMessageSummary ?? "");
  }

  return "";
}

function buildDailyInputSnapshot(dailyInput: DailyInput) {
  return {
    date: dailyInput.date.toISOString().slice(0, 10),
    mustDo: dailyInput.mustDo,
    temporaryItems: dailyInput.temporaryItems,
    specialNeeds: dailyInput.specialNeeds,
    externalMessageSummary: getExternalMessageSummary(dailyInput),
    bodyStatus: dailyInput.bodyStatus,
    mentalStatus: dailyInput.mentalStatus
  };
}

function buildContextSnapshot({
  dailyInput,
  context,
  lifeContext
}: {
  dailyInput: DailyInput;
  context: PlannerContext;
  lifeContext: LifeContext;
}) {
  return {
    packageVersion: "manual-planner-files-v1",
    generatedAt: new Date().toISOString(),
    language: "zh-CN",
    workflow:
      "ChatGPT Pro 读取这些文件后只生成 daily_plan_schema JSON；Life OS 会在导入时强校验。",
    personalContext: lifeContext,
    dailyInput: buildDailyInputSnapshot(dailyInput),
    systemContext: {
      anchors: context.anchors,
      requiredDomains: context.requiredDomains,
      outputPolicy: {
        exactBlockCount: 34,
        allowedDomainIds: context.requiredDomains.map((domain) => domain.id),
        domainFieldRule:
          "每个 block.domain 必须优先使用 allowedDomainIds 里的精确 id，例如 vocal、dance、music、chip_eda。不要用领域名称替代 id。",
        skillIdRule:
          "skill_node_ids 只能使用 skillNodes 里真实存在的 id。不要把 domain id 例如 review、music、vocal 当成 skill_node_id。",
        routeBindingRule:
          "如果 block 来自 routeContext.fixedSlots 或 routeContext.routes，可填写 route_id、route_stage_id、route_week_id、fixed_slot_template_id、course_slot_id、open_agent_slot_id、protected、flexible、route_topic、slot_source。无法确定时留空，不要编造 id。"
      },
      mainlinePriority: context.coreFramework.mainline_priority,
      overloadRules: context.coreFramework.overload_rules,
      dailyTemplateSlots: context.dailyTemplate.slots,
      skillNodes: context.skillNodes.map((node) => ({
        id: node.id,
        parentId: node.parentId,
        name: node.name,
        domain: node.domain,
        currentLevel: node.currentLevel,
        targetLevel: node.targetLevel,
        evidenceRequired: node.evidenceRequired,
        description: node.description,
        sortOrder: node.sortOrder
      })),
      resources: context.resources.map((resource) => ({
        id: resource.id,
        name: resource.name,
        url: resource.url,
        language: resource.language,
        price: resource.price,
        learningDepth: resource.learningDepth,
        practicality: resource.practicality,
        jobMatch: resource.jobMatch,
        completionThreshold: resource.completionThreshold,
        replacementRisk: resource.replacementRisk,
        tags: resource.tags,
        phase: resource.phase,
        accessChannel: resource.accessChannel,
        status: resource.status
      })),
      recentExecutionLogs: context.executionLogs.map((log) => ({
        status: log.status,
        energy: log.energy,
        focus: log.focus,
        urgeTrigger: log.urgeTrigger,
        note: log.note,
        artifactUrl: log.artifactUrl,
        createdAt: log.createdAt,
        block: log.planBlock
      })),
      routeContext: context.routeContext
    }
  };
}

function buildRulesMarkdown() {
  return [
    "# Aialra Life OS PlannerAgent 规则",
    "",
    "你是 Aialra Life OS 的每日计划 Agent。你的任务是生成 03:00-20:00 的半小时执行计划。",
    "",
    "## 输出规则",
    "",
    "- 只输出一个 JSON 对象，不要 Markdown，不要解释，不要代码块。",
    "- JSON 必须严格符合 `lifeos-daily-plan-schema.json`。",
    "- 所有用户可见文本必须使用简体中文。",
    "- `date` 必须等于今日输入里的日期。",
    "- `timezone` 使用用户上下文或系统上下文里的时区；没有时使用 `America/New_York`。",
    "",
    "## 时间规则",
    "",
    "- 必须覆盖 03:00-20:00。",
    "- 03:00-20:00 一共必须生成 34 个半小时 blocks。",
    "- 不能安排 03:00 前或 20:00 后的任务。",
    "- 每个 block 必须是 30 分钟粒度。",
    "- blocks 必须连续，不能有空洞，不能重叠。",
    "",
    "## 每日必需领域",
    "",
    "- 运动",
    "- 饮食",
    "- 声乐",
    "- 舞蹈",
    "- 音乐制作",
    "- 芯片/EDA",
    "- AI Agent",
    "- 商业金融管理表达",
    "- 复盘",
    "- `block.domain` 优先使用这些精确 id：`health`、`diet`、`vocal`、`dance`、`music`、`chip_eda`、`ai_agent`、`business`、`external_feedback`、`review`。",
    "- 声乐必须至少有一个 `domain: \"vocal\"` 的 block。",
    "- 舞蹈必须至少有一个 `domain: \"dance\"` 的 block。",
    "- 音乐制作必须至少有一个 `domain: \"music\"` 的 block。",
    "- 芯片/EDA 必须使用 `domain: \"chip_eda\"`，AI Agent 必须使用 `domain: \"ai_agent\"`。",
    "",
    "## 优先级",
    "",
    "- 芯片/EDA 是最高优先级主线，必须有可见产出。",
    "- AI Agent 是支线加速器，只能服务主线，不允许吞掉芯片/EDA。",
    "- 计划骨架必须优先使用 `lifeos-daily-context.json` 里的 `routeContext.fixedSlots`。",
    "- 受保护时间片 `protected: true` 不能移动、替换或删除。",
    "- 根据 `routeContext.routes[].currentStage/currentWeek` 选择当天路线主题，不要重新发明人生路线。",
    "- 03:30-04:00 必须是 Body Activation Route；07:00-08:00 必须是 Movement Training Route 或安全降级版。",
    "- 外部消息摘要里的紧急事项可以插入，但不能破坏睡眠边界和每日必需领域。",
    "",
    "## 产出规则",
    "",
    "- 每个 block 的 `expected_output` 必须可验证，例如：笔记、代码、练习记录、截图、报告、音频草稿、舞蹈练习记录。",
    "- `resource_ids` 和 `skill_node_ids` 只能使用 `lifeos-daily-context.json` 里存在的 id。",
    "- 不要把领域 id 当成技能节点 id，例如 `review`、`music`、`vocal`、`dance` 不是 skill_node_id，除非它们确实出现在 skillNodes 的 id 列表里。",
    "- 不确定资源或技能节点时填空数组，不要编造 id。",
    "- 最终输出前自己检查：所有必需领域都出现；所有 resource_ids 和 skill_node_ids 都能在上下文列表中找到；没有 20:00 后任务。",
    "",
    "## Rescue Plan",
    "",
    "- 如果能量低、疼痛高、焦虑高或冲动风险高，生成低强度 rescue plan。",
    "- rescue plan 仍要保护 03:00 起床、20:00 睡觉和芯片/EDA最小产出。",
    "- 高风险日降低强度，不降低结构。"
  ].join("\n");
}

function buildChatMessage() {
  return [
    "我上传了 3 个 Aialra Life OS 文件：",
    "",
    "1. `lifeos-daily-context.json`：个人背景、长期规划、今日输入、资源库、技能树、最近执行记录。",
    "2. `lifeos-daily-plan-schema.json`：你必须遵守的 JSON Schema。",
    "3. `lifeos-planner-rules.md`：每日计划规则。",
    "",
    "请完整读取这些文件，生成今天 03:00-20:00 的半小时执行计划。",
    "",
    "硬性要求：只输出一个 JSON 对象；不要 Markdown；不要解释；不要代码块；所有用户可见文本使用简体中文；JSON 必须符合 schema；每个 block 必须有可验证产出。"
  ].join("\n");
}

export function buildManualPlannerPromptPackage({
  dailyInput,
  context,
  lifeContext
}: {
  dailyInput: DailyInput;
  context: PlannerContext;
  lifeContext: LifeContext;
}) {
  const schema = getDailyPlanJsonSchema();
  const contextSnapshot = buildContextSnapshot({ dailyInput, context, lifeContext });
  const rulesMarkdown = buildRulesMarkdown();
  const chatMessage = buildChatMessage();
  const uploadFiles: PromptUploadFile[] = [
    {
      filename: "lifeos-daily-context.json",
      mimeType: "application/json",
      description: "每日计划上下文：个人背景、长期规划、今日输入、资源库、技能树、最近执行记录。",
      content: compactJson(contextSnapshot)
    },
    {
      filename: "lifeos-daily-plan-schema.json",
      mimeType: "application/json",
      description: "ChatGPT 必须输出的 daily_plan_schema JSON Schema。",
      content: compactJson(schema)
    },
    {
      filename: "lifeos-planner-rules.md",
      mimeType: "text/markdown",
      description: "PlannerAgent 硬规则：时间边界、必需领域、主线优先级、rescue plan、产出要求。",
      content: rulesMarkdown
    }
  ];

  const prompt = [
    "# Aialra Life OS 手动 PlannerAgent 提示包",
    "",
    "如果 ChatGPT 当前对话支持文件上传，优先上传下方 3 个文件，然后发送“开场消息”。如果不方便上传文件，直接复制本完整提示包。",
    "",
    "## 开场消息",
    "",
    chatMessage,
    "",
    "## 上传文件 1: lifeos-daily-context.json",
    "",
    uploadFiles[0].content,
    "",
    "## 上传文件 2: lifeos-daily-plan-schema.json",
    "",
    uploadFiles[1].content,
    "",
    "## 上传文件 3: lifeos-planner-rules.md",
    "",
    uploadFiles[2].content,
    "",
    "现在请直接输出最终 JSON。"
  ].join("\n");

  return {
    prompt,
    schema,
    chatMessage,
    uploadFiles,
    importInstructions:
      "推荐做法：下载并上传 3 个文件到 ChatGPT Pro，然后发送开场消息。让 ChatGPT 只返回 JSON。再把返回 JSON 粘贴回 Life OS 的导入框。无法上传文件时，可以复制完整提示包作为兜底。"
  };
}

export function buildDeepSeekPlannerPrompt({
  chatMessage,
  uploadFiles
}: {
  chatMessage: string;
  uploadFiles: PromptUploadFile[];
}) {
  return [
    chatMessage,
    "",
    "下面是这些文件的完整内容。请把它们当作已经上传的文件读取。",
    "",
    ...uploadFiles.flatMap((file) => [
      `## ${file.filename}`,
      "",
      file.content,
      ""
    ]),
    "",
    "再次强调：只输出 JSON 对象，不要 Markdown，不要解释，不要代码块。"
  ].join("\n");
}
