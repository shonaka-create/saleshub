"use client";

import { useEffect, useState } from "react";

// 締切までのカウントダウン表示。締切を過ぎたら何も表示しない。
// SSR とのハイドレーション不一致を避けるため、マウント後にのみ残り時間を描画する。
export function Countdown({ deadlineIso, className = "" }: { deadlineIso: string; className?: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const deadline = new Date(deadlineIso).getTime();
  if (now === null) return <span className={className}>…</span>;
  const ms = deadline - now;
  if (ms <= 0) return null;

  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <span className={`tabular-nums ${className}`}>
      残り {days}日 {pad(hours)}:{pad(minutes)}:{pad(seconds)}
    </span>
  );
}
