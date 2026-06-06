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

export function redactSecrets<T>(value: T): T {
  const text = JSON.stringify(value);
  return JSON.parse(
    text.replace(
      /(sk-[A-Za-z0-9_-]{12,}|SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|DATABASE_URL)/g,
      "[REDACTED]"
    )
  ) as T;
}
