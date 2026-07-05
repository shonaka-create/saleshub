"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  prepareTemplateUpload,
  finalizeTemplateUpload,
  createUrlTemplate,
  updateTemplate,
  deleteTemplate,
} from "@/app/actions/templates";
import { TEMPLATE_CATEGORIES, TEMPLATE_CATEGORY_LABELS, TEMPLATE_CATEGORY_MAX_LEN, templateCategoryLabel } from "@/lib/constants";
import { TEMPLATE_BUCKET, templateFileType, templateUrlType, urlHost, formatFileSize } from "@/lib/templates";
import { Card, Badge, EmptyState, btnPrimary, btnSecondary, inputCls, labelCls, selectCls } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";

type TemplateItem = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  fileName: string | null; // URL登録の場合は null
  fileSize: number;
  sourceUrl: string | null; // 外部リンク登録の場合のURL
  downloadCount: number;
  updatedAt: string; // ISO文字列
};

export function TemplateLibrary({ templates }: { templates: TemplateItem[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("ALL");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editing, setEditing] = useState<TemplateItem | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: templates.length };
    for (const t of templates) c[t.category] = (c[t.category] ?? 0) + 1;
    return c;
  }, [templates]);

  // このユーザー(組織)が作成した自由入力カテゴリ。フィルタタブとカテゴリ選択肢に反映する。
  const customCategories = useMemo(() => {
    const preset = new Set<string>(TEMPLATE_CATEGORIES);
    const set = new Set<string>();
    for (const t of templates) if (!preset.has(t.category)) set.add(t.category);
    return [...set].sort((a, b) => a.localeCompare(b, "ja"));
  }, [templates]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((t) => {
      if (category !== "ALL" && t.category !== category) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        (t.fileName ?? "").toLowerCase().includes(q) ||
        (t.sourceUrl ?? "").toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [templates, query, category]);

  return (
    <div>
      {/* ツールバー: 検索 + アップロード */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1 sm:max-w-xs">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="テンプレートを検索"
            className={`${inputCls} pl-9`}
          />
        </div>
        <button type="button" onClick={() => setUploadOpen(true)} className={`${btnPrimary} ml-auto`}>
          ＋ テンプレートを追加
        </button>
      </div>

      {/* カテゴリタブ (プリセット + 自由入力カテゴリ) */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            ["ALL", "すべて"],
            ...TEMPLATE_CATEGORIES.map((c) => [c, TEMPLATE_CATEGORY_LABELS[c]] as [string, string]),
            ...customCategories.map((c) => [c, c] as [string, string]),
          ] as [string, string][]
        ).map(
          ([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategory(key)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                category === key
                  ? "bg-akane-600 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {label}
              <span className={`ml-1.5 text-xs ${category === key ? "text-akane-100" : "text-slate-400"}`}>
                {counts[key] ?? 0}
              </span>
            </button>
          )
        )}
      </div>

      {/* テンプレート一覧 */}
      {filtered.length === 0 ? (
        <EmptyState
          title={templates.length === 0 ? "テンプレートがまだありません" : "条件に一致するテンプレートがありません"}
          description={
            templates.length === 0
              ? "「＋ テンプレートを追加」から、普段使う Word / Excel / PowerPoint / PDF などのファイルや、Canva・X・Notion などのURLを登録できます"
              : "検索条件やカテゴリを変えてお試しください"
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((t) => (
            <TemplateCard key={t.id} template={t} onEdit={() => setEditing(t)} />
          ))}
        </div>
      )}

      {uploadOpen && <UploadDialog onClose={() => setUploadOpen(false)} customCategories={customCategories} />}
      {editing && (
        <EditDialog template={editing} onClose={() => setEditing(null)} customCategories={customCategories} />
      )}
    </div>
  );
}

function TemplateCard({ template: t, onEdit }: { template: TemplateItem; onEdit: () => void }) {
  const isUrl = !!t.sourceUrl;
  const ft = isUrl ? templateUrlType(t.sourceUrl!) : templateFileType(t.fileName ?? "");
  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${ft.tile}`}
        >
          {ft.mark}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800" title={t.name}>
            {t.name}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge className="bg-akane-50 text-akane-700">{templateCategoryLabel(t.category)}</Badge>
            <Badge className="bg-slate-100 text-slate-500">{ft.label}</Badge>
          </div>
        </div>
      </div>

      {t.description && <p className="mt-3 line-clamp-2 text-xs text-slate-500">{t.description}</p>}

      {isUrl ? (
        <p className="mt-3 truncate text-xs text-slate-400" title={t.sourceUrl!}>
          {urlHost(t.sourceUrl!)} · 更新 {new Date(t.updatedAt).toLocaleDateString("ja-JP")}
        </p>
      ) : (
        <p className="mt-3 truncate text-xs text-slate-400" title={t.fileName ?? ""}>
          {t.fileName} · {formatFileSize(t.fileSize)} · DL {t.downloadCount}回 · 更新{" "}
          {new Date(t.updatedAt).toLocaleDateString("ja-JP")}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
        {isUrl ? (
          <a
            href={t.sourceUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg bg-akane-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-akane-700"
          >
            ↗ リンクを開く
          </a>
        ) : (
          <a
            href={`/api/templates/${t.id}/download`}
            className="inline-flex items-center gap-1 rounded-lg bg-akane-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-akane-700"
          >
            ⬇ ダウンロード
          </a>
        )}
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
        >
          編集
        </button>
        <ConfirmButton
          action={deleteTemplate.bind(null, t.id)}
          message={`テンプレート「${t.name}」を削除しますか？ファイルも完全に削除されます。`}
          className="ml-auto rounded-lg px-2 py-1.5 text-xs font-medium text-rose-500 transition hover:bg-rose-50"
        >
          削除
        </ConfirmButton>
      </div>
    </Card>
  );
}

// カテゴリ選択。プリセット + 既存の自由入力カテゴリから選ぶか、「＋ 新しいカテゴリ」で自由入力する。
const NEW_CATEGORY = "__NEW__";
function CategoryField({
  value,
  onChange,
  customCategories,
}: {
  value: string;
  onChange: (v: string) => void;
  customCategories: string[];
}) {
  const options = [
    ...TEMPLATE_CATEGORIES.map((c) => ({ value: c, label: TEMPLATE_CATEGORY_LABELS[c] })),
    ...customCategories.map((c) => ({ value: c, label: c })),
  ];
  const known = options.some((o) => o.value === value);
  // 既知カテゴリでなく空でもない = 新規入力中
  const [adding, setAdding] = useState(!known && value !== "");

  if (adding) {
    return (
      <div className="flex gap-2">
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, TEMPLATE_CATEGORY_MAX_LEN))}
          placeholder="新しいカテゴリ名"
          maxLength={TEMPLATE_CATEGORY_MAX_LEN}
          className={inputCls}
        />
        <button
          type="button"
          onClick={() => {
            setAdding(false);
            onChange(options[0]?.value ?? "OTHER");
          }}
          className={btnSecondary}
        >
          一覧から選ぶ
        </button>
      </div>
    );
  }

  return (
    <select
      value={known ? value : options[0]?.value ?? "OTHER"}
      onChange={(e) => {
        if (e.target.value === NEW_CATEGORY) {
          setAdding(true);
          onChange("");
        } else {
          onChange(e.target.value);
        }
      }}
      className={`${selectCls} w-full`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
      <option value={NEW_CATEGORY}>＋ 新しいカテゴリを入力…</option>
    </select>
  );
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function UploadDialog({ onClose, customCategories }: { onClose: () => void; customCategories: string[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"file" | "url">("file");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("OTHER");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function pickFile(f: File | null) {
    setFile(f);
    setError(null);
    // テンプレート名が未入力なら拡張子を除いたファイル名を初期値にする
    if (f && !name.trim()) setName(f.name.replace(/\.[^.]+$/, ""));
  }

  async function submitFile() {
    if (!file) return;
    // 1. 署名付きアップロードURLを発行 (サーバー側で形式・サイズを検証)
    const prep = await prepareTemplateUpload(file.name, file.size);
    if ("error" in prep) {
      setError(prep.error);
      return;
    }

    // 2. ブラウザから Storage に直接アップロード (Vercel のボディ上限を回避)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { error: upErr } = await supabase.storage
      .from(TEMPLATE_BUCKET)
      .uploadToSignedUrl(prep.path, prep.token, file);
    if (upErr) {
      setError("ファイルのアップロードに失敗しました。時間をおいて再度お試しください。");
      return;
    }

    // 3. メタデータを登録
    const fin = await finalizeTemplateUpload({
      path: prep.path,
      name: name.trim() || file.name.replace(/\.[^.]+$/, ""),
      category,
      description,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    });
    if (fin.error) {
      setError(fin.error);
      return;
    }

    router.refresh();
    onClose();
  }

  async function submitUrl() {
    const res = await createUrlTemplate({ name: name.trim(), category, description, url });
    if (res.error) {
      setError(res.error);
      return;
    }
    router.refresh();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (mode === "file" && !file) return;
    if (mode === "url" && !url.trim()) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === "file") await submitFile();
      else await submitUrl();
    } finally {
      setBusy(false);
    }
  }

  const ft = file ? templateFileType(file.name) : null;
  const canSubmit = mode === "file" ? !!file : !!url.trim();

  return (
    <Dialog title="テンプレートを追加" onClose={busy ? () => {} : onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 登録方法の切り替え: ファイル or URL */}
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {([
            ["file", "📎 ファイル"],
            ["url", "🔗 URL"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setMode(key);
                setError(null);
              }}
              className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition ${
                mode === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "file" ? (
          /* ファイル選択 (ドラッグ&ドロップ対応) */
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              pickFile(e.dataTransfer.files?.[0] ?? null);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${
              dragOver ? "border-akane-500 bg-akane-50" : "border-slate-300 bg-slate-50 hover:border-akane-300"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.pdf,.txt,.md,.zip,.png,.jpg,.jpeg"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
            {file && ft ? (
              <div className="flex items-center justify-center gap-3">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-lg text-xs font-bold text-white ${ft.tile}`}
                >
                  {ft.mark}
                </span>
                <span className="text-left">
                  <span className="block max-w-64 truncate text-sm font-medium text-slate-800">{file.name}</span>
                  <span className="text-xs text-slate-400">
                    {formatFileSize(file.size)} · クリックで変更
                  </span>
                </span>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium text-slate-600">
                  ファイルをドラッグ&ドロップ、またはクリックして選択
                </p>
                <p className="mt-1 text-xs text-slate-400">Word / Excel / PowerPoint / PDF など · 最大30MB</p>
              </>
            )}
          </div>
        ) : (
          <div>
            <label className={labelCls}>URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.canva.com/design/... や Notion / X の投稿URLなど"
              className={inputCls}
            />
            <p className="mt-1 text-xs text-slate-400">
              Canva・X (旧Twitter)・Notion・Google ドキュメントなど、Web上のリンクを登録できます。
            </p>
          </div>
        )}

        <div>
          <label className={labelCls}>テンプレート名</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="例: 提案書テンプレート (SNS運用)"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>カテゴリ</label>
          <CategoryField value={category} onChange={setCategory} customCategories={customCategories} />
        </div>

        <div>
          <label className={labelCls}>説明 (任意)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="用途や使い方のメモ"
            className={inputCls}
          />
        </div>

        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={busy} className={btnSecondary}>
            キャンセル
          </button>
          <button type="submit" disabled={!canSubmit || busy} className={btnPrimary}>
            {busy ? (mode === "file" ? "アップロード中…" : "登録中…") : mode === "file" ? "アップロード" : "登録"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function EditDialog({
  template: t,
  onClose,
  customCategories,
}: {
  template: TemplateItem;
  onClose: () => void;
  customCategories: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState(t.category);
  const isUrl = !!t.sourceUrl;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("category", category); // CategoryField は name を持たないので明示的に載せる
    const res = await updateTemplate(t.id, fd);
    if (res.error) {
      setError(res.error);
      setBusy(false);
      return;
    }
    router.refresh();
    onClose();
  }

  return (
    <Dialog title="テンプレートを編集" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>テンプレート名</label>
          <input name="name" defaultValue={t.name} required className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>カテゴリ</label>
          <CategoryField value={category} onChange={setCategory} customCategories={customCategories} />
        </div>
        <div>
          <label className={labelCls}>説明 (任意)</label>
          <textarea name="description" defaultValue={t.description ?? ""} rows={2} className={inputCls} />
        </div>
        {isUrl ? (
          <div>
            <label className={labelCls}>URL</label>
            <input name="url" type="url" defaultValue={t.sourceUrl ?? ""} required className={inputCls} />
          </div>
        ) : (
          <p className="text-xs text-slate-400">
            ファイル: {t.fileName} — ファイル自体を差し替える場合は、削除して再アップロードしてください。
          </p>
        )}
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={busy} className={btnSecondary}>
            キャンセル
          </button>
          <button type="submit" disabled={busy} className={btnPrimary}>
            {busy ? "保存中…" : "保存"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
