import { existsSync, readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import { extractJsonFromText } from "../lib/utils/json";

type EnvMap = Record<string, string>;

type CookieJar = {
  header: string;
  addFromResponse(response: Response): void;
};

type PromptPackageResponse = {
  agentRunId: string;
  dailyInputId: string;
  date: string;
  prompt: string;
  chatMessage: string;
  uploadFiles: Array<{
    filename: string;
    mimeType: string;
    description: string;
    content: string;
  }>;
};

type ImportResponse = {
  dailyPlanId: string;
  validation: { ok: boolean; errors?: string[] };
};

type TodayPlanResponse = {
  plan: {
    id: string;
    blocks: Array<{
      id: string;
      startTime: string;
      endTime: string;
      domain: string;
      title: string;
      expectedOutput: string;
    }>;
  };
};

type ReviewResponse = {
  summary: string;
  completionRate: number;
};

type DeepSeekResult = {
  content: string;
  usage: unknown;
  maxTokens: number;
};

const TEST_DATE = process.env.LIFEOS_E2E_DATE ?? "2099-01-01";
const TEST_MARKER = "[DEEPSEEK_E2E]";
const ENV_FILES = [
  ".env.production",
  ".env",
  "/srv/aialra/config/secrets/codexapp.env",
  "/srv/aialra/config/secrets/deeeeeepwiki.env",
  "/srv/aialra/config/secrets/readlayer.env",
  "/srv/aialra/config/secrets/opencode.env",
  "/srv/aialra/config/secrets/opencode-debug1.env"
];

function parseEnvFile(path: string): EnvMap {
  if (!existsSync(path)) return {};
  const result: EnvMap = {};
  const content = readFileSync(path, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const normalized = line.startsWith("export ") ? line.slice("export ".length).trim() : line;
    const equalsIndex = normalized.indexOf("=");
    if (equalsIndex <= 0) continue;

    const key = normalized.slice(0, equalsIndex).trim();
    let value = normalized.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }

  return result;
}

function loadEnv() {
  const merged: EnvMap = {};
  for (const file of ENV_FILES) {
    const parsed = parseEnvFile(file);
    for (const [key, value] of Object.entries(parsed)) {
      if (!merged[key]) merged[key] = value;
      if (!process.env[key]) process.env[key] = value;
    }
  }

  return merged;
}

function firstEnv(env: EnvMap, keys: string[]) {
  for (const key of keys) {
    const value = process.env[key] ?? env[key];
    if (value) return { key, value };
  }

  return null;
}

function findEnvSource(variableName: string) {
  for (const file of ENV_FILES) {
    const parsed = parseEnvFile(file);
    if (parsed[variableName]) return `${file}:${variableName}`;
  }

  return `process.env:${variableName}`;
}

function normalizeDeepSeekModel(model: string) {
  const trimmed = model.trim();
  if (trimmed.startsWith("deepseek/")) {
    return trimmed.slice("deepseek/".length);
  }

  return trimmed;
}

function createCookieJar(): CookieJar {
  const cookies = new Map<string, string>();

  return {
    get header() {
      return Array.from(cookies.entries())
        .map(([name, value]) => `${name}=${value}`)
        .join("; ");
    },
    addFromResponse(response) {
      const raw = response.headers.get("set-cookie");
      if (!raw) return;

      const parts = raw.split(/,(?=\s*[^=;,]+=[^;,]+)/);
      for (const part of parts) {
        const [cookiePair] = part.trim().split(";");
        const equalsIndex = cookiePair.indexOf("=");
        if (equalsIndex <= 0) continue;
        cookies.set(cookiePair.slice(0, equalsIndex), cookiePair.slice(equalsIndex + 1));
      }
    }
  };
}

async function requestJson<T>({
  baseUrl,
  jar,
  path,
  method = "GET",
  body
}: {
  baseUrl: string;
  jar: CookieJar;
  path: string;
  method?: "GET" | "POST";
  body?: unknown;
}) {
  const response = await fetch(new URL(path, baseUrl), {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(jar.header ? { Cookie: jar.header } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  jar.addFromResponse(response);

  const text = await response.text();
  const parsed = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(
      `${method} ${path} failed with ${response.status}: ${JSON.stringify(parsed)}`
    );
    Object.assign(error, { status: response.status, body: parsed });
    throw error;
  }

  return parsed as T;
}

function buildDeepSeekPrompt(promptPackage: PromptPackageResponse) {
  return [
    promptPackage.chatMessage,
    "",
    "下面是这些文件的完整内容。请把它们当作已经上传的文件读取。",
    "",
    ...promptPackage.uploadFiles.flatMap((file) => [
      `## ${file.filename}`,
      "",
      file.content,
      ""
    ]),
    "再次强调：只输出 JSON 对象，不要 Markdown，不要解释，不要代码块。"
  ].join("\n");
}

function buildRepairPrompt({
  promptPackage,
  previousPlan,
  validationErrors
}: {
  promptPackage: PromptPackageResponse;
  previousPlan: unknown;
  validationErrors: string[];
}) {
  return [
    buildDeepSeekPrompt(promptPackage),
    "",
    "上一版 JSON 没有通过 Life OS 导入校验。请只输出修正后的完整 JSON 对象。",
    "",
    "## Life OS 校验错误",
    "",
    validationErrors.map((error) => `- ${error}`).join("\n"),
    "",
    "## 上一版 JSON",
    "",
    JSON.stringify(previousPlan, null, 2),
    "",
    "修正规则：不要只输出补丁；必须输出完整 daily_plan_schema JSON；不要 Markdown；不要解释；不要代码块。"
  ].join("\n");
}

function getValidationErrors(error: unknown) {
  if (!(error instanceof Error)) return null;
  const body = (error as Error & { body?: unknown }).body;
  if (!body || typeof body !== "object") return null;
  const validation = (body as { validation?: unknown }).validation;
  if (!validation || typeof validation !== "object") return null;
  const errors = (validation as { errors?: unknown }).errors;
  return Array.isArray(errors) && errors.every((item) => typeof item === "string")
    ? errors
    : null;
}

async function callDeepSeek({
  apiKey,
  baseUrl,
  model,
  prompt
}: {
  apiKey: string;
  baseUrl: string;
  model: string;
  prompt: string;
}): Promise<DeepSeekResult> {
  const endpoint = new URL("/chat/completions", baseUrl).toString();
  const systemPrompt = [
    "你是 Aialra Life OS 的每日计划 Agent。",
    "你必须输出严格 JSON 对象。",
    "不要 Markdown，不要解释，不要代码块。",
    "所有用户可见文本使用简体中文。"
  ].join("\n");
  const maxTokenAttempts = [16000, 8192, 4096];
  let lastError: unknown = null;

  for (const maxTokens of maxTokenAttempts) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: maxTokens
      })
    });

    const text = await response.text();
    const parsed = text ? JSON.parse(text) : null;
    if (!response.ok) {
      lastError = new Error(
        `DeepSeek failed with ${response.status} at max_tokens=${maxTokens}: ${JSON.stringify(parsed)}`
      );
      continue;
    }

    const content = parsed?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      lastError = new Error("DeepSeek returned an empty message content.");
      continue;
    }

    return {
      content,
      usage: parsed?.usage,
      maxTokens
    };
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function toUtcDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

async function cleanupTestData(email: string, dateText: string, agentRunIds: string[]) {
  const prisma = new PrismaClient();

  try {
    const user = await prisma.userProfile.findUnique({ where: { email } });
    if (!user) return { plans: 0, inputs: 0, logs: 0, journals: 0, agentRuns: 0 };

    const date = toUtcDate(dateText);
    const plans = await prisma.dailyPlan.findMany({
      where: { userId: user.id, date },
      include: { blocks: { select: { id: true } } }
    });
    const planIds = plans.map((plan) => plan.id);
    const blockIds = plans.flatMap((plan) => plan.blocks.map((block) => block.id));

    const logs = blockIds.length
      ? await prisma.executionLog.deleteMany({ where: { planBlockId: { in: blockIds } } })
      : { count: 0 };
    const journals = await prisma.journalEntry.deleteMany({ where: { userId: user.id, date } });
    const linkedAgentRuns = planIds.length
      ? await prisma.agentRun.deleteMany({ where: { dailyPlanId: { in: planIds } } })
      : { count: 0 };
    const explicitAgentRuns = agentRunIds.length
      ? await prisma.agentRun.deleteMany({ where: { id: { in: agentRunIds } } })
      : { count: 0 };
    const deletedPlans = await prisma.dailyPlan.deleteMany({ where: { id: { in: planIds } } });
    const inputs = await prisma.dailyInput.deleteMany({
      where: {
        userId: user.id,
        date,
        mustDo: { contains: TEST_MARKER }
      }
    });

    return {
      plans: deletedPlans.count,
      inputs: inputs.count,
      logs: logs.count,
      journals: journals.count,
      agentRuns: linkedAgentRuns.count + explicitAgentRuns.count
    };
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const env = loadEnv();
  const deepSeekKey = firstEnv(env, [
    "DEEPSEEK_API_KEY",
    "OPENCODE_DEEPSEEK_API_KEY",
    "DS_API_KEY"
  ]);
  const email = firstEnv(env, ["LIFEOS_LOCAL_EMAIL", "CODEXAPP_USERNAME"]);
  const password = firstEnv(env, ["LIFEOS_LOCAL_PASSWORD", "CODEXAPP_PASSWORD"]);

  if (!deepSeekKey) {
    throw new Error("没有找到 DeepSeek API key。需要 DEEPSEEK_API_KEY 或 OPENCODE_DEEPSEEK_API_KEY。");
  }
  if (!email || !password) {
    throw new Error("没有找到 Life OS 登录凭据。需要 LIFEOS_LOCAL_EMAIL/CODEXAPP_USERNAME 与对应密码。");
  }

  const baseUrl = process.env.LIFEOS_TEST_APP_URL ?? "https://lifeos.aialra.online";
  const baseUrlWithSlash = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const deepSeekBaseUrl =
    process.env.DEEPSEEK_BASE_URL ?? env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
  const model =
    normalizeDeepSeekModel(
      process.env.DEEPSEEK_E2E_MODEL ??
        process.env.OPENCODE_E2E_MODEL ??
        process.env.DEEPSEEK_MODEL_PRO ??
        process.env.DEEPSEEK_MODEL ??
        "deepseek-v4-flash"
    );

  const agentRunIds: string[] = [];
  await cleanupTestData(email.value, TEST_DATE, agentRunIds);

  try {
    const jar = createCookieJar();
    await requestJson({
      baseUrl: baseUrlWithSlash,
      jar,
      path: "/api/auth/login",
      method: "POST",
      body: {
        email: email.value,
        password: password.value
      }
    });

    const promptPackage = await requestJson<PromptPackageResponse>({
      baseUrl: baseUrlWithSlash,
      jar,
      path: "/api/plan/prompt-package",
      method: "POST",
      body: {
        date: TEST_DATE,
        mustDo: `${TEST_MARKER} 完成一个芯片/EDA最小产出，并验证 DeepSeek 生成计划质量`,
        temporaryItems: "15:30 前回复一封外部消息；如果冲突，压缩副线但保留最小产出。",
        specialNeeds: "测试日：低噪音、结构清晰、每块都要有可验证产出。",
        externalMessageSummary:
          "Gmail 摘要：一封合作邮件需要当日回复；一封学习资料邮件可以延后处理。",
        sleepQuality: 3,
        weightKg: 100,
        painLevel: 1,
        energy: 3,
        focus: 3,
        anxiety: 1,
        urgeRisk: 0
      }
    });
    agentRunIds.push(promptPackage.agentRunId);

    const deepSeek = await callDeepSeek({
      apiKey: deepSeekKey.value,
      baseUrl: deepSeekBaseUrl,
      model,
      prompt: buildDeepSeekPrompt(promptPackage)
    });
    let planObject = extractJsonFromText(deepSeek.content);
    const deepSeekCalls = [deepSeek];
    let imported: ImportResponse | null = null;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        imported = await requestJson<ImportResponse>({
          baseUrl: baseUrlWithSlash,
          jar,
          path: "/api/plan/import-json",
          method: "POST",
          body: {
            agentRunId: promptPackage.agentRunId,
            dailyInputId: promptPackage.dailyInputId,
            date: TEST_DATE,
            planJson: planObject
          }
        });
        break;
      } catch (error) {
        const validationErrors = getValidationErrors(error);
        if (!validationErrors || attempt === 3) {
          throw error;
        }

        const repaired = await callDeepSeek({
          apiKey: deepSeekKey.value,
          baseUrl: deepSeekBaseUrl,
          model,
          prompt: buildRepairPrompt({
            promptPackage,
            previousPlan: planObject,
            validationErrors
          })
        });
        deepSeekCalls.push(repaired);
        planObject = extractJsonFromText(repaired.content);
      }
    }

    if (!imported) {
      throw new Error("DeepSeek 生成结果没有成功导入。");
    }

    const today = await requestJson<TodayPlanResponse>({
      baseUrl: baseUrlWithSlash,
      jar,
      path: `/api/plan/today?date=${TEST_DATE}`
    });

    const firstBlock = today.plan.blocks[0];
    if (!firstBlock) throw new Error("导入后没有计划块。");

    await requestJson({
      baseUrl: baseUrlWithSlash,
      jar,
      path: `/api/plan/block/${firstBlock.id}/checkin`,
      method: "POST",
      body: {
        status: "COMPLETED",
        actualStart: `${TEST_DATE}T03:00:00.000Z`,
        actualEnd: `${TEST_DATE}T03:30:00.000Z`,
        energy: 3,
        focus: 4,
        urgeTrigger: "",
        note: `${TEST_MARKER} 首块打卡成功。`,
        artifactUrl: ""
      }
    });

    const review = await requestJson<ReviewResponse>({
      baseUrl: baseUrlWithSlash,
      jar,
      path: "/api/review/daily",
      method: "POST",
      body: {
        date: TEST_DATE,
        mode: "generate_and_save"
      }
    });

    const cleanup = await cleanupTestData(email.value, TEST_DATE, agentRunIds);
    const report = {
      ok: true,
      appUrl: baseUrlWithSlash,
      deepSeekKeySource: findEnvSource(deepSeekKey.key),
      deepSeekModel: model,
      deepSeekAttempts: deepSeekCalls.length,
      deepSeekMaxTokens: deepSeekCalls.map((call) => call.maxTokens),
      promptUploadFiles: promptPackage.uploadFiles.map((file) => file.filename),
      importedPlanId: imported.dailyPlanId,
      validationOk: imported.validation.ok,
      blockCount: today.plan.blocks.length,
      firstBlock: {
        startTime: firstBlock.startTime,
        endTime: firstBlock.endTime,
        domain: firstBlock.domain,
        title: firstBlock.title
      },
      review: {
        completionRate: review.completionRate,
        summaryLength: review.summary.length
      },
      cleanup,
      usage: deepSeekCalls.map((call) => call.usage ?? null)
    };

    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    const cleanup = await cleanupTestData(email.value, TEST_DATE, agentRunIds);
    console.error(
      JSON.stringify(
        {
          ok: false,
          appUrl: baseUrlWithSlash,
          deepSeekKeySource: findEnvSource(deepSeekKey.key),
          deepSeekModel: model,
          error: error instanceof Error ? error.message : String(error),
          cleanup
        },
        null,
        2
      )
    );
    process.exitCode = 1;
  }
}

main();
