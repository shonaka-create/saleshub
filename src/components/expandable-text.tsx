"use client";

import { useEffect, useRef, useState } from "react";

// 長いテキストを数行で折りたたみ、「もっと見る」で全文を展開するテキスト表示。
// 折りたたみ時に実際にあふれている場合だけボタンを表示する。
export function ExpandableText({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);

  useEffect(() => {
    if (expanded) return; // 展開中は折りたたみ時の計測結果を維持する
    const el = ref.current;
    if (!el) return;
    const measure = () => setClamped(el.scrollHeight > el.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, expanded]);

  return (
    <div>
      <p
        ref={ref}
        className={`mt-1 whitespace-pre-wrap break-words text-sm text-slate-700 ${
          expanded ? "" : "line-clamp-5"
        }`}
      >
        {text}
      </p>
      {clamped && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs font-medium text-akane-700 hover:underline"
        >
          {expanded ? "折りたたむ ▲" : "もっと見る ▼"}
        </button>
      )}
    </div>
  );
}
