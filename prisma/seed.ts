// デモデータ投入: demo@akane.studio / akane1234 でログイン可能
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createOrganizationWithDefaults } from "../src/lib/bootstrap";

const db = new PrismaClient();

function ym(offset: number): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + offset, 1);
}

async function main() {
  const existing = await db.user.findUnique({ where: { email: "demo@akane.studio" } });
  if (existing) {
    console.log("デモデータは投入済みです");
    return;
  }

  const user = await db.user.create({
    data: {
      email: "demo@akane.studio",
      name: "Shotaro Nakaebisu",
      passwordHash: await bcrypt.hash("akane1234", 10),
    },
  });
  const org = await createOrganizationWithDefaults("AKANE WEB STUDIO", user.id);
  const services = await db.service.findMany({ where: { orgId: org.id }, include: { plans: true } });
  const sns = services.find((s) => s.name === "SNS運用")!;
  const web = services.find((s) => s.name === "サイト制作")!;
  const humanHub = services.find((s) => s.name === "human-hub")!;

  // --- 顧客 ---
  const customersData = [
    { name: "Lash Studio MOANA", country: "AU", status: "ACTIVE", industry: "マツエクサロン", instagram: "@moana.lash", tags: "ゴールドコースト,紹介" },
    { name: "Cafe Hinata", country: "AU", status: "ACTIVE", industry: "カフェ", instagram: "@cafe.hinata", tags: "ゴールドコースト" },
    { name: "Zen Yoga Studio", country: "AU", status: "PROSPECT", industry: "ヨガスタジオ", instagram: "@zenyoga.gc", tags: "見込み,英語対応" },
    { name: "株式会社サクラツアーズ", country: "JP", status: "PROSPECT", industry: "パッケージツアー", email: "info@sakura-tours.jp", tags: "tour-hub候補" },
    { name: "Bondi Fitness Lab", country: "AU", status: "LEAD", industry: "パーソナルジム", instagram: "@bondi.fitlab", tags: "" },
    { name: "美容室 ルミエール", country: "JP", status: "ACTIVE", industry: "美容室", email: "lumiere@example.jp", tags: "human-hub" },
    { name: "Gold Coast Sushi Bar", country: "AU", status: "CHURNED", industry: "飲食店", tags: "解約" },
  ];
  const customers: Record<string, string> = {};
  for (const c of customersData) {
    const created = await db.customer.create({ data: { orgId: org.id, ...c } });
    customers[c.name] = created.id;
  }

  // --- 案件 ---
  const planA = sns.plans.find((p) => p.name.startsWith("Plan A"))!;
  const planB = sns.plans.find((p) => p.name.startsWith("Plan B"))!;
  const webPlan = web.plans[0];
  const hhStd = humanHub.plans.find((p) => p.name === "Standard")!;

  await db.deal.createMany({
    data: [
      {
        orgId: org.id, customerId: customers["Zen Yoga Studio"], title: "Zen Yoga — SNS Plan B 提案",
        stage: "PROPOSAL", serviceId: sns.id, planId: planB.id, currency: "AUD",
        initialFee: 0, monthlyFee: 750, probability: 70,
        expectedCloseDate: ym(1), memo: "リール強化を希望。撮影同行はオプションで検討。",
      },
      {
        orgId: org.id, customerId: customers["株式会社サクラツアーズ"], title: "サクラツアーズ — tour-hub 導入商談",
        stage: "NEGOTIATION", currency: "JPY", initialFee: 0, monthlyFee: 30000, probability: 50,
        expectedCloseDate: ym(2), memo: "バックオフィス業務のシステム化を検討中。",
      },
      {
        orgId: org.id, customerId: customers["Bondi Fitness Lab"], title: "Bondi Fitness — サイト制作+SNS",
        stage: "LEAD", serviceId: web.id, planId: webPlan.id, currency: "AUD",
        initialFee: 600, monthlyFee: 200, probability: 30,
      },
      {
        orgId: org.id, customerId: customers["Cafe Hinata"], title: "Cafe Hinata — サイト制作",
        stage: "WON", serviceId: web.id, planId: webPlan.id, currency: "AUD",
        initialFee: 600, monthlyFee: 200, probability: 100, closedAt: ym(-2),
      },
    ],
  });

  // --- 契約 (自動売上計算の元) ---
  await db.contract.createMany({
    data: [
      {
        orgId: org.id, customerId: customers["Lash Studio MOANA"], serviceId: sns.id, planId: planA.id,
        name: "MOANA — SNS Plan A", currency: "AUD", initialFee: 0, monthlyFee: 500, startDate: ym(-4),
      },
      {
        orgId: org.id, customerId: customers["Cafe Hinata"], serviceId: web.id, planId: webPlan.id,
        name: "Cafe Hinata — サイト制作+運用", currency: "AUD", initialFee: 600, monthlyFee: 200, startDate: ym(-2),
      },
      {
        orgId: org.id, customerId: customers["Cafe Hinata"], serviceId: sns.id, planId: planA.id,
        name: "Cafe Hinata — SNS Plan A", currency: "AUD", initialFee: 0, monthlyFee: 500, startDate: ym(-1),
      },
      {
        orgId: org.id, customerId: customers["美容室 ルミエール"], serviceId: humanHub.id, planId: hhStd.id,
        name: "ルミエール — human-hub Standard", currency: "JPY", initialFee: 0, monthlyFee: 30000, startDate: ym(-3),
      },
      {
        orgId: org.id, customerId: customers["Gold Coast Sushi Bar"], serviceId: sns.id, planId: planA.id,
        name: "GC Sushi — SNS Plan A", currency: "AUD", initialFee: 0, monthlyFee: 500,
        startDate: ym(-5), endDate: ym(-1), status: "ENDED",
      },
    ],
  });

  // --- 経費 (直近3ヶ月) ---
  const cats = await db.expenseCategory.findMany({ where: { orgId: org.id } });
  const mk = (offset: number) => {
    const d = ym(offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const infra = cats.find((c) => c.name.includes("サーバー"))!;
  const ads = cats.find((c) => c.name.includes("広告"))!;
  for (const offset of [-2, -1, 0]) {
    await db.monthlyValue.create({
      data: { orgId: org.id, month: mk(offset), type: "EXPENSE", expenseCategoryId: infra.id, amount: 8000 },
    });
  }
  await db.monthlyValue.create({
    data: { orgId: org.id, month: mk(0), type: "EXPENSE", expenseCategoryId: ads.id, amount: 15000, memo: "Instagram広告" },
  });

  // --- 活動履歴 ---
  await db.activity.createMany({
    data: [
      { orgId: org.id, customerId: customers["Zen Yoga Studio"], userId: user.id, type: "MEETING", content: "初回ヒアリング実施。リールでの集客に関心が高い。Plan Bで提案予定。" },
      { orgId: org.id, customerId: customers["株式会社サクラツアーズ"], userId: user.id, type: "CALL", content: "予約管理・顧客管理・請求業務をまとめてシステム化したい意向。tour-hubのデモを来週実施。" },
      { orgId: org.id, customerId: customers["Lash Studio MOANA"], userId: user.id, type: "NOTE", content: "月次レポート送付済み。保存数が先月比+40%。" },
    ],
  });

  // --- GAデータのサンプルデータセット (MCP連携の受け皿デモ) ---
  const source = await db.dataSource.findFirst({ where: { orgId: org.id } });
  const dataset = await db.dataset.create({
    data: {
      orgId: org.id,
      sourceId: source?.id,
      name: "akane-web-studio.vercel.app 月次トラフィック",
      columns: JSON.stringify([
        { key: "month", label: "月", type: "text" },
        { key: "users", label: "ユーザー数", type: "number" },
        { key: "sessions", label: "セッション数", type: "number" },
        { key: "inquiries", label: "問い合わせ数", type: "number" },
      ]),
    },
  });
  const trafficRows = [
    { month: mk(-2), users: 320, sessions: 410, inquiries: 3 },
    { month: mk(-1), users: 450, sessions: 590, inquiries: 5 },
    { month: mk(0), users: 610, sessions: 800, inquiries: 8 },
  ];
  for (let i = 0; i < trafficRows.length; i++) {
    await db.dataRow.create({
      data: { datasetId: dataset.id, rowIndex: i, data: JSON.stringify(trafficRows[i]) },
    });
  }

  console.log("デモデータ投入完了: demo@akane.studio / akane1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
