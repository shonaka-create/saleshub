// 既存組織の無料期間 (freeUntil / earlyBird) を登録日から再計算して埋める。
// 実行: npx tsx --env-file=.env scripts/backfill-base-plan.ts
//
// - freeUntil が未設定 (null) の組織のみ対象 (再実行しても安全)
// - 2026-07-15 までに登録済みの組織は早期特典 (3ヶ月無料) として扱う

import { PrismaClient } from "@prisma/client";

const EARLY_BIRD_DEADLINE = new Date("2026-07-15T23:59:59+09:00");
const db = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL_ADMIN });

async function main() {
  const orgs = await db.organization.findMany({
    where: { freeUntil: null, basePlanStatus: "FREE" },
    select: { id: true, name: true, createdAt: true },
  });
  if (orgs.length === 0) {
    console.log("対象組織はありません (すべて設定済み)");
    return;
  }
  for (const org of orgs) {
    const earlyBird = org.createdAt.getTime() <= EARLY_BIRD_DEADLINE.getTime();
    const months = earlyBird ? 3 : 1;
    const freeUntil = new Date(org.createdAt);
    freeUntil.setUTCMonth(freeUntil.getUTCMonth() + months);
    await db.organization.update({
      where: { id: org.id },
      data: { freeUntil, earlyBird },
    });
    console.log(
      `${org.name}: 登録 ${org.createdAt.toISOString().slice(0, 10)} → 無料期間 ${freeUntil
        .toISOString()
        .slice(0, 10)} まで (earlyBird=${earlyBird})`
    );
  }
  console.log(`\n完了: ${orgs.length} 組織を更新しました`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
