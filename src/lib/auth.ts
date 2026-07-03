import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "./db";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dev-secret-do-not-use-in-production"
);
const COOKIE_NAME = "akane_session";

export type SessionPayload = {
  userId: string;
  orgId: string;
};

export async function createSession(userId: string, orgId: string) {
  const token = await new SignJWT({ userId, orgId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function readSessionToken(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (typeof payload.userId !== "string" || typeof payload.orgId !== "string") return null;
    return { userId: payload.userId, orgId: payload.orgId };
  } catch {
    return null;
  }
}

// セッション + メンバーシップ検証済みのコンテキストを返す (リクエスト内キャッシュ)
export const getSession = cache(async () => {
  const payload = await readSessionToken();
  if (!payload) return null;
  const membership = await db.membership.findUnique({
    where: { userId_orgId: { userId: payload.userId, orgId: payload.orgId } },
    include: { user: true, org: true },
  });
  if (!membership) return null;
  return {
    user: membership.user,
    org: membership.org,
    role: membership.role,
  };
});

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export function isAdmin(role: string) {
  return role === "OWNER" || role === "ADMIN";
}
