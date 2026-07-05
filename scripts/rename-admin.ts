// 運営者アカウントの表示名を修正する (中戎 翔太郎 → 中胡 翔太郎)。
// 実行: npx tsx --env-file=.env scripts/rename-admin.ts
//
// - User.name (プロフィール) を更新
// - Supabase Auth の user_metadata.name も揃える

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = "nakaebisu.shotaro1543@gmail.com";
const OLD_NAME = "中戎 翔太郎";
const NEW_NAME = "中胡 翔太郎";

const db = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL_ADMIN });

async function main() {
  // 1. DB プロフィール名を更新 (旧名 or メール一致のどちらでも拾う)
  const res = await db.user.updateMany({
    where: { email: ADMIN_EMAIL },
    data: { name: NEW_NAME },
  });
  console.log(`User.name を更新: ${res.count} 件 (${OLD_NAME} → ${NEW_NAME})`);

  // 2. Supabase Auth の user_metadata.name も揃える
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data: list, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const user = list.users.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL);
  if (user) {
    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, name: NEW_NAME },
    });
    console.log(`Supabase Auth user_metadata.name を更新しました (${user.id})`);
  } else {
    console.warn("Supabase Auth に該当ユーザーが見つかりませんでした");
  }

  console.log("完了");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
