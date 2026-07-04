import { requireSession } from "@/lib/auth";
import { MAX_PRO_PRICE_JPY } from "@/lib/plan";
import { PageHeader, Card, Badge } from "@/components/ui";

export const metadata = { title: "相談君" };

// MAX Pro プラン (Coming Soon)。課金導線はまだなく、プランの予告ページのみ。
const MAX_FEATURES = [
  {
    icon: "💬",
    title: "利益あげる君とのチャット壁打ち",
    body: "事業の方向性やクライアントとの期待値コントロールを、いつでもチャットで相談。あなたの売上・コスト・顧客データを踏まえた具体的なアドバイスが返ってきます。",
  },
  {
    icon: "🧑‍💼",
    title: "あなた専用のCOO(右腕)",
    body: "相談君はあなたの事業を継続的に理解する専属の右腕。単発の回答ではなく、事業の文脈を積み上げた上で利益を上げるための提案をします。",
  },
  {
    icon: "🛠️",
    title: "週1回のプロによるカスタマイズ",
    body: "週に1回、裏側で管理者(プロ)があなたの事業に合わせて相談君をチューニング。使えば使うほど、あなたの事業に最適化されていきます。",
  },
];

const VALUE_PILLARS = [
  {
    label: "売上",
    icon: "💰",
    body: "基本機能で自身の売上や顧客との関係性を財産として残す",
  },
  {
    label: "コスト",
    icon: "🔍",
    body: "コストの見える化とアラートで無駄を発見する",
  },
  {
    label: "利益",
    icon: "🚀",
    body: "相談君との壁打ちで事業と期待値をコントロールし、利益を上げる",
  },
];

export default async function AdvisorPage() {
  await requireSession();

  return (
    <>
      <PageHeader
        title="相談君"
        description="あなた専用のCOO(右腕)と、利益を上げるための壁打ちを"
      />

      {/* ヒーロー */}
      <Card className="relative overflow-hidden p-8 text-center">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 to-fuchsia-500" />
        <Badge className="bg-violet-100 text-violet-700">Coming Soon</Badge>
        <p className="mt-4 text-4xl">🤝</p>
        <h2 className="mt-3 text-xl font-bold text-slate-900">
          管理するだけのシステムで、終わらせない。
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-500">
          Saleshub は活動を管理し、無駄なコストを削減し、売上と利益を上げるためのシステムです。
          その最後のピースが「相談君」— あなた専用のCOOとして、利益を上げるための相談相手になります。
        </p>

        <div className="mx-auto mt-6 grid max-w-3xl gap-3 sm:grid-cols-3">
          {VALUE_PILLARS.map((p) => (
            <div
              key={p.label}
              className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-left"
            >
              <p className="text-sm font-bold text-slate-900">
                <span className="mr-1.5">{p.icon}</span>
                {p.label}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{p.body}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* MAX Pro プラン内容 */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {MAX_FEATURES.map((f) => (
          <Card key={f.title} className="p-6">
            <p className="text-2xl">{f.icon}</p>
            <h3 className="mt-3 text-sm font-bold text-slate-900">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{f.body}</p>
          </Card>
        ))}
      </div>

      {/* 料金 */}
      <Card className="mx-auto mt-6 max-w-xl p-8 text-center">
        <span className="inline-flex items-center rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-1 text-xs font-bold text-white">
          MAX Pro プラン
        </span>
        <p className="mt-4 text-3xl font-bold text-slate-900">
          ¥{MAX_PRO_PRICE_JPY.toLocaleString()}
          <span className="text-sm font-medium text-slate-500"> / 月</span>
        </p>
        <p className="mt-2 text-sm text-slate-500">
          相談君 (専属COOチャット) + 週1回のプロによるカスタマイズ
        </p>
        <button
          type="button"
          disabled
          className="mt-6 inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg bg-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-400"
        >
          近日公開 — しばらくお待ちください
        </button>
      </Card>
    </>
  );
}
