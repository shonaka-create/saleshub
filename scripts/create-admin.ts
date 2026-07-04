// システム管理者アカウントを作成する。
// 実行: npx tsx --env-file=.env scripts/create-admin.ts
//
// - Supabase Auth にユーザーを作成 (既存ならそのまま利用)
// - User.isSystemAdmin = true を付与
// - 所属組織がなければ運営用組織を作成 (basePlanStatus=ACTIVE: 運営アカウントは課金対象外)

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = "nakaebisu.shotaro1543@gmail.com";
const ADMIN_PASSWORD = "1543baske";
const ADMIN_NAME = "中戎 翔太郎";
const ADMIN_ORG_NAME = "AKANE WEB STUDIO (運営)";

const db = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL_ADMIN });

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // 1. Supabase Auth ユーザーを作成 (既存なら取得)
  let userId: string;
  const { data, error } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { name: ADMIN_NAME },
  });
  if (error) {
    if (error.code === "email_exists") {
      console.log("Auth ユーザーは既に存在します。既存ユーザーを検索します...");
      const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      if (listErr) throw listErr;
      const existing = list.users.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL);
      if (!existing) throw new Error("既存ユーザーが見つかりませんでした");
      userId = existing.id;
      // パスワードを memo 記載の値に更新
      await supabase.auth.admin.updateUserById(userId, { password: ADMIN_PASSWORD });
      console.log("パスワードを更新しました");
    } else {
      throw error;
    }
  } else {
    userId = data.user.id;
    console.log(`Auth ユーザーを作成しました: ${userId}`);
  }

  // 2. User プロフィール行 + システム管理者フラグ
  await db.user.upsert({
    where: { id: userId },
    create: {
      id: userId,
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      isSystemAdmin: true,
      termsAcceptedAt: new Date(),
    },
    update: { isSystemAdmin: true },
  });
  console.log("User.isSystemAdmin = true を設定しました");

  // 3. 所属組織がなければ運営用組織を作成
  const membership = await db.membership.findFirst({ where: { userId } });
  if (!membership) {
    const org = await db.organization.create({
      data: {
        name: ADMIN_ORG_NAME,
        basePlanStatus: "ACTIVE", // 運営アカウントは課金対象外として常時有効
        earlyBird: true,
        memberships: { create: { userId, role: "OWNER" } },
      },
    });
    console.log(`運営用組織を作成しました: ${org.name} (${org.id})`);
  } else {
    console.log("既に組織に所属しています (組織作成はスキップ)");
  }

  console.log(`\n完了: ${ADMIN_EMAIL} でログイン後、/admin にアクセスできます`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
