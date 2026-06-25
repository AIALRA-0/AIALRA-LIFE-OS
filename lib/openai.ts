import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { DailyInput } from "@prisma/client";
import type { PlannerContext } from "@/lib/plan/compile-context";
import { formatBodyActivationMethod } from "@/lib/body/activation-template";
import { evaluateBodySafety } from "@/lib/body/safety-rules";
import { formatMovementTrainingMethod } from "@/lib/body/movement-template";
import { buildHalfHourSlots, timeToMinutes } from "@/lib/utils/time";
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

function slotContains(slot: { startTime: string; endTime: string }, block: { start: string; end: string }) {
  return timeToMinutes(slot.startTime) < timeToMinutes(block.end) &&
    timeToMinutes(block.start) < timeToMinutes(slot.endTime);
}

function normalizeRouteDomain(domain?: string | null) {
  const value = (domain ?? "").toLowerCase();
  if (value.includes("chip")) return "chip_eda";
  if (value.includes("ai")) return "ai_agent";
  if (value.includes("business")) return "business";
  if (value.includes("diet")) return "diet";
  if (value.includes("vocal")) return "vocal";
  if (value.includes("dance")) return "dance";
  if (value.includes("music")) return "music";
  if (value.includes("body")) return "health";
  if (value.includes("life")) return "review";
  return null;
}

function routeForSlot(context: PlannerContext, slot: { slotType: string; routeDomain?: string | null; title: string }) {
  if (slot.slotType === "BODY_ACTIVATION") {
    return context.routeContext.routes.find((route) => route.name === "Body Activation Route") ?? null;
  }
  if (slot.slotType === "MOVEMENT_TRAINING") {
    return context.routeContext.routes.find((route) => route.name === "Movement Training Route") ?? null;
  }

  const normalized = normalizeRouteDomain(slot.routeDomain);
  if (normalized === "chip_eda") {
    return context.routeContext.routes.find((route) => route.domain === "Chip/EDA") ?? null;
  }
  if (normalized === "ai_agent") {
    return context.routeContext.routes.find((route) => route.domain === "AI Systems") ?? null;
  }
  if (normalized === "business") {
    return context.routeContext.routes.find((route) => route.domain === "Business") ?? null;
  }
  if (normalized === "vocal" || normalized === "dance" || normalized === "music") {
    return context.routeContext.routes.find((route) => route.domain.toLowerCase() === normalized) ?? null;
  }

  return null;
}

function idsForFallbackDomain(context: PlannerContext, domain: string) {
  const skillMatchers: Record<string, string[]> = {
    health: ["body", "sleep", "diet", "training", "body_activation", "movement"],
    diet: ["diet", "body"],
    vocal: ["vocal", "arts"],
    dance: ["dance", "arts"],
    music: ["music", "music_production", "arts"],
    chip_eda: ["chip_eda", "verification", "digital_ic", "open_source_eda", "riscv_soc"],
    ai_agent: ["ai_agent", "lifeos_product"],
    business: ["business", "finance", "management", "strategy"],
    external_feedback: ["social_expression", "job_pipeline"],
    review: ["lifeos_product", "root"]
  };
  const resourceMatchers: Record<string, string[]> = {
    vocal: ["vocal", "estill", "cvt"],
    dance: ["dance", "steezy"],
    music: ["music", "soundgym", "fl studio", "berklee"],
    chip_eda: ["eda", "rtl", "verification", "verilog", "risc-v", "openroad"],
    ai_agent: ["openai", "ai", "next.js", "supabase"],
    business: ["business", "finance", "management", "yc", "damodaran", "wharton"],
    external_feedback: ["career", "toastmasters"],
    review: ["lifeos"]
  };
  const skillTokens = skillMatchers[domain] ?? ["root"];
  const resourceTokens = resourceMatchers[domain] ?? [];

  return {
    skillIds: skillIdsFor(context, (node) => skillTokens.some((token) => node.includes(token))),
    resourceIds: resourceIdsFor(context, (tags) => resourceTokens.some((token) => tags.includes(token)))
  };
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

  const bodySafety = evaluateBodySafety({
    painLevel: bodyStatus.painLevel,
    energy: bodyStatus.energy,
    anxiety: mentalStatus.anxiety,
    urgeRisk: mentalStatus.urgeRisk
  });

  const blocks = buildHalfHourSlots().map((slot, index) => {
    const fixedSlot = context.routeContext.fixedSlots.find((candidate) =>
      slotContains(candidate, slot)
    );
    const slotType = fixedSlot?.slotType ?? "OPEN_AGENT_SLOT";
    const route = fixedSlot ? routeForSlot(context, fixedSlot) : null;
    const normalizedDomain = normalizeRouteDomain(fixedSlot?.routeDomain);
    const domain =
      slotType === "COURSE_SLOT" || slotType === "OPEN_AGENT_SLOT"
        ? "external_feedback"
        : normalizedDomain ?? (slotType === "SHUTDOWN" ? "review" : "review");
    const ids = idsForFallbackDomain(context, domain);
    const fallbackSkillIds =
      ids.skillIds.length > 0 ? ids.skillIds : [pickFirstId(context.skillNodes.map((node) => node.id), "root")];

    let title = fixedSlot?.title ?? "开放处理块";
    let method = fixedSlot?.defaultRule ?? "处理当前最重要的低风险任务。";
    let expectedOutput = "完成本时间片记录。";
    let difficulty = rescue ? 2 : 3;

    if (slotType === "BODY_ACTIVATION") {
      title = "身体激活：脊柱-髋-肩颈";
      method = bodySafety.rescueMode
        ? `Rescue：${bodySafety.activationPlan.join("；")}`
        : formatBodyActivationMethod();
      expectedOutput = "pain_before / pain_after / stiffness 记录。";
      difficulty = 1;
    } else if (slotType === "MOVEMENT_TRAINING") {
      title = bodySafety.rescueMode ? "运动训练：安全降级" : "运动训练：心肺-街健-协调";
      method = bodySafety.rescueMode
        ? `Rescue：${bodySafety.movementPlan.join("；")}`
        : formatMovementTrainingMethod(dailyInput.date);
      expectedOutput = "训练分钟、RPE、pain_before / pain_after / fatigue_after 记录。";
      difficulty = bodySafety.rescueMode ? 1 : 3;
    } else if (slotType === "FIXED_ROUTE" || slotType === "PARALLEL_ROUTE") {
      const weekTitle = route?.currentWeek?.title;
      title = `${fixedSlot?.title ?? "路线推进"}${weekTitle ? `：${weekTitle}` : ""}`;
      method = route?.currentWeek?.theme ?? fixedSlot?.defaultRule ?? "推进当前路线周主题。";
      expectedOutput =
        route?.currentWeek?.expectedEvidence
          ? `产出证据：${JSON.stringify(route.currentWeek.expectedEvidence)}`
          : "完成一个可验证路线证据。";
      difficulty = rescue && domain === "chip_eda" ? 3 : rescue ? 2 : 4;
    } else if (slotType === "MEAL") {
      title = fixedSlot?.title ?? "饮食";
      method = "按默认饮食：蛋白质、蔬菜、主碳水、蓝莓/坚果/西兰花和补剂检查。";
      expectedOutput = "protein_ok / vegetable_ok / fruit_ok / carb_ok / supplements_taken 记录。";
      difficulty = 1;
    } else if (slotType === "ART_SLOT") {
      expectedOutput =
        domain === "vocal"
          ? "30-60 秒声乐录音或 phrase analysis。"
          : domain === "dance"
            ? "30 秒舞蹈视频或动作清单。"
            : "8-bar loop、导出音频或耳训记录。";
      difficulty = rescue ? 1 : 2;
    } else if (slotType === "COURSE_SLOT") {
      title = fixedSlot?.title ?? "课程";
      method = "上课 / 整理课堂输入，并提取一个可进入路线的证据。";
      expectedOutput = "课程笔记、问题清单或作业下一步。";
      difficulty = 3;
    } else if (slotType === "OPEN_AGENT_SLOT") {
      title = fixedSlot?.title ?? "OpenSlot 外部事项";
      method = fixedSlot?.reason
        ? `处理插入事项：${fixedSlot.reason}`
        : "处理外联、行政、课程缓冲或 Repair Plan 插入事项。";
      expectedOutput = "完成一个外部动作，并记录是否影响今日路线。";
      difficulty = rescue ? 1 : 2;
    } else if (slotType === "SHUTDOWN") {
      title = "下线/洗漱/睡眠准备";
      method = "屏幕降刺激，洗漱，上床，不补偿未完成任务。";
      expectedOutput = "20:00 睡眠边界被保护。";
      difficulty = 1;
    } else if (slot.start === "03:00") {
      title = "起床启动 / 今日冲突输入";
      method = "喝水、洗漱、记录睡眠/体重/疼痛/今日冲突。";
      expectedOutput = "今日硬约束与身体读数。";
      difficulty = 1;
    }

    return {
      start: slot.start,
      end: slot.end,
      domain,
      title,
      method,
      expected_output: expectedOutput,
      skill_node_ids: fallbackSkillIds,
      resource_ids: ids.resourceIds,
      difficulty: index >= 32 ? 1 : difficulty,
      checkin_required: true,
      route_id: route?.id ?? null,
      route_stage_id: route?.currentStage?.id ?? null,
      route_week_id: route?.currentWeek?.id ?? null,
      fixed_slot_template_id: fixedSlot?.source === "template" ? fixedSlot.id : null,
      course_slot_id: fixedSlot?.source === "course" ? fixedSlot.id : null,
      open_agent_slot_id: fixedSlot?.source === "open_agent" ? fixedSlot.id : null,
      protected: fixedSlot?.protected ?? false,
      flexible: fixedSlot?.flexible ?? true,
      route_topic: route?.currentWeek?.title ?? fixedSlot?.title ?? null,
      slot_source: fixedSlot?.source ?? "fallback"
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
