import { prisma } from "@/lib/prisma";
import { getRouteWeekIndex, getUtcDayOfWeek } from "@/lib/routes/current-week";
import { resolveFixedSlots } from "@/lib/routes/fixed-slots";

export type CompiledRouteContext = Awaited<ReturnType<typeof compileRouteContext>>;

export async function compileRouteContext(userId: string, date: Date) {
  const dayOfWeek = getUtcDayOfWeek(date);
  const [routes, fixedTemplates, courseSlots, openAgentSlots, bodyRules, dietDefault] =
    await Promise.all([
      prisma.cognitiveRoute.findMany({
        where: { userId, status: "ACTIVE" },
        include: {
          stages: { orderBy: { order: "asc" } },
          weeks: { orderBy: { weekIndex: "asc" } },
          evidenceNodes: { orderBy: [{ track: "asc" }, { name: "asc" }] }
        },
        orderBy: [{ domain: "asc" }, { name: "asc" }]
      }),
      prisma.fixedTimeSlotTemplate.findMany({
        where: {
          userId,
          OR: [{ dayOfWeek: null }, { dayOfWeek }]
        },
        orderBy: [{ startTime: "asc" }, { endTime: "asc" }]
      }),
      prisma.courseSlot.findMany({
        where: {
          userId,
          active: true,
          dayOfWeek
        },
        orderBy: [{ startTime: "asc" }, { endTime: "asc" }]
      }),
      prisma.openAgentSlot.findMany({
        where: {
          userId,
          date
        },
        orderBy: [{ startTime: "asc" }, { endTime: "asc" }]
      }),
      prisma.systemSetting.findUnique({ where: { key: "body_safety_rules" } }),
      prisma.systemSetting.findUnique({ where: { key: "diet_default" } })
    ]);

  const routeSummaries = routes.map((route) => {
    const window = getRouteWeekIndex({
      routeStartDate: route.startDate,
      targetDate: date,
      totalWeeks: route.weeks.length
    });
    const currentWeek = route.weeks.find((week) => week.weekIndex === window.weekIndex) ?? null;
    const currentStage =
      route.stages.find((stage) => stage.id === currentWeek?.stageId) ??
      route.stages.find((stage) => stage.order === 1) ??
      null;

    return {
      id: route.id,
      name: route.name,
      description: route.description,
      domain: route.domain,
      status: route.status,
      startDate: route.startDate.toISOString(),
      endDate: route.endDate?.toISOString() ?? null,
      currentWeekWindow: window,
      currentStage: currentStage
        ? {
            id: currentStage.id,
            order: currentStage.order,
            name: currentStage.name,
            objective: currentStage.objective,
            completionStandard: currentStage.completionStandard,
            serialOrParallel: currentStage.serialOrParallel
          }
        : null,
      currentWeek: currentWeek
        ? {
            id: currentWeek.id,
            weekIndex: currentWeek.weekIndex,
            title: currentWeek.title,
            theme: currentWeek.theme,
            concreteTopics: currentWeek.concreteTopics,
            primaryResources: currentWeek.primaryResources,
            expectedEvidence: currentWeek.expectedEvidence
          }
        : null,
      evidenceNodes: route.evidenceNodes.map((node) => ({
        id: node.id,
        skillNodeId: node.skillNodeId,
        name: node.name,
        domain: node.domain,
        track: node.track,
        currentLevel: node.currentLevel,
        nextGate: node.nextGate,
        requiredArtifact: node.requiredArtifact,
        linkedResourceUrls: node.linkedResourceUrls,
        confidence: node.confidence,
        lastEvidenceAt: node.lastEvidenceAt?.toISOString() ?? null
      }))
    };
  });

  const fixedSlots = resolveFixedSlots({
    templates: fixedTemplates.map((slot) => ({
      id: slot.id,
      startTime: slot.startTime,
      endTime: slot.endTime,
      title: slot.title,
      slotType: slot.slotType,
      routeDomain: slot.routeDomain,
      protected: slot.protected,
      flexible: slot.flexible,
      defaultRule: slot.defaultRule
    })),
    courseSlots,
    openAgentSlots
  });

  return {
    date: date.toISOString().slice(0, 10),
    dayOfWeek,
    generatedAt: new Date().toISOString(),
    routes: routeSummaries,
    fixedSlots,
    courseSlots: courseSlots.map((slot) => ({
      id: slot.id,
      courseName: slot.courseName,
      courseCode: slot.courseCode,
      instructor: slot.instructor,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      location: slot.location,
      term: slot.term,
      source: slot.source,
      locked: slot.locked,
      active: slot.active
    })),
    openAgentSlots: openAgentSlots.map((slot) => ({
      id: slot.id,
      date: slot.date.toISOString().slice(0, 10),
      startTime: slot.startTime,
      endTime: slot.endTime,
      insertedTitle: slot.insertedTitle,
      reason: slot.reason,
      source: slot.source
    })),
    bodySafetyRules: bodyRules?.value ?? null,
    dietDefault: dietDefault?.value ?? null
  };
}
