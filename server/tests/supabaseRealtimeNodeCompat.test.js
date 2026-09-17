/**
 * NODE 18 PRODUCTION CRASH FIX — odaklı regresyon testleri.
 *
 * OLAY: Railway'de (Node 18) production deploy'u şu hatayla çöküyordu:
 *   "Node.js detected but native WebSocket not found."
 *   Stack: server/config/supabase.js:43
 *
 * KÖK NEDEN: @supabase/supabase-js'in createClient()'ı, Realtime HİÇ
 * kullanılmasa bile, çağrıldığı anda (constructor içinde, senkron) bir
 * RealtimeClient inşa eder. `realtime.transport` seçeneği verilmezse,
 * RealtimeClient'ın KENDİ constructor'ı native global bir `WebSocket`
 * constructor'ı bulmaya çalışır (@supabase/realtime-js
 * WebSocketFactory.getWebSocketConstructor) -- Node 18'de native global
 * `WebSocket` OLMADIĞI için (Node 22'ye kadar stabilize edilmedi) bu
 * arama hemen fırlatır.
 *
 * Bu dosya, Node 18'in "native global WebSocket yok" ortamını taklit
 * ederek (global.WebSocket/globalThis.WebSocket'i geçici olarak silerek)
 * üç `createClient()` çağrı noktasının HİÇBİRİNİN artık bu hatayı
 * fırlatmadığını doğrular -- bu test, fix OLMADAN (yani `realtime`
 * seçeneği çıkarılırsa) KIRILIR, bu yüzden gerçek bir regresyon testidir.
 *
 * Bu test ayrıca, bu simüle-Node-18 ortamında bile Auth/RLS/request-scoped
 * JWT ile ilgili hiçbir davranışın DEĞİŞMEDİĞİNİ (client'ların hâlâ
 * doğru url/anonKey/Authorization header ile kurulduğunu) doğrular --
 * yani fix'in SADECE Realtime'ın erken WebSocket aramasını devre dışı
 * bıraktığını, başka hiçbir şeyi etkilemediğini kanıtlar.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

var CONFIG_PATH = require.resolve("../config/supabase");
var GAME_PERSISTENCE_PATH = require.resolve("../services/gamePersistence");
var API_KEY_PERSISTENCE_PATH = require.resolve("../services/userApiKeyPersistence");

// Gerçek bir proje değil -- SADECE createClient()'ın URL-format doğrulamasını
// (isValidHttpUrl-benzeri kontrol) geçecek, ağa hiç gitmeyecek sahte bir
// değer. "sb_" ile BAŞLAMIYOR -- yani checkApiKeyFormat (supabase-js'in
// KENDİ, hiç throw etmeyen format kontrolü) burada devre dışı/no-op kalır,
// testi kirletecek bir console.warn bile üretmez.
var FAKE_URL = "https://example-project.supabase.co";
var FAKE_ANON_KEY = "test-anon-key-for-client-construction-only";
var FAKE_SERVICE_ROLE_KEY = "test-service-role-key-for-client-construction-only";

function withSimulatedNode18(fn) {
  // Node 18'in gerçekte SAHİP OLMADIĞI native global WebSocket'i (bu sandbox
  // Node 22 çalıştırıyor, bkz. dosya başı notu) geçici olarak kaldırıyoruz --
  // bu, "Node.js detected but native WebSocket not found." fırlatan
  // WebSocketFactory.detectEnvironment() kontrolünü GERÇEKÇİ şekilde tetikler.
  var hadGlobalWebSocket = Object.prototype.hasOwnProperty.call(global, "WebSocket");
  var originalGlobalWebSocket = global.WebSocket;
  var hadGlobalThisWebSocket = Object.prototype.hasOwnProperty.call(globalThis, "WebSocket");
  var originalGlobalThisWebSocket = globalThis.WebSocket;

  delete global.WebSocket;
  delete globalThis.WebSocket;

  var originalEnv = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  process.env.SUPABASE_URL = FAKE_URL;
  process.env.SUPABASE_ANON_KEY = FAKE_ANON_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = FAKE_SERVICE_ROLE_KEY;

  // config/supabase.js, çevresel değişkenleri module-top-level'da OKUYUP
  // serverClient'ı HEMEN inşa ediyor -- bu yüzden yeni env değerleriyle
  // GERÇEKTEN yeniden inşa edilmesi için require cache'ini bozmamız gerekiyor.
  delete require.cache[CONFIG_PATH];
  delete require.cache[GAME_PERSISTENCE_PATH];
  delete require.cache[API_KEY_PERSISTENCE_PATH];

  try {
    return fn();
  } finally {
    delete require.cache[CONFIG_PATH];
    delete require.cache[GAME_PERSISTENCE_PATH];
    delete require.cache[API_KEY_PERSISTENCE_PATH];

    process.env.SUPABASE_URL = originalEnv.SUPABASE_URL;
    process.env.SUPABASE_ANON_KEY = originalEnv.SUPABASE_ANON_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalEnv.SUPABASE_SERVICE_ROLE_KEY;

    if (hadGlobalWebSocket) global.WebSocket = originalGlobalWebSocket;
    if (hadGlobalThisWebSocket) globalThis.WebSocket = originalGlobalThisWebSocket;
  }
}

test("supabase.js: serverClient construction does not throw without native global WebSocket (Node 18 simulation)", function () {
  withSimulatedNode18(function () {
    var supabaseConfig;
    assert.doesNotThrow(function () {
      supabaseConfig = require("../config/supabase");
    }, "requiring config/supabase.js must not crash the process on Node 18 (no native WebSocket)");

    // Fix'in kendisi: isConfigured=true olduğunda serverClient GERÇEKTEN
    // kuruluyor olmalı (crash'ten kaçmak için null'a düşülmüş olmamalı).
    assert.equal(supabaseConfig.isConfigured, true);
    assert.ok(supabaseConfig.serverClient, "serverClient should be constructed, not null, once configured");
    assert.equal(supabaseConfig.publicConfig.supabaseUrl, FAKE_URL);
    assert.equal(supabaseConfig.publicConfig.supabaseAnonKey, FAKE_ANON_KEY);

    // REALTIME_DISABLED artık paylaşılan/dışa açık bir seçenek -- diğer iki
    // çağrı noktasının da aynı korumayı kullanabilmesi bu export'a bağlı.
    assert.equal(typeof supabaseConfig.REALTIME_DISABLED, "object");
    assert.equal(typeof supabaseConfig.REALTIME_DISABLED.transport, "function");
  });
});

test("supabase.js: the disabled Realtime transport placeholder throws only if Realtime is actually invoked", function () {
  withSimulatedNode18(function () {
    var supabaseConfig = require("../config/supabase");
    // Bu placeholder'ın KENDİSİ çağrılırsa (yani biri yanlışlıkla Realtime
    // kullanmaya kalkarsa) sessizce no-op OLMAMALI -- açık bir hata
    // fırlatmalı. Ama normal client kurulumu/kullanımı sırasında (Realtime
    // hiç invoke edilmediği için) HİÇ çağrılmaz -- bkz. yukarıdaki test.
    assert.throws(function () {
      supabaseConfig.REALTIME_DISABLED.transport();
    }, /Realtime is intentionally disabled/);
  });
});

test("gamePersistence.createRequestScopedClient does not throw without native global WebSocket (Node 18 simulation)", function () {
  withSimulatedNode18(function () {
    var gamePersistence = require("../services/gamePersistence");
    var client;
    assert.doesNotThrow(function () {
      client = gamePersistence._internal.createRequestScopedClient("fake-user-access-token");
    }, "creating a request-scoped games client must not crash on Node 18 (no native WebSocket)");
    assert.ok(client, "client should be constructed (Supabase is configured + a token was supplied)");
  });
});

test("userApiKeyPersistence.createRequestScopedClient does not throw without native global WebSocket (Node 18 simulation)", function () {
  withSimulatedNode18(function () {
    var userApiKeyPersistence = require("../services/userApiKeyPersistence");
    var client;
    assert.doesNotThrow(function () {
      client = userApiKeyPersistence._internal.createRequestScopedClient("fake-user-access-token");
    }, "creating a request-scoped API-key client must not crash on Node 18 (no native WebSocket)");
    assert.ok(client, "client should be constructed (Supabase is configured + a token was supplied)");
  });
});

test("gamePersistence request-scoped client still carries the caller's own Authorization JWT (RLS/auth behavior unchanged)", function () {
  withSimulatedNode18(function () {
    var gamePersistence = require("../services/gamePersistence");
    var client = gamePersistence._internal.createRequestScopedClient("caller-own-access-token-abc");
    // RLS'in auth.uid()'i doğru değerlendirmesi, bu client'ın Postgrest
    // isteklerine ÇAĞIRANIN KENDİ JWT'sini Authorization header'ı olarak
    // eklemesine bağlıdır -- Realtime fix'inin bunu BOZMADIĞINI doğruluyoruz.
    assert.equal(client.headers.Authorization, "Bearer caller-own-access-token-abc");
  });
});

test("userApiKeyPersistence request-scoped client still carries the caller's own Authorization JWT (RLS/auth behavior unchanged)", function () {
  withSimulatedNode18(function () {
    var userApiKeyPersistence = require("../services/userApiKeyPersistence");
    var client = userApiKeyPersistence._internal.createRequestScopedClient("caller-own-access-token-xyz");
    assert.equal(client.headers.Authorization, "Bearer caller-own-access-token-xyz");
  });
});
