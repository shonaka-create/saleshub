// 管理者テナント (Saleshub 運営) に、Saleshub 事業そのものの業務データを投入する (dogfooding)。
// 現状の登録テナント・課金状況を「正直に」反映する:
//   - 提供プラン(基本¥500/Pro¥490/チーム¥3,000/MAX¥3,000) を サービス・プランマスタに
//   - 実登録テナント2件を顧客に (Akane Web Studio=契約中, Saleshub Demo=商談中)
//   - 案件・契約は実状況どおり (基本=受注/成立, Pro=トライアル商談中, デモ=リード)
//   - 売上は無料期間中につき実績¥0 (契約は成立済みなので 2026-10 の無料明けから¥500が立つ)
//   - 経費カテゴリは枠のみ用意 (実費は運営が入力)
//
// 既存の管理者テナント業務データ (テスト用の捨てデータ) は削除してから入れ直す (冪等)。
// 実行: node ".\node_modules\tsx\dist\cli.mjs" --env-file=.env scripts/seed-admin-dogfood.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL_ADMIN });
const ADMIN_ORG_ID = "cmr54six60000xkn0syzv9501";

const d = (s: string) => new Date(s);

async function main() {
  // 管理者 (OWNER) の userId を取得 (アクティビティの担当者に使う)
  const owner = await db.membership.findFirst({
    where: { orgId: ADMIN_ORG_ID, role: "OWNER" },
  });
  const userId = owner?.userId ?? null;

  // ===== 0. 既存の捨てデータを削除 (管理者テナントに限定) =====
  await db.$transaction([
    db.monthlyValue.deleteMany({ where: { orgId: ADMIN_ORG_ID } }),
    db.activity.deleteMany({ where: { orgId: ADMIN_ORG_ID } }),
    db.contract.deleteMany({ where: { orgId: ADMIN_ORG_ID } }),
    db.deal.deleteMany({ where: { orgId: ADMIN_ORG_ID } }),
    db.plan.deleteMany({ where: { service: { orgId: ADMIN_ORG_ID } } }),
    db.service.deleteMany({ where: { orgId: ADMIN_ORG_ID } }),
    db.customer.deleteMany({ where: { orgId: ADMIN_ORG_ID } }),
    db.expenseCategory.deleteMany({ where: { orgId: ADMIN_ORG_ID } }),
  ]);
  console.log("既存の管理者テナント業務データを削除しました");

  // ===== 1. サービス・プラン管理: Saleshub の提供プラン =====
  const basic = await db.service.create({
    data: {
      orgId: ADMIN_ORG_ID, name: "基本プラン", category: "SAAS", color: "#6366f1", sortOrder: 0,
      plans: { create: { name: "基本 (1席)", initialFee: 0, monthlyFee: 500, active: true, sortOrder: 0 } },
    },
    include: { plans: true },
  });
  const pro = await db.service.create({
    data: {
      orgId: ADMIN_ORG_ID, name: "Proプラン｜経営分析", category: "SAAS", color: "#f59e0b", sortOrder: 1,
      plans: { create: { name: "Pro (1席)", initialFee: 0, monthlyFee: 490, active: true, sortOrder: 0 } },
    },
    include: { plans: true },
  });
  const team = await db.service.create({
    data: {
      orgId: ADMIN_ORG_ID, name: "チームプラン｜契約書・請求書・委託費", category: "SAAS", color: "#10b981", sortOrder: 2,
      plans: { create: { name: "チーム (1席)", initialFee: 0, monthlyFee: 3000, active: true, sortOrder: 0 } },
    },
    include: { plans: true },
  });
  await db.service.create({
    data: {
      orgId: ADMIN_ORG_ID, name: "MAXプラン｜壁打ちCOO", category: "SAAS", color: "#8b5cf6", sortOrder: 3,
      // Coming Soon: プラン自体は登録するが未提供 (active=false)
      plans: { create: { name: "MAX (1席・近日提供)", initialFee: 0, monthlyFee: 3000, active: false, sortOrder: 0 } },
    },
  });
  const basicPlan = basic.plans[0];
  const proPlan = pro.plans[0];
  console.log("サービス・プラン (4サービス) を作成しました");

  // ===== 2. 顧客管理: 実登録テナント =====
  const akane = await db.customer.create({
    data: {
      orgId: ADMIN_ORG_ID, name: "Akane Web Studio", country: "JP", status: "ACTIVE",
      industry: "Web制作", email: "akane.webstudio@gmail.com",
      tags: "早期登録,基本プラン契約中,Proトライアル",
      memo: "2026-07-05 登録。早期登録特典で 2026-10-05 まで基本プラン無料 (以降 ¥500/席・月)。Proプラン14日トライアル同意済 (カード登録済・トライアル後に自動課金)。",
      createdAt: d("2026-07-05T10:37:00+09:00"),
    },
  });
  const demo = await db.customer.create({
    data: {
      orgId: ADMIN_ORG_ID, name: "Saleshub デモ環境", country: "JP", status: "PROSPECT",
      industry: "SaaS / デモ", email: "demo@akane.studio",
      tags: "デモ,評価中",
      memo: "プロダクト同梱のデモ用テナント (2026-07-03 作成)。Proトライアル利用中 (〜2026-07-17)。プロダクト評価・フィードバック収集の位置づけ。",
      createdAt: d("2026-07-03T12:00:00+09:00"),
    },
  });
  console.log("顧客 (2件) を作成しました");

  // ===== 3. 案件管理: 実状況どおりのパイプライン =====
  const wonDeal = await db.deal.create({
    data: {
      orgId: ADMIN_ORG_ID, customerId: akane.id, title: "Akane Web Studio｜基本プラン導入",
      stage: "WON", serviceId: basic.id, planId: basicPlan.id, monthlyFee: 500, probability: 100,
      closedAt: d("2026-07-05T10:37:00+09:00"),
      memo: "早期登録で受注。2026-10-05 まで無料期間、以降 ¥500/席・月で経常化。", sortOrder: 0,
    },
  });
  await db.deal.create({
    data: {
      orgId: ADMIN_ORG_ID, customerId: akane.id, title: "Akane Web Studio｜Proプラン (経営分析)",
      stage: "NEGOTIATION", serviceId: pro.id, planId: proPlan.id, monthlyFee: 490, probability: 70,
      expectedCloseDate: d("2026-07-19T12:00:00+09:00"),
      memo: "14日無料トライアル中 (カード登録済)。トライアル終了後に自動課金され本契約化の見込み。", sortOrder: 1,
    },
  });
  await db.deal.create({
    data: {
      orgId: ADMIN_ORG_ID, customerId: demo.id, title: "Saleshub デモ環境｜本契約化",
      stage: "LEAD", probability: 20,
      memo: "デモ利用中。プロダクトの反応・要望を収集するフェーズ。", sortOrder: 2,
    },
  });
  console.log("案件 (3件) を作成しました");

  // ===== 4. 契約管理: 成立済みの契約 =====
  await db.contract.create({
    data: {
      orgId: ADMIN_ORG_ID, customerId: akane.id, dealId: wonDeal.id, serviceId: basic.id, planId: basicPlan.id,
      name: "Akane Web Studio｜基本プラン", billingCycle: "MONTHLY", initialFee: 0, monthlyFee: 500,
      startDate: d("2026-07-05T12:00:00+09:00"), status: "ACTIVE",
      memo: "早期登録特典で 2026-10-05 まで無料。無料明けの2026-10月から ¥500/席・月の請求が発生。",
    },
  });
  console.log("契約 (1件) を作成しました");

  // ===== 5. 売上管理: 実績ベース =====
  // 契約からの自動計算は開始月(2026-07)から¥500/月を計上するが、無料期間中(〜2026-10-05)は
  // 実際の売上は¥0。無料期間の3ヶ月(07/08/09)を ¥0 で上書きし、無料明けの2026-10から¥500が立つ形にする。
  for (const month of ["2026-07", "2026-08", "2026-09"]) {
    await db.monthlyValue.create({
      data: {
        orgId: ADMIN_ORG_ID, month, type: "REVENUE_OVERRIDE", serviceId: basic.id, amount: 0,
        memo: "早期登録特典による無料期間中のため実売上¥0 (2026-10 の無料明けから¥500が計上)。",
      },
    });
  }
  // 経費カテゴリは枠のみ用意 (実費は運営が入力)。無料期間中で売上¥0のため Stripe 手数料等も現状¥0。
  await db.expenseCategory.createMany({
    data: [
      { orgId: ADMIN_ORG_ID, name: "インフラ費 (Supabase / Vercel)", sortOrder: 0 },
      { orgId: ADMIN_ORG_ID, name: "決済手数料 (Stripe)", sortOrder: 1 },
      { orgId: ADMIN_ORG_ID, name: "ドメイン・ツール", sortOrder: 2 },
      { orgId: ADMIN_ORG_ID, name: "広告宣伝費", sortOrder: 3 },
    ],
  });
  console.log("売上管理 (無料期間の売上¥0上書き3ヶ月 + 経費カテゴリ4件) を作成しました");

  // ===== 番外: アクティビティ (顧客・案件のタイムラインを埋める) =====
  if (userId) {
    await db.activity.createMany({
      data: [
        {
          orgId: ADMIN_ORG_ID, customerId: akane.id, userId, type: "MEETING",
          content: "オンボーディング。組織作成〜初期設定をサポート。基本プラン早期登録を案内。",
          occurredAt: d("2026-07-05T11:00:00+09:00"),
        },
        {
          orgId: ADMIN_ORG_ID, customerId: akane.id, userId, type: "NOTE",
          content: "Proプラン(経営分析)の14日トライアルを開始。カード登録・自動課金に同意済み。",
          occurredAt: d("2026-07-05T15:00:00+09:00"),
        },
        {
          orgId: ADMIN_ORG_ID, customerId: demo.id, userId, type: "NOTE",
          content: "デモ環境の利用状況をモニタリング。UI・オンボーディング導線のフィードバックを収集中。",
          occurredAt: d("2026-07-03T12:00:00+09:00"),
        },
      ],
    });
    console.log("アクティビティ (3件) を作成しました");
  }

  console.log("\n完了: 管理者テナントに Saleshub 事業データを投入しました");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
