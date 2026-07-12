// 指定ユーザー (OWNER) の組織を無償で全機能解放する (comp)。
// 実行: npx tsx --env-file=.env scripts/comp-org.ts <owner-email>
//
// - basePlanStatus = ACTIVE (基本プラン: 無料期間切れでもロックしない)
// - plan = PRO (経営分析・テンプレート)
// - teamPlan = TEAM (チーム機能。TEAM は Pro を包含)
// Stripe には一切触れない。admin 画面では「無償組織 (ACTIVE かつ Stripe サブスク無し)」として
// 実課金 (realBase) から除外される (src/app/admin/page.tsx の compedBase と同じ扱い)。
//
// 安全のため、対象組織に Stripe サブスクリプションが1つでも紐づいている場合は中断する
// (実課金中の組織を comp すると webhook 同期と競合するため。先に Stripe 側を解約すること)。

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL_ADMIN });

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error("使い方: npx tsx --env-file=.env scripts/comp-org.ts <owner-email>");
    process.exit(1);
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user) throw new Error(`ユーザーが見つかりません: ${email}`);

  const membership = await db.membership.findFirst({
    where: { userId: user.id, role: "OWNER" },
  });
  if (!membership) throw new Error(`${email} が OWNER の組織がありません`);

  const org = await db.organization.findUniqueOrThrow({
    where: { id: membership.orgId },
    select: {
      id: true,
      name: true,
      basePlanStatus: true,
      plan: true,
      teamPlan: true,
      stripeBaseSubscriptionId: true,
      stripeSubscriptionId: true,
      stripeTeamSubscriptionId: true,
    },
  });
  console.log("対象組織:", org.name, `(${org.id})`);
  console.log(
    `現在: base=${org.basePlanStatus} / pro=${org.plan} / team=${org.teamPlan}`
  );

  if (org.stripeBaseSubscriptionId || org.stripeSubscriptionId || org.stripeTeamSubscriptionId) {
    throw new Error(
      "Stripe サブスクリプションが紐づいています。先に Stripe 側を解約してから実行してください"
    );
  }

  await db.organization.update({
    where: { id: org.id },
    data: { basePlanStatus: "ACTIVE", plan: "PRO", teamPlan: "TEAM" },
  });

  // システム管理者向け利用ログに証跡を残す (admin 画面の利用ログに表示される)
  await db.billingEvent.create({
    data: {
      orgId: org.id,
      orgName: org.name,
      email,
      type: "COMPED",
      detail:
        "運営判断で全機能を無償解放 (基本=ACTIVE / Pro / チーム)。Stripe 課金なし (scripts/comp-org.ts)",
    },
  });

  console.log(
    `完了: ${org.name} を無償で全機能解放しました (base=ACTIVE / plan=PRO / teamPlan=TEAM)`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
