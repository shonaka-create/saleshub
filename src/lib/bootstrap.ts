import { db } from "./db";

// 新規組織作成時の初期マスタ投入 (AKANE WEB STUDIO のサービス構成を既定値とする)
export async function createOrganizationWithDefaults(name: string, ownerUserId: string) {
  const org = await db.organization.create({
    data: {
      name,
      baseCurrency: "JPY",
      fxRates: JSON.stringify({ AUD: 95, USD: 150 }),
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
          { name: "Plan A (週1投稿)", currency: "AUD", initialFee: 0, monthlyFee: 500, sortOrder: 0 },
          { name: "Plan B (週2投稿)", currency: "AUD", initialFee: 0, monthlyFee: 750, sortOrder: 1 },
          { name: "Plan C (週3投稿+撮影)", currency: "AUD", initialFee: 0, monthlyFee: 1500, sortOrder: 2 },
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
          { name: "制作+運用パッケージ", currency: "AUD", initialFee: 600, monthlyFee: 200, sortOrder: 0 },
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
          { name: "Standard", currency: "JPY", initialFee: 0, monthlyFee: 30000, sortOrder: 0 },
          { name: "Pro", currency: "JPY", initialFee: 0, monthlyFee: 50000, sortOrder: 1 },
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
          { name: "Standard", currency: "JPY", initialFee: 0, monthlyFee: 30000, sortOrder: 0 },
          { name: "Pro", currency: "JPY", initialFee: 0, monthlyFee: 50000, sortOrder: 1 },
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

  await db.dataSource.create({
    data: {
      orgId: org.id,
      name: "Google Analytics 4 (今後MCP連携予定)",
      type: "GA4",
      config: JSON.stringify({ note: "MCP経由でのデータ取込を想定した受け皿" }),
    },
  });

  return org;
}
