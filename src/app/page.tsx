import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function Home() {
  const session = await getSession();
  // 未ログインの訪問者は料金案内付きの登録ページへ誘導する
  redirect(session ? "/dashboard" : "/register");
}
