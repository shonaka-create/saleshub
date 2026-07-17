// 区分値の定数とラベル (SQLite は enum 非対応のため String で保持)

export const ROLES = ["OWNER", "ADMIN", "MEMBER"] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "オーナー",
  ADMIN: "管理者",
  MEMBER: "メンバー",
};

// 主要国を選べるようにする (日本をデフォルト)。過去データの "AU" 等も引き続き表示できる。
export const COUNTRIES = ["JP", "US", "CN", "KR", "AU", "GB", "SG", "TW", "OTHER"] as const;
export const COUNTRY_LABELS: Record<string, string> = {
  JP: "🇯🇵 日本",
  US: "🇺🇸 アメリカ",
  CN: "🇨🇳 中国",
  KR: "🇰🇷 韓国",
  AU: "🇦🇺 オーストラリア",
  GB: "🇬🇧 イギリス",
  SG: "🇸🇬 シンガポール",
  TW: "🇹🇼 台湾",
  OTHER: "🌏 その他",
};

export const CUSTOMER_STATUSES = ["LEAD", "PROSPECT", "ACTIVE", "CHURNED"] as const;
export const CUSTOMER_STATUS_LABELS: Record<string, string> = {
  LEAD: "リード",
  PROSPECT: "商談中",
  ACTIVE: "契約中",
  CHURNED: "解約済",
};
export const CUSTOMER_STATUS_COLORS: Record<string, string> = {
  LEAD: "bg-slate-100 text-slate-700",
  PROSPECT: "bg-amber-100 text-amber-800",
  ACTIVE: "bg-emerald-100 text-emerald-800",
  CHURNED: "bg-rose-100 text-rose-700",
};

export const DEAL_STAGES = ["LEAD", "NEGOTIATION", "PROPOSAL", "WON", "LOST"] as const;
export type DealStage = (typeof DEAL_STAGES)[number];
export const DEAL_STAGE_LABELS: Record<string, string> = {
  LEAD: "リード",
  NEGOTIATION: "商談",
  PROPOSAL: "提案・見積",
  WON: "受注",
  LOST: "失注",
};
export const DEAL_STAGE_COLORS: Record<string, string> = {
  LEAD: "#94a3b8",
  NEGOTIATION: "#f59e0b",
  PROPOSAL: "#6366f1",
  WON: "#10b981",
  LOST: "#f43f5e",
};

export const ACTIVITY_TYPES = ["NOTE", "CALL", "MEETING", "EMAIL", "TASK"] as const;
export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  NOTE: "メモ",
  CALL: "電話",
  MEETING: "打合せ",
  EMAIL: "メール",
  TASK: "タスク",
};

export const SERVICE_CATEGORIES = ["SNS", "WEB", "SAAS", "OTHER"] as const;
export const SERVICE_CATEGORY_LABELS: Record<string, string> = {
  SNS: "SNS運用",
  WEB: "サイト制作",
  SAAS: "SaaS",
  OTHER: "その他",
};

// 基準通貨 (組織単位)。デフォルトは JPY。主要国の通貨を選べる。
export const CURRENCIES = ["JPY", "USD", "CNY", "KRW", "AUD", "GBP", "EUR", "SGD", "TWD"] as const;
export const CURRENCY_SYMBOLS: Record<string, string> = {
  JPY: "¥",
  USD: "$",
  CNY: "元",
  KRW: "₩",
  AUD: "A$",
  GBP: "£",
  EUR: "€",
  SGD: "S$",
  TWD: "NT$",
};
export const CURRENCY_LABELS: Record<string, string> = {
  JPY: "日本円 (¥)",
  USD: "米ドル ($)",
  CNY: "人民元 (元)",
  KRW: "韓国ウォン (₩)",
  AUD: "豪ドル (A$)",
  GBP: "英ポンド (£)",
  EUR: "ユーロ (€)",
  SGD: "シンガポールドル (S$)",
  TWD: "台湾ドル (NT$)",
};

// 契約の課金頻度。売上計上の仕方を切り替える。
// MONTHLY: 毎月 monthlyFee を計上 / WEEKLY: 週額を月換算 (×4.33) / ONE_TIME: 開始月に一度だけ計上
export const BILLING_CYCLES = ["MONTHLY", "WEEKLY", "ONE_TIME"] as const;
export const BILLING_CYCLE_LABELS: Record<string, string> = {
  MONTHLY: "毎月",
  WEEKLY: "各週",
  ONE_TIME: "単月",
};
export const WEEKS_PER_MONTH = 52 / 12; // 週額→月額の換算係数 (年52週 ÷ 12ヶ月 ≈ 4.33)

// 契約の「毎月の経常売上」を頻度に応じて返す (初期費用・単月本体は含まない)。
export function recurringMonthlyFee(cycle: string, fee: number): number {
  if (cycle === "WEEKLY") return fee * WEEKS_PER_MONTH;
  if (cycle === "ONE_TIME") return 0; // 単月は経常ではない (開始月に一度だけ)
  return fee; // MONTHLY
}

// 開始月にだけ一度計上する額 (初期費用 + 単月契約の本体額)。
export function oneTimeFeeAtStart(cycle: string, initialFee: number, monthlyFee: number): number {
  return initialFee + (cycle === "ONE_TIME" ? monthlyFee : 0);
}

export const MONTHLY_VALUE_TYPES = {
  REVENUE_OVERRIDE: "REVENUE_OVERRIDE",
  REVENUE_MANUAL: "REVENUE_MANUAL",
  EXPENSE: "EXPENSE",
} as const;

export const CUSTOM_FIELD_TYPES = ["text", "number", "date", "select"] as const;
export const CUSTOM_FIELD_TYPE_LABELS: Record<string, string> = {
  text: "テキスト",
  number: "数値",
  date: "日付",
  select: "選択式",
};

// 契約手続きテンプレートで選べる定型プロセス。チーム機能 (近日公開) と連動し、
// 手続きステップとして追加すると契約のチェックリストから該当機能へ導線を出す。
export const PROCEDURE_FEATURES = ["contract-doc", "invoice", "outsourcing-cost"] as const;
export type ProcedureFeature = (typeof PROCEDURE_FEATURES)[number];
export const PROCEDURE_FEATURE_META: Record<
  ProcedureFeature,
  { label: string; icon: string; href: string; description: string }
> = {
  "contract-doc": {
    label: "契約書管理",
    icon: "📄",
    href: "/team/contract-docs",
    description: "契約書ファイルの保管・締結状況の管理",
  },
  invoice: {
    label: "請求書管理",
    icon: "🧾",
    href: "/team/invoices",
    description: "契約・売上データと連動した請求書の作成と入金ステータス管理",
  },
  "outsourcing-cost": {
    label: "委託費管理",
    icon: "💸",
    href: "/team/outsourcing-costs",
    description: "外注先・委託先への支払いを案件ごとに管理",
  },
};

// ===== 契約書管理 =====
// 3つのチェックポイント (送付 → 締結 → 保管) の到達状況からステータスを導く。
export const CONTRACT_DOC_STAGES = ["DRAFT", "SENT", "AGREED", "STORED"] as const;
export const CONTRACT_DOC_STAGE_LABELS: Record<string, string> = {
  DRAFT: "未送付",
  SENT: "回付中", // 送付済・締結待ち
  AGREED: "締結済", // 同意取得・保管待ち
  STORED: "保管完了",
};
export const CONTRACT_DOC_STAGE_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  SENT: "bg-amber-100 text-amber-800",
  AGREED: "bg-sky-100 text-sky-800",
  STORED: "bg-emerald-100 text-emerald-800",
};

// ===== 請求書管理 =====
export const INVOICE_DIRECTIONS = ["ISSUED", "RECEIVED"] as const;
export type InvoiceDirection = (typeof INVOICE_DIRECTIONS)[number];
export const INVOICE_DIRECTION_LABELS: Record<string, string> = {
  ISSUED: "発行 (自社→取引先)",
  RECEIVED: "受領 (取引先→自社)",
};
// direction ごとに「引き渡し」「決済」の意味が変わるためラベルを切り替える。
export const INVOICE_FIELD_LABELS: Record<InvoiceDirection, { delivered: string; settled: string }> = {
  ISSUED: { delivered: "送付", settled: "入金" },
  RECEIVED: { delivered: "受領", settled: "支払" },
};

// ===== タスク管理 / WBS =====
export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "DONE"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const TASK_STATUS_LABELS: Record<string, string> = {
  TODO: "未着手",
  IN_PROGRESS: "進行中",
  DONE: "完了",
};
export const TASK_STATUS_COLORS: Record<string, string> = {
  TODO: "bg-slate-100 text-slate-600",
  IN_PROGRESS: "bg-sky-100 text-sky-800",
  DONE: "bg-emerald-100 text-emerald-800",
};

// プリセットのカテゴリ (キーで保存)。これに加えて、ユーザーは自由入力カテゴリを作成でき、
// その場合はラベル文字列そのものを category として保存する (キーではない)。
export const TEMPLATE_CATEGORIES = ["PROPOSAL", "QUOTE", "CONTRACT", "INVOICE", "REPORT", "OTHER"] as const;
export const TEMPLATE_CATEGORY_LABELS: Record<string, string> = {
  PROPOSAL: "提案書",
  QUOTE: "見積書",
  CONTRACT: "契約書",
  INVOICE: "請求書",
  REPORT: "議事録・報告書",
  OTHER: "その他",
};
export const TEMPLATE_CATEGORY_MAX_LEN = 20; // 自由入力カテゴリ名の最大文字数

// プリセットならラベルへ、自由入力カテゴリならその文字列をそのまま表示に使う。
export function templateCategoryLabel(category: string): string {
  return TEMPLATE_CATEGORY_LABELS[category] ?? category;
}

// 入力カテゴリを保存用の値に正規化する。
// - 空 → OTHER / プリセットキー → そのまま / プリセットのラベルと一致 → 対応キー / それ以外 → 自由入力 (trim + 上限)
export function normalizeTemplateCategory(raw: string): string {
  const v = (raw ?? "").trim();
  if (v === "") return "OTHER";
  if ((TEMPLATE_CATEGORIES as readonly string[]).includes(v)) return v;
  const key = (Object.keys(TEMPLATE_CATEGORY_LABELS) as string[]).find(
    (k) => TEMPLATE_CATEGORY_LABELS[k] === v
  );
  if (key) return key;
  return v.slice(0, TEMPLATE_CATEGORY_MAX_LEN);
}
