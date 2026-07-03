import "server-only";
import Stripe from "stripe";

// Stripe クライアント (キー未設定環境ではnullを返し、UIは設定手順を案内する)
let client: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  client ??= new Stripe(key);
  return client;
}

export function proPriceId(): string | null {
  return process.env.STRIPE_PRICE_ID_PRO ?? null;
}

export function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}
