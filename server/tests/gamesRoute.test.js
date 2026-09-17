/**
 * PERSISTENT MY GAMES round — server/routes/games.js + server/services/
 * gamePersistence.js için odaklı testler.
 *
 * Bu proje gerçek bir Postgres/Supabase/PostgREST bağlantısı OLMADAN test
 * ediliyor (package.json'da pg/supabase test-container dependency'si YOK,
 * databaseSchema.test.js İLE AYNI konvansiyon: statik/yapısal + mocklu
 * davranış testleri). Bu yüzden burada, gamePersistence.js'in KENDİ
 * query-inşa mantığını (ownership filtreleri, userId'nin HER ZAMAN
 * parametre olarak geldiği, service-role key'in ASLA kullanılmadığı)
 * doğrulayan MİNİMAL bir sahte (in-memory) Supabase query-builder
 * kullanılıyor — bkz. aşağıdaki createFakeSupabaseClient. Bu sahte client,
 * gamePersistence.js'in ZİNCİRLEDİĞİ .eq(...) filtrelerini OLDUĞU GİBİ
 * uygular (RLS'i taklit ETMİYOR, sadece kodun GERÇEKTEN hangi filtreleri
 * uyguladığını sadakatle yürütüyor) — bu yüzden "cross-user access denied"
 * testi, gamePersistence.js'in user_id filtresini GERÇEKTEN eklediğini
 * (bir regresyonla kaldırılırsa bu test KIRILIR) kanıtlıyor.
 *
 * RLS'in KENDİSİNİN (Postgres policy düzeyinde) doğru olduğu, önceki
 * round'da GERÇEK bir yerel Postgres 16 + stub auth şeması ile canlı
 * olarak doğrulanmıştı (migration review round) — o doğrulama burada
 * TEKRARLANMIYOR, sadece bu round'un YENİ kodu (route + service) test
 * ediliyor.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const express = require("express");

const gamePersistence = require("../services/gamePersistence");
const gamesRouter = require("../routes/games");

// ---------------------------------------------------------------------
// Sahte, in-memory Supabase query-builder. SADECE bu test dosyasında
// kullanılır (bkz. gamePersistence.js'teki "TEST SEAM" notu) — production
// kodunun HİÇBİR yerinde bu devreye girmez.
// ---------------------------------------------------------------------
var fakeIdCounter = 0;

function createFakeSupabaseClient(db) {
  function makeQuery(table) {
    var op = null;
    var filters = [];
    var writeValue = null;

    function applyFilters(rows) {
      return rows.filter(function (row) {
        return filters.every(function (f) { return row[f[0]] === f[1]; });
      });
    }

    function execute(mode) {
      return new Promise(function (resolve) {
        if (op === "select") {
          var rows = applyFilters(db[table]);
          if (mode === "single") {
            if (rows.length === 1) resolve({ data: rows[0], error: null });
            else resolve({ data: null, error: { message: "no rows", code: "PGRST116" } });
          } else if (mode === "maybeSingle") {
            resolve({ data: rows[0] || null, error: null });
          } else {
            resolve({ data: rows.slice(), error: null });
          }
        } else if (op === "insert") {
          var newRow = Object.assign(
            {
              id: "fake-id-" + ++fakeIdCounter,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            writeValue
          );
          db[table].push(newRow);
          resolve({ data: newRow, error: null });
        } else if (op === "update") {
          var matched = applyFilters(db[table]);
          matched.forEach(function (row) {
            Object.assign(row, writeValue, { updated_at: new Date().toISOString() });
          });
          if (mode === "single") {
            if (matched.length === 1) resolve({ data: matched[0], error: null });
            else resolve({ data: null, error: { message: "no rows", code: "PGRST116" } });
          } else {
            resolve({ data: matched, error: null });
          }
        } else if (op === "delete") {
          var toDelete = applyFilters(db[table]);
          db[table] = db[table].filter(function (row) { return toDelete.indexOf(row) === -1; });
          resolve({ data: toDelete, error: null });
        }
      });
    }

    var builder = {
      select: function () { if (!op) op = "select"; return builder; },
      insert: function (row) { op = "insert"; writeValue = row; return builder; },
      update: function (row) { op = "update"; writeValue = row; return builder; },
      delete: function () { op = "delete"; return builder; },
      eq: function (col, val) { filters.push([col, val]); return builder; },
      order: function () { return builder; },
      single: function () { return execute("single"); },
      maybeSingle: function () { return execute("maybeSingle"); },
      then: function (resolve, reject) { return execute(null).then(resolve, reject); },
    };
    return builder;
  }
  return { from: function (table) { return makeQuery(table); } };
}

function makeClientFactory(db) {
  var calls = [];
  return {
    calls: calls,
    factory: function (accessToken) {
      calls.push(accessToken);
      if (!accessToken) return null;
      return createFakeSupabaseClient(db);
    },
  };
}

function freshDb() {
  return { games: [] };
}

test.beforeEach(function () {
  gamePersistence._internal.resetClientFactoryForTests();
});

test.after(function () {
  gamePersistence._internal.resetClientFactoryForTests();
});

// ---------------------------------------------------------------------
// gamePersistence.js: doğrudan servis-katmanı testleri
// ---------------------------------------------------------------------

test("gamePersistence: aynı kullanıcının GET isteği SADECE kendi oyunlarını döner (authenticated GET isolation)", async function () {
  var db = freshDb();
  db.games.push({ id: "g1", user_id: "userA", title: "A1", metadata: {} });
  db.games.push({ id: "g2", user_id: "userB", title: "B1", metadata: {} });
  db.games.push({ id: "g3", user_id: "userA", title: "A2", metadata: {} });
  var cf = makeClientFactory(db);
  gamePersistence._internal.setClientFactoryForTests(cf.factory);

  var games = await gamePersistence.listGames("token-for-userA", "userA");
  assert.equal(games.length, 2);
  assert.ok(games.every(function (g) { return g.id === "g1" || g.id === "g3"; }));
  // İstek-bazlı client HER ZAMAN çağıranın KENDİ token'ıyla kuruldu.
  assert.deepEqual(cf.calls, ["token-for-userA"]);
});

test("gamePersistence: INSERT her zaman fonksiyona verilen userId'yi kullanır -- payload içindeki user_id/userId TAMAMEN yok sayılır (no client-supplied userId trust)", async function () {
  var db = freshDb();
  var cf = makeClientFactory(db);
  gamePersistence._internal.setClientFactoryForTests(cf.factory);

  var malicious = { title: "Hijack attempt", user_id: "attacker", userId: "attacker2", id: "client-chosen-id" };
  var created = await gamePersistence.createGame("token-for-userA", "userA", malicious);

  assert.equal(db.games[0].user_id, "userA", "insert edilen satırın user_id'si SADECE fonksiyon parametresinden gelmeli");
  assert.notEqual(created.id, "client-chosen-id", "server, client'ın verdiği id'yi ASLA kullanmamalı (görev: ID HANDLING)");
  assert.equal(created.title, "Hijack attempt");
});

test("gamePersistence: UPDATE sadece kendi oyununu günceller (authenticated UPDATE ownership) ve mevcut metadata'yı korur", async function () {
  var db = freshDb();
  db.games.push({
    id: "g1",
    user_id: "userA",
    title: "Old title",
    prompt: "p",
    html: "<html></html>",
    game_type: "platformer",
    model: "deepseek",
    quality_score: 80,
    metadata: { meta: { mock: true }, validation: { score: 80 }, titleIsCustom: false },
  });
  var cf = makeClientFactory(db);
  gamePersistence._internal.setClientFactoryForTests(cf.factory);

  // Rename benzeri KISMİ bir payload -- SADECE title/titleIsCustom.
  var updated = await gamePersistence.updateGame("token-for-userA", "userA", "g1", { title: "New title", titleIsCustom: true });
  assert.equal(updated.title, "New title");
  assert.equal(updated.titleIsCustom, true);
  // meta/validation DOKUNULMADAN korunmuş olmalı (görev: "Preserve existing
  // metadata unless intentionally updated").
  assert.deepEqual(updated.meta, { mock: true });
  assert.deepEqual(updated.validation, { score: 80 });
});

test("gamePersistence: DELETE sadece kendi oyununu siler (authenticated DELETE ownership)", async function () {
  var db = freshDb();
  db.games.push({ id: "g1", user_id: "userA", title: "A1", metadata: {} });
  var cf = makeClientFactory(db);
  gamePersistence._internal.setClientFactoryForTests(cf.factory);

  var deleted = await gamePersistence.deleteGame("token-for-userA", "userA", "g1");
  assert.equal(deleted, true);
  assert.equal(db.games.length, 0);
});

test("gamePersistence: cross-user erişim REDDEDİLİR -- userB, userA'nın oyununu ne güncelleyebilir ne silebilir ne de duplicate edebilir", async function () {
  var db = freshDb();
  db.games.push({ id: "g1", user_id: "userA", title: "A1", prompt: "p", html: "h", metadata: {} });
  var cf = makeClientFactory(db);
  gamePersistence._internal.setClientFactoryForTests(cf.factory);

  var updateResult = await gamePersistence.updateGame("token-for-userB", "userB", "g1", { title: "Hijacked" });
  assert.equal(updateResult, null, "userB, userA'nın oyununu GÜNCELLEYEMEMELİ (null -> route 404 döner)");

  var deleteResult = await gamePersistence.deleteGame("token-for-userB", "userB", "g1");
  assert.equal(deleteResult, false, "userB, userA'nın oyununu SİLEMEMELİ");

  var dupResult = await gamePersistence.duplicateGame("token-for-userB", "userB", "g1");
  assert.equal(dupResult, null, "userB, userA'nın oyununu DUPLICATE EDEMEMELİ");

  // userA'nın orijinal kaydı TAMAMEN dokunulmamış olmalı.
  assert.equal(db.games.length, 1);
  assert.equal(db.games[0].title, "A1");
});

test("gamePersistence: Supabase yapılandırılmamışsa/token yoksa PersistenceUnavailableError fırlatır (çökme yok)", async function () {
  // client factory'i test etmiyoruz burada -- gerçek createRequestScopedClient
  // (varsayılan) test ortamında zaten SUPABASE_URL/ANON_KEY olmadığı için
  // null döner (bkz. server/config/supabase.js).
  await assert.rejects(
    gamePersistence.listGames("some-token", "userA"),
    gamePersistence.PersistenceUnavailableError
  );
});

// ---------------------------------------------------------------------
// server/routes/games.js: HTTP katmanı testleri (fake attachUser + fake
// Supabase client factory ile)
// ---------------------------------------------------------------------

function startTestServer(db, opts) {
  opts = opts || {};
  var cf = makeClientFactory(db);
  gamePersistence._internal.setClientFactoryForTests(cf.factory);

  var app = express();
  app.use(express.json());
  // attachUser'ın GERÇEK doğrulama mantığını BURADA tekrar test ETMİYORUZ
  // (bkz. attachUser.test.js) -- sadece onun SONUCUNU (req.user/req.userId/
  // req.accessToken) simüle eden minimal bir sahte middleware. opts.userId
  // verilmezse istek TAMAMEN anonim (attachUser'ın gerçek anonim davranışıyla
  // AYNI: req.userId = null).
  app.use(function (req, res, next) {
    req.user = opts.userId ? { id: opts.userId, email: opts.userId + "@example.com" } : null;
    req.userId = opts.userId || null;
    req.accessToken = opts.userId ? "token-for-" + opts.userId : null;
    next();
  });
  app.use("/api", gamesRouter);

  return new Promise(function (resolve) {
    var server = app.listen(0, function () {
      resolve({ server: server, port: server.address().port, clientFactoryCalls: cf.calls });
    });
  });
}

function jsonRequest(port, method, path, body) {
  return new Promise(function (resolve, reject) {
    var data = body !== undefined ? JSON.stringify(body) : null;
    var req = http.request(
      { hostname: "localhost", port: port, path: path, method: method, headers: data ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) } : {} },
      function (res) {
        var chunks = "";
        res.on("data", function (c) { chunks += c; });
        res.on("end", function () {
          var parsed = null;
          try { parsed = chunks ? JSON.parse(chunks) : null; } catch (err) { parsed = null; }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

test("route: anonim istek (req.userId yok) TÜM /api/games endpoint'lerinde 401 döner, hiçbir persistence çağrısı yapılmaz (anonymous behavior)", async function () {
  var db = freshDb();
  var ctx = await startTestServer(db, {});
  try {
    var getRes = await jsonRequest(ctx.port, "GET", "/api/games");
    assert.equal(getRes.status, 401);
    var postRes = await jsonRequest(ctx.port, "POST", "/api/games", { title: "x" });
    assert.equal(postRes.status, 401);
    var putRes = await jsonRequest(ctx.port, "PUT", "/api/games/g1", { title: "x" });
    assert.equal(putRes.status, 401);
    var delRes = await jsonRequest(ctx.port, "DELETE", "/api/games/g1");
    assert.equal(delRes.status, 401);
    var dupRes = await jsonRequest(ctx.port, "POST", "/api/games/g1/duplicate");
    assert.equal(dupRes.status, 401);
    // 401 -- yukarıdaki hiçbir istek gerçek/sahte bir Supabase client'ı hiç
    // İSTEMEMELİ (requireAuth, gamePersistence'e ulaşmadan ÖNCE reddeder).
    assert.deepEqual(ctx.clientFactoryCalls, []);
  } finally {
    ctx.server.close();
  }
});

test("route: kimliği doğrulanmış kullanıcı kendi oyununu oluşturur/listeler/günceller/siler (tam CRUD akışı)", async function () {
  var db = freshDb();
  var ctx = await startTestServer(db, { userId: "userA" });
  try {
    var createRes = await jsonRequest(ctx.port, "POST", "/api/games", {
      title: "My Game", prompt: "a cat game", html: "<html></html>", meta: { mock: true }, validation: { valid: true, score: 90 }, gameType: "platformer", model: null, qualityScore: 90,
    });
    assert.equal(createRes.status, 201);
    var gameId = createRes.body.game.id;
    assert.ok(gameId);

    var listRes = await jsonRequest(ctx.port, "GET", "/api/games");
    assert.equal(listRes.status, 200);
    assert.equal(listRes.body.games.length, 1);

    var updateRes = await jsonRequest(ctx.port, "PUT", "/api/games/" + gameId, { title: "Renamed", titleIsCustom: true });
    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.game.title, "Renamed");

    var dupRes = await jsonRequest(ctx.port, "POST", "/api/games/" + gameId + "/duplicate");
    assert.equal(dupRes.status, 201);
    assert.notEqual(dupRes.body.game.id, gameId);

    var listAfterDup = await jsonRequest(ctx.port, "GET", "/api/games");
    assert.equal(listAfterDup.body.games.length, 2);

    var deleteRes = await jsonRequest(ctx.port, "DELETE", "/api/games/" + gameId);
    assert.equal(deleteRes.status, 204);

    var listAfterDelete = await jsonRequest(ctx.port, "GET", "/api/games");
    assert.equal(listAfterDelete.body.games.length, 1);
  } finally {
    ctx.server.close();
  }
});

test("route: bir kullanıcı BAŞKA bir kullanıcının oyununu güncelleyemez/silemez -- 404 döner (cross-user access denied, HTTP katmanı)", async function () {
  var db = freshDb();
  db.games.push({ id: "victim-game", user_id: "userA", title: "A's game", prompt: "", html: "", metadata: {} });
  var ctx = await startTestServer(db, { userId: "userB" });
  try {
    var updateRes = await jsonRequest(ctx.port, "PUT", "/api/games/victim-game", { title: "Hijacked" });
    assert.equal(updateRes.status, 404);
    var deleteRes = await jsonRequest(ctx.port, "DELETE", "/api/games/victim-game");
    assert.equal(deleteRes.status, 404);
    var dupRes = await jsonRequest(ctx.port, "POST", "/api/games/victim-game/duplicate");
    assert.equal(dupRes.status, 404);
    // Kurbanın kaydı DOKUNULMAMIŞ olmalı.
    assert.equal(db.games[0].title, "A's game");
  } finally {
    ctx.server.close();
  }
});

test("route: req.body içindeki bir userId/user_id alanı HİÇBİR ZAMAN kimlik olarak kullanılmaz (no client-supplied userId trust, HTTP katmanı)", async function () {
  var db = freshDb();
  var ctx = await startTestServer(db, { userId: "realUser" });
  try {
    var createRes = await jsonRequest(ctx.port, "POST", "/api/games", {
      title: "test", userId: "attacker", user_id: "attacker2",
    });
    assert.equal(createRes.status, 201);
    assert.equal(db.games[0].user_id, "realUser", "kayıt SADECE middleware'in doğruladığı req.userId'ye ait olmalı");
  } finally {
    ctx.server.close();
  }
});

test("kod incelemesi: routes/games.js ve services/gamePersistence.js HİÇBİR YERDE req.body.userId/req.body.user_id/req.query.userId OKUMUYOR (yorumlar hariç)", function () {
  ["../routes/games.js", "../services/gamePersistence.js"].forEach(function (rel) {
    var full = require.resolve(rel);
    var src = fs.readFileSync(full, "utf8");
    var codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    assert.equal(/req\.body\.user_?[Ii]d/.test(codeOnly), false, full + " içinde req.body'den bir userId okunuyor");
    assert.equal(/req\.query\.user_?[Ii]d/.test(codeOnly), false, full + " içinde req.query'den bir userId okunuyor");
  });
});

test("kod incelemesi: gamePersistence.js hiçbir yerde SUPABASE_SERVICE_ROLE_KEY okumuyor / service role client'ı kullanıcı CRUD'unda KULLANMIYOR", function () {
  var src = fs.readFileSync(require.resolve("../services/gamePersistence.js"), "utf8");
  // Dosyanın üst dokümantasyon yorumları KASITLI olarak "service role
  // KULLANILMAZ" gibi ifadeler içeriyor (şeffaflık için) -- bu yüzden
  // yorumları ÇIKARIP sadece ÇALIŞAN kodu kontrol ediyoruz (attachUser.
  // test.js'teki AYNI desen).
  var codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.equal(/SERVICE_ROLE/i.test(codeOnly), false, "gamePersistence.js'in ÇALIŞAN kodu service-role key'e referans içermemeli -- SADECE anon key ile İSTEK-BAZLI client kurmalı");
  assert.match(codeOnly, /supabaseConfig\.anonKey/, "gamePersistence.js anon key kullanmalı (request-scoped client)");
});

test("kod incelemesi: gamePersistence.js hiçbir console çağrısında access token'ı loglamıyor", function () {
  var src = fs.readFileSync(require.resolve("../services/gamePersistence.js"), "utf8");
  var logCalls = src.match(/console\.(log|error|warn|info)\([^)]*\)/g) || [];
  logCalls.forEach(function (call) {
    assert.equal(/accessToken|access_token/i.test(call), false, "Bir console çağrısı access token içeriyor olabilir: " + call);
  });
  var routeSrc = fs.readFileSync(require.resolve("../routes/games.js"), "utf8");
  var routeLogCalls = routeSrc.match(/console\.(log|error|warn|info)\([^)]*\)/g) || [];
  routeLogCalls.forEach(function (call) {
    assert.equal(/accessToken|access_token/i.test(call), false, "routes/games.js'te bir console çağrısı access token içeriyor olabilir: " + call);
  });
});
