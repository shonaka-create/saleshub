import { dbAdmin as db } from "./db";
import { computeFreeUntil } from "./pricing";

// 新規組織作成時の初期マスタ投入。
// サービス・プランは各社バラバラなので初期投入せず、ユーザーが自分で登録する (デフォルト未設定)。
// 経費カテゴリのみ、会計上ほぼ共通の汎用区分を既定値として入れておく (設定画面から編集可)。
// メンバーシップ成立前に実行されるため RLS をバイパスする dbAdmin を使う。
export async function createOrganizationWithDefaults(name: string, ownerUserId: string) {
  // 基本プランの無料期間を登録時点で確定する (早期登録なら3ヶ月、通常は初月無料)
  const { freeUntil, earlyBird } = computeFreeUntil(new Date());
  const org = await db.organization.create({
    data: {
      name,
      baseCurrency: "JPY",
      freeUntil,
      earlyBird,
      memberships: { create: { userId: ownerUserId, role: "OWNER" } },
    },
  });

  await db.expenseCategory.createMany({
    data: [
      { orgId: org.id, name: "人件費・外注費", sortOrder: 0 },
      { orgId: org.id, name: "広告宣伝費", sortOrder: 1 },
      { orgId: org.id, name: "サーバー・インフラ・ツール費", sortOrder: 2 },
      { orgId: org.id, name: "地代家賃・その他経費", sortOrder: 3 },
    ],
  });

  return org;
}
