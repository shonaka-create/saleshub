// 一時確認用: 旧データ連携テーブルの行数を確認する (db push で削除される前に)
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL_ADMIN });

async function main() {
  try {
    const r = await db.$queryRawUnsafe<Record<string, bigint>[]>(
      'SELECT (SELECT COUNT(*) FROM "DataSource") as ds, (SELECT COUNT(*) FROM "Dataset") as d, (SELECT COUNT(*) FROM "DataRow") as dr'
    );
    console.log(
      `DataSource=${r[0].ds} Dataset=${r[0].d} DataRow=${r[0].dr}`
    );
  } catch (e) {
    console.log("tables not found (already dropped?):", (e as Error).message.slice(0, 200));
  }
}

main().finally(() => db.$disconnect());
