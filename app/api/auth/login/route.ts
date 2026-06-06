import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  hasLocalAuthConfig,
  setLocalSession,
  verifyLocalCredentials
} from "@/lib/local-auth";
import { parseJsonBody } from "@/lib/utils/json";

export const dynamic = "force-dynamic";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(request: Request) {
  const payload = await parseJsonBody(request, LoginSchema);

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: payload.email,
      password: payload.password
    });

    if (error) {
      return Response.json({ error: "账号或密码不正确。" }, { status: 401 });
    }

    return Response.json({ ok: true, provider: "supabase" });
  }

  if (hasLocalAuthConfig() && verifyLocalCredentials(payload.email, payload.password)) {
    await setLocalSession(payload.email);
    return Response.json({ ok: true, provider: "local" });
  }

  return Response.json({ error: "账号或密码不正确。" }, { status: 401 });
}
