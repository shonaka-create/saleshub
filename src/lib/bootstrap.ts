import { dbAdmin as db } from "./db";
import { computeFreeUntil } from "./pricing";

// 新規組織作成時の初期マスタ投入 (AKANE WEB STUDIO のサービス構成を既定値とする)
// メンバーシップ成立前に実行されるため RLS をバイパスする dbAdmin を使う。
export async function createOrganizationWithDefaults(name: string, ownerUserId: string) {
  // 基本プランの無料期間を登録時点で確定する (早期登録なら3ヶ月、通常は初月無料)
  const { freeUntil, earlyBird } = computeFreeUntil(new Date());
  const org = await db.organization.create({
    data: {
      name,
      baseCurrency: "JPY",
      freeUntil,
      earlyBird,
      memberships: { create: { userId: ownerUserId, role: "OWNER" } },
    },
  });

  await db.service.create({
    data: {
      orgId: org.id,
      name: "SNS運用",
      category: "SNS",
      color: "#ec4899",
      sortOrder: 0,
      plans: {
        create: [
          { name: "Plan A (週1投稿)", initialFee: 0, monthlyFee: 47500, sortOrder: 0 },
          { name: "Plan B (週2投稿)", initialFee: 0, monthlyFee: 71250, sortOrder: 1 },
          { name: "Plan C (週3投稿+撮影)", initialFee: 0, monthlyFee: 142500, sortOrder: 2 },
        ],
      },
    },
  });
  await db.service.create({
    data: {
      orgId: org.id,
      name: "サイト制作",
      category: "WEB",
      color: "#6366f1",
      sortOrder: 1,
      plans: {
        create: [
          { name: "制作+運用パッケージ", initialFee: 57000, monthlyFee: 19000, sortOrder: 0 },
        ],
      },
    },
  });
  await db.service.create({
    data: {
      orgId: org.id,
      name: "human-hub",
      category: "SAAS",
      color: "#10b981",
      sortOrder: 2,
      plans: {
        create: [
          { name: "Standard", initialFee: 0, monthlyFee: 30000, sortOrder: 0 },
          { name: "Pro", initialFee: 0, monthlyFee: 50000, sortOrder: 1 },
        ],
      },
    },
  });
  await db.service.create({
    data: {
      orgId: org.id,
      name: "tour-hub",
      category: "SAAS",
      color: "#f59e0b",
      sortOrder: 3,
      plans: {
        create: [
          { name: "Standard", initialFee: 0, monthlyFee: 30000, sortOrder: 0 },
          { name: "Pro", initialFee: 0, monthlyFee: 50000, sortOrder: 1 },
        ],
      },
    },
  });

  await db.expenseCategory.createMany({
    data: [
      { orgId: org.id, name: "人件費・外注費", sortOrder: 0 },
      { orgId: org.id, name: "広告宣伝費", sortOrder: 1 },
      { orgId: org.id, name: "サーバー・インフラ・ツール費", sortOrder: 2 },
      { orgId: org.id, name: "地代家賃・その他経費", sortOrder: 3 },
    ],
  });

  return org;
}
