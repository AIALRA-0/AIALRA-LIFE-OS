import { redirect } from "next/navigation";
import { AuthRequiredError, requireUserProfile } from "@/lib/auth";

export async function requirePageUser() {
  try {
    return await requireUserProfile();
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      redirect("/login");
    }

    throw error;
  }
}
