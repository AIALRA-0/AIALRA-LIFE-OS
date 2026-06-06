import type { UserProfile } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getLocalSessionEmail, hasLocalAuthConfig } from "@/lib/local-auth";

export class AuthRequiredError extends Error {
  constructor() {
    super("需要先登录。");
    this.name = "AuthRequiredError";
  }
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL && hasLocalAuthConfig()) {
    const email = await getLocalSessionEmail();
    if (!email) return null;

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

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    return null;
  }

  const existingById = await prisma.userProfile.findUnique({
    where: { id: user.id }
  });

  if (existingById) {
    return prisma.userProfile.update({
      where: { id: user.id },
      data: {
        email: user.email,
        displayName:
          typeof user.user_metadata?.name === "string"
            ? user.user_metadata.name
            : existingById.displayName
      }
    });
  }

  const existingByEmail = await prisma.userProfile.findUnique({
    where: { email: user.email }
  });

  if (existingByEmail) {
    return existingByEmail;
  }

  return prisma.userProfile.create({
    data: {
      id: user.id,
      email: user.email,
      displayName:
        typeof user.user_metadata?.name === "string"
          ? user.user_metadata.name
          : null,
      timezone: "America/New_York"
    }
  });
}

export async function requireUserProfile(): Promise<UserProfile> {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    throw new AuthRequiredError();
  }
  return profile;
}

export function authErrorResponse(error: unknown) {
  if (error instanceof AuthRequiredError) {
    return Response.json({ error: "未登录" }, { status: 401 });
  }

  throw error;
}
