import { z } from "zod";

export function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>
): Promise<T> {
  const body = await request.json().catch(() => null);
  return schema.parse(body);
}

export function compactJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function extractJsonFromText(value: string): unknown {
  const trimmed = value.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  const candidate = fenced?.[1]?.trim() ?? trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    const firstObject = candidate.indexOf("{");
    const lastObject = candidate.lastIndexOf("}");
    if (firstObject >= 0 && lastObject > firstObject) {
      return JSON.parse(candidate.slice(firstObject, lastObject + 1));
    }
    throw new Error("无法解析 JSON，请确认粘贴的是 ChatGPT 返回的完整 JSON 对象。");
  }
}

export function redactSecrets<T>(value: T): T {
  const text = JSON.stringify(value);
  return JSON.parse(
    text.replace(
      /(sk-[A-Za-z0-9_-]{12,}|SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|DATABASE_URL)/g,
      "[REDACTED]"
    )
  ) as T;
}
