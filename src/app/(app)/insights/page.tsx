import { redirect } from "next/navigation";

// 経営分析はダッシュボード (経営数値分析) に統合された。
// 旧URL・Stripe戻りURLからのアクセスをリダイレクトで受ける。
export default function InsightsPage() {
  redirect("/dashboard");
}
