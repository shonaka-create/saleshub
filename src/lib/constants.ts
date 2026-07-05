// 区分値の定数とラベル (SQLite は enum 非対応のため String で保持)

export const ROLES = ["OWNER", "ADMIN", "MEMBER"] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "オーナー",
  ADMIN: "管理者",
  MEMBER: "メンバー",
};

export const COUNTRIES = ["JP", "AU", "OTHER"] as const;
export const COUNTRY_LABELS: Record<string, string> = {
  JP: "🇯🇵 日本",
  AU: "🇦🇺 オーストラリア",
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

export const CURRENCIES = ["JPY", "AUD", "USD"] as const;
export const CURRENCY_SYMBOLS: Record<string, string> = {
  JPY: "¥",
  AUD: "A$",
  USD: "$",
};

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

export const TEMPLATE_CATEGORIES = ["PROPOSAL", "QUOTE", "CONTRACT", "INVOICE", "REPORT", "OTHER"] as const;
export const TEMPLATE_CATEGORY_LABELS: Record<string, string> = {
  PROPOSAL: "提案書",
  QUOTE: "見積書",
  CONTRACT: "契約書",
  INVOICE: "請求書",
  REPORT: "議事録・報告書",
  OTHER: "その他",
};
