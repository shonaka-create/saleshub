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

export const DATA_SOURCE_TYPES = ["MANUAL", "GA4", "CSV", "MCP"] as const;
export const DATA_SOURCE_TYPE_LABELS: Record<string, string> = {
  MANUAL: "手入力",
  GA4: "Google Analytics 4",
  CSV: "CSVインポート",
  MCP: "MCP連携",
};
