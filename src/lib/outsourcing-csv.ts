// 委託先に渡す「稼働報告CSV」の列定義・テンプレート生成・解析。
// 委託先が Excel 等で記入して返したファイルを取り込み、稼働ログに自動登録する。

// 列は位置で対応づける (委託先が並び替えない前提)。ヘッダ行は解析時にスキップする。
export const OUTSOURCING_CSV_HEADERS = [
  "実施日(YYYY-MM-DD)",
  "担当者",
  "実施内容",
  "稼働時間(h)",
  "委託費(円)",
  "メモ",
] as const;

export type ParsedWorkRow = {
  workedOn: Date;
  performer: string;
  task: string;
  hours: number | null;
  amount: number;
  memo: string | null;
};

// Excel が UTF-8 と認識できるよう BOM 付きで生成する。ヘッダのみ (記入例は入れない)。
export function buildOutsourcingTemplateCsv(): string {
  const BOM = "﻿";
  return BOM + OUTSOURCING_CSV_HEADERS.join(",") + "\r\n";
}

// バイト列を文字列へ。UTF-8 (BOM有無どちらも) を優先し、失敗したら Shift_JIS とみなす。
// (日本語版 Excel で「CSV」として保存すると Shift_JIS になることが多いため両対応)
export function decodeCsvBytes(bytes: Uint8Array): string {
  // UTF-8 BOM を除去
  let buf = bytes;
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    buf = bytes.subarray(3);
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    try {
      return new TextDecoder("shift_jis").decode(buf);
    } catch {
      return new TextDecoder("utf-8").decode(buf); // 最後の手段 (置換文字を許容)
    }
  }
}

// RFC4180 準拠の簡易パーサ (引用符・エスケープ・CRLF/LF に対応)。
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  // 末尾フィールド/行
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// "2026-07-01" / "2026/7/1" 等を Date に。パースできなければ null。
function parseDate(raw: string): Date | null {
  const s = raw.trim().replace(/\//g, "-");
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, mo - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

// "40,000" / "¥40000" / "40000円" 等から数値を取り出す。
function parseNumber(raw: string): number | null {
  const s = raw.replace(/[^\d.-]/g, "");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// 解析結果。valid = 取り込める行、skipped = 日付/内容が無く飛ばした行数。
export function parseOutsourcingCsv(text: string): { rows: ParsedWorkRow[]; skipped: number } {
  const records = parseCsv(text);
  const out: ParsedWorkRow[] = [];
  let skipped = 0;

  records.forEach((cells, idx) => {
    // 完全な空行は無視 (件数にも数えない)
    if (cells.every((c) => c.trim() === "")) return;

    const [dateRaw = "", performerRaw = "", taskRaw = "", hoursRaw = "", amountRaw = "", memoRaw = ""] = cells;
    const workedOn = parseDate(dateRaw);
    const task = taskRaw.trim();

    // 先頭行 (ヘッダ) や、日付・実施内容が欠けた行はスキップ
    if (!workedOn || !task) {
      // 1行目は通常ヘッダなので skipped に数えない
      if (idx > 0) skipped++;
      return;
    }

    out.push({
      workedOn,
      performer: performerRaw.trim(),
      task,
      hours: parseNumber(hoursRaw),
      amount: parseNumber(amountRaw) ?? 0,
      memo: memoRaw.trim() || null,
    });
  });

  return { rows: out, skipped };
}
