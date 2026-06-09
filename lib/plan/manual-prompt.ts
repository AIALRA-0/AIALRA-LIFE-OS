import { z } from "zod";
import type { DailyInput } from "@prisma/client";
import type { LifeContext } from "@/lib/life-context";
import type { PlannerContext } from "@/lib/plan/compile-context";
import { summarizePlannerContext } from "@/lib/plan/compile-context";
import { GeneratedDailyPlanSchema } from "@/lib/plan/validate-plan";
import { compactJson } from "@/lib/utils/json";

export function getDailyPlanJsonSchema() {
  return z.toJSONSchema(GeneratedDailyPlanSchema);
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
  const externalMessageSummary =
    typeof dailyInput.availableWindows === "object" &&
    dailyInput.availableWindows &&
    "externalMessageSummary" in dailyInput.availableWindows
      ? String((dailyInput.availableWindows as Record<string, unknown>).externalMessageSummary ?? "")
      : "";

  const prompt = [
    "# Aialra Life OS 手动 PlannerAgent 提示包",
    "",
    "你是 Aialra Life OS 的每日计划 Agent。请根据下方全部上下文，生成今天 03:00-20:00 的半小时执行计划。",
    "",
    "## 输出要求",
    "",
    "- 只输出一个 JSON 对象，不要 Markdown，不要解释，不要代码块。",
    "- JSON 必须严格符合 daily_plan_schema。",
    "- 所有用户可见文本必须使用简体中文。",
    "- 时间必须覆盖 03:00-20:00，不能早于 03:00，不能晚于 20:00。",
    "- 每个 block 必须是半小时粒度，连续无空洞。",
    "- 每个 block 必须有可验证的 expected_output。",
    "- 每天必须出现：运动、饮食、声乐、舞蹈、音乐制作、芯片/EDA、AI Agent、商业金融管理表达、复盘。",
    "- 芯片/EDA 是最高优先级主线；AI Agent 只能服务主线加速，不能吞掉主线。",
    "- 如果能量低、疼痛高、焦虑高或冲动风险高，生成低强度 rescue plan。",
    "- resource_ids 和 skill_node_ids 只能使用上下文里已经给出的 id；不确定时用空数组。",
    "",
    "## daily_plan_schema",
    "",
    compactJson(schema),
    "",
    "## 个人背景 / 长期规划 / 当前战略",
    "",
    compactJson(lifeContext),
    "",
    "## 今日输入",
    "",
    compactJson({
      date: dailyInput.date.toISOString().slice(0, 10),
      mustDo: dailyInput.mustDo,
      temporaryItems: dailyInput.temporaryItems,
      specialNeeds: dailyInput.specialNeeds,
      externalMessageSummary,
      bodyStatus: dailyInput.bodyStatus,
      mentalStatus: dailyInput.mentalStatus
    }),
    "",
    "## 系统上下文快照",
    "",
    compactJson(summarizePlannerContext(context)),
    "",
    "现在请直接输出最终 JSON。"
  ].join("\n");

  return {
    prompt,
    schema,
    importInstructions:
      "复制上面的完整提示词到 ChatGPT Pro。让 ChatGPT 只返回 JSON。然后把返回的 JSON 粘贴回 Life OS 的导入框。"
  };
}
