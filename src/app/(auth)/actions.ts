"use server";

import { redirect } from "next/navigation";
import { dbAdmin } from "@/lib/db";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { setCurrentOrgCookie, clearCurrentOrgCookie } from "@/lib/auth";
import { createOrganizationWithDefaults } from "@/lib/bootstrap";

export type AuthState = { error?: string };

// Supabase Auth にユーザーを作成し、プロフィール行 (User) も同期する。
// email_confirm: true でメール確認をスキップし、その場でログインできる UX を維持する。
async function createAuthUser(email: string, password: string, name: string) {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (error) {
    if (error.code === "email_exists") {
      return { error: "このメールアドレスは既に登録されています" };
    }
    if (error.code === "weak_password") {
      return { error: "パスワードが簡単すぎます。より複雑なものにしてください" };
    }
    console.error("createAuthUser failed:", error);
    return { error: "アカウント作成に失敗しました。時間をおいて再度お試しください" };
  }
  try {
    await dbAdmin.user.create({ data: { id: data.user.id, email, name } });
  } catch (e) {
    await admin.auth.admin.deleteUser(data.user.id).catch(() => {});
    throw e;
  }
  return { userId: data.user.id };
}

async function signIn(email: string, password: string) {
  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error;
}

export async function register(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const orgName = String(formData.get("orgName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const agreed = formData.get("agree") === "on";

  if (!name || !orgName || !email || password.length < 8) {
    return { error: "全項目を入力してください (パスワードは8文字以上)" };
  }
  if (!agreed) {
    return { error: "利用規約と個人情報保護方針への同意が必要です" };
  }

  const created = await createAuthUser(email, password, name);
  if ("error" in created) return created;

  // 規約同意の記録 (いつの時点の同意かを証跡として残す)
  await dbAdmin.user.update({
    where: { id: created.userId },
    data: { termsAcceptedAt: new Date() },
  });

  const org = await createOrganizationWithDefaults(orgName, created.userId);

  // システム管理者向けの利用ログ
  await dbAdmin.billingEvent
    .create({
      data: {
        orgId: org.id,
        orgName: org.name,
        email,
        type: "REGISTER",
        detail: org.earlyBird ? "早期登録特典 (3ヶ月無料)" : "通常登録 (初月無料)",
      },
    })
    .catch(() => {}); // ログ失敗で登録自体を止めない

  const signInError = await signIn(email, password);
  if (signInError) return { error: "アカウントは作成されました。ログイン画面からログインしてください" };
  await setCurrentOrgCookie(org.id);
  // 新規登録直後は Pro 前提の経営数値分析ではなく、まず顧客管理から使い始めてもらう。
  redirect("/customers");
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  // 招待リンク経由のログインでは戻り先 (招待受諾ページ) を next で受け取る。相対パスのみ許可。
  const nextRaw = String(formData.get("next") ?? "");
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "";

  const signInError = await signIn(email, password);
  if (signInError) {
    return { error: "メールアドレスまたはパスワードが正しくありません" };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const membership = user
    ? await dbAdmin.membership.findFirst({ where: { userId: user.id }, orderBy: { id: "asc" } })
    : null;
  if (!membership) {
    // 所属組織がなくても、招待リンクへ戻れば受諾して組織に参加できる。
    if (next.startsWith("/invite/")) redirect(next);
    await supabase.auth.signOut();
    return { error: "所属する組織がありません" };
  }
  await setCurrentOrgCookie(membership.orgId);
  redirect(next || "/dashboard");
}

export async function logout() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  await clearCurrentOrgCookie();
  redirect("/login");
}

export async function switchOrg(orgId: string) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const membership = await dbAdmin.membership.findUnique({
    where: { userId_orgId: { userId: user.id, orgId } },
  });
  if (membership) {
    await setCurrentOrgCookie(orgId);
  }
  redirect("/dashboard");
}

export async function acceptInvite(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const token = String(formData.get("token") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const invite = await dbAdmin.invitation.findUnique({ where: { token } });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    return { error: "招待リンクが無効か、期限切れです" };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  let userId: string;
  const existing = await dbAdmin.user.findUnique({ where: { email: invite.email } });

  if (existing) {
    // 既存アカウント: 招待メール宛のユーザーとしてログイン済みであることを要求する
    if (!currentUser || currentUser.email?.toLowerCase() !== invite.email.toLowerCase()) {
      return { error: "既存アカウントの招待です。先にログインしてから、もう一度この招待リンクを開いてください" };
    }
    userId = existing.id;
  } else {
    if (!name || password.length < 8) {
      return { error: "名前とパスワード (8文字以上) を入力してください" };
    }
    if (formData.get("agree") !== "on") {
      return { error: "利用規約・個人情報保護方針・課金の仕組みへの同意が必要です" };
    }
    const created = await createAuthUser(invite.email, password, name);
    if ("error" in created) return created;
    userId = created.userId;
    // 規約同意の記録 (新規登録と同様に証跡として残す)
    await dbAdmin.user
      .update({ where: { id: userId }, data: { termsAcceptedAt: new Date() } })
      .catch(() => {});
    const signInError = await signIn(invite.email, password);
    if (signInError) {
      return { error: "アカウントは作成されました。ログイン画面からログインしてください" };
    }
  }

  await dbAdmin.membership.upsert({
    where: { userId_orgId: { userId, orgId: invite.orgId } },
    create: { userId, orgId: invite.orgId, role: invite.role },
    update: {},
  });
  await dbAdmin.invitation.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
  await setCurrentOrgCookie(invite.orgId);
  redirect("/dashboard");
}
