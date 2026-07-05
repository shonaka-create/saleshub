import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { buildOutsourcingTemplateCsv } from "@/lib/outsourcing-csv";

// 委託先に渡す「稼働報告CSV」テンプレートをダウンロードする。
export async function GET() {
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const csv = buildOutsourcingTemplateCsv();
  const filename = "委託稼働報告_テンプレート.csv";
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="template.csv"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
