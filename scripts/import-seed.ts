import { PrismaClient, ResourceStatus } from "@prisma/client";
import coreFrameworkSeed from "@/seed/core-framework.seed.json";
import resourcesSeed from "@/seed/resources.seed.json";
import skillTreeSeed from "@/seed/skill-tree.seed.json";
import dailyTemplateSeed from "@/seed/daily-template.seed.json";
import aiOutputSchemasSeed from "@/seed/ai-output-schemas.seed.json";

const prisma = new PrismaClient();

type SeedResource = (typeof resourcesSeed)[number] & {
  notes?: string;
};

const REQUIRED_RESOURCE_MATCHERS: Array<[string, (name: string) => boolean]> = [
  ["MIT OCW 6.111", (name) => name.includes("mit ocw 6.111")],
  ["RISC-V specs", (name) => name.includes("risc-v") && name.includes("spec")],
  ["Chipyard", (name) => name.includes("chipyard")],
  ["Verilator", (name) => name.includes("verilator")],
  ["cocotb", (name) => name.includes("cocotb")],
  ["Accellera UVM", (name) => name.includes("accellera") && name.includes("uvm")],
  ["Verification Academy", (name) => name.includes("verification academy")],
  ["Doulos", (name) => name.includes("doulos")],
  ["Yosys", (name) => name.includes("yosys")],
  ["OpenROAD", (name) => name.includes("openroad")],
  ["Tiny Tapeout", (name) => name.includes("tiny tapeout")],
  ["Synopsys University Program", (name) => name.includes("synopsys university")],
  ["Synopsys.ai", (name) => name.includes("synopsys.ai")],
  ["Cadence Training", (name) => name.includes("cadence training")],
  ["Cadence Academic Network", (name) => name.includes("cadence academic")],
  ["Cadence Digital Design and Signoff", (name) => name.includes("digital design and signoff")],
  ["Cadence System Design and Verification", (name) => name.includes("system design and verification")],
  ["Siemens Xcelerator Academy", (name) => name.includes("siemens xcelerator")],
  ["Siemens EDA Self-Paced", (name) => name.includes("self-paced")],
  ["Siemens Badging", (name) => name.includes("badging")],
  ["Keysight ADS", (name) => name.includes("keysight") && name.includes("ads")],
  ["VSD", (name) => name.includes("vsd") || name.includes("vlsi system design")],
  ["极术社区", (name) => name.includes("极术")],
  ["移知/EEEKnow", (name) => name.includes("eeeknow") || name.includes("移知")],
  ["EETOP", (name) => name.includes("eetop")],
  ["IC修真院", (name) => name.includes("ic修真院")],
  ["JMOOC", (name) => name.includes("jmooc")],
  ["K-MOOC", (name) => name.includes("k-mooc")],
  ["Berkeley EECS151", (name) => name.includes("berkeley eecs 151")],
  ["Estill", (name) => name.includes("estill")],
  ["CVT", (name) => name.includes("cvt") || name.includes("complete vocal")],
  ["Berklee Online", (name) => name.includes("berklee online")],
  ["STEEZY", (name) => name.includes("steezy")],
  ["CLI Studios", (name) => name.includes("cli studios")],
  ["Broadway Dance Center", (name) => name.includes("broadway dance center")],
  ["FL Studio", (name) => name.includes("fl studio")],
  ["SoundGym", (name) => name.includes("soundgym")],
  ["YC Library", (name) => name.includes("y combinator")],
  ["Damodaran", (name) => name.includes("damodaran")],
  ["Wharton Online", (name) => name.includes("wharton")],
  ["Toastmasters", (name) => name.includes("toastmasters")],
  ["OpenAI Deep Research API", (name) => name.includes("openai deep research")],
  ["OpenAI File Search", (name) => name.includes("openai file search")],
  ["Next.js Docs", (name) => name.includes("next.js")],
  ["Supabase Next.js", (name) => name.includes("supabase next.js")],
  ["Supabase pgvector", (name) => name.includes("pgvector")],
  ["Vercel Git Deploy", (name) => name.includes("vercel git")]
];

function assertRequiredResources() {
  const names = resourcesSeed.map((resource) => resource.name.toLowerCase());
  const missing = REQUIRED_RESOURCE_MATCHERS.filter(([, matcher]) => {
    return !names.some((name) => matcher(name));
  }).map(([label]) => label);

  if (missing.length > 0) {
    throw new Error(`Required resources missing from seed: ${missing.join(", ")}`);
  }
}

async function upsertCoreFramework() {
  await prisma.coreFramework.updateMany({
    where: { isActive: true },
    data: { isActive: false }
  });

  const existing = await prisma.coreFramework.findFirst({
    where: {
      version: "0.1.0",
      title: coreFrameworkSeed.system_name
    }
  });

  const framework = existing
    ? await prisma.coreFramework.update({
        where: { id: existing.id },
        data: {
          content: coreFrameworkSeed,
          isActive: true
        }
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

  return framework;
}

async function upsertResources() {
  for (const resource of resourcesSeed as SeedResource[]) {
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
        status: ResourceStatus.SEED,
        notes: resource.notes ?? null
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
        status: ResourceStatus.SEED,
        notes: resource.notes ?? null
      }
    });
  }
}

async function upsertSkillTree() {
  await prisma.skillNode.upsert({
    where: { id: skillTreeSeed.root.id },
    update: {
      parentId: null,
      name: skillTreeSeed.root.name,
      domain: "root",
      currentLevel: skillTreeSeed.root.current_level,
      targetLevel: skillTreeSeed.root.target_level,
      evidenceRequired: ["Top-level life system evidence"],
      description: "Root node for Aialra Life OS skill graph.",
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
      description: "Root node for Aialra Life OS skill graph.",
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
}

async function upsertSettingsAndPrompts() {
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

  await prisma.systemSetting.upsert({
    where: { key: "deployment_domain" },
    update: { value: { domain: "lifeos.aialra.online" } },
    create: { key: "deployment_domain", value: { domain: "lifeos.aialra.online" } }
  });

  for (const [id, outputSchema] of Object.entries(aiOutputSchemasSeed)) {
    await prisma.promptTemplate.upsert({
      where: { id },
      update: {
        name: id,
        version: "0.1.0",
        description: "Seeded AI output schema.",
        template: `Return JSON matching ${id}.`,
        outputSchema
      },
      create: {
        id,
        name: id,
        version: "0.1.0",
        description: "Seeded AI output schema.",
        template: `Return JSON matching ${id}.`,
        outputSchema
      }
    });
  }

  await prisma.promptTemplate.upsert({
    where: { id: "planner_agent_v1" },
    update: {
      name: "PlannerAgent",
      version: "0.1.0",
      description: "Daily 03:00-20:00 half-hour planner prompt.",
      template:
        "Preserve 03:00 wake and 20:00 sleep. Prioritize Chip/EDA. Include all required daily domains. Every block needs verifiable output.",
      outputSchema: aiOutputSchemasSeed.daily_plan_schema
    },
    create: {
      id: "planner_agent_v1",
      name: "PlannerAgent",
      version: "0.1.0",
      description: "Daily 03:00-20:00 half-hour planner prompt.",
      template:
        "Preserve 03:00 wake and 20:00 sleep. Prioritize Chip/EDA. Include all required daily domains. Every block needs verifiable output.",
      outputSchema: aiOutputSchemasSeed.daily_plan_schema
    }
  });
}

async function main() {
  assertRequiredResources();

  await upsertCoreFramework();
  await upsertResources();
  await upsertSkillTree();
  await upsertSettingsAndPrompts();

  await prisma.auditEvent.create({
    data: {
      eventType: "seed.import",
      entityType: "system",
      payload: {
        resources: resourcesSeed.length,
        skill_nodes: skillTreeSeed.nodes.length + 1,
        anchors: coreFrameworkSeed.daily_anchor_points.length
      }
    }
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        resources: resourcesSeed.length,
        skillNodes: skillTreeSeed.nodes.length + 1,
        anchors: coreFrameworkSeed.daily_anchor_points.length
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
