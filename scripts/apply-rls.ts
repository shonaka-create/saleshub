// Supabase (PostgreSQL) に RLS ポリシーと専用ロールを適用する。
// 実行: npx tsx scripts/apply-rls.ts  (prisma db push の後に実行すること)
//
// 設計:
// - アプリの通常クエリは非特権ロール akane_app で接続し、RLS が強制される
// - 各トランザクション冒頭で set_config した GUC (app.user_id / app.org_id) をポリシーが参照する
// - postgres ロール (テーブルオーナー) は RLS をバイパスする → dbAdmin / prisma db push 用
// - anon / authenticated (PostgREST 経由) にはポリシーを一切与えない → Supabase REST からのデータ直読を遮断

import { PrismaClient } from "@prisma/client";

const directUrl = process.env.DIRECT_URL;
const appPassword = process.env.APP_DB_PASSWORD;
if (!directUrl || !appPassword) {
  console.error("DIRECT_URL と APP_DB_PASSWORD を .env に設定してください");
  process.exit(1);
}

const prisma = new PrismaClient({ datasourceUrl: directUrl });

// orgId カラムを直接持つテーブル
const ORG_TABLES = [
  "Invitation",
  "Service",
  "Customer",
  "Activity",
  "Deal",
  "Contract",
  "ExpenseCategory",
  "MonthlyValue",
  "CustomFieldDef",
  "Template",
];

// 親テーブル経由で分離される子テーブル: [テーブル, 親参照カラム, 親テーブル]
const CHILD_TABLES: Array<[string, string, string]> = [
  ["Plan", "serviceId", "Service"],
  ["Contact", "customerId", "Customer"],
];

// dbAdmin (postgres ロール) からのみ触るテーブル: RLS を有効化しポリシーを与えない
// → akane_app からは一切アクセス不可になる (システム管理者向け利用ログ等)
const ADMIN_ONLY_TABLES = ["BillingEvent"];

const ALL_TABLES = [
  "User",
  "Organization",
  "Membership",
  ...ORG_TABLES,
  ...CHILD_TABLES.map(([t]) => t),
  ...ADMIN_ONLY_TABLES,
];

const quotedPassword = appPassword.replace(/'/g, "''");

const statements: string[] = [
  // ===== アプリ用ロール =====
  `do $$ begin
     if not exists (select 1 from pg_roles where rolname = 'akane_app') then
       create role akane_app login;
     end if;
   end $$`,
  `alter role akane_app login password '${quotedPassword}'`,
  `grant usage on schema public to akane_app`,
  `grant select, insert, update, delete on all tables in schema public to akane_app`,
  `alter default privileges in schema public grant select, insert, update, delete on tables to akane_app`,

  // ===== ヘルパー関数 =====
  `create schema if not exists app`,
  `grant usage on schema app to akane_app`,
  `create or replace function app.uid() returns text
     language sql stable as $f$ select nullif(current_setting('app.user_id', true), '') $f$`,
  `create or replace function app.oid() returns text
     language sql stable as $f$ select nullif(current_setting('app.org_id', true), '') $f$`,
  // Membership 自身のポリシーから参照すると再帰するため security definer で RLS を迂回
  `create or replace function app.is_member(uid text, oid text) returns boolean
     language sql stable security definer set search_path = public as
     $f$ select exists (select 1 from "Membership" where "userId" = uid and "orgId" = oid) $f$`,
  `create or replace function app.shares_org(target text) returns boolean
     language sql stable security definer set search_path = public as
     $f$ select exists (
       select 1 from "Membership" a join "Membership" b on a."orgId" = b."orgId"
       where a."userId" = app.uid() and b."userId" = target
     ) $f$`,
  `grant execute on all functions in schema app to akane_app`,

  // ===== RLS 有効化 =====
  ...ALL_TABLES.map((t) => `alter table "${t}" enable row level security`),

  // ===== User: 自分自身 + 同じ組織のメンバーのみ閲覧可、更新は自分のみ =====
  `drop policy if exists user_select on "User"`,
  `create policy user_select on "User" for select to akane_app
     using (id = app.uid() or app.shares_org(id))`,
  `drop policy if exists user_update on "User"`,
  `create policy user_update on "User" for update to akane_app
     using (id = app.uid()) with check (id = app.uid())`,

  // ===== Organization: 所属組織のみ閲覧、更新は現在の組織のみ (作成・削除は dbAdmin 経由) =====
  `drop policy if exists org_select on "Organization"`,
  `create policy org_select on "Organization" for select to akane_app
     using (app.is_member(app.uid(), id))`,
  `drop policy if exists org_update on "Organization"`,
  `create policy org_update on "Organization" for update to akane_app
     using (id = app.oid() and app.is_member(app.uid(), id)) with check (id = app.oid())`,

  // ===== Membership: 自分の所属一覧 + 現在の組織のメンバー一覧 (作成は dbAdmin 経由) =====
  `drop policy if exists membership_select on "Membership"`,
  `create policy membership_select on "Membership" for select to akane_app
     using ("userId" = app.uid() or ("orgId" = app.oid() and app.is_member(app.uid(), "orgId")))`,
  `drop policy if exists membership_update on "Membership"`,
  `create policy membership_update on "Membership" for update to akane_app
     using ("orgId" = app.oid() and app.is_member(app.uid(), "orgId")) with check ("orgId" = app.oid())`,
  `drop policy if exists membership_delete on "Membership"`,
  `create policy membership_delete on "Membership" for delete to akane_app
     using ("orgId" = app.oid() and app.is_member(app.uid(), "orgId"))`,

  // ===== orgId を持つ業務テーブル: 現在の組織のメンバーのみ全操作可 =====
  ...ORG_TABLES.flatMap((t) => [
    `drop policy if exists ${t.toLowerCase()}_all on "${t}"`,
    `create policy ${t.toLowerCase()}_all on "${t}" for all to akane_app
       using ("orgId" = app.oid() and app.is_member(app.uid(), "orgId"))
       with check ("orgId" = app.oid() and app.is_member(app.uid(), "orgId"))`,
  ]),

  // ===== 子テーブル: 親行が見えること (親側の RLS が組織分離を担う) =====
  ...CHILD_TABLES.flatMap(([t, col, parent]) => [
    `drop policy if exists ${t.toLowerCase()}_all on "${t}"`,
    `create policy ${t.toLowerCase()}_all on "${t}" for all to akane_app
       using (exists (select 1 from "${parent}" p where p."id" = "${col}"))
       with check (exists (select 1 from "${parent}" p where p."id" = "${col}"))`,
  ]),
];

async function main() {
  for (const sql of statements) {
    const label = sql.replace(/\s+/g, " ").slice(0, 72);
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log(`OK  ${label}`);
    } catch (e) {
      console.error(`NG  ${label}`);
      throw e;
    }
  }
  console.log(`\n完了: ${ALL_TABLES.length} テーブルに RLS を適用しました`);
}

main().finally(() => prisma.$disconnect());
