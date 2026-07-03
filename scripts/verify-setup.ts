// 移行後の疎通確認: Supabase Auth ログイン + RLS の実効性チェック
// 実行: npx tsx --env-file=.env scripts/verify-setup.ts
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

async function main() {
  // 1. Supabase Auth: デモユーザーでログインできるか (anon キー = アプリと同じ経路)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: signIn, error } = await supabase.auth.signInWithPassword({
    email: "demo@akane.studio",
    password: "akane1234",
  });
  if (error) throw new Error(`ログイン失敗: ${error.message}`);
  const userId = signIn.user.id;
  console.log(`1. Auth ログイン OK (userId=${userId})`);

  // 2. RLS: akane_app 接続で GUC 未設定 → 何も見えないこと
  const app = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
  const blind = await app.customer.count();
  console.log(`2. GUC 未設定時の customer 件数 = ${blind} ${blind === 0 ? "OK (遮断)" : "NG!! RLS が効いていない"}`);

  // 3. RLS: 正しい GUC を設定 → 自組織のデータが見えること
  const admin = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL_ADMIN });
  const membership = await admin.membership.findFirstOrThrow({ where: { userId } });
  const [, visible] = await app.$transaction([
    app.$executeRaw`SELECT set_config('app.user_id', ${userId}, TRUE), set_config('app.org_id', ${membership.orgId}, TRUE)`,
    app.customer.count(),
  ]);
  console.log(`3. GUC 設定時の customer 件数 = ${visible} ${Number(visible) > 0 ? "OK (自組織のみ閲覧可)" : "NG!!"}`);

  // 4. RLS: 他組織の orgId を偽装しても、メンバーでなければ見えないこと
  const [, spoofed] = await app.$transaction([
    app.$executeRaw`SELECT set_config('app.user_id', ${userId}, TRUE), set_config('app.org_id', 'someone-elses-org', TRUE)`,
    app.customer.count(),
  ]);
  console.log(`4. 他組織 orgId 偽装時の件数 = ${spoofed} ${Number(spoofed) === 0 ? "OK (遮断)" : "NG!!"}`);

  // 5. anon キーでの PostgREST 直読が遮断されていること
  const { data: restData, error: restErr } = await supabase.from("Customer").select("*").limit(5);
  const restCount = restData?.length ?? 0;
  console.log(
    `5. anon キーで REST 直読 = ${restErr ? `エラー(${restErr.code})` : `${restCount}件`} ${restErr || restCount === 0 ? "OK (遮断)" : "NG!!"}`
  );

  await app.$disconnect();
  await admin.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
