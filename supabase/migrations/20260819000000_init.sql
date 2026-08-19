-- ============================================================
-- Entity Dock  初期スキーマ (Phase 1)
-- Supabase SQL Editor に貼り付けて実行するか、
-- `supabase link` + `supabase db push` で適用する。
--
-- 設計メモ:
-- * 全テーブルに user_id (default auth.uid()) を持たせ、RLS で本人のみに制限。
--   Web (anon key + ログインセッション) からの INSERT は default で自動的に
--   本人の uuid が入る。
-- * Entity (service_role key) は RLS をバイパスするが、auth.uid() が NULL に
--   なるため default が効かず、NOT NULL 制約により user_id の明示送信が
--   強制される。これは意図したガード（他人の行を「うっかり」作れない）。
--   → Entity からの書き込みでは必ず user_id を含めること (Phase 2 の
--     ENTITY_API.md 参照)。
-- * photo_url には署名URLではなく Storage のオブジェクトパスを保存する
--   (例: meals/2026/08/xxxx.jpg)。署名は表示時にフロントで行う。
-- ============================================================

-- ------------------------------------------------------------
-- daily_logs: 1日1行。date が PK（単一ユーザー前提。
-- 将来マルチユーザー化する場合は PK を (user_id, date) に変更する）。
-- sleep_start / sleep_end は timestamptz。睡眠は日付をまたぐため
-- time 型では表現できない。行の date は「起床日」を表す。
-- ------------------------------------------------------------
create table public.daily_logs (
  date            date primary key,
  user_id         uuid not null default auth.uid() references auth.users (id),
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
  user_id     uuid not null default auth.uid() references auth.users (id),
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
  user_id    uuid not null default auth.uid() references auth.users (id),
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
-- RLS: 本人 (user_id = auth.uid()) のみ読み書き可。
-- anon 向けポリシーは作らない → 未ログインでは何も見えない。
-- service_role は RLS をバイパスする (Entity 用)。
-- ------------------------------------------------------------
alter table public.daily_logs enable row level security;
alter table public.meals enable row level security;
alter table public.workouts enable row level security;

create policy "daily_logs_select_own" on public.daily_logs
  for select to authenticated using (user_id = auth.uid());
create policy "daily_logs_insert_own" on public.daily_logs
  for insert to authenticated with check (user_id = auth.uid());
create policy "daily_logs_update_own" on public.daily_logs
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "daily_logs_delete_own" on public.daily_logs
  for delete to authenticated using (user_id = auth.uid());

create policy "meals_select_own" on public.meals
  for select to authenticated using (user_id = auth.uid());
create policy "meals_insert_own" on public.meals
  for insert to authenticated with check (user_id = auth.uid());
create policy "meals_update_own" on public.meals
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "meals_delete_own" on public.meals
  for delete to authenticated using (user_id = auth.uid());

create policy "workouts_select_own" on public.workouts
  for select to authenticated using (user_id = auth.uid());
create policy "workouts_insert_own" on public.workouts
  for insert to authenticated with check (user_id = auth.uid());
create policy "workouts_update_own" on public.workouts
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "workouts_delete_own" on public.workouts
  for delete to authenticated using (user_id = auth.uid());

-- ============================================================
-- Storage: private バケット 'photos' とアクセスポリシー
--
-- ※ この節が権限エラーになった場合 (CLI 実行時など) は、
--   ここから下だけを Supabase Dashboard の SQL Editor で実行すること。
--
-- ポリシーは owner ベースではなくロールベース (authenticated) にしている。
-- Entity (service_role) がアップロードするオブジェクトには owner が
-- 付かないため、owner = auth.uid() で縛ると Web から見えなくなる。
-- 単一ユーザー + private バケットなので authenticated = 本人 で等価。
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos',
  'photos',
  false,
  10485760, -- 10MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "photos_select_authenticated" on storage.objects
  for select to authenticated using (bucket_id = 'photos');
create policy "photos_insert_authenticated" on storage.objects
  for insert to authenticated with check (bucket_id = 'photos');
create policy "photos_update_authenticated" on storage.objects
  for update to authenticated using (bucket_id = 'photos') with check (bucket_id = 'photos');
create policy "photos_delete_authenticated" on storage.objects
  for delete to authenticated using (bucket_id = 'photos');
