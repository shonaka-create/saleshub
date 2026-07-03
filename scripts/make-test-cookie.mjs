// 動作検証用: デモユーザーのセッションクッキーを生成して出力する
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";

const db = new PrismaClient();
const user = await db.user.findUnique({
  where: { email: "demo@akane.studio" },
  include: { memberships: true },
});
if (!user) {
  console.error("demo user not found");
  process.exit(1);
}
const secret = new TextEncoder().encode("akane-hub-dev-secret-change-in-production-1a2b3c4d5e6f");
const token = await new SignJWT({ userId: user.id, orgId: user.memberships[0].orgId })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("1d")
  .sign(secret);
console.log(token);
await db.$disconnect();
