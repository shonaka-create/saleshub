"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { prepareAttachmentUpload, finalizeAttachment, removeAttachment } from "@/app/actions/attachments";
import {
  ATTACHMENT_BUCKET,
  ATTACHMENT_ALLOWED_EXTS,
  type AttachmentEntity,
} from "@/lib/attachments";
import { templateFileType, formatFileSize } from "@/lib/templates";

// 契約書・請求書の1レコードに実ファイルを添付する共通UI。
// 添付済みならダウンロード / 差し替え / 削除、未添付ならアップロードを表示する。
export function FileAttach({
  entity,
  id,
  fileName,
  fileSize,
}: {
  entity: AttachmentEntity;
  id: string;
  fileName: string | null;
  fileSize: number;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const prep = await prepareAttachmentUpload(entity, id, file.name, file.size);
      if ("error" in prep) {
        setError(prep.error);
        return;
      }
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { error: upErr } = await supabase.storage
        .from(ATTACHMENT_BUCKET)
        .uploadToSignedUrl(prep.path, prep.token, file);
      if (upErr) {
        setError("アップロードに失敗しました。時間をおいて再度お試しください。");
        return;
      }
      const fin = await finalizeAttachment({
        entity,
        id,
        path: prep.path,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      });
      if (fin.error) {
        setError(fin.error);
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await removeAttachment(entity, id);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const accept = ATTACHMENT_ALLOWED_EXTS.map((e) => `.${e}`).join(",");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />

      {fileName ? (
        <>
          <a
            href={`/api/attachments/${entity}/${id}`}
            className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-bold text-white ${templateFileType(fileName).tile}`}
            >
              {templateFileType(fileName).mark}
            </span>
            <span className="max-w-48 truncate">{fileName}</span>
            {fileSize > 0 && <span className="text-slate-400">{formatFileSize(fileSize)}</span>}
            <span>⬇</span>
          </a>
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="text-xs text-slate-400 hover:text-slate-600 disabled:opacity-50"
          >
            差し替え
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={remove}
            className="text-xs text-slate-400 hover:text-rose-500 disabled:opacity-50"
          >
            削除
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:border-akane-300 hover:bg-akane-50 disabled:opacity-50"
        >
          📎 {busy ? "アップロード中…" : "ファイルを添付"}
        </button>
      )}
      {error && <span className="text-xs text-rose-500">{error}</span>}
    </div>
  );
}
