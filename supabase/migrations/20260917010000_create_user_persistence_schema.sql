-- =====================================================================
-- PHASE 1 — AUTH & PERSISTENCE ARCHITECTURE: DATABASE FOUNDATION
-- =====================================================================
--
-- Bu migration, gelecekteki kullanıcı-hesabı sistemi (auth + persistence)
-- için SADECE veritabanı temelini kurar. HİÇBİR uygulama kodu (server/,
-- public/) bu migration'ı henüz KULLANMIYOR/import ETMİYOR — mevcut
-- generator/TopDown runtime/Free-HTML şablonları/asset resolver/model
-- selector/Game Library UI DAVRANIŞI bu migration'dan TAMAMEN BAĞIMSIZ,
-- hiçbiri değiştirilmedi (bkz. bu round'un görev tanımı: "Do NOT modify
-- the existing generator behavior" vb.).
--
-- Bu proje şu ana kadar HİÇBİR sunucu-taraflı veritabanı KULLANMIYORDU —
-- Game Library tamamen client-side `window.localStorage`'da tutuluyor
-- (bkz. public/app.js, "ROUND I — GAME LIBRARY" bloğu). Bu migration,
-- Supabase/Postgres'e geçiş için gereken İLK, izole adım.
--
-- Auth: Supabase'in kendi `auth.users` tablosunu (Supabase Auth tarafından
-- yönetilir, burada OLUŞTURULMUYOR) kullanıyoruz — her kullanıcı-sahipli
-- tablo `auth.users(id)`'e FOREIGN KEY ile bağlanıyor.
--
-- GÜVENLİK (bu round'un kesin kısıtları):
--   - Her tabloda Row Level Security (RLS) AÇIK.
--   - Her policy `auth.uid() = <ownership kolonu>` ile SADECE sahibinin
--     kendi satırlarına erişebilmesini sağlıyor (select/insert/update/
--     delete için AYRI policy'ler — tek bir "for all" policy YOK, böylece
--     her komut türü ayrı ayrı, açıkça denetlenebilir).
--   - `anon`/`public` rollerine HİÇBİR ayrıcalık verilmiyor (aksine, olası
--     şema-seviyesi varsayılan grant'lara karşı EXPLICIT REVOKE var) —
--     hiçbir tablo public'e açık/yazılabilir değil.
--   - `api_keys.encrypted_key`, gelecekteki şifreleme katmanı için SADECE
--     bir PLACEHOLDER kolon — bu migration şifreleme/çözme mantığını
--     UYGULAMIYOR, hiçbir plaintext key/secret İÇERMİYOR/kabul etmiyor
--     (kolon adı bilerek "encrypted_key" — application code, bu kolona
--     ASLA plaintext yazmamalı; bu kural burada, migration'da ZORLANMIYOR
--     ama isim ve yorumla açıkça belgeleniyor).
--   - service_role için burada YENİ bir bypass/policy YAZILMIYOR —
--     Supabase'in service_role'ü zaten platform seviyesinde RLS'i
--     bypass eder (BYPASSRLS rolü), bu migration'ın kapsamı DIŞINDA.
--
-- İdempotency: `create table if not exists` + her policy/trigger'dan önce
-- `drop ... if exists` kullanılarak bu dosya güvenle yeniden çalıştırılabilir
-- (örn. bir staging ortamında migration'ı tekrar uygulama ihtiyacı olursa).
-- =====================================================================

-- gen_random_uuid() için (Postgres 13+ çekirdekte var, ama garanti olsun
-- diye pgcrypto da açık bırakılıyor — Supabase projelerinde zaten varsayılan
-- olarak etkin).
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- ORTAK YARDIMCI: updated_at otomatik güncelleme
-- ---------------------------------------------------------------------
-- Her UPDATE'te updated_at'i now()'a çeker — 5 tablonun HERBİRİNDE
-- tekrarlanmasın diye TEK, paylaşılan bir trigger fonksiyonu.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- =======================================================================
-- 1) profiles — auth.users(id) ile bire-bir, kullanıcı profil bilgisi
-- =======================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

revoke all on public.profiles from public;
revoke all on public.profiles from anon;
grant select, insert, update, delete on public.profiles to authenticated;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_delete_own on public.profiles
  for delete
  using (auth.uid() = id);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute procedure public.set_updated_at();


-- =======================================================================
-- 2) user_settings — kullanıcı başına TEK satır (user_id PRIMARY KEY)
-- =======================================================================
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  selected_model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

revoke all on public.user_settings from public;
revoke all on public.user_settings from anon;
grant select, insert, update, delete on public.user_settings to authenticated;

drop policy if exists user_settings_select_own on public.user_settings;
create policy user_settings_select_own on public.user_settings
  for select
  using (auth.uid() = user_id);

drop policy if exists user_settings_insert_own on public.user_settings;
create policy user_settings_insert_own on public.user_settings
  for insert
  with check (auth.uid() = user_id);

drop policy if exists user_settings_update_own on public.user_settings;
create policy user_settings_update_own on public.user_settings
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists user_settings_delete_own on public.user_settings;
create policy user_settings_delete_own on public.user_settings
  for delete
  using (auth.uid() = user_id);

drop trigger if exists set_user_settings_updated_at on public.user_settings;
create trigger set_user_settings_updated_at
  before update on public.user_settings
  for each row
  execute procedure public.set_updated_at();


-- =======================================================================
-- 3) api_keys — kullanıcı başına, provider başına EN FAZLA 1 key
-- =======================================================================
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  -- PLACEHOLDER: şifreleme katmanı bu round'da UYGULANMIYOR. Application
  -- code bu kolona ASLA plaintext bir key yazmamalı — bu, gelecekteki
  -- şifreleme round'unun sorumluluğu (görev md: "Do not implement the
  -- encryption/decryption logic yet").
  encrypted_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint api_keys_user_provider_unique unique (user_id, provider)
);

-- NOT: api_keys_user_provider_unique zaten (user_id, provider) üzerinde
-- bir unique index oluşturuyor ve bu index user_id'ye göre TEK BAŞINA
-- filtrelemeyi de (leftmost-prefix) hızlandırıyor — bu yüzden ayrı bir
-- idx_api_keys_user_id EKLENMEDİ (gereksiz/yinelenen index'ten kaçınmak
-- için bilinçli bir tercih).

alter table public.api_keys enable row level security;

revoke all on public.api_keys from public;
revoke all on public.api_keys from anon;
grant select, insert, update, delete on public.api_keys to authenticated;

drop policy if exists api_keys_select_own on public.api_keys;
create policy api_keys_select_own on public.api_keys
  for select
  using (auth.uid() = user_id);

drop policy if exists api_keys_insert_own on public.api_keys;
create policy api_keys_insert_own on public.api_keys
  for insert
  with check (auth.uid() = user_id);

drop policy if exists api_keys_update_own on public.api_keys;
create policy api_keys_update_own on public.api_keys
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists api_keys_delete_own on public.api_keys;
create policy api_keys_delete_own on public.api_keys
  for delete
  using (auth.uid() = user_id);

drop trigger if exists set_api_keys_updated_at on public.api_keys;
create trigger set_api_keys_updated_at
  before update on public.api_keys
  for each row
  execute procedure public.set_updated_at();


-- =======================================================================
-- 4) games — kullanıcının ürettiği/kaydettiği oyunlar
-- =======================================================================
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  prompt text,
  html text,
  game_type text,
  model text,
  quality_score numeric,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ownership lookup (RLS'in kendisi de bunu kullanır) + "kullanıcının
-- oyunlarını en yeniden eskiye listele" (Game Library'nin en olası sorgu
-- deseni) için birleşik index. NOT (review round'unda düzeltildi): ayrı bir
-- idx_games_user_id (sadece user_id) EKLENMEDİ — api_keys'teki
-- api_keys_user_provider_unique İLE AYNI gerekçe: bu birleşik (user_id,
-- created_at desc) index'in EN SOLDAKİ kolonu zaten user_id olduğu için,
-- sadece user_id'ye göre filtreleme de bu index üzerinden (leftmost-prefix)
-- karşılanır — ayrı bir tek-kolonlu index GEREKSİZ/yinelenen olurdu.
create index if not exists idx_games_user_id_created_at
  on public.games (user_id, created_at desc);

alter table public.games enable row level security;

revoke all on public.games from public;
revoke all on public.games from anon;
grant select, insert, update, delete on public.games to authenticated;

drop policy if exists games_select_own on public.games;
create policy games_select_own on public.games
  for select
  using (auth.uid() = user_id);

drop policy if exists games_insert_own on public.games;
create policy games_insert_own on public.games
  for insert
  with check (auth.uid() = user_id);

drop policy if exists games_update_own on public.games;
create policy games_update_own on public.games
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists games_delete_own on public.games;
create policy games_delete_own on public.games
  for delete
  using (auth.uid() = user_id);

drop trigger if exists set_games_updated_at on public.games;
create trigger set_games_updated_at
  before update on public.games
  for each row
  execute procedure public.set_updated_at();


-- =======================================================================
-- 5) asset_libraries — kullanıcının yüklediği custom asset kütüphaneleri
-- =======================================================================
create table if not exists public.asset_libraries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  manifest jsonb not null default '{}'::jsonb,
  storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_asset_libraries_user_id
  on public.asset_libraries (user_id);

alter table public.asset_libraries enable row level security;

revoke all on public.asset_libraries from public;
revoke all on public.asset_libraries from anon;
grant select, insert, update, delete on public.asset_libraries to authenticated;

drop policy if exists asset_libraries_select_own on public.asset_libraries;
create policy asset_libraries_select_own on public.asset_libraries
  for select
  using (auth.uid() = user_id);

drop policy if exists asset_libraries_insert_own on public.asset_libraries;
create policy asset_libraries_insert_own on public.asset_libraries
  for insert
  with check (auth.uid() = user_id);

drop policy if exists asset_libraries_update_own on public.asset_libraries;
create policy asset_libraries_update_own on public.asset_libraries
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists asset_libraries_delete_own on public.asset_libraries;
create policy asset_libraries_delete_own on public.asset_libraries
  for delete
  using (auth.uid() = user_id);

drop trigger if exists set_asset_libraries_updated_at on public.asset_libraries;
create trigger set_asset_libraries_updated_at
  before update on public.asset_libraries
  for each row
  execute procedure public.set_updated_at();


-- =======================================================================
-- Yeni bir auth.users kaydı oluşunca otomatik, minimal bir profil satırı
-- ekleyen GÜVENLİ trigger/fonksiyon.
-- =======================================================================
-- SECURITY DEFINER: bu fonksiyon, çağıran kullanıcının (henüz insert
-- anında "authenticated" bile değil) DEĞİL, fonksiyonu YARATAN rolün
-- (migration'ı uygulayan, tipik olarak tablo sahibi) yetkisiyle çalışır —
-- bu yüzden profiles üzerindeki RLS'i (owner bypass eder) sorunsuz atlar.
-- `set search_path = public`: SECURITY DEFINER fonksiyonlarda ZORUNLU bir
-- güvenlik pratiği — search_path'in çağıran tarafından manipüle edilip
-- başka bir şemadaki kötü niyetli bir fonksiyon/objeye yönlendirilmesini
-- (search_path hijacking) engeller.
-- Bilerek MİNİMAL: sadece id + email kopyalanıyor (display_name/avatar_url
-- NULL kalır, kullanıcı sonra kendi dolduracak) — burada normalize/
-- doğrulama/ekstra iş mantığı YOK.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();
