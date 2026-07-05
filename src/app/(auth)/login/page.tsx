import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; next?: string }>;
}) {
  const sp = await searchParams;
  // next は招待リンクなどアプリ内の相対パスのみ許可する (オープンリダイレクト対策)。
  const next = sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "";
  return <LoginForm email={sp.email ?? ""} next={next} />;
}
