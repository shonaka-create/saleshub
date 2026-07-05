"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { requireProAccess } from "@/lib/plan";
import { createSupabaseAdmin } from "@/lib/supabase";
import { TEMPLATE_CATEGORIES } from "@/lib/constants";
import {
  TEMPLATE_BUCKET,
  TEMPLATE_MAX_FILE_SIZE,
  TEMPLATE_ALLOWED_EXTS,
  fileExtension,
} from "@/lib/templates";

// ファイル本体はサーバーを経由せず、署名付きURLでブラウザから Supabase Storage に
// 直接アップロードする (Vercel のリクエストボディ上限 4.5MB を回避するため)。
// 流れ: prepareTemplateUpload → (ブラウザが uploadToSignedUrl) → finalizeTemplateUpload

async function ensureBucket(supabase: SupabaseClient) {
  const { data } = await supabase.storage.getBucket(TEMPLATE_BUCKET);
  if (!data) {
    await supabase.storage.createBucket(TEMPLATE_BUCKET, {
      public: false,
      fileSizeLimit: TEMPLATE_MAX_FILE_SIZE,
    });
  }
}

export async function prepareTemplateUpload(
  fileName: string,
  fileSize: number
): Promise<{ path: string; token: string } | { error: string }> {
  const session = await requireSession();
  await requireProAccess(session.org.id); // テンプレートは Pro 機能

  const ext = fileExtension(fileName);
  if (!(TEMPLATE_ALLOWED_EXTS as readonly string[]).includes(ext)) {
    return { error: `対応していないファイル形式です (${TEMPLATE_ALLOWED_EXTS.join(" / ")})` };
  }
  if (fileSize > TEMPLATE_MAX_FILE_SIZE) {
    return { error: "ファイルサイズの上限は 30MB です" };
  }

  const supabase = createSupabaseAdmin();
  await ensureBucket(supabase);

  // オブジェクトキーは ASCII のみで構成し、日本語ファイル名は DB (fileName) 側に保持する
  const path = `${session.org.id}/${randomUUID()}.${ext}`;
  const { data, error } = await supabase.storage.from(TEMPLATE_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { error: "アップロード用URLの発行に失敗しました" };
  return { path: data.path, token: data.token };
}

export async function finalizeTemplateUpload(input: {
  path: string;
  name: string;
  category: string;
  description: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}): Promise<{ error?: string }> {
  const session = await requireSession();
  await requireProAccess(session.org.id); // テンプレートは Pro 機能

  // パス先頭の orgId で、他テナントのオブジェクトを登録できないようにする
  if (!input.path.startsWith(`${session.org.id}/`)) return { error: "不正なファイルパスです" };

  const name = input.name.trim();
  const fileName = input.fileName.trim();
  if (!name || !fileName) return { error: "テンプレート名を入力してください" };

  // クライアント申告値は信用せず、実際にアップロードされたオブジェクトを確認する
  const supabase = createSupabaseAdmin();
  const { data: info, error } = await supabase.storage.from(TEMPLATE_BUCKET).info(input.path);
  if (error || !info) return { error: "ファイルのアップロードを確認できませんでした" };

  const category = (TEMPLATE_CATEGORIES as readonly string[]).includes(input.category)
    ? input.category
    : "OTHER";

  await db.template.create({
    data: {
      orgId: session.org.id,
      name,
      description: input.description.trim() || null,
      category,
      fileName,
      filePath: input.path,
      mimeType: info.contentType ?? input.mimeType ?? "application/octet-stream",
      fileSize: info.size ?? input.fileSize,
    },
  });

  revalidatePath("/templates");
  return {};
}

// http(s) のURLだけを許可して正規化する。不正な場合は error を返す。
function normalizeTemplateUrl(raw: string): { url: string } | { error: string } {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return { error: "有効なURLを入力してください (https:// から始まる形式)" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { error: "URLは http:// または https:// で始めてください" };
  }
  return { url: parsed.toString() };
}

// 外部リンク (Canva / X / Notion 等) をテンプレートとして登録する。ファイルは持たない。
export async function createUrlTemplate(input: {
  name: string;
  category: string;
  description: string;
  url: string;
}): Promise<{ error?: string }> {
  const session = await requireSession();
  await requireProAccess(session.org.id); // テンプレートは Pro 機能

  const name = input.name.trim();
  if (!name) return { error: "テンプレート名を入力してください" };

  const normalized = normalizeTemplateUrl(input.url);
  if ("error" in normalized) return { error: normalized.error };

  const category = (TEMPLATE_CATEGORIES as readonly string[]).includes(input.category)
    ? input.category
    : "OTHER";

  await db.template.create({
    data: {
      orgId: session.org.id,
      name,
      description: input.description.trim() || null,
      category,
      sourceUrl: normalized.url,
    },
  });

  revalidatePath("/templates");
  return {};
}

export async function updateTemplate(id: string, formData: FormData): Promise<{ error?: string }> {
  const session = await requireSession();
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "OTHER");
  const description = String(formData.get("description") ?? "").trim();
  if (!name) return { error: "テンプレート名を入力してください" };

  // URL登録テンプレートはリンク先も編集できる (フォームに url フィールドがある場合のみ)
  const rawUrl = formData.get("url");
  let sourceUrl: string | undefined;
  if (typeof rawUrl === "string") {
    const normalized = normalizeTemplateUrl(rawUrl);
    if ("error" in normalized) return { error: normalized.error };
    sourceUrl = normalized.url;
  }

  await db.template.updateMany({
    where: { id, orgId: session.org.id },
    data: {
      name,
      category: (TEMPLATE_CATEGORIES as readonly string[]).includes(category) ? category : "OTHER",
      description: description || null,
      ...(sourceUrl ? { sourceUrl } : {}),
    },
  });
  revalidatePath("/templates");
  return {};
}

export async function deleteTemplate(id: string): Promise<void> {
  const session = await requireSession();
  const template = await db.template.findFirst({ where: { id, orgId: session.org.id } });
  if (!template) return;

  // URL登録テンプレートはストレージ上に実体を持たないので、ファイル削除はスキップ
  if (template.filePath) {
    const supabase = createSupabaseAdmin();
    await supabase.storage.from(TEMPLATE_BUCKET).remove([template.filePath]);
  }
  await db.template.deleteMany({ where: { id, orgId: session.org.id } });
  revalidatePath("/templates");
}
