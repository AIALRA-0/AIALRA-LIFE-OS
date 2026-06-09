import type { DailyInput } from "@prisma/client";
import { describe, expect, it } from "vitest";
import type { LifeContext } from "@/lib/life-context";
import type { PlannerContext } from "@/lib/plan/compile-context";
import { buildManualPlannerPromptPackage } from "@/lib/plan/manual-prompt";

function dailyInputFixture(): DailyInput {
  return {
    id: "daily-input-test",
    userId: "user-test",
    date: new Date("2026-06-09T00:00:00.000Z"),
    mustDo: "完成一个芯片/EDA最小产出",
    temporaryItems: "下午处理一封重要邮件",
    specialNeeds: "低强度，保护腰椎",
    bodyStatus: { sleepQuality: 3, weightKg: 100, painLevel: 2, energy: 3 },
    mentalStatus: { focus: 3, anxiety: 1, urgeRisk: 0 },
    availableWindows: { externalMessageSummary: "Gmail 有一封需要今晚前回复的邮件。" },
    createdAt: new Date("2026-06-09T00:00:00.000Z"),
    updatedAt: new Date("2026-06-09T00:00:00.000Z")
  };
}

function plannerContextFixture(): PlannerContext {
  return {
    coreFramework: {
      mainline_priority: ["芯片/EDA"],
      overload_rules: ["低能量时降级但不破坏结构"]
    },
    anchors: [
      {
        id: "A0_WAKE",
        time: "03:00",
        name: "起床启动",
        required: true,
        definition_of_done: "起床并记录状态。"
      }
    ],
    requiredDomains: [
      { id: "chip_eda", name: "芯片/EDA", minimum_minutes: 180 },
      { id: "review", name: "复盘", minimum_minutes: 20 }
    ],
    dailyTemplate: {
      slots: []
    },
    resources: [
      {
        id: "res-verilator",
        name: "Verilator",
        url: "https://www.veripool.org/verilator/",
        language: "English",
        price: "Free",
        learningDepth: "Deep",
        practicality: "High",
        jobMatch: 0.9,
        completionThreshold: "完成一个仿真产出",
        replacementRisk: "Low",
        tags: ["EDA"],
        phase: ["chip_eda"],
        accessChannel: "web",
        status: "SEED"
      }
    ],
    skillNodes: [
      {
        id: "skill-rtl",
        parentId: null,
        name: "RTL 验证",
        domain: "chip_eda",
        currentLevel: 1,
        targetLevel: 5,
        evidenceRequired: ["仿真记录"],
        description: null,
        sortOrder: 1
      }
    ],
    executionLogs: [],
    outputSchemas: {}
  } as unknown as PlannerContext;
}

describe("buildManualPlannerPromptPackage", () => {
  it("returns upload files, opening message, and full fallback prompt", () => {
    const result = buildManualPlannerPromptPackage({
      dailyInput: dailyInputFixture(),
      context: plannerContextFixture(),
      lifeContext: {
        personalBackground: "个人背景",
        longTermPlan: "长期规划",
        currentStrategy: "当前战略"
      } satisfies LifeContext
    });

    expect(result.chatMessage).toContain("我上传了 3 个 Aialra Life OS 文件");
    expect(result.uploadFiles.map((file) => file.filename)).toEqual([
      "lifeos-daily-context.json",
      "lifeos-daily-plan-schema.json",
      "lifeos-planner-rules.md"
    ]);
    expect(result.uploadFiles[0].content).toContain("Gmail 有一封需要今晚前回复的邮件");
    expect(result.uploadFiles[1].content).toContain("blocks");
    expect(result.uploadFiles[2].content).toContain("芯片/EDA 是最高优先级主线");
    expect(result.prompt).toContain("上传文件 1: lifeos-daily-context.json");
  });
});
