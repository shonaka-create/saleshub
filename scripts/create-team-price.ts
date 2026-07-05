// Stripe にチームプラン (月額3,000円 / 人) の Product / Price を作成する。
// 実行: node --env-file=.env node_modules/tsx/dist/cli.mjs scripts/create-team-price.ts
// 出力された STRIPE_PRICE_ID_TEAM=... を .env / Vercel の環境変数に設定する。
// 既に lookup_key=saleshub_team_3000 の Price があればそれを再利用する (再実行安全)。

import Stripe from "stripe";

const LOOKUP_KEY = "saleshub_team_3000";

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY が未設定です");
  const stripe = new Stripe(key);

  const existing = await stripe.prices.list({ lookup_keys: [LOOKUP_KEY], limit: 1 });
  if (existing.data.length > 0) {
    console.log(`既存の Price を再利用: ${existing.data[0].id}`);
    console.log(`STRIPE_PRICE_ID_TEAM=${existing.data[0].id}`);
    return;
  }

  const product = await stripe.products.create({
    name: "Saleshub チームプラン",
    description: "契約書/請求書/委託費管理 ＋ Pro プランの全機能 (月額3,000円 / 人)",
  });
  const price = await stripe.prices.create({
    product: product.id,
    currency: "jpy",
    unit_amount: 3000,
    recurring: { interval: "month" },
    lookup_key: LOOKUP_KEY,
  });
  console.log(`Product: ${product.id}`);
  console.log(`STRIPE_PRICE_ID_TEAM=${price.id}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
