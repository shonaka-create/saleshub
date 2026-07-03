"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";
import { createOrganizationWithDefaults } from "@/lib/bootstrap";

export type AuthState = { error?: string };

export async function register(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const orgName = String(formData.get("orgName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !orgName || !email || password.length < 8) {
    return { error: "全項目を入力してください (パスワードは8文字以上)" };
  }
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { error: "このメールアドレスは既に登録されています" };

  const user = await db.user.create({
    data: { name, email, passwordHash: await bcrypt.hash(password, 10) },
  });
  const org = await createOrganizationWithDefaults(orgName, user.id);
  await createSession(user.id, org.id);
  redirect("/dashboard");
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = await db.user.findUnique({
    where: { email },
    include: { memberships: { include: { org: true } } },
  });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "メールアドレスまたはパスワードが正しくありません" };
  }
  const membership = user.memberships[0];
  if (!membership) return { error: "所属する組織がありません" };
  await createSession(user.id, membership.orgId);
  redirect("/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function switchOrg(orgId: string) {
  const { readSessionToken } = await import("@/lib/auth");
  const payload = await readSessionToken();
  if (!payload) redirect("/login");
  const membership = await db.membership.findUnique({
    where: { userId_orgId: { userId: payload.userId, orgId } },
  });
  if (membership) {
    await createSession(payload.userId, orgId);
  }
  redirect("/dashboard");
}

export async function acceptInvite(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const token = String(formData.get("token") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const invite = await db.invitation.findUnique({ where: { token } });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    return { error: "招待リンクが無効か、期限切れです" };
  }

  let user = await db.user.findUnique({ where: { email: invite.email } });
  if (!user) {
    if (!name || password.length < 8) {
      return { error: "名前とパスワード (8文字以上) を入力してください" };
    }
    user = await db.user.create({
      data: { name, email: invite.email, passwordHash: await bcrypt.hash(password, 10) },
    });
  }

  await db.membership.upsert({
    where: { userId_orgId: { userId: user.id, orgId: invite.orgId } },
    create: { userId: user.id, orgId: invite.orgId, role: invite.role },
    update: {},
  });
  await db.invitation.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
  await createSession(user.id, invite.orgId);
  redirect("/dashboard");
}
