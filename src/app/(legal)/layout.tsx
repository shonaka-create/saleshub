import Link from "next/link";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-bold tracking-tight text-akane-700">
            Saleshub
          </Link>
          <nav className="flex gap-4 text-sm text-slate-500">
            <Link href="/terms" className="hover:text-akane-600 hover:underline">
              利用規約
            </Link>
            <Link href="/privacy" className="hover:text-akane-600 hover:underline">
              個人情報保護方針
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        © AKANE WEB STUDIO — Saleshub
      </footer>
    </div>
  );
}
