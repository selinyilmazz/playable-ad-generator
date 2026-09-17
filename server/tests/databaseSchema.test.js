/**
 * PHASE 1 — AUTH & PERSISTENCE ARCHITECTURE: veritabanı migration'ı için
 * STATİK/YAPISAL testler.
 *
 * Bu proje şu ana kadar HİÇBİR canlı Postgres/Supabase bağlantısı
 * KULLANMIYOR (bkz. package.json — @supabase/supabase-js veya pg gibi
 * bir dependency YOK) — bu yüzden burada GERÇEK bir veritabanına
 * bağlanıp migration'ı ÇALIŞTIRAN bir test YAZILAMAZ/YAZILMADI (yeni bir
 * dependency veya kimlik bilgisi gerektirirdi, bu round'un kesin
 * kısıtlarına aykırı olurdu: "Do NOT expose or read any secrets").
 *
 * Onun yerine, bu testler migration SQL dosyasının METNİNİ okuyup, görev
 * tanımının GÜVENLİK gereksinimlerini (RLS açık, sahiplik bazlı policy'ler,
 * public/anon'a sızıntı yok, unique constraint, index'ler, updated_at
 * trigger'ları, profil oluşturma trigger'ı) YAPISAL olarak doğruluyor —
 * modelSelector.test.js'in "yanıt hiçbir secret İÇERMİYOR" testleriyle
 * AYNI felsefe: içerik/regex bazlı, network'süz, saf metin kontrolü.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

var MIGRATION_PATH = path.join(
  __dirname,
  "..",
  "..",
  "supabase",
  "migrations",
  "20260917010000_create_user_persistence_schema.sql"
);

var USER_OWNED_TABLES = ["profiles", "user_settings", "api_keys", "games", "asset_libraries"];

function readMigration() {
  return fs.readFileSync(MIGRATION_PATH, "utf8");
}

// Yorum satırlarını (-- ile başlayan) ATAR — bazı testler "kod olarak
// GERÇEKTEN ne yaptığını" kontrol ediyor; migration'ın kendi açıklayıcı
// yorumları (ör. "service_role için bypass YAZILMIYOR" notu) İÇİNDE
// geçen kelimeler YANLIŞ POZİTİF üretmesin diye.
function stripSqlComments(sql) {
  return sql
    .split("\n")
    .filter(function (line) {
      return !/^\s*--/.test(line);
    })
    .join("\n");
}

// Her bir "create policy <ad> ... ;" ifadesini AYRI AYRI çıkarır (bir
// sonraki policy'nin/tablonun içeriğine TAŞMADAN) — "to public"/"to anon"
// gibi kontrolleri, İLK "create policy"den metnin çok ilerisindeki
// alakasız bir eşleşmeye kadar YANLIŞLIKLA genişletmemek için.
function extractPolicyStatements(sql) {
  var matches = sql.match(/create policy\s+\S+[\s\S]*?;/gi);
  return matches || [];
}

test("migration dosyası beklenen konumda (supabase/migrations/) VAR", function () {
  assert.ok(fs.existsSync(MIGRATION_PATH), "Migration dosyası bulunamadı: " + MIGRATION_PATH);
});

test("migration: gen_random_uuid() için pgcrypto extension'ı açılıyor", function () {
  var sql = readMigration();
  assert.match(sql, /create extension if not exists "pgcrypto"/i);
});

USER_OWNED_TABLES.forEach(function (table) {
  test("migration: '" + table + "' tablosu create table if not exists ile TANIMLI", function () {
    var sql = readMigration();
    var re = new RegExp("create table if not exists public\\." + table + "\\s*\\(", "i");
    assert.match(sql, re);
  });

  test("migration: '" + table + "' tablosunda Row Level Security AÇIK", function () {
    var sql = readMigration();
    var re = new RegExp("alter table public\\." + table + " enable row level security", "i");
    assert.match(sql, re);
  });

  test("migration: '" + table + "' tablosu anon/public rollerinden AÇIKÇA revoke edilmiş (public'e açık DEĞİL)", function () {
    var sql = readMigration();
    var revokePublic = new RegExp("revoke all on public\\." + table + " from public", "i");
    var revokeAnon = new RegExp("revoke all on public\\." + table + " from anon", "i");
    assert.match(sql, revokePublic, table + " için 'from public' revoke satırı eksik");
    assert.match(sql, revokeAnon, table + " için 'from anon' revoke satırı eksik");
  });

  ["select", "insert", "update", "delete"].forEach(function (action) {
    test("migration: '" + table + "' için " + action.toUpperCase() + " policy'si auth.uid() ile SAHİPLİK kontrolü yapıyor", function () {
      var sql = readMigration();
      var policyName = table + "_" + action + "_own";
      // Policy bloğunu (create policy <ad> ... ile bir SONRAKİ ';' arasını)
      // yakala, İÇİNDE auth.uid() geçtiğini VE "using (true)" gibi
      // over-permissive bir ifade OLMADIĞINI doğrula.
      var blockRe = new RegExp("create policy " + policyName + "[\\s\\S]*?;", "i");
      var match = sql.match(blockRe);
      assert.ok(match, "Policy bulunamadı: " + policyName);
      assert.match(match[0], /auth\.uid\(\)/, policyName + " policy'si auth.uid() KULLANMIYOR");
    });
  });

  test("migration: '" + table + "' için updated_at trigger'ı VAR (paylaşılan set_updated_at() fonksiyonunu kullanıyor)", function () {
    var sql = readMigration();
    var re = new RegExp(
      "create trigger set_" + table + "_updated_at\\s+before update on public\\." + table +
        "[\\s\\S]*?execute procedure public\\.set_updated_at\\(\\)",
      "i"
    );
    assert.match(sql, re);
  });
});

test("migration: 'api_keys' tablosunda (user_id, provider) için UNIQUE constraint VAR (aynı kullanıcı+provider'a iki key yazılamaz)", function () {
  var sql = readMigration();
  assert.match(sql, /constraint\s+api_keys_user_provider_unique\s+unique\s*\(\s*user_id\s*,\s*provider\s*\)/i);
});

test("migration: 'api_keys.encrypted_key' PLACEHOLDER kolonu var, ama migration İÇİNDE hiçbir plaintext key/secret DEĞERİ YOK", function () {
  var sql = readMigration();
  assert.match(sql, /encrypted_key text not null/i);
  // GÜVENLİK: migration dosyasının kendisi, gerçek/örnek bir API key
  // formatına (OpenRouter "sk-or-...", OpenAI "sk-...", JWT "eyJ...")
  // BENZER hiçbir literal DEĞER içermemeli — sadece şema/placeholder.
  assert.equal(/sk-[a-z0-9-]{10,}/i.test(sql), false, "migration içinde bir API-key benzeri literal bulundu");
  assert.equal(/eyJ[a-zA-Z0-9_-]{10,}/.test(sql), false, "migration içinde bir JWT/token benzeri literal bulundu");
});

test("migration: her kullanıcı-sahipli tablo, user_id/id üzerinden auth.users(id)'e FOREIGN KEY ile bağlı (5 tablo x 1 referans)", function () {
  var sql = readMigration();
  var matches = sql.match(/references auth\.users\(id\)/gi) || [];
  assert.equal(matches.length, USER_OWNED_TABLES.length, "Beklenen auth.users(id) referans sayısı: " + USER_OWNED_TABLES.length);
});

test("migration: 'games' tablosunda (user_id, created_at) için birleşik index VAR (ownership + 'en yeni oyunlarım' sorgusu)", function () {
  var sql = readMigration();
  assert.match(sql, /create index if not exists idx_games_user_id_created_at\s+on public\.games \(user_id, created_at desc\)/i);
});

test("migration: 'games' tablosunda AYRI/yinelenen bir idx_games_user_id (sadece user_id) index'i YOK (review round'unda kaldırıldı — idx_games_user_id_created_at'in en soldaki kolonu zaten user_id, ayrı index gereksizdi)", function () {
  var sql = readMigration();
  assert.equal(/create index if not exists idx_games_user_id on public\.games \(user_id\)/i.test(sql), false);
});

test("migration: 'asset_libraries' tablosunda user_id için index VAR", function () {
  var sql = readMigration();
  assert.match(sql, /create index if not exists idx_asset_libraries_user_id\s+on public\.asset_libraries \(user_id\)/i);
});

test("migration: hiçbir policy over-permissive DEĞİL ('using (true)' veya benzeri koşulsuz izin YOK)", function () {
  var sql = readMigration();
  assert.equal(/using\s*\(\s*true\s*\)/i.test(sql), false, "Koşulsuz 'using (true)' policy bulundu — sahiplik kontrolü atlanmış olabilir");
  assert.equal(/with check\s*\(\s*true\s*\)/i.test(sql), false, "Koşulsuz 'with check (true)' policy bulundu");
});

test("migration: hiçbir policy anon/public rolüne YÖNELİK DEĞİL (policy'ler sadece auth.uid() sahiplik kontrolüyle çalışıyor, 'to anon'/'to public' YOK)", function () {
  var sql = readMigration();
  var policies = extractPolicyStatements(sql);
  assert.ok(policies.length >= USER_OWNED_TABLES.length * 4, "Beklenenden az create policy ifadesi bulundu");
  policies.forEach(function (statement) {
    assert.equal(/\bto\s+anon\b/i.test(statement), false, "Bir policy 'to anon' hedefliyor: " + statement.slice(0, 60));
    assert.equal(/\bto\s+public\b/i.test(statement), false, "Bir policy 'to public' hedefliyor: " + statement.slice(0, 60));
  });
});

test("migration: service_role için EK bir bypass/grant YOK (yorum satırları HARİÇ, GERÇEK kodda service_role'e hiç dokunulmuyor)", function () {
  var sql = readMigration();
  var codeOnly = stripSqlComments(sql);
  assert.equal(/service_role/i.test(codeOnly), false, "Migration'ın ÇALIŞAN SQL kodunda beklenmeyen bir service_role referansı bulundu");
  // Yorumlarda service_role'ün NEDEN elle ele alınmadığının belgelenmesi
  // beklenir (şeffaflık) — bu yüzden tam metinde geçmesi NORMAL/beklenen.
  assert.match(sql, /service_role/i, "Migration, service_role'ün platform seviyesinde ele alındığını yorumlarda belgelemiyor");
});

test("migration: 'profiles' için otomatik oluşturma trigger'ı (handle_new_user) GÜVENLİ şekilde tanımlı (security definer + sabit search_path)", function () {
  var sql = readMigration();
  var fnMatch = sql.match(/create or replace function public\.handle_new_user\(\)[\s\S]*?\$\$;/i);
  assert.ok(fnMatch, "handle_new_user() fonksiyonu bulunamadı");
  assert.match(fnMatch[0], /security definer/i, "handle_new_user() security definer DEĞİL");
  assert.match(fnMatch[0], /set search_path = public/i, "handle_new_user() sabit bir search_path AYARLAMIYOR (search_path hijacking riski)");
  assert.match(fnMatch[0], /insert into public\.profiles \(id, email\)/i, "handle_new_user() beklenenden FAZLA/FARKLI alan yazıyor olabilir");
  assert.match(fnMatch[0], /on conflict \(id\) do nothing/i, "handle_new_user() ON CONFLICT koruması YOK (duplicate insert hatası riski)");

  assert.match(
    sql,
    /create trigger on_auth_user_created\s+after insert on auth\.users[\s\S]*?execute procedure public\.handle_new_user\(\)/i,
    "on_auth_user_created trigger'ı auth.users üzerine doğru şekilde bağlanmamış"
  );
});

test("migration: dosya adı Supabase CLI'ın beklediği <timestamp>_<isim>.sql desenine UYUYOR", function () {
  var fileName = path.basename(MIGRATION_PATH);
  assert.match(fileName, /^\d{14}_[a-z0-9_]+\.sql$/);
});
