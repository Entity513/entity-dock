-- ============================================================
-- Entity Dock  初期スキーマ (Phase 1)
-- Supabase SQL Editor に貼り付けて実行するか、
-- Management API の /database/query に投げる。
--
-- ★ 認証なし構成
--   このアプリはログインを持たない。anon キー（= 公開鍵、JS バンドルに
--   含まれる）だけで読み書きできる。つまり URL を知っている人は誰でも
--   全データを閲覧・編集・削除できる。オーナーの明示的な判断による設計。
--   後からログインを付ける場合は、user_id 列と
--   `user_id = auth.uid()` の RLS ポリシーに戻すこと。
--
-- 設計メモ:
-- * RLS は有効のまま、anon / authenticated に全許可のポリシーを張る
--   （RLS を無効にすると PostgREST 側で弾かれるため）。
-- * photo_url には署名URLではなく Storage のオブジェクトパスを保存する
--   (例: meals/2026/08/xxxx.jpg)。署名は表示時にフロントで行う。
-- * Entity (service_role key) は RLS をバイパスするので、そのまま
--   INSERT/UPSERT できる (Phase 2 の ENTITY_API.md 参照)。
--
-- このファイルは何度でも流し直せる（先頭で既存オブジェクトを削除する）。
-- ※ 既存データがある場合は消えるので注意。
-- ============================================================

-- ------------------------------------------------------------
-- リセット
-- ------------------------------------------------------------
drop table if exists public.meals cascade;
drop table if exists public.workouts cascade;
drop table if exists public.daily_logs cascade;
drop function if exists public.set_updated_at() cascade;

-- ------------------------------------------------------------
-- daily_logs: 1日1行。date が PK。
-- sleep_start / sleep_end は timestamptz。睡眠は日付をまたぐため
-- time 型では表現できない。行の date は「起床日」を表す。
-- ------------------------------------------------------------
create table public.daily_logs (
  date            date primary key,
  weight_kg       numeric(5, 2) check (weight_kg > 0 and weight_kg < 300),
  sleep_start     timestamptz,
  sleep_end       timestamptz,
  sleep_score     smallint check (sleep_score between 0 and 100),
  meditation_min  smallint check (meditation_min >= 0),
  condition_score smallint check (condition_score between 1 and 10),
  mood            smallint check (mood between 1 and 10),
  steps           integer check (steps >= 0),
  active_kcal     integer check (active_kcal >= 0),
  exercise_min    smallint check (exercise_min >= 0),
  stand_hours     smallint check (stand_hours between 0 and 24),
  diary           text,
  updated_at      timestamptz not null default now(),
  constraint sleep_range check (
    sleep_start is null
    or sleep_end is null
    or (sleep_end > sleep_start and sleep_end - sleep_start < interval '24 hours')
  )
);

create table public.meals (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  time        time,
  meal_type   text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  photo_url   text, -- 'photos' バケット内のオブジェクトパス。URL ではない
  description text,
  tags        text[] not null default '{}',
  source      text not null default 'web' check (source in ('entity', 'web')),
  created_at  timestamptz not null default now()
);

create index meals_date_idx on public.meals (date);

create table public.workouts (
  id         uuid primary key default gen_random_uuid(),
  date       date not null,
  photo_url  text, -- トレーニングノート写真のオブジェクトパス
  menu       text,
  notes      text,
  tags       text[] not null default '{}',
  source     text not null default 'web' check (source in ('entity', 'web')),
  created_at timestamptz not null default now()
);

create index workouts_date_idx on public.workouts (date);

-- ------------------------------------------------------------
-- updated_at 自動更新 (daily_logs のみ)
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create trigger daily_logs_set_updated_at
  before update on public.daily_logs
  for each row
  execute function public.set_updated_at();

-- ------------------------------------------------------------
-- RLS: 認証なし構成のため anon にも全許可。
-- RLS 自体は有効にしておく（無効だと PostgREST が拒否する）。
-- ------------------------------------------------------------
alter table public.daily_logs enable row level security;
alter table public.meals enable row level security;
alter table public.workouts enable row level security;

create policy "daily_logs_all" on public.daily_logs
  for all to anon, authenticated using (true) with check (true);
create policy "meals_all" on public.meals
  for all to anon, authenticated using (true) with check (true);
create policy "workouts_all" on public.workouts
  for all to anon, authenticated using (true) with check (true);

-- ============================================================
-- Storage: バケット 'photos'
--
-- バケット自体は private のままにして、表示時に署名 URL を発行する
-- （オブジェクトを直リンクで総当たりされないようにするため）。
-- ただし anon が署名 URL を発行できるので、実質的な保護にはならない。
--
-- ※ この節が権限エラーになった場合は、ここから下だけを
--   Supabase Dashboard の SQL Editor で実行すること。
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos',
  'photos',
  false,
  10485760, -- 10MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "photos_select_authenticated" on storage.objects;
drop policy if exists "photos_insert_authenticated" on storage.objects;
drop policy if exists "photos_update_authenticated" on storage.objects;
drop policy if exists "photos_delete_authenticated" on storage.objects;
drop policy if exists "photos_all" on storage.objects;

create policy "photos_all" on storage.objects
  for all to anon, authenticated
  using (bucket_id = 'photos') with check (bucket_id = 'photos');
