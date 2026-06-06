import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "lifeos_local_session";

function localEmail() {
  return process.env.LIFEOS_LOCAL_EMAIL ?? process.env.CODEXAPP_USERNAME;
}

function localPassword() {
  return process.env.LIFEOS_LOCAL_PASSWORD ?? process.env.CODEXAPP_PASSWORD;
}

function localSecret() {
  return process.env.LIFEOS_LOCAL_AUTH_SECRET ?? process.env.CODEXAPP_SESSION_SECRET;
}

export function hasLocalAuthConfig() {
  return Boolean(localEmail() && localPassword() && localSecret());
}

export function verifyLocalCredentials(email: string, password: string) {
  return email === localEmail() && password === localPassword();
}

function sign(email: string) {
  const secret = localSecret();
  if (!secret) throw new Error("Missing local auth secret.");
  return createHmac("sha256", secret).update(email).digest("hex");
}

export function createLocalSessionValue(email: string) {
  return `${Buffer.from(email).toString("base64url")}.${sign(email)}`;
}

export function verifyLocalSessionValue(value?: string) {
  if (!value || !hasLocalAuthConfig()) return null;
  const [encodedEmail, signature] = value.split(".");
  if (!encodedEmail || !signature) return null;

  const email = Buffer.from(encodedEmail, "base64url").toString("utf8");
  const expected = sign(email);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(providedBuffer, expectedBuffer)) return null;
  if (email !== localEmail()) return null;

  return email;
}

export async function setLocalSession(email: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createLocalSessionValue(email), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

export async function getLocalSessionEmail() {
  const cookieStore = await cookies();
  return verifyLocalSessionValue(cookieStore.get(COOKIE_NAME)?.value);
}

export async function clearLocalSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
