// 一時確認用: Supabase 上のテーブル存在確認 (実行後に削除してよい)
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });

async function main() {
  const rows = await prisma.$queryRawUnsafe(
    `select table_name from information_schema.tables
     where table_schema='public'
       and table_name in ('Template','Dataset','DataSource','DataRow','BillingEvent')
     order by table_name`
  );
  console.log("TABLES:", JSON.stringify(rows));
}

main().finally(() => prisma.$disconnect());
