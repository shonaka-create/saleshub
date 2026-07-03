export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-akane-50 via-white to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="text-3xl font-bold tracking-tight text-akane-700">Saleshub</div>
          <p className="mt-2 text-sm text-slate-500">CRM・案件管理・売上管理の統合システム</p>
        </div>
        {children}
      </div>
    </div>
  );
}
