import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { createSupabaseAdmin } from "@/lib/supabase";
import { TEMPLATE_BUCKET } from "@/lib/templates";

// テンプレートのダウンロード。組織メンバーであることを確認したうえで
// 元ファイル名付きの署名付きURL (60秒有効) にリダイレクトする。
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const template = await db.template.findFirst({ where: { id, orgId: session.org.id } });
  if (!template) return new NextResponse("Not Found", { status: 404 });

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(TEMPLATE_BUCKET)
    .createSignedUrl(template.filePath, 60, { download: template.fileName });
  if (error || !data) return new NextResponse("ファイルの取得に失敗しました", { status: 500 });

  await db.template.update({
    where: { id: template.id },
    data: { downloadCount: { increment: 1 } },
  });

  return NextResponse.redirect(data.signedUrl);
}
