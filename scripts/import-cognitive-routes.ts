import {
  FixedSlotType,
  Prisma,
  PrismaClient,
  RouteStageMode,
  RouteStatus
} from "@prisma/client";
import cognitiveRoutesSeed from "@/seed/cognitive-routes.seed.json";

const prisma = new PrismaClient();

type CognitiveSeed = typeof cognitiveRoutesSeed;
type RouteSeed = CognitiveSeed["routes"][number];
type StageSeed = RouteSeed["stages"][number];
type FixedSlotSeed = CognitiveSeed["fixed_time_slots"][number];

const skillNodeByDomain: Record<string, string> = {
  "AI Systems": "lifeos_product",
  Business: "finance",
  Body: "body",
  Chip: "riscv_soc",
  "Chip/EDA": "riscv_soc",
  Dance: "dance",
  Music: "music_production",
  Vocal: "vocal"
};

function toRouteStatus(status: string): RouteStatus {
  if (status === "PAUSED") return RouteStatus.PAUSED;
  if (status === "COMPLETED") return RouteStatus.COMPLETED;
  return RouteStatus.ACTIVE;
}

function toStageMode(mode: string): RouteStageMode {
  return mode === "SERIAL" ? RouteStageMode.SERIAL : RouteStageMode.PARALLEL;
}

function toFixedSlotType(slotType: string): FixedSlotType {
  const value = FixedSlotType[slotType as keyof typeof FixedSlotType];
  if (!value) throw new Error(`Unknown FixedSlotType: ${slotType}`);
  return value;
}

function addWeeks(date: Date, weeks: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + weeks * 7);
  return result;
}

async function getSeedUser() {
  const existing = await prisma.userProfile.findFirst({
    orderBy: { createdAt: "asc" }
  });

  if (existing) return existing;

  const email =
    process.env.LIFEOS_LOCAL_EMAIL ??
    process.env.CODEXAPP_USERNAME ??
    "local-aialra@example.invalid";

  return prisma.userProfile.upsert({
    where: { email },
    update: { displayName: "Aialra" },
    create: {
      id: "local-aialra-user",
      email,
      displayName: "Aialra",
      timezone: "America/New_York"
    }
  });
}

function chooseSkillNodeId(route: RouteSeed, evidenceName: string) {
  const normalized = evidenceName.toLowerCase();
  if (route.domain === "Chip/EDA") {
    if (normalized.includes("verification")) return "verification";
    if (normalized.includes("rtl") || normalized.includes("gds")) return "open_source_eda";
    return "riscv_soc";
  }

  return skillNodeByDomain[route.domain] ?? null;
}

function generateTemplateWeek(route: RouteSeed, weekIndex: number, stages: StageSeed[]) {
  const stageIndex = Math.min(Math.floor((weekIndex - 1) / 4), stages.length - 1);
  const stage = stages[stageIndex];
  const template = "week_template" in route ? route.week_template : [];
  const title = Array.isArray(template) && template.length > 0
    ? String(template[Math.min(stageIndex, template.length - 1)])
    : stage.name;

  return {
    week_index: weekIndex,
    stage_order: stage.order,
    title,
    theme: `${stage.name}: ${stage.objective}`,
    concrete_topics: [stage.objective, stage.completion_standard],
    primary_resources: [],
    expected_evidence: [stage.completion_standard]
  };
}

async function upsertStages(routeId: string, stages: StageSeed[]) {
  const stageByOrder = new Map<number, Awaited<ReturnType<typeof prisma.routeStage.upsert>>>();

  for (const stage of stages) {
    const dbStage = await prisma.routeStage.upsert({
      where: {
        routeId_order: {
          routeId,
          order: stage.order
        }
      },
      update: {
        name: stage.name,
        weeks: stage.weeks,
        objective: stage.objective,
        completionStandard: stage.completion_standard,
        serialOrParallel: toStageMode(stage.serial_or_parallel)
      },
      create: {
        routeId,
        order: stage.order,
        name: stage.name,
        weeks: stage.weeks,
        objective: stage.objective,
        completionStandard: stage.completion_standard,
        serialOrParallel: toStageMode(stage.serial_or_parallel)
      }
    });

    stageByOrder.set(stage.order, dbStage);
  }

  return stageByOrder;
}

async function upsertRoute(userId: string, seedStartDate: Date, routeSeed: RouteSeed) {
  const totalWeeks = routeSeed.stages.reduce((sum, stage) => sum + stage.weeks, 0);
  const route = await prisma.cognitiveRoute.upsert({
    where: {
      userId_name: {
        userId,
        name: routeSeed.name
      }
    },
    update: {
      description: routeSeed.description,
      domain: routeSeed.domain,
      status: toRouteStatus(routeSeed.status),
      startDate: seedStartDate,
      endDate: addWeeks(seedStartDate, totalWeeks)
    },
    create: {
      userId,
      name: routeSeed.name,
      description: routeSeed.description,
      domain: routeSeed.domain,
      status: toRouteStatus(routeSeed.status),
      startDate: seedStartDate,
      endDate: addWeeks(seedStartDate, totalWeeks)
    }
  });

  const stageByOrder = await upsertStages(route.id, routeSeed.stages);
  const explicitWeeks = "weeks" in routeSeed && Array.isArray(routeSeed.weeks)
    ? routeSeed.weeks
    : [];
  const weekSeeds =
    explicitWeeks.length > 0
      ? explicitWeeks
      : Array.from({ length: totalWeeks }, (_, index) =>
          generateTemplateWeek(routeSeed, index + 1, routeSeed.stages)
        );

  const weekByIndex = new Map<number, Awaited<ReturnType<typeof prisma.routeWeek.upsert>>>();

  for (const weekSeed of weekSeeds) {
    const stage = stageByOrder.get(weekSeed.stage_order);
    if (!stage) throw new Error(`Missing stage ${weekSeed.stage_order} for ${routeSeed.name}`);

    const week = await prisma.routeWeek.upsert({
      where: {
        routeId_weekIndex: {
          routeId: route.id,
          weekIndex: weekSeed.week_index
        }
      },
      update: {
        stageId: stage.id,
        title: weekSeed.title,
        theme: weekSeed.theme,
        concreteTopics: weekSeed.concrete_topics as Prisma.InputJsonValue,
        primaryResources: weekSeed.primary_resources as Prisma.InputJsonValue,
        expectedEvidence: weekSeed.expected_evidence as Prisma.InputJsonValue
      },
      create: {
        routeId: route.id,
        stageId: stage.id,
        weekIndex: weekSeed.week_index,
        title: weekSeed.title,
        theme: weekSeed.theme,
        concreteTopics: weekSeed.concrete_topics as Prisma.InputJsonValue,
        primaryResources: weekSeed.primary_resources as Prisma.InputJsonValue,
        expectedEvidence: weekSeed.expected_evidence as Prisma.InputJsonValue
      }
    });

    weekByIndex.set(week.weekIndex, week);
  }

  for (const evidence of routeSeed.evidence_nodes) {
    const skillNodeId = chooseSkillNodeId(routeSeed, evidence.name);
    const skillNode = skillNodeId
      ? await prisma.skillNode.findUnique({ where: { id: skillNodeId } })
      : null;

    await prisma.routeEvidenceNode.upsert({
      where: {
        userId_routeId_track_name: {
          userId,
          routeId: route.id,
          track: evidence.track,
          name: evidence.name
        }
      },
      update: {
        skillNodeId: skillNode?.id ?? null,
        domain: routeSeed.domain,
        currentLevel: evidence.current_level,
        nextGate: evidence.next_gate,
        requiredArtifact: evidence.required_artifact,
        linkedResourceUrls: evidence.linked_resource_urls as Prisma.InputJsonValue,
        confidence: evidence.confidence
      },
      create: {
        userId,
        routeId: route.id,
        skillNodeId: skillNode?.id ?? null,
        name: evidence.name,
        domain: routeSeed.domain,
        track: evidence.track,
        currentLevel: evidence.current_level,
        nextGate: evidence.next_gate,
        requiredArtifact: evidence.required_artifact,
        linkedResourceUrls: evidence.linked_resource_urls as Prisma.InputJsonValue,
        confidence: evidence.confidence
      }
    });
  }

  return {
    route,
    stageCount: stageByOrder.size,
    weekCount: weekByIndex.size,
    evidenceCount: routeSeed.evidence_nodes.length
  };
}

async function upsertFixedSlot(userId: string, slot: FixedSlotSeed) {
  const existing = await prisma.fixedTimeSlotTemplate.findFirst({
    where: {
      userId,
      dayOfWeek: null,
      startTime: slot.start_time,
      endTime: slot.end_time
    }
  });

  const data = {
    userId,
    dayOfWeek: null,
    startTime: slot.start_time,
    endTime: slot.end_time,
    slotType: toFixedSlotType(slot.slot_type),
    title: slot.title,
    routeDomain: slot.route_domain,
    protected: slot.protected,
    flexible: slot.flexible,
    defaultRule: slot.default_rule
  };

  if (existing) {
    await prisma.fixedTimeSlotTemplate.update({
      where: { id: existing.id },
      data
    });
    return;
  }

  await prisma.fixedTimeSlotTemplate.create({ data });
}

async function main() {
  const user = await getSeedUser();
  const seedStartDate = new Date(`${cognitiveRoutesSeed.start_date}T00:00:00.000Z`);
  let stageCount = 0;
  let weekCount = 0;
  let evidenceCount = 0;

  for (const routeSeed of cognitiveRoutesSeed.routes) {
    const result = await upsertRoute(user.id, seedStartDate, routeSeed);
    stageCount += result.stageCount;
    weekCount += result.weekCount;
    evidenceCount += result.evidenceCount;
  }

  for (const slot of cognitiveRoutesSeed.fixed_time_slots) {
    await upsertFixedSlot(user.id, slot);
  }

  await prisma.systemSetting.upsert({
    where: { key: "cognitive_routes_seed" },
    update: { value: cognitiveRoutesSeed as Prisma.InputJsonValue },
    create: { key: "cognitive_routes_seed", value: cognitiveRoutesSeed as Prisma.InputJsonValue }
  });

  await prisma.systemSetting.upsert({
    where: { key: "diet_default" },
    update: { value: cognitiveRoutesSeed.diet_default as Prisma.InputJsonValue },
    create: { key: "diet_default", value: cognitiveRoutesSeed.diet_default as Prisma.InputJsonValue }
  });

  await prisma.auditEvent.create({
    data: {
      userId: user.id,
      eventType: "seed.cognitive_routes.import",
      entityType: "CognitiveRoute",
      payload: {
        routes: cognitiveRoutesSeed.routes.length,
        stages: stageCount,
        weeks: weekCount,
        evidence_nodes: evidenceCount,
        fixed_time_slots: cognitiveRoutesSeed.fixed_time_slots.length
      }
    }
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        userId: user.id,
        routes: cognitiveRoutesSeed.routes.length,
        stages: stageCount,
        weeks: weekCount,
        evidenceNodes: evidenceCount,
        fixedTimeSlots: cognitiveRoutesSeed.fixed_time_slots.length
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
