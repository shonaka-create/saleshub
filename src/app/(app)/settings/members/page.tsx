import { requireSession, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LABELS, type Role } from "@/lib/constants";
import { Card, Badge, btnPrimary, inputCls, selectCls } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { CopyLinkButton } from "@/components/copy-button";
import {
  createInvitation,
  deleteInvitation,
  changeMemberRole,
  removeMember,
} from "@/app/actions/settings";
import { RoleSelect } from "./role-select";

export default async function MembersPage() {
  const session = await requireSession();
  const admin = isAdmin(session.role);
  const [members, invitations] = await Promise.all([
    db.membership.findMany({
      where: { orgId: session.org.id },
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    }),
    db.invitation.findMany({
      where: { orgId: session.org.id, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <Card className="p-6">
        <h2 className="mb-4 text-base font-semibold">メンバー ({members.length}名)</h2>
        <ul className="divide-y divide-slate-100">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">{m.user.name}</p>
                <p className="truncate text-xs text-slate-400">{m.user.email}</p>
              </div>
              <div className="flex items-center gap-3">
                {m.role === "OWNER" || !admin ? (
                  <Badge className="bg-akane-50 text-akane-700">
                    {ROLE_LABELS[m.role as Role] ?? m.role}
                  </Badge>
                ) : (
                  <>
                    <RoleSelect
                      membershipId={m.id}
                      current={m.role}
                      action={changeMemberRole}
                    />
                    {m.userId !== session.user.id && (
                      <ConfirmButton
                        action={removeMember.bind(null, m.id)}
                        message={`${m.user.name} さんを組織から外しますか？`}
                        className="text-xs text-slate-400 hover:text-rose-500"
                      >
                        削除
                      </ConfirmButton>
                    )}
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {admin && (
        <Card className="p-6">
          <h2 className="mb-1 text-base font-semibold">メンバーを招待</h2>
          <p className="mb-4 text-sm text-slate-500">
            招待を作成すると招待リンクが発行されます。リンクを相手に共有してください (有効期限14日)。
          </p>
          <form action={createInvitation} className="flex flex-wrap items-end gap-3">
            <div className="min-w-56 flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">メールアドレス</label>
              <input type="email" name="email" required className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">ロール</label>
              <select name="role" defaultValue="MEMBER" className={selectCls}>
                <option value="MEMBER">メンバー</option>
                <option value="ADMIN">管理者</option>
              </select>
            </div>
            <button type="submit" className={btnPrimary}>招待を作成</button>
          </form>

          {invitations.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-medium text-slate-600">保留中の招待</h3>
              <ul className="divide-y divide-slate-100">
                {invitations.map((inv) => (
                  <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <div>
                      <p className="text-sm text-slate-700">{inv.email}</p>
                      <p className="text-xs text-slate-400">
                        {ROLE_LABELS[inv.role as Role] ?? inv.role} · 期限{" "}
                        {inv.expiresAt.toLocaleDateString("ja-JP")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <CopyLinkButton
                        path={`/invite/${inv.token}`}
                        className="text-xs font-medium text-akane-600 hover:underline"
                      />
                      <ConfirmButton
                        action={deleteInvitation.bind(null, inv.id)}
                        message="この招待を取り消しますか？"
                        className="text-xs text-slate-400 hover:text-rose-500"
                      >
                        取消
                      </ConfirmButton>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
