-- =====================================================================
-- PHASE 3 — PERSISTENT USER OPENROUTER API KEYS: ENCRYPTION-AT-REST SCHEMA
-- =====================================================================
--
-- Bu migration, 20260917010000_create_user_persistence_schema.sql'in
-- KENDİSİNİ DEĞİŞTİRMEZ (o dosya olduğu gibi kalır, idempotent/uygulanmış
-- durumda) — SADECE `public.api_keys` tablosunu, o migration'ın kendi
-- yorumunda açıkça "PLACEHOLDER, application code ASLA plaintext
-- yazmamalı" diye belgelenen `encrypted_key text` kolonundan, GERÇEK bir
-- AES-256-GCM şifreleme şemasına taşıyan, AYRI/ek bir migration.
--
-- MİMARİ (bkz. server/services/apiKeyCrypto.js):
--   - Uygulama-seviyesi authenticated encryption (AES-256-GCM), TEK bir
--     server-only master key (process.env.API_KEY_ENCRYPTION_KEY) ile.
--   - Her satır KENDİ, benzersiz 96-bit nonce'una sahip (AYNI key ile
--     nonce'un ASLA tekrar kullanılmaması GCM'in güvenliği için ZORUNLU).
--   - auth_tag, GCM'in kimlik doğrulama (bütünlük) etiketi — decrypt
--     sırasında ciphertext/nonce ÜZERİNDE herhangi bir bit oynaması bu
--     etiketin doğrulanmasını BAŞARISIZ kılar (tamper-evident).
--   - key_version, gelecekteki bir master-key rotasyonunun (eski/yeni
--     key'le şifrelenmiş satırların YAN YANA var olabilmesi için)
--     KENDİSİNİ şimdiden hazırlıyor — bu migration rotasyonun KENDİSİNİ
--     UYGULAMIYOR, sadece kolonu ekliyor (varsayılan: 1).
--
-- GÜVENLİK (DEĞİŞMEYEN, mevcut RLS/ownership modeli):
--   - RLS AÇIK kalıyor, HİÇBİR policy DEĞİŞMİYOR (api_keys_select_own/
--     insert_own/update_own/delete_own, hepsi auth.uid() = user_id).
--   - anon/public'e HİÇBİR ayrıcalık YOK (değişmedi).
--   - service_role için burada da YENİ bir bypass/policy YAZILMIYOR.
--   - unique(user_id, provider) KORUNUYOR.
--
-- "encrypted_key" kolonunun KALDIRILMASI GÜVENLİ midir?
--   Evet — o kolon, önceki migration'ın kendi yorumunun da açıkça
--   belirttiği gibi SADECE bir PLACEHOLDER'dı ve bu migration'a kadar
--   hiçbir uygulama kodu (server/routes, server/services) bu tabloya HİÇ
--   yazmıyordu (Phase 3'ün API/route/service katmanı bu migration'la
--   AYNI round'da, bu migration'dan SONRA devreye giriyor). Bu yüzden bu
--   kolonda GERÇEK/kullanılabilir bir secret olması YAPISAL OLARAK
--   mümkün değil — silinmesi hiçbir gerçek veriyi kaybetmez.
--
-- DETERMİNİZM: Yine de, ileride biri elle/bir test scriptiyle bu tabloya
-- placeholder bir satır yazmış olabileceği (çok düşük ama sıfır olmayan
-- bir ihtimal) göz önüne alınarak, aşağıdaki adımlar SIRAYLA:
--   1) Yeni (nullable) bytea/integer kolonları ekler.
--   2) Bu tabloda hâlâ duran HERHANGİ bir satırı temizler (bkz. yukarıdaki
--      gerekçe: böyle bir satır olsaydı bile, içindeki `encrypted_key`
--      GERÇEK bir şifreli key OLAMAZDI — bu yüzden silinmesi güvenlidir,
--      "gerçek kullanıcı verisi" kaybı SÖZ KONUSU DEĞİLDİR).
--   3) Yeni kolonları NOT NULL yapar (adım 2 sayesinde bu HER ZAMAN
--      başarılı olur — koşullu/belirsiz bir migration değildir).
--   4) `encrypted_key` kolonunu düşürür.
-- Bu sıralama, migration'ın (tablo boş olsun ya da olmasın) HER ZAMAN
-- aynı, öngörülebilir şekilde tamamlanmasını garanti eder.
-- =====================================================================

-- 1) Yeni kolonlar — başlangıçta nullable (adım 3'te NOT NULL yapılacak).
alter table public.api_keys
  add column if not exists key_version integer not null default 1,
  add column if not exists nonce bytea,
  add column if not exists auth_tag bytea,
  add column if not exists ciphertext bytea;

-- 2) Bu migration'dan ÖNCEKİ herhangi bir satırı temizle (yukarıdaki
-- "DETERMİNİZM" notuna bkz. — böyle bir satır varsa GERÇEK/kullanılabilir
-- bir şifreli key TAŞIYAMAZ, bu yüzden silinmesi güvenlidir).
delete from public.api_keys;

-- 3) Artık tablo (yapısal olarak) boş olduğu için bu NOT NULL kısıtları
-- HER ZAMAN başarıyla eklenir.
alter table public.api_keys
  alter column nonce set not null,
  alter column auth_tag set not null,
  alter column ciphertext set not null;

-- 4) Eski PLACEHOLDER kolonunu düşür — application code artık SADECE
-- nonce/auth_tag/ciphertext/key_version üzerinden yazar/okur.
alter table public.api_keys drop column if exists encrypted_key;

-- RLS/policy/trigger/unique constraint: HİÇBİRİNE DOKUNULMADI — hepsi
-- 20260917010000_create_user_persistence_schema.sql'de tanımlandığı gibi
-- (auth.uid() = user_id, unique(user_id, provider), set_api_keys_updated_at)
-- olduğu gibi kalıyor ve bu yeni kolonlarla birlikte de doğru çalışmaya
-- devam ediyor (hiçbiri policy ifadelerinde referans edilmiyor).
