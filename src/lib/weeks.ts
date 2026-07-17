// WBS の週次カラム用ユーティリティ。
// サーバー (Vercel=UTC) とユーザー (JST) で「今日・今週」がずれないよう、判定は常に JST 基準で行う。
// 日付のみの値 (startDate/dueDate) は UTC 深夜として保存されるため +9h しても日付は変わらず安全。

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// JST での「今日」を UTC 深夜の Date として返す (保存値と同じ土俵で比較できる)
export function todayJst(): Date {
  const jst = new Date(Date.now() + JST_OFFSET_MS);
  return new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate()));
}

// その日を含む週の月曜 (UTC 深夜)
export function mondayOf(date: Date): Date {
  const dow = date.getUTCDay(); // 0=日
  const diff = (dow + 6) % 7; // 月曜からの経過日数
  return new Date(date.getTime() - diff * DAY_MS);
}

export type WeekCol = { start: Date; end: Date; label: string };

// 今週 (JST の今日を含む週) を先頭に count 週分のカラムを返す。
// 過去の週は含めない = スプレッドシートの「過去週の自動削除」に相当する。
export function currentWeeks(count: number): WeekCol[] {
  const first = mondayOf(todayJst());
  return Array.from({ length: count }, (_, i) => {
    const start = new Date(first.getTime() + i * 7 * DAY_MS);
    const end = new Date(start.getTime() + 6 * DAY_MS);
    return {
      start,
      end,
      label: `${start.getUTCMonth() + 1}/${start.getUTCDate()}`,
    };
  });
}

// タスクの期間 [startDate, dueDate] が週 [start, end] と重なるか (色塗り判定)
export function overlapsWeek(
  start: Date | null,
  due: Date | null,
  week: WeekCol
): boolean {
  if (!start && !due) return false;
  const from = start ?? due!;
  const to = due ?? start!;
  return from.getTime() <= week.end.getTime() && to.getTime() >= week.start.getTime();
}

export function isOverdue(dueDate: Date | null, status: string): boolean {
  if (!dueDate || status === "DONE") return false;
  return dueDate.getTime() < todayJst().getTime();
}

export function fmtDateShort(d: Date | null): string {
  if (!d) return "";
  return `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

// <input type="date"> の value 用 (YYYY-MM-DD)
export function toInputDate(d: Date | null): string {
  if (!d) return "";
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
