// "2026-07" 形式の月キーユーティリティ

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function currentMonthKey(): string {
  return monthKey(new Date());
}

export function addMonths(key: string, n: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return monthKey(d);
}

// from〜to (両端含む) の月キー配列
export function monthRange(from: string, to: string): string[] {
  const result: string[] = [];
  let cur = from;
  let guard = 0;
  while (cur <= to && guard < 240) {
    result.push(cur);
    cur = addMonths(cur, 1);
    guard++;
  }
  return result;
}

export function formatMonthShort(key: string): string {
  const [y, m] = key.split("-");
  return `${y.slice(2)}/${Number(m)}`;
}

export function formatMonthJa(key: string): string {
  const [y, m] = key.split("-");
  return `${y}年${Number(m)}月`;
}

// 会計年度 (7月始まり等) は考慮せず、直近 N ヶ月 + 先 M ヶ月のレンジを既定とする
export function defaultRange(past = 5, future = 6): { from: string; to: string } {
  const now = currentMonthKey();
  return { from: addMonths(now, -past), to: addMonths(now, future) };
}
