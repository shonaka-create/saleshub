import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { createSupabaseAdmin } from "@/lib/supabase";
import { ATTACHMENT_BUCKET, ATTACHMENT_ENTITIES, type AttachmentEntity } from "@/lib/attachments";

// 契約書・請求書の添付ファイルのダウンロード。
// 組織メンバーであることを確認したうえで、元ファイル名付きの署名付きURL (60秒) にリダイレクトする。
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ entity: string; id: string }> }
) {
  const { entity, id } = await params;
  if (!ATTACHMENT_ENTITIES.includes(entity as AttachmentEntity)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const session = await getSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const record =
    entity === "contract-doc"
      ? await db.contractDoc.findFirst({ where: { id, orgId: session.org.id } })
      : await db.invoice.findFirst({ where: { id, orgId: session.org.id } });
  if (!record || !record.filePath) return new NextResponse("Not Found", { status: 404 });

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrl(record.filePath, 60, { download: record.fileName ?? true });
  if (error || !data) return new NextResponse("ファイルの取得に失敗しました", { status: 500 });

  return NextResponse.redirect(data.signedUrl);
}
