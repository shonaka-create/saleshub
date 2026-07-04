// Stripe に基本プラン (月額500円) の Product / Price を作成する。
// 実行: node --env-file=.env node_modules/tsx/dist/cli.mjs scripts/create-base-price.ts
// 既に lookup_key=saleshub_base_500 の Price があればそれを再利用する (再実行安全)。

import Stripe from "stripe";

const LOOKUP_KEY = "saleshub_base_500";

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY が未設定です");
  const stripe = new Stripe(key);

  const existing = await stripe.prices.list({ lookup_keys: [LOOKUP_KEY], limit: 1 });
  if (existing.data.length > 0) {
    console.log(`既存の Price を再利用: ${existing.data[0].id}`);
    console.log(`STRIPE_PRICE_ID_BASE=${existing.data[0].id}`);
    return;
  }

  const product = await stripe.products.create({
    name: "Saleshub 基本プラン",
    description: "Saleshub システム利用料 (月額500円・初月無料 / 早期登録は3ヶ月無料)",
  });
  const price = await stripe.prices.create({
    product: product.id,
    currency: "jpy",
    unit_amount: 500,
    recurring: { interval: "month" },
    lookup_key: LOOKUP_KEY,
  });
  console.log(`Product: ${product.id}`);
  console.log(`STRIPE_PRICE_ID_BASE=${price.id}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
