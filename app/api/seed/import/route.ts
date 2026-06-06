import { ResourceStatus } from "@prisma/client";
import { requireUserProfile, authErrorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import coreFrameworkSeed from "@/seed/core-framework.seed.json";
import resourcesSeed from "@/seed/resources.seed.json";
import skillTreeSeed from "@/seed/skill-tree.seed.json";
import dailyTemplateSeed from "@/seed/daily-template.seed.json";
import aiOutputSchemasSeed from "@/seed/ai-output-schemas.seed.json";

export const dynamic = "force-dynamic";

async function importSeed() {
  await prisma.coreFramework.updateMany({
    where: { isActive: true },
    data: { isActive: false }
  });

  const existingFramework = await prisma.coreFramework.findFirst({
    where: { version: "0.1.0", title: coreFrameworkSeed.system_name }
  });

  const framework = existingFramework
    ? await prisma.coreFramework.update({
        where: { id: existingFramework.id },
        data: { content: coreFrameworkSeed, isActive: true }
      })
    : await prisma.coreFramework.create({
        data: {
          version: "0.1.0",
          title: coreFrameworkSeed.system_name,
          content: coreFrameworkSeed,
          isActive: true
        }
      });

  for (const [index, anchor] of coreFrameworkSeed.daily_anchor_points.entries()) {
    await prisma.anchor.upsert({
      where: { code: anchor.id },
      update: {
        frameworkId: framework.id,
        name: anchor.name,
        time: anchor.time,
        required: anchor.required,
        definitionDone: anchor.definition_of_done,
        sortOrder: index
      },
      create: {
        frameworkId: framework.id,
        code: anchor.id,
        name: anchor.name,
        time: anchor.time,
        required: anchor.required,
        definitionDone: anchor.definition_of_done,
        sortOrder: index
      }
    });
  }

  for (const resource of resourcesSeed) {
    await prisma.resource.upsert({
      where: { id: resource.id },
      update: {
        name: resource.name,
        url: resource.url,
        language: resource.language,
        price: resource.price,
        learningDepth: resource.learning_depth,
        practicality: resource.practicality,
        jobMatch: resource.job_match,
        completionThreshold: resource.completion_threshold,
        replacementRisk: resource.replacement_risk,
        tags: resource.tags,
        phase: resource.phase,
        accessChannel: resource.access_channel,
        status: ResourceStatus.SEED
      },
      create: {
        id: resource.id,
        name: resource.name,
        url: resource.url,
        language: resource.language,
        price: resource.price,
        learningDepth: resource.learning_depth,
        practicality: resource.practicality,
        jobMatch: resource.job_match,
        completionThreshold: resource.completion_threshold,
        replacementRisk: resource.replacement_risk,
        tags: resource.tags,
        phase: resource.phase,
        accessChannel: resource.access_channel,
        status: ResourceStatus.SEED
      }
    });
  }

  await prisma.skillNode.upsert({
    where: { id: skillTreeSeed.root.id },
    update: {
      parentId: null,
      name: skillTreeSeed.root.name,
      domain: "root",
      currentLevel: skillTreeSeed.root.current_level,
      targetLevel: skillTreeSeed.root.target_level,
      evidenceRequired: ["Top-level life system evidence"],
      sortOrder: 0
    },
    create: {
      id: skillTreeSeed.root.id,
      parentId: null,
      name: skillTreeSeed.root.name,
      domain: "root",
      currentLevel: skillTreeSeed.root.current_level,
      targetLevel: skillTreeSeed.root.target_level,
      evidenceRequired: ["Top-level life system evidence"],
      sortOrder: 0
    }
  });

  for (const [index, node] of skillTreeSeed.nodes.entries()) {
    await prisma.skillNode.upsert({
      where: { id: node.id },
      update: {
        parentId: node.parent_id,
        name: node.name,
        domain: node.domain,
        currentLevel: node.current_level,
        targetLevel: node.target_level,
        evidenceRequired: node.evidence_required,
        sortOrder: index + 1
      },
      create: {
        id: node.id,
        parentId: node.parent_id,
        name: node.name,
        domain: node.domain,
        currentLevel: node.current_level,
        targetLevel: node.target_level,
        evidenceRequired: node.evidence_required,
        sortOrder: index + 1
      }
    });
  }

  await prisma.systemSetting.upsert({
    where: { key: "daily_template" },
    update: { value: dailyTemplateSeed },
    create: { key: "daily_template", value: dailyTemplateSeed }
  });

  await prisma.systemSetting.upsert({
    where: { key: "ai_output_schemas" },
    update: { value: aiOutputSchemasSeed },
    create: { key: "ai_output_schemas", value: aiOutputSchemasSeed }
  });

  await prisma.auditEvent.create({
    data: {
      eventType: "seed.import.api",
      entityType: "system",
      payload: {
        resources: resourcesSeed.length,
        skill_nodes: skillTreeSeed.nodes.length + 1,
        anchors: coreFrameworkSeed.daily_anchor_points.length
      }
    }
  });

  return {
    resources: resourcesSeed.length,
    skillNodes: skillTreeSeed.nodes.length + 1,
    anchors: coreFrameworkSeed.daily_anchor_points.length
  };
}

export async function POST() {
  try {
    await requireUserProfile();
    const result = await importSeed();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    try {
      return authErrorResponse(error);
    } catch (inner) {
      return Response.json(
        { error: inner instanceof Error ? inner.message : String(inner) },
        { status: 500 }
      );
    }
  }
}
