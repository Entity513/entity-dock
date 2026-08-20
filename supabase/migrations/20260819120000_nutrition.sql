-- ============================================================
-- 栄養データと目標値の追加 (Phase 2.1)
--
-- ⚠️ このファイルは「追加専用」。既存のテーブルを drop しない。
--    20260819000000_init.sql とは違い、記録済みのデータを消さずに
--    そのまま流せる（何度流しても同じ結果になる）。
-- ============================================================

-- ------------------------------------------------------------
-- meals: 1食ごとの栄養（Entity が写真から概算して入れる想定）
-- 厳密な数値は求めない。傾向が見えれば十分。
-- ------------------------------------------------------------
alter table public.meals
  add column if not exists kcal      integer      check (kcal >= 0 and kcal < 20000),
  add column if not exists protein_g numeric(5,1) check (protein_g >= 0 and protein_g < 2000),
  add column if not exists fat_g     numeric(5,1) check (fat_g >= 0 and fat_g < 2000),
  add column if not exists carb_g    numeric(5,1) check (carb_g >= 0 and carb_g < 2000);

comment on column public.meals.kcal is '概算カロリー。Entity が写真から推定して入れる';
comment on column public.meals.protein_g is 'たんぱく質 (g)。概算';
comment on column public.meals.fat_g is '脂質 (g)。概算';
comment on column public.meals.carb_g is '炭水化物 (g)。概算';

-- ------------------------------------------------------------
-- settings: 目標値。単一ユーザーなので1行だけ持つ。
-- id を boolean + check(id) にして、2行目を作れないようにする。
-- ------------------------------------------------------------
create table if not exists public.settings (
  id                 boolean primary key default true check (id),
  target_weight_kg   numeric(5,2) check (target_weight_kg > 0 and target_weight_kg < 300),
  target_sleep_hours numeric(3,1) check (target_sleep_hours > 0 and target_sleep_hours <= 24),
  target_kcal        integer      check (target_kcal > 0 and target_kcal < 20000),
  target_protein_g   integer      check (target_protein_g >= 0 and target_protein_g < 2000),
  target_fat_g       integer      check (target_fat_g >= 0 and target_fat_g < 2000),
  target_carb_g      integer      check (target_carb_g >= 0 and target_carb_g < 2000),
  updated_at         timestamptz not null default now()
);

insert into public.settings (id) values (true) on conflict (id) do nothing;

drop trigger if exists settings_set_updated_at on public.settings;
create trigger settings_set_updated_at
  before update on public.settings
  for each row
  execute function public.set_updated_at();

alter table public.settings enable row level security;

drop policy if exists "settings_all" on public.settings;
create policy "settings_all" on public.settings
  for all to anon, authenticated using (true) with check (true);
