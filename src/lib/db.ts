import { PrismaClient } from "@prisma/client";
import { cache } from "react";

// リクエスト単位の RLS コンテキスト。getSession() が検証済みの userId/orgId を設定し、
// db への全クエリはこの値を Postgres の GUC (app.user_id / app.org_id) として送る。
export const rlsContext = cache(() => ({ userId: "", orgId: "" }));

const globalForPrisma = globalThis as unknown as {
  prismaApp?: PrismaClient;
  prismaAdmin?: PrismaClient;
};

// 非特権ロール (akane_app) での接続。RLS が適用される。
const prismaApp =
  globalForPrisma.prismaApp ?? new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

// テーブルオーナー (postgres) での接続。RLS をバイパスするため、
// 認証・招待・組織ブートストラップ等の「セッション成立前」の処理専用。
export const dbAdmin =
  globalForPrisma.prismaAdmin ??
  new PrismaClient({ datasourceUrl: process.env.DATABASE_URL_ADMIN });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaApp = prismaApp;
  globalForPrisma.prismaAdmin = dbAdmin;
}

// 通常のデータアクセス用クライアント。各操作をトランザクションで包み、
// 先頭で RLS コンテキストを set_config してからクエリを実行する。
// set_config の第3引数 TRUE でトランザクション局所になるため、pgbouncer (transaction mode) でも安全。
export const db = prismaApp.$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        const ctx = rlsContext();
        const [, result] = await prismaApp.$transaction([
          prismaApp.$executeRaw`SELECT set_config('app.user_id', ${ctx.userId}, TRUE), set_config('app.org_id', ${ctx.orgId}, TRUE)`,
          query(args) as never,
        ]);
        return result;
      },
    },
  },
});
