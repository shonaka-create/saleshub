"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase";
import { fileExtension } from "@/lib/templates";
import {
  ATTACHMENT_BUCKET,
  ATTACHMENT_MAX_FILE_SIZE,
  ATTACHMENT_ALLOWED_EXTS,
  ATTACHMENT_ENTITIES,
  type AttachmentEntity,
} from "@/lib/attachments";

// テンプレートと同じく、ファイル本体は署名付きURLでブラウザから Storage へ直接アップロードし、
// サーバーはメタデータ (filePath/fileName/fileSize/mimeType) だけを DB に保存する。

const PATH_BY_ENTITY: Record<AttachmentEntity, string> = {
  "contract-doc": "/team/contract-docs",
  invoice: "/team/invoices",
};

async function ensureBucket(supabase: SupabaseClient) {
  const { data } = await supabase.storage.getBucket(ATTACHMENT_BUCKET);
  if (!data) {
    await supabase.storage.createBucket(ATTACHMENT_BUCKET, {
      public: false,
      fileSizeLimit: ATTACHMENT_MAX_FILE_SIZE,
    });
  }
}

// 対象レコードが現在の組織のものか検証する。存在しなければ null。
async function findRecord(entity: AttachmentEntity, id: string, orgId: string) {
  if (entity === "contract-doc") return db.contractDoc.findFirst({ where: { id, orgId } });
  return db.invoice.findFirst({ where: { id, orgId } });
}

export async function prepareAttachmentUpload(
  entity: AttachmentEntity,
  id: string,
  fileName: string,
  fileSize: number
): Promise<{ path: string; token: string } | { error: string }> {
  const session = await requireSession();
  if (!ATTACHMENT_ENTITIES.includes(entity)) return { error: "不正な対象です" };

  const record = await findRecord(entity, id, session.org.id);
  if (!record) return { error: "対象が見つかりません" };

  const ext = fileExtension(fileName);
  if (!(ATTACHMENT_ALLOWED_EXTS as readonly string[]).includes(ext)) {
    return { error: `対応していないファイル形式です (${ATTACHMENT_ALLOWED_EXTS.join(" / ")})` };
  }
  if (fileSize > ATTACHMENT_MAX_FILE_SIZE) {
    return { error: "ファイルサイズの上限は 30MB です" };
  }

  const supabase = createSupabaseAdmin();
  await ensureBucket(supabase);

  // オブジェクトキーは ASCII のみ。先頭 orgId でテナントを分離する。
  const path = `${session.org.id}/${entity}/${randomUUID()}.${ext}`;
  const { data, error } = await supabase.storage.from(ATTACHMENT_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { error: "アップロード用URLの発行に失敗しました" };
  return { path: data.path, token: data.token };
}

export async function finalizeAttachment(input: {
  entity: AttachmentEntity;
  id: string;
  path: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}): Promise<{ error?: string }> {
  const session = await requireSession();
  const { entity, id } = input;
  if (!ATTACHMENT_ENTITIES.includes(entity)) return { error: "不正な対象です" };

  const record = await findRecord(entity, id, session.org.id);
  if (!record) return { error: "対象が見つかりません" };

  // パス先頭の orgId/entity で、他テナント・他種別のオブジェクトを登録できないようにする
  if (!input.path.startsWith(`${session.org.id}/${entity}/`)) return { error: "不正なファイルパスです" };

  // クライアント申告値は信用せず、実際にアップロードされたオブジェクトを確認する
  const supabase = createSupabaseAdmin();
  const { data: info, error } = await supabase.storage.from(ATTACHMENT_BUCKET).info(input.path);
  if (error || !info) return { error: "ファイルのアップロードを確認できませんでした" };

  // 既存の添付があれば差し替え (古いオブジェクトを削除)
  const prevPath = record.filePath;

  const data = {
    filePath: input.path,
    fileName: input.fileName.trim() || "file",
    fileSize: info.size ?? input.fileSize,
    mimeType: info.contentType ?? input.mimeType ?? "application/octet-stream",
  };
  if (entity === "contract-doc") {
    await db.contractDoc.update({ where: { id }, data });
  } else {
    await db.invoice.update({ where: { id }, data });
  }

  if (prevPath && prevPath !== input.path) {
    await supabase.storage.from(ATTACHMENT_BUCKET).remove([prevPath]);
  }

  revalidatePath(PATH_BY_ENTITY[entity]);
  return {};
}

export async function removeAttachment(entity: AttachmentEntity, id: string): Promise<void> {
  const session = await requireSession();
  if (!ATTACHMENT_ENTITIES.includes(entity)) return;

  const record = await findRecord(entity, id, session.org.id);
  if (!record || !record.filePath) return;

  const supabase = createSupabaseAdmin();
  await supabase.storage.from(ATTACHMENT_BUCKET).remove([record.filePath]);

  const data = { filePath: null, fileName: null, fileSize: 0, mimeType: null };
  if (entity === "contract-doc") {
    await db.contractDoc.update({ where: { id }, data });
  } else {
    await db.invoice.update({ where: { id }, data });
  }
  revalidatePath(PATH_BY_ENTITY[entity]);
}
