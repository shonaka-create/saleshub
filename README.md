# Akane Hub

AKANE WEB STUDIO 向けの CRM・案件管理・売上管理 統合業務システム。

## 起動方法

```powershell
cd akane-hub
npm install
node node_modules\prisma\build\index.js db push   # 初回のみ (DB作成)
node node_modules\tsx\dist\cli.mjs prisma/seed.ts # 任意 (デモデータ)
npm run dev
```

http://localhost:3000 を開く。

> **注意**: このフォルダのパスに `&` が含まれるため、`npx` コマンドは失敗します。
> 上記のように `node node_modules\...` で直接実行してください (`npm run dev` は問題ありません)。

### デモアカウント

- メール: `demo@akane.studio`
- パスワード: `akane1234`

新しい組織は「新規登録」からいつでも作成できます (マルチテナント)。

## 主な機能

| 画面 | 内容 |
|---|---|
| ダッシュボード | 今月売上・MRR・稼働契約・パイプラインのタイル + サービス別売上/利益/MRR/パイプラインのグラフ |
| 顧客管理 | 顧客 (日豪の国区分・ステータス・タグ・カスタム項目)、担当者、活動履歴 |
| 案件管理 | パイプラインボード (リード→商談→提案→受注/失注)、受注案件の契約変換 |
| 契約管理 | サービス・プラン紐付きの継続契約。ここから月次売上が自動計算される |
| 売上管理 | Excelライクな月次グリッド。自動計算値をセル単位で手動上書き可、自由行・経費入力、利益/利益率/累計を自動算出 |
| テンプレート | 普段使う Word/Excel/PowerPoint/PDF 等のファイルを保管・検索・ダウンロードできるテンプレートライブラリ (Supabase Storage) |
| 設定 | 組織・基準通貨・為替レート / メンバー招待 (リンク発行・ロール管理) / サービス・プランマスタ / 経費カテゴリ / カスタム項目定義 |

## アーキテクチャ

- **Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 + Recharts**
- **Prisma + SQLite** — スキーマは Postgres 互換設計。本番移行時は `datasource` を `postgresql` に変えて `db push` するだけ
- **マルチテナント**: 全業務データは `Organization` に属し、全クエリが `orgId` でスコープされる
- **認証**: 自前JWT (httpOnlyクッキー) + bcrypt。招待はトークン付きリンク (`/invite/[token]`、14日有効)
- **通貨**: 契約・案件は JPY/AUD 建て。組織設定の為替レートで基準通貨に換算して集計

### 売上の自動計算ロジック (`src/lib/revenue.ts`)

- 契約の `initialFee` は開始月に、`monthlyFee` は開始月〜終了月に毎月計上
- サービス行のセルは `REVENUE_OVERRIDE` で手動上書き可能 (空にすると自動値に戻る)
- 自由行 (`REVENUE_MANUAL`) と経費 (`EXPENSE`) は `MonthlyValue` テーブルに保存

### テンプレートライブラリ (`/templates`)

実ファイルは Supabase Storage の非公開バケット `templates` に `{orgId}/{uuid}.{ext}` 形式で保存し、
メタデータのみ `Template` テーブルに持つ。アップロードは署名付きURLでブラウザから Storage に直接行い
(Vercel のリクエストボディ上限 4.5MB を回避)、ダウンロードは組織メンバー確認後に署名付きURLへリダイレクトする。

## 本番運用メモ

- `.env` の `AUTH_SECRET` を必ず強いランダム値に変更すること
- Vercel等にデプロイする場合は SQLite ではなく Postgres (Neon/Supabase等) を使用
