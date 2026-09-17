/**
 * SUPABASE AUTHENTICATION FOUNDATION round — server/middleware/attachUser.js
 * için odaklı testler.
 *
 * Test ortamında (bu repo'nun CI/local test koşusunda) gerçek
 * SUPABASE_URL/SUPABASE_ANON_KEY env değişkenleri YOKTUR — yani
 * supabaseConfig.isConfigured HER ZAMAN false'tur. Bu, requirement'ın
 * "Supabase yapılandırılmamışsa middleware HİÇBİR ağ çağrısı yapmadan
 * anonim geçirir" davranışını test etmek için doğru/gerçek koşuldur;
 * ayrıca middleware'in HİÇBİR durumda (header yok/bozuk/rastgele) mevcut
 * route'ları BLOKLAMADIĞINI doğrular.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");

const supabaseConfig = require("../config/supabase");
const { attachUser } = require("../middleware/attachUser");

function startTestServer() {
  var app = express();
  app.use("/api", attachUser);
  // Var olan bir API route'unu simüle eden basit bir echo endpoint'i —
  // attachUser'ın req.user/req.userId'i nasıl doldurduğunu (veya
  // doldurmadığını) ve isteği hiçbir zaman reddetmediğini doğrulamak için.
  app.get("/api/echo", function (req, res) {
    res.json({ user: req.user, userId: req.userId });
  });
  return new Promise(function (resolve) {
    var server = app.listen(0, function () {
      resolve({ server: server, port: server.address().port });
    });
  });
}

function getJson(port, path, headers) {
  return new Promise(function (resolve, reject) {
    http
      .get({ hostname: "localhost", port: port, path: path, headers: headers || {} }, function (res) {
        var chunks = "";
        res.on("data", function (c) { chunks += c; });
        res.on("end", function () {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(chunks) });
          } catch (err) {
            reject(err);
          }
        });
      })
      .on("error", reject);
  });
}

test("test ortamında Supabase yapılandırılmamış (isConfigured=false) — bu dosyanın diğer testleri bu varsayıma dayanıyor", function () {
  assert.equal(supabaseConfig.isConfigured, false);
  assert.equal(supabaseConfig.serverClient, null);
});

test("attachUser: Authorization header YOK -> istek anonim geçer, req.user/req.userId null, 200 döner (reddedilmez)", async function () {
  var ctx = await startTestServer();
  try {
    var res = await getJson(ctx.port, "/api/echo");
    assert.equal(res.status, 200);
    assert.equal(res.body.user, null);
    assert.equal(res.body.userId, null);
  } finally {
    ctx.server.close();
  }
});

test("attachUser: Authorization header BOZUK (Bearer yok) -> istek yine de anonim geçer, 200 döner", async function () {
  var ctx = await startTestServer();
  try {
    var res = await getJson(ctx.port, "/api/echo", { Authorization: "not-a-bearer-token" });
    assert.equal(res.status, 200);
    assert.equal(res.body.user, null);
    assert.equal(res.body.userId, null);
  } finally {
    ctx.server.close();
  }
});

test("attachUser: Authorization: Bearer <rastgele/geçersiz token> -> Supabase yapılandırılmadığı için AĞ ÇAĞRISI YAPILMADAN anonim geçer, 200 döner", async function () {
  var ctx = await startTestServer();
  try {
    var res = await getJson(ctx.port, "/api/echo", { Authorization: "Bearer totally-invalid-or-expired-token" });
    assert.equal(res.status, 200);
    assert.equal(res.body.user, null);
    assert.equal(res.body.userId, null);
  } finally {
    ctx.server.close();
  }
});

test("attachUser: Authorization: Bearer <boş> -> anonim geçer, 200 döner", async function () {
  var ctx = await startTestServer();
  try {
    var res = await getJson(ctx.port, "/api/echo", { Authorization: "Bearer    " });
    assert.equal(res.status, 200);
    assert.equal(res.body.user, null);
    assert.equal(res.body.userId, null);
  } finally {
    ctx.server.close();
  }
});

test("attachUser: req.body.userId ASLA kullanılmıyor -- middleware kimliği yalnızca doğrulanmış token'dan türetiyor (yorum satırları HARİÇ, ÇALIŞAN kodda req.body'ye hiç referans yok)", function () {
  var src = require("node:fs").readFileSync(require.resolve("../middleware/attachUser"), "utf8");
  // Dosyanın üst dokümantasyon yorumu ("req.body.userId ASLA güvenilmez")
  // KASITLI olarak bu kelimeleri içeriyor (şeffaflık için) — bu yüzden
  // yorum bloklarını (/* ... */ ve //) ÇIKARIP sadece ÇALIŞAN kodu kontrol
  // ediyoruz (databaseSchema.test.js'teki stripSqlComments İLE AYNI fikir).
  var codeOnly = src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  assert.equal(/req\.body/.test(codeOnly), false, "attachUser.js'in ÇALIŞAN kodunda req.body'ye referans bulundu — kimlik ASLA body'den türetilmemeli");
});

test("attachUser: kaynak kodu access token'ı ASLA loglamıyor (console.log/console.error çağrılarında 'token' değişkeni yok)", function () {
  var src = require("node:fs").readFileSync(require.resolve("../middleware/attachUser"), "utf8");
  var logCalls = src.match(/console\.(log|error|warn|info)\([^)]*\)/g) || [];
  logCalls.forEach(function (call) {
    assert.equal(/token/i.test(call), false, "Bir console çağrısı token içeriyor olabilir: " + call);
  });
});

test("GET /api/auth/config: SADECE public-safe alanları döner (supabaseUrl/supabaseAnonKey/configured) — service role key ASLA yok", async function () {
  var authConfigRouter = require("../routes/authConfig");
  var app = express();
  app.use("/api", authConfigRouter);
  var server = app.listen(0);
  try {
    await new Promise(function (resolve) { server.on("listening", resolve); if (server.listening) resolve(); });
    var port = server.address().port;
    var res = await getJson(port, "/api/auth/config");
    assert.equal(res.status, 200);
    assert.deepEqual(Object.keys(res.body).sort(), ["configured", "supabaseAnonKey", "supabaseUrl"]);
    assert.equal(JSON.stringify(res.body).toLowerCase().indexOf("service") === -1, true);
  } finally {
    server.close();
  }
});
