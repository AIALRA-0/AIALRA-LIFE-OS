import {
  FixedSlotType,
  Prisma,
  PrismaClient,
  RouteStageMode,
  RouteStatus
} from "@prisma/client";
import bodyRoutesSeed from "@/seed/body-routes.seed.json";

const prisma = new PrismaClient();

type BodySeed = typeof bodyRoutesSeed;
type BodyRouteSeed = BodySeed["routes"][number];
type BodyStageSeed = BodyRouteSeed["stages"][number];

const bodySkillNodes = [
  {
    id: "body_activation",
    parentId: "training",
    name: "脊柱-髋-肩颈激活路线",
    evidenceRequired: ["7-day activation completion log", "pain_before / pain_after trend"]
  },
  {
    id: "body_activation_breathing",
    parentId: "body_activation",
    name: "Breathing / Brace Reset",
    evidenceRequired: ["pain_before / pain_after trend"]
  },
  {
    id: "body_activation_neck_scapular",
    parentId: "body_activation",
    name: "Neck / Scapular Reset",
    evidenceRequired: ["morning stiffness score trend"]
  },
  {
    id: "body_activation_spine_hip",
    parentId: "body_activation",
    name: "Spine / Hip Mobility",
    evidenceRequired: ["weekly 30-second form check video"]
  },
  {
    id: "body_activation_glute",
    parentId: "body_activation",
    name: "Glute Activation",
    evidenceRequired: ["activation set log"]
  },
  {
    id: "body_activation_core",
    parentId: "body_activation",
    name: "Core Anti-extension",
    evidenceRequired: ["core control log"]
  },
  {
    id: "body_activation_gait",
    parentId: "body_activation",
    name: "Morning Gait Reset",
    evidenceRequired: ["morning gait reset log"]
  },
  {
    id: "movement_training",
    parentId: "training",
    name: "心肺-街健-协调性路线",
    evidenceRequired: ["weekly training completion", "pain_before / pain_after trend"]
  },
  {
    id: "movement_aerobic_base",
    parentId: "movement_training",
    name: "Aerobic Base",
    evidenceRequired: ["weekly aerobic log"]
  },
  {
    id: "movement_run_walk",
    parentId: "movement_training",
    name: "Run-Walk Progression",
    evidenceRequired: ["run-walk interval log"]
  },
  {
    id: "movement_bodyweight_strength",
    parentId: "movement_training",
    name: "Bodyweight Strength",
    evidenceRequired: ["bodyweight strength set log"]
  },
  {
    id: "movement_core_stability",
    parentId: "movement_training",
    name: "Core Stability",
    evidenceRequired: ["core stability log"]
  },
  {
    id: "movement_hip_ankle",
    parentId: "movement_training",
    name: "Hip / Ankle Mobility",
    evidenceRequired: ["mobility trend log"]
  },
  {
    id: "movement_dance_coordination",
    parentId: "movement_training",
    name: "Dance Coordination Support",
    evidenceRequired: ["dance support note"]
  },
  {
    id: "movement_body_composition",
    parentId: "movement_training",
    name: "Body Composition Control",
    evidenceRequired: ["weight / waist trend"]
  }
];

const skillNodeByEvidenceName: Record<string, string> = {
  "Spine-Hip-Shoulder-Neck Activation": "body_activation",
  "Breathing / Brace Reset": "body_activation_breathing",
  "Neck / Scapular Reset": "body_activation_neck_scapular",
  "Spine / Hip Mobility": "body_activation_spine_hip",
  "Glute Activation": "body_activation_glute",
  "Core Anti-extension": "body_activation_core",
  "Morning Gait Reset": "body_activation_gait",
  "Movement Training": "movement_training",
  "Aerobic Base": "movement_aerobic_base",
  "Run-Walk Progression": "movement_run_walk",
  "Bodyweight Strength": "movement_bodyweight_strength",
  "Core Stability": "movement_core_stability",
  "Hip / Ankle Mobility": "movement_hip_ankle",
  "Dance Coordination Support": "movement_dance_coordination",
  "Body Composition Control": "movement_body_composition"
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

async function upsertBodySkillNodes() {
  const existingTraining = await prisma.skillNode.findUnique({ where: { id: "training" } });
  if (!existingTraining) {
    await prisma.skillNode.upsert({
      where: { id: "body" },
      update: {},
      create: {
        id: "body",
        parentId: null,
        name: "运动员的身体",
        domain: "health",
        currentLevel: 0,
        targetLevel: 5,
        evidenceRequired: ["body evidence"],
        sortOrder: 100
      }
    });

    await prisma.skillNode.upsert({
      where: { id: "training" },
      update: {},
      create: {
        id: "training",
        parentId: "body",
        name: "跑步+无器械+腰椎友好训练",
        domain: "health",
        currentLevel: 0,
        targetLevel: 5,
        evidenceRequired: ["training log"],
        sortOrder: 101
      }
    });
  }

  for (const [index, node] of bodySkillNodes.entries()) {
    await prisma.skillNode.upsert({
      where: { id: node.id },
      update: {
        parentId: node.parentId,
        name: node.name,
        domain: "health",
        evidenceRequired: node.evidenceRequired,
        description: "Body Routes Patch v1 evidence node."
      },
      create: {
        id: node.id,
        parentId: node.parentId,
        name: node.name,
        domain: "health",
        currentLevel: 0,
        targetLevel: 5,
        evidenceRequired: node.evidenceRequired,
        description: "Body Routes Patch v1 evidence node.",
        sortOrder: 300 + index
      }
    });
  }
}

async function upsertFixedSlot(userId: string, routeSeed: BodyRouteSeed) {
  const slot = routeSeed.fixed_slot;
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
    routeDomain: routeSeed.domain,
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

function weekPayload(routeSeed: BodyRouteSeed, stage: BodyStageSeed) {
  if ("weekly_template" in routeSeed) {
    return {
      concreteTopics: routeSeed.weekly_template as Prisma.InputJsonValue,
      primaryResources: [] as Prisma.InputJsonValue,
      expectedEvidence: [stage.completion_standard] as Prisma.InputJsonValue
    };
  }

  return {
    concreteTopics: {
      daily_structure: "daily_structure" in routeSeed ? routeSeed.daily_structure : [],
      action_library: "action_library" in routeSeed ? routeSeed.action_library : {}
    } as Prisma.InputJsonValue,
    primaryResources: [] as Prisma.InputJsonValue,
    expectedEvidence: [stage.completion_standard] as Prisma.InputJsonValue
  };
}

async function upsertRoute(userId: string, routeSeed: BodyRouteSeed) {
  const seedStartDate = new Date("2026-06-25T00:00:00.000Z");
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

  const stageByOrder = new Map<number, Awaited<ReturnType<typeof prisma.routeStage.upsert>>>();
  let runningWeek = 1;

  for (const stageSeed of routeSeed.stages) {
    const stage = await prisma.routeStage.upsert({
      where: {
        routeId_order: {
          routeId: route.id,
          order: stageSeed.order
        }
      },
      update: {
        name: stageSeed.name,
        weeks: stageSeed.weeks,
        objective: stageSeed.objective,
        completionStandard: stageSeed.completion_standard,
        serialOrParallel: toStageMode(stageSeed.serial_or_parallel)
      },
      create: {
        routeId: route.id,
        order: stageSeed.order,
        name: stageSeed.name,
        weeks: stageSeed.weeks,
        objective: stageSeed.objective,
        completionStandard: stageSeed.completion_standard,
        serialOrParallel: toStageMode(stageSeed.serial_or_parallel)
      }
    });

    stageByOrder.set(stageSeed.order, stage);

    for (let offset = 0; offset < stageSeed.weeks; offset += 1) {
      const weekIndex = runningWeek + offset;
      const payload = weekPayload(routeSeed, stageSeed);
      await prisma.routeWeek.upsert({
        where: {
          routeId_weekIndex: {
            routeId: route.id,
            weekIndex
          }
        },
        update: {
          stageId: stage.id,
          title: `${stageSeed.name} W${offset + 1}`,
          theme: stageSeed.objective,
          concreteTopics: payload.concreteTopics,
          primaryResources: payload.primaryResources,
          expectedEvidence: payload.expectedEvidence
        },
        create: {
          routeId: route.id,
          stageId: stage.id,
          weekIndex,
          title: `${stageSeed.name} W${offset + 1}`,
          theme: stageSeed.objective,
          concreteTopics: payload.concreteTopics,
          primaryResources: payload.primaryResources,
          expectedEvidence: payload.expectedEvidence
        }
      });
    }

    runningWeek += stageSeed.weeks;
  }

  for (const evidence of routeSeed.evidence_nodes) {
    const skillNodeId = skillNodeByEvidenceName[evidence.name];
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

  await upsertFixedSlot(userId, routeSeed);

  return {
    stages: stageByOrder.size,
    weeks: totalWeeks,
    evidenceNodes: routeSeed.evidence_nodes.length
  };
}

async function main() {
  const user = await getSeedUser();
  await upsertBodySkillNodes();

  let stages = 0;
  let weeks = 0;
  let evidenceNodes = 0;

  for (const routeSeed of bodyRoutesSeed.routes) {
    const result = await upsertRoute(user.id, routeSeed);
    stages += result.stages;
    weeks += result.weeks;
    evidenceNodes += result.evidenceNodes;
  }

  await prisma.systemSetting.upsert({
    where: { key: "body_routes_seed" },
    update: { value: bodyRoutesSeed as Prisma.InputJsonValue },
    create: { key: "body_routes_seed", value: bodyRoutesSeed as Prisma.InputJsonValue }
  });

  await prisma.systemSetting.upsert({
    where: { key: "body_safety_rules" },
    update: { value: bodyRoutesSeed.safety_rules as Prisma.InputJsonValue },
    create: { key: "body_safety_rules", value: bodyRoutesSeed.safety_rules as Prisma.InputJsonValue }
  });

  await prisma.systemSetting.upsert({
    where: { key: "diet_default" },
    update: { value: bodyRoutesSeed.diet_default as Prisma.InputJsonValue },
    create: { key: "diet_default", value: bodyRoutesSeed.diet_default as Prisma.InputJsonValue }
  });

  await prisma.auditEvent.create({
    data: {
      userId: user.id,
      eventType: "seed.body_routes.import",
      entityType: "CognitiveRoute",
      payload: {
        routes: bodyRoutesSeed.routes.length,
        stages,
        weeks,
        evidence_nodes: evidenceNodes,
        skill_nodes: bodySkillNodes.length
      }
    }
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        userId: user.id,
        routes: bodyRoutesSeed.routes.length,
        stages,
        weeks,
        evidenceNodes,
        bodySkillNodes: bodySkillNodes.length
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
