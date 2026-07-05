// 契約書・請求書に添付する実ファイルの保管ヘルパー (クライアント・サーバー共用)。
// テンプレートライブラリと同じ「署名付きURLでブラウザから直接アップロード」方式を使う。

export const ATTACHMENT_BUCKET = "attachments";
export const ATTACHMENT_MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB

// 添付を許可する拡張子 (契約書・請求書でよく使う形式)
export const ATTACHMENT_ALLOWED_EXTS = [
  "pdf", "doc", "docx", "xls", "xlsx", "csv", "png", "jpg", "jpeg", "txt", "zip",
] as const;

// 添付を持てるエンティティ種別 (URLパス・Storageパスの一部にも使う)
export const ATTACHMENT_ENTITIES = ["contract-doc", "invoice"] as const;
export type AttachmentEntity = (typeof ATTACHMENT_ENTITIES)[number];
