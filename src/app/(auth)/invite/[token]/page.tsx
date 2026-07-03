import { dbAdmin } from "@/lib/db";
import { createSupabaseServer } from "@/lib/supabase";
import { ROLE_LABELS, type Role } from "@/lib/constants";
import { InviteForm } from "./invite-form";

// 未ログインでも開ける公開ページのため、招待の照会は dbAdmin で行う (token を知る人のみ到達できる)。
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await dbAdmin.invitation.findUnique({
    where: { token },
    include: { org: true },
  });

  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="mb-2 text-lg font-semibold">招待リンクが無効です</h1>
        <p className="text-sm text-slate-500">
          リンクの期限が切れているか、既に使用されています。管理者に再招待を依頼してください。
        </p>
      </div>
    );
  }

  const existingUser = await dbAdmin.user.findUnique({ where: { email: invite.email } });
  const supabase = await createSupabaseServer();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();
  const loggedInAsInvitee =
    !!currentUser && currentUser.email?.toLowerCase() === invite.email.toLowerCase();

  return (
    <InviteForm
      token={token}
      orgName={invite.org.name}
      email={invite.email}
      roleLabel={ROLE_LABELS[invite.role as Role] ?? invite.role}
      existingUser={!!existingUser}
      loggedInAsInvitee={loggedInAsInvitee}
    />
  );
}
