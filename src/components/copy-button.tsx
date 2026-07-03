"use client";

import { useState } from "react";

// path (例: /invite/xxx) を現在のオリジン付き完全URLとしてコピーする
export function CopyLinkButton({ path, className }: { path: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        await navigator.clipboard.writeText(`${window.location.origin}${path}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? "コピーしました ✓" : "招待リンクをコピー"}
    </button>
  );
}
