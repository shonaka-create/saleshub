import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "./supabase";
import { dbAdmin, rlsContext } from "./db";

// 現在操作中の組織 (テナント) を保持する Cookie。認証そのものは Supabase Auth の Cookie が担う。
const ORG_COOKIE = "akane_org";

export async function setCurrentOrgCookie(orgId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ORG_COOKIE, orgId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export async function clearCurrentOrgCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(ORG_COOKIE);
}

// Supabase Auth のユーザー + メンバーシップ検証済みのコンテキストを返す (リクエスト内キャッシュ)。
// 検証に成功したら RLS コンテキストを設定し、以降の db クエリがテナント分離される。
// メンバーシップ検証自体はセッション成立前のため dbAdmin で行う。
//
// メモ化は React.cache ではなく cookies() ストアをキーにした WeakMap で行う。
// React.cache はレンダリング外 (Server Action 実行中) ではメモ化されず、
// RLS コンテキストの設定がアクション内の db クエリに反映されないため。
type Session = {
  user: { id: string; email: string; name: string; createdAt: Date };
  org: {
    id: string;
    name: string;
    baseCurrency: string;
    fxRates: string;
    settings: string;
    createdAt: Date;
  };
  role: string;
};
const sessionByRequest = new WeakMap<object, Promise<Session | null>>();

export async function getSession(): Promise<Session | null> {
  const key = (await cookies()) as unknown as object;
  let pending = sessionByRequest.get(key);
  if (!pending) {
    pending = resolveSession();
    sessionByRequest.set(key, pending);
  }
  return pending;
}

async function resolveSession(): Promise<Session | null> {
  const supabase = await createSupabaseServer();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return null;

  const cookieStore = await cookies();
  const preferredOrgId = cookieStore.get(ORG_COOKIE)?.value;

  let membership = preferredOrgId
    ? await dbAdmin.membership.findUnique({
        where: { userId_orgId: { userId: authUser.id, orgId: preferredOrgId } },
        include: { user: true, org: true },
      })
    : null;
  membership ??= await dbAdmin.membership.findFirst({
    where: { userId: authUser.id },
    include: { user: true, org: true },
    orderBy: { id: "asc" },
  });
  if (!membership) return null;

  const ctx = await rlsContext();
  ctx.userId = membership.userId;
  ctx.orgId = membership.orgId;

  return {
    user: membership.user,
    org: membership.org,
    role: membership.role,
  };
}

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export function isAdmin(role: string) {
  return role === "OWNER" || role === "ADMIN";
}
