// テンプレートライブラリのファイル関連ヘルパー (クライアント・サーバー共用)

export const TEMPLATE_BUCKET = "templates";
export const TEMPLATE_MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB

// 格納を許可する拡張子 (Word / Excel / PowerPoint / PDF + よく使う周辺形式)
export const TEMPLATE_ALLOWED_EXTS = [
  "doc", "docx", "xls", "xlsx", "csv", "ppt", "pptx", "pdf",
  "txt", "md", "zip", "png", "jpg", "jpeg",
] as const;

export function fileExtension(fileName: string): string {
  const i = fileName.lastIndexOf(".");
  return i >= 0 ? fileName.slice(i + 1).toLowerCase() : "";
}

// 拡張子からファイル種別の表示情報を返す (アイコンタイルの文字と配色)
export type TemplateFileType = { label: string; mark: string; tile: string };
export function templateFileType(fileName: string): TemplateFileType {
  const ext = fileExtension(fileName);
  if (ext === "doc" || ext === "docx") return { label: "Word", mark: "W", tile: "bg-blue-600" };
  if (ext === "xls" || ext === "xlsx" || ext === "csv") return { label: "Excel", mark: "X", tile: "bg-emerald-600" };
  if (ext === "ppt" || ext === "pptx") return { label: "PowerPoint", mark: "P", tile: "bg-orange-500" };
  if (ext === "pdf") return { label: "PDF", mark: "PDF", tile: "bg-rose-600" };
  if (ext === "png" || ext === "jpg" || ext === "jpeg") return { label: "画像", mark: "IMG", tile: "bg-violet-500" };
  if (ext === "zip") return { label: "ZIP", mark: "ZIP", tile: "bg-amber-600" };
  return { label: ext ? ext.toUpperCase() : "ファイル", mark: "TXT", tile: "bg-slate-500" };
}

// URL登録テンプレートの表示情報 (リンク先サービスからアイコンタイルの文字と配色を推定)
export function templateUrlType(url: string): TemplateFileType {
  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    // パースできないURLは汎用リンク扱い
  }
  if (host.includes("canva.")) return { label: "Canva", mark: "Cv", tile: "bg-sky-500" };
  if (host === "x.com" || host.includes("twitter.")) return { label: "X", mark: "𝕏", tile: "bg-slate-900" };
  if (host.includes("notion.")) return { label: "Notion", mark: "N", tile: "bg-slate-800" };
  if (host.includes("figma.")) return { label: "Figma", mark: "Fig", tile: "bg-fuchsia-600" };
  if (host.includes("youtube.") || host.includes("youtu.be")) return { label: "YouTube", mark: "▶", tile: "bg-red-600" };
  if (host.includes("docs.google.") || host.includes("drive.google.") || host.includes("sheets.google."))
    return { label: "Google", mark: "G", tile: "bg-blue-500" };
  if (host.includes("instagram.")) return { label: "Instagram", mark: "IG", tile: "bg-pink-500" };
  return { label: "リンク", mark: "🔗", tile: "bg-indigo-500" };
}

// URLからドメイン部分だけを取り出して表示用に整える
export function urlHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
