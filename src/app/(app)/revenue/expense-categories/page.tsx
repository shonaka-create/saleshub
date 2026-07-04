import { requireSession, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, btnPrimary, btnSecondary, inputCls } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import {
  createExpenseCategory,
  renameExpenseCategory,
  deleteExpenseCategory,
} from "@/app/actions/settings";

export default async function ExpenseCategoriesPage() {
  const session = await requireSession();
  const admin = isAdmin(session.role);
  const categories = await db.expenseCategory.findMany({
    where: { orgId: session.org.id },
    orderBy: { sortOrder: "asc" },
  });

  if (!admin) {
    return <p className="text-sm text-slate-500">経費カテゴリの管理には管理者権限が必要です。</p>;
  }

  return (
    <Card className="max-w-2xl p-6">
      <h2 className="mb-1 text-base font-semibold">経費カテゴリ</h2>
      <p className="mb-5 text-sm text-slate-500">売上管理の経費セクションの行になります。</p>

      <div className="space-y-2">
        {categories.map((cat) => (
          <form key={cat.id} action={renameExpenseCategory} className="flex items-center gap-2">
            <input type="hidden" name="id" value={cat.id} />
            <input name="name" defaultValue={cat.name} className={`${inputCls} flex-1`} />
            <button type="submit" className={btnSecondary}>変更</button>
            <ConfirmButton
              action={deleteExpenseCategory.bind(null, cat.id)}
              message={`「${cat.name}」を削除しますか？入力済みの経費データも削除されます。`}
              className="text-xs text-slate-400 hover:text-rose-500"
            >
              削除
            </ConfirmButton>
          </form>
        ))}
      </div>

      <form action={createExpenseCategory} className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-5">
        <input name="name" required placeholder="新しいカテゴリ名" className={`${inputCls} flex-1`} />
        <button type="submit" className={btnPrimary}>＋ 追加</button>
      </form>
    </Card>
  );
}
