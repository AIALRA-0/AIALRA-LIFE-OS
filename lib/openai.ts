import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { DailyInput } from "@prisma/client";
import type { PlannerContext } from "@/lib/plan/compile-context";
import { buildHalfHourSlots } from "@/lib/utils/time";
import {
  GeneratedDailyPlanSchema,
  type GeneratedDailyPlan
} from "@/lib/plan/validate-plan";

export function hasOpenAIKey() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

export async function generateStructuredPlanWithOpenAI(prompt: string) {
  const client = getOpenAIClient();
  const response = await client.responses.parse({
    model: process.env.OPENAI_PLANNER_MODEL ?? "gpt-4.1",
    input: [
      {
        role: "system",
        content:
          "Generate an executable Aialra Life OS daily plan. User-facing title, method, expected_output, summary, rescue_plan, and success_criteria must be in Simplified Chinese. Output must match the provided schema."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    text: {
      format: zodTextFormat(GeneratedDailyPlanSchema, "daily_plan")
    }
  });

  if (!response.output_parsed) {
    throw new Error("OpenAI returned no parsed daily plan.");
  }

  return {
    responseId: response.id,
    plan: response.output_parsed
  };
}

export async function startDeepResearch(prompt: string) {
  const client = getOpenAIClient();

  try {
    const response = await client.responses.create({
      model: "o3-deep-research",
      input: prompt,
      background: true,
      tools: [{ type: "web_search_preview" }]
    });

    return {
      model: "o3-deep-research",
      responseId: response.id,
      outputText: response.output_text ?? null,
      raw: response
    };
  } catch (error) {
    const fallback = await client.responses.create({
      model: "o4-mini-deep-research",
      input: prompt,
      background: true,
      tools: [{ type: "web_search_preview" }]
    });

    return {
      model: "o4-mini-deep-research",
      responseId: fallback.id,
      outputText: fallback.output_text ?? null,
      raw: fallback,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function generateTextWithOpenAI(prompt: string, model = "gpt-4.1") {
  const client = getOpenAIClient();
  const response = await client.responses.create({
    model,
    input: prompt
  });

  return {
    responseId: response.id,
    outputText: response.output_text ?? ""
  };
}

function pickFirstId(ids: string[], fallback: string) {
  return ids[0] ?? fallback;
}

function resourceIdsFor(context: PlannerContext, matcher: (tags: string) => boolean) {
  return context.resources
    .filter((resource) => matcher(resource.tags.join(" ").toLowerCase()))
    .slice(0, 2)
    .map((resource) => resource.id);
}

function skillIdsFor(context: PlannerContext, matcher: (node: string) => boolean) {
  return context.skillNodes
    .filter((node) => matcher(`${node.id} ${node.name} ${node.domain}`.toLowerCase()))
    .slice(0, 2)
    .map((node) => node.id);
}

export function buildFallbackDailyPlan(
  dailyInput: DailyInput,
  context: PlannerContext,
  reason: string
): GeneratedDailyPlan {
  const bodyStatus = (dailyInput.bodyStatus ?? {}) as Record<string, number | undefined>;
  const mentalStatus = (dailyInput.mentalStatus ?? {}) as Record<string, number | undefined>;
  const rescue =
    (bodyStatus.energy ?? 3) <= 2 ||
    (bodyStatus.painLevel ?? 0) >= 3 ||
    (mentalStatus.anxiety ?? 0) >= 4 ||
    (mentalStatus.urgeRisk ?? 0) >= 4;

  const chipResources = resourceIdsFor(context, (tags) =>
    ["eda", "rtl", "verification", "verilog", "risc-v", "openroad"].some((tag) =>
      tags.includes(tag)
    )
  );
  const aiResources = resourceIdsFor(context, (tags) => tags.includes("openai") || tags.includes("ai"));
  const artsResources = resourceIdsFor(context, (tags) =>
    ["vocal", "dance", "music", "ear-training"].some((tag) => tags.includes(tag))
  );
  const businessResources = resourceIdsFor(context, (tags) =>
    ["business", "finance", "management"].some((tag) => tags.includes(tag))
  );

  const chipSkills = skillIdsFor(context, (node) =>
    ["chip_eda", "verification", "digital_ic", "open_source_eda"].some((id) =>
      node.includes(id)
    )
  );
  const healthSkills = skillIdsFor(context, (node) =>
    ["body", "sleep", "diet", "training"].some((id) => node.includes(id))
  );
  const artsSkills = skillIdsFor(context, (node) =>
    ["arts", "vocal", "dance", "music"].some((id) => node.includes(id))
  );
  const aiSkills = skillIdsFor(context, (node) => node.includes("ai_agent"));
  const businessSkills = skillIdsFor(context, (node) => node.includes("business"));
  const reviewSkills = skillIdsFor(context, (node) => node.includes("lifeos") || node.includes("review"));

  const blocks = buildHalfHourSlots().map((slot, index) => {
    const blockMap = [
      ["startup", "起床启动与身体读数", "喝水、洗漱、记录睡眠/体重/疼痛", "完成启动记录", healthSkills, []],
      ["review", "确认今日约束", "把必须事项写进计划输入并锁定20:00睡眠", "今日硬约束清单", reviewSkills, []],
      ["chip_eda", "芯片/EDA主线深工 1", "阅读/实现一个最小技术单元", "一个repo commit或技术笔记", chipSkills, chipResources],
      ["chip_eda", "芯片/EDA主线深工 2", "继续主线实验，记录失败点", "可复现实验记录", chipSkills, chipResources],
      ["chip_eda", "芯片/EDA主线深工 3", "补测试或波形/报告", "测试结果或截图", chipSkills, chipResources],
      ["health", "低刺激运动", rescue ? "步行+核心稳定" : "跑走结合+核心训练", "运动记录与疼痛评分", healthSkills, []],
      ["health", "恢复与拉伸", "腰椎友好拉伸、补水、整理训练感受", "恢复记录", healthSkills, []],
      ["diet", "第一顿饭", "蛋白+主食+蔬菜，记录饮食", "饮食记录", healthSkills, []],
      ["chip_eda", "芯片/EDA主线深工 4", "聚焦验证/RTL/EDA工具链产物", "主线产物增量", chipSkills, chipResources],
      ["chip_eda", "芯片/EDA主线深工 5", "运行或复盘一个工具链步骤", "命令/日志摘要", chipSkills, chipResources],
      ["chip_eda", "芯片/EDA主线深工 6", "把失败点转为下一步测试", "issue或todo记录", chipSkills, chipResources],
      ["chip_eda", "芯片/EDA主线深工 7", "完成一个可展示切片", "可见技术证据", chipSkills, chipResources],
      ["review", "主线中段审计", "确认今天芯片/EDA是否已有可见产物", "中段审计结论", reviewSkills, []],
      ["business", "商业/金融/表达", "学习一个概念并口述输出", "150字表达或录音", businessSkills, businessResources],
      ["business", "管理表达练习", "将技术产物讲给非技术听众", "表达稿或录音", businessSkills, businessResources],
      ["ai_agent", "AI Agent支线", "只做能加速主线的工作流", "一个prompt/脚本/自动化片段", aiSkills, aiResources],
      ["chip_eda", "主线补产物", "补齐今天最小可验证技术证据", "commit/笔记/截图之一", chipSkills, chipResources],
      ["ai_agent", "Agent审计", "检查AI输出是否服务主线", "agent审计记录", aiSkills, aiResources],
      ["music", "音乐制作/耳训", "SoundGym/FL Studio最小练习", "练习截图或音频片段", artsSkills, artsResources],
      ["diet", "第二顿饭", "清淡晚饭，记录饮食与过载风险", "晚饭记录", healthSkills, []],
      ["vocal", "声乐", "Estill/CVT小练习，低刺激录音", "30秒声乐记录", artsSkills, artsResources],
      ["dance", "舞蹈", "基础动作或编舞片段", "30秒视频或动作清单", artsSkills, artsResources],
      ["external_feedback", "外部反馈/行政", "处理一个求职、人际或行政节点", "发送/整理/记录一个外部动作", reviewSkills, []],
      ["review", "日结准备", "整理执行日志、产出物和风险", "日结素材", reviewSkills, []],
      ["review", "技能树更新", "把证据挂到技能节点", "技能证据记录", reviewSkills, []],
      ["review", "明日材料准备", "只准备材料，不开新战线", "明日第一块材料", reviewSkills, []],
      ["review", "关机降刺激", "屏幕降刺激，洗漱，确认20:00睡眠", "关机清单", healthSkills, []],
      ["review", "睡眠例行", "上床关灯，不补偿未完成任务", "20:00睡眠执行", healthSkills, []]
    ] as const;

    const mapped = blockMap[Math.min(index, blockMap.length - 1)];
    const [domain, title, method, expectedOutput, skillIds, resourceIds] = mapped;

    return {
      start: slot.start,
      end: slot.end,
      domain,
      title: index >= blockMap.length ? "缓冲与睡前降载" : title,
      method: index >= blockMap.length ? "只做低刺激整理，不新增任务" : method,
      expected_output: index >= blockMap.length ? "睡前稳定状态" : expectedOutput,
      skill_node_ids: skillIds.length > 0 ? [...skillIds] : [pickFirstId(context.skillNodes.map((node) => node.id), "root")],
      resource_ids: [...resourceIds],
      difficulty: rescue ? Math.min(3, index < 6 ? 2 : 1) : index >= 18 ? 2 : 3,
      checkin_required: true
    };
  });

  return {
    date: dailyInput.date.toISOString().slice(0, 10),
    timezone: context.coreFramework.timezone,
    day_theme: rescue ? "恢复日：保护睡眠，并交付一个主线产出" : "先完成主线证据，再扩展支线",
    risk_level: rescue ? "recovery" : "normal",
    anchors: context.anchors.map((anchor) => ({
      anchor_id: anchor.id,
      time: anchor.time,
      status: "planned",
      definition_of_done: anchor.definition_of_done
    })),
    blocks,
    rescue_plan: {
      trigger: reason,
      minimum_actions: [
        "保护 20:00 睡觉和 03:00 起床。",
        "完成身体和饮食锚点。",
        "至少做出一个可见的芯片/EDA产出，哪怕很小。",
        "如实记录未完成项，不把整天往后拖。"
      ]
    },
    success_criteria: [
      "20:00 睡眠边界没有被破坏。",
      "至少存在一个芯片/EDA可见产出。",
      "身体、饮食、声乐、舞蹈、音乐制作、AI Agent、商业表达、外部反馈和复盘都出现过。",
      "每个已打卡计划块都有诚实执行记录。"
    ],
    agent_tasks: [
      {
        agent: "PlannerAgentFallback",
        input: dailyInput.mustDo,
        output: "本地兜底计划",
        deadline: "03:30",
        human_review_required: true
      }
    ]
  };
}
