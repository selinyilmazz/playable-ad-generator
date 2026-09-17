/**
 * PROMPT -> SPEC -> RUNTIME entegrasyonu — testler.
 *
 * 1) eligibility.js: keyword-skorlama saf mantığı (unit).
 * 2) specSchemaBridge.js: gerçek public/runtime/topdown/specSchema.js'i
 *    kullanan köprünün doğru çalıştığı (unit).
 * 3) buildHtml.js: derlenen tek-dosyalık HTML'in TEK DOSYA KURALI'na uyduğu
 *    ve gerçek runtime kaynağını içerdiği (unit).
 * 4) /api/generate uçtan uca (mock modda, generateRoute.test.js İLE AYNI
 *    teknik — ayrı bir Express app + Node http): eligible bir prompt için
 *    yeni topdown-runtime yolunun devreye girdiği VE mevcut alanların/
 *    testlerin (generateRoute.test.js) hiç bozulmadığı.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");

const { detectTopDownEligibility } = require("../services/topdown/eligibility");
const { normalizeSpec } = require("../services/topdown/specSchemaBridge");
const { buildTopDownHtml } = require("../services/topdown/buildHtml");
const { validatePlayable } = require("../services/validate");
const {
  resolveTopDownAssets,
  toAssetPaths,
  resolveTopDownGroundTile,
  resolveTopDownDecorationAssets,
  toGroundTilePath,
  toDecorationPaths,
} = require("../services/topdown/assetResolver");
const { generateWorldDecorations } = require("../services/topdown/worldDecorations");
const generateRouter = require("../routes/generate");
const {
  buildMockSpec,
  detectTheme,
  extractNumberNear,
  tokenize,
} = require("../services/topdown/mockSpecGenerator");

// ================== 1) ELIGIBILITY ==================

test("detectTopDownEligibility: 'forest survive zombies' tarzı bir prompt eligible=true döner", function () {
  var result = detectTopDownEligibility("A top-down game where you survive in a forest avoiding zombies for 30 seconds.");
  assert.equal(result.eligible, true);
  assert.ok(result.score > 0);
});

test("detectTopDownEligibility: platformer/racing/shooter gibi mevcut asset-kit türleri eligible=false döner", function () {
  var platformer = detectTopDownEligibility("A forest platformer where you jump between platforms.");
  var racing = detectTopDownEligibility("A racing game with cars on a track, drift to win.");
  var shooter = detectTopDownEligibility("A space shooter, shoot asteroids with your spaceship.");
  assert.equal(platformer.eligible, false);
  assert.equal(racing.eligible, false);
  assert.equal(shooter.eligible, false);
});

test("detectTopDownEligibility: hiçbir sinyal yoksa (boş/alakasız prompt) eligible=false döner (emin olmadığında tahmin etme)", function () {
  var result = detectTopDownEligibility("Just a random idea with no clear type.");
  assert.equal(result.eligible, false);
  assert.equal(result.score, 0);
});

test("detectTopDownEligibility: boş/undefined prompt çökmez, eligible=false döner", function () {
  assert.equal(detectTopDownEligibility("").eligible, false);
  assert.equal(detectTopDownEligibility(undefined).eligible, false);
});

// ================== 2) SPEC SCHEMA BRIDGE ==================

test("specSchemaBridge.normalizeSpec: Selin'in örnek spec'ini birebir kabul eder ve eksik alanları doldurur", function () {
  var raw = {
    gameType: "topDown",
    theme: "forest",
    player: { speed: 220, health: 3 },
    enemies: { count: 5, speed: 80 },
    world: { width: 2400, height: 1600 },
    goal: { type: "survive", duration: 30 },
  };
  var normalized = normalizeSpec(raw);
  assert.equal(normalized.theme, "forest");
  assert.equal(normalized.player.speed, 220);
  assert.equal(normalized.world.width, 2400);
  // eksik alanlar (lose, score, enemies.radius, ...) güvenli varsayılanla dolu:
  assert.equal(normalized.lose.type, "healthZero");
  assert.equal(typeof normalized.score.pointsPerSecond, "number");
});

test("specSchemaBridge.normalizeSpec: geçersiz/eksik alanlarda çökmez, sayısal alanlar güvenli varsayılana/aralığa düşer", function () {
  // NOT: theme, normalizeSpec seviyesinde bir enum'a karşı doğrulanmıyor
  // (bilinmeyen bir tema string'i olduğu gibi geçer) — bilinmeyen temayı
  // "neutral"a düşürmek renderer.js'in (getTheme()) işi, specSchema.js'in
  // DEĞİL. Bu, runtime'ın MEVCUT, değiştirilmemiş davranışı (bkz. Top-Down
  // Runtime QC turu) — burada sadece sayısal/negatif/NaN alanların güvenli
  // şekilde kelepçelendiği doğrulanıyor.
  var normalized = normalizeSpec({ theme: "not-a-real-theme", player: { speed: -999, health: NaN } });
  assert.equal(normalized.theme, "not-a-real-theme");
  assert.ok(normalized.player.speed > 0);
  assert.ok(normalized.player.health >= 1);
});

test("specSchemaBridge.normalizeSpec: undefined/null/garbage girdide çökmez", function () {
  assert.doesNotThrow(function () { normalizeSpec(undefined); });
  assert.doesNotThrow(function () { normalizeSpec(null); });
  assert.doesNotThrow(function () { normalizeSpec("not-an-object"); });
  assert.doesNotThrow(function () { normalizeSpec(42); });
});

// ================== 3) BUILD HTML ==================

test("buildTopDownHtml: TEK DOSYA KURALI'na uyar (<!DOCTYPE html> ile başlar, </html> ile biter) ve gerçek runtime kaynağını içerir", function () {
  var spec = normalizeSpec({ theme: "forest", goal: { type: "survive", duration: 30 } });
  var html = buildTopDownHtml(spec);

  assert.ok(html.trim().toLowerCase().indexOf("<!doctype html>") === 0);
  assert.ok(html.trim().toLowerCase().endsWith("</html>"));
  // Dış kaynak YOK — tamamen inline:
  assert.equal(/src\s*=\s*["']https?:\/\//i.test(html), false);
  assert.equal(/href\s*=\s*["']https?:\/\//i.test(html), false);
  // Gerçek runtime kodu (kopya/özet DEĞİL) inline edilmiş:
  assert.ok(html.indexOf("window.TopDownRuntime.create") !== -1 || html.indexOf("ns.create = create") !== -1);
  assert.ok(html.indexOf("TopDownRuntime.Utils") !== -1 || html.indexOf("ns.Utils = {") !== -1);
  // Spec JSON gömülü:
  assert.ok(html.indexOf('"theme":"forest"') !== -1);
});

test("buildTopDownHtml çıktısı mevcut validatePlayable() checks'lerinden GEÇER (kritik hiçbir check fail vermez)", function () {
  var spec = normalizeSpec({ theme: "dungeon", goal: { type: "survive", duration: 20 } });
  var html = buildTopDownHtml(spec);
  var validation = validatePlayable(html, "A dungeon survival game, avoid the monsters.");

  assert.equal(validation.valid, true, "Beklenmeyen kritik fail(ler): " + JSON.stringify(validation.checks.filter(function (c) { return c.critical && c.status === "fail"; })));
});

// ================== 4) /api/generate uçtan uca (mock modda) ==================

function startTestServer() {
  var previousKey = process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_API_KEY;

  var app = express();
  app.use(express.json({ limit: "2mb" }));
  app.use("/api", generateRouter);

  return new Promise(function (resolve) {
    var server = app.listen(0, function () {
      resolve({
        server: server,
        port: server.address().port,
        restore: function () {
          if (previousKey !== undefined) process.env.OPENROUTER_API_KEY = previousKey;
        },
      });
    });
  });
}

function postJson(port, path, body) {
  return new Promise(function (resolve, reject) {
    var data = JSON.stringify(body);
    var req = http.request(
      {
        hostname: "localhost",
        port: port,
        path: path,
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
      },
      function (res) {
        var chunks = "";
        res.on("data", function (c) { chunks += c; });
        res.on("end", function () {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(chunks) });
          } catch (err) {
            reject(err);
          }
        });
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

test("/api/generate (mock modda): eligible bir TopDown prompt -> pipeline='topdown-runtime', gerçek runtime HTML'i, valid=true", async function () {
  var ctx = await startTestServer();
  try {
    var res = await postJson(ctx.port, "/api/generate", {
      prompt: "A top-down game where you survive in a forest, avoiding zombies, for 30 seconds.",
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.meta.pipeline, "topdown-runtime");
    assert.equal(res.body.meta.mock, true);
    assert.equal(res.body.meta.gameType, null);
    assert.equal(res.body.meta.assetKit, null);
    assert.equal(res.body.meta.gameSpec.theme, "forest");
    assert.equal(typeof res.body.html, "string");
    assert.ok(res.body.html.indexOf("window.TopDownRuntime") !== -1 || res.body.html.indexOf("TopDownRuntime.create") !== -1);
    assert.equal(res.body.validation.valid, true);
  } finally {
    ctx.restore();
    ctx.server.close();
  }
});

test("/api/generate (mock modda): eligible OLMAYAN (space-shooter) bir prompt mevcut Free-HTML akışına düşer — REGRESSION", async function () {
  var ctx = await startTestServer();
  try {
    var res = await postJson(ctx.port, "/api/generate", { prompt: "Create a 5-second space shooter game with asteroids." });

    assert.equal(res.status, 200);
    // generateRoute.test.js'teki AYNI beklenti — hiç değişmedi:
    assert.equal(res.body.meta.gameType, "space-shooter");
    assert.equal(res.body.meta.assetKit.key, "space-shooter");
    // Yeni alan bu yolda YOK (undefined) — topdown dalı hiç çalışmadı:
    assert.equal(res.body.meta.pipeline, undefined);
  } finally {
    ctx.restore();
    ctx.server.close();
  }
});

test("/api/generate (mock modda): eligible OLMAYAN (alakasız) bir prompt mevcut davranışı korur — REGRESSION", async function () {
  var ctx = await startTestServer();
  try {
    var res = await postJson(ctx.port, "/api/generate", { prompt: "Just a random idea with no clear type." });
    assert.equal(res.status, 200);
    assert.equal(res.body.meta.gameType, null);
    assert.equal(res.body.meta.assetKit, null);
    assert.equal(res.body.meta.pipeline, undefined);
  } finally {
    ctx.restore();
    ctx.server.close();
  }
});

test("/api/generate: boş prompt hâlâ 400 döner (mevcut davranış değişmedi) — REGRESSION", async function () {
  var ctx = await startTestServer();
  try {
    var res = await postJson(ctx.port, "/api/generate", { prompt: "" });
    assert.equal(res.status, 400);
  } finally {
    ctx.restore();
    ctx.server.close();
  }
});

// ================== 5) ASSET LIBRARY -> TOPDOWN (assetResolver.js) ==================

test("resolveTopDownAssets: 'forest' teması -> forest-platformer kitinden GERÇEK, kategorisi doğru asset'ler döner", function () {
  var resolved = resolveTopDownAssets("forest");
  assert.equal(resolved.player.id, "sunnyland_player");
  // enemy/obstacle, forest-platformer'ın TEK "obstacle" havuzundan GERÇEK
  // category alanına göre ayrıştırılmış olmalı (bkz. assetResolver.js notu):
  assert.equal(resolved.enemy.category, "enemy");
  assert.equal(resolved.obstacle.category, "obstacle");
  assert.ok(resolved.collectible);
  assert.equal(resolved.collectible.category, "collectible");
  assert.equal(resolved.background.category, "background");
});

test("resolveTopDownAssets: 'dungeon' teması -> dungeon-rpg kitinden asset'ler döner; pakette gerçek bir 'obstacle' kategorisi YOK, wall tile'a düşer; background pakette hiç yok -> null (uydurulmaz)", function () {
  var resolved = resolveTopDownAssets("dungeon");
  assert.equal(resolved.player.category, "character");
  assert.equal(resolved.enemy.category, "enemy");
  // dungeon-rpg'nin obstacle-rolü havuzu SADECE enemy category taşıyor —
  // bu yüzden fallback zinciri (bkz. pickObstacleAsset) devreye girmeli:
  assert.equal(resolved.obstacle.id, "tinydungeon_tile_wall");
  assert.equal(resolved.collectible.category, "collectible");
  // dungeon-rpg kitinin KENDİ missingRoles'ü zaten background'ı "yok" diyor
  // — burada da uydurulmadan null kalmalı (primitive fallback).
  assert.equal(resolved.background, null);
});

test("resolveTopDownAssets: 'space' teması -> space-shooter kitinden GERÇEK, enemy/obstacle (asteroid) doğru ayrıştırılmış asset'ler döner", function () {
  var resolved = resolveTopDownAssets("space");
  assert.equal(resolved.player.category, "character");
  assert.equal(resolved.enemy.category, "enemy");
  // "obstacle" havuzu hem enemy hem asteroid içeriyor — category filtresi
  // asteroid'i (gerçek category:"obstacle") doğru seçmeli, bir enemy gemisi
  // DEĞİL.
  assert.equal(resolved.obstacle.category, "obstacle");
  assert.ok(/asteroid/.test(resolved.obstacle.id));
  assert.equal(resolved.background.category, "background");
});

test("resolveTopDownAssets: 'neutral'/bilinmeyen/undefined tema -> TÜM roller null (uydurulmaz, primitive fallback güvenli)", function () {
  ["neutral", "not-a-real-theme", undefined, null, 42].forEach(function (theme) {
    var resolved = resolveTopDownAssets(theme);
    assert.equal(resolved.player, null);
    assert.equal(resolved.enemy, null);
    assert.equal(resolved.collectible, null);
    assert.equal(resolved.obstacle, null);
    assert.equal(resolved.background, null);
  });
});

test("toAssetPaths: resolveTopDownAssets()'in çıktısını düz { role: url|null } haritasına indirger", function () {
  var paths = toAssetPaths(resolveTopDownAssets("forest"));
  assert.equal(paths.player, "/assets/packs/sunnyland-forest/characters/player.png");
  assert.equal(typeof paths.enemy, "string");
  assert.equal(typeof paths.collectible, "string");
  assert.equal(typeof paths.obstacle, "string");
  assert.equal(typeof paths.background, "string");

  var neutralPaths = toAssetPaths(resolveTopDownAssets("neutral"));
  assert.equal(neutralPaths.player, null);
  assert.equal(neutralPaths.background, null);
});

test("/api/generate (mock modda): eligible bir FOREST TopDown prompt -> spec.assets gerçek, erişilebilir asset yollarıyla dolu ve üretilen HTML'e gömülü", async function () {
  var ctx = await startTestServer();
  try {
    var res = await postJson(ctx.port, "/api/generate", {
      prompt: "A top-down game where you survive in a forest, avoiding zombies, for 30 seconds.",
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.meta.gameSpec.theme, "forest");
    var assets = res.body.meta.gameSpec.assets;
    assert.equal(assets.player, "/assets/packs/sunnyland-forest/characters/player.png");
    assert.equal(typeof assets.enemy, "string");
    assert.equal(typeof assets.collectible, "string");
    assert.equal(typeof assets.obstacle, "string");
    assert.equal(typeof assets.background, "string");
    // Gömülü spec JSON'ında da GERÇEKTEN yer alıyor (buildHtml.js'in
    // JSON.stringify'ı üzerinden) — sadece meta'da değil, runtime'ın
    // fiilen alacağı spec'in içinde de:
    assert.ok(res.body.html.indexOf(assets.player) !== -1);
    // assets.js runtime dosyası da TEK DOSYA HTML'e inline edilmiş olmalı:
    assert.ok(res.body.html.indexOf("ns.AssetLoader = AssetLoader") !== -1);
  } finally {
    ctx.restore();
    ctx.server.close();
  }
});

test("/api/generate (mock modda): eligible OLMAYAN bir prompt akışında meta.gameSpec hiç YOK — REGRESSION (asset resolver Free-HTML yoluna hiç karışmaz)", async function () {
  var ctx = await startTestServer();
  try {
    var res = await postJson(ctx.port, "/api/generate", { prompt: "Create a 5-second space shooter game with asteroids." });
    assert.equal(res.status, 200);
    assert.equal(res.body.meta.gameSpec, undefined);
  } finally {
    ctx.restore();
    ctx.server.close();
  }
});

// ================== 6) MOCK SPEC GENERATOR — SPEC CONTENT EXTRACTION ==================
// Doğal dil promptundaki AÇIKÇA belirtilen içerik (enemy/collectible/
// obstacle count, goal, theme) gerçekten mock Game Spec'e aktarılıyor mu?

test("tokenize: Türkçe karakterleri (ı, ğ, ş, ü, ö, ç) bozmadan kelime bazında ayırır", function () {
  var tokens = tokenize("ormanda 10 altın ve 5 zombi var");
  assert.ok(tokens.indexOf("altın") !== -1, "altın kelimesi bozulmadan token olarak bulunmalı: " + JSON.stringify(tokens));
  assert.ok(tokens.indexOf("ormanda") !== -1);
  assert.ok(tokens.indexOf("10") !== -1);
});

test("extractNumberNear: sayı token'ından hemen sonraki pencerede eşleşen anahtar kelime varsa sayıyı döner", function () {
  var tokens = tokenize("ormanda 5 zombi bulunuyor");
  assert.equal(extractNumberNear(tokens, ["zombi", "zombiler"]), 5);
});

test("extractNumberNear: eşleşen anahtar kelime YOKSA null döner (hiçbir şey uydurulmaz)", function () {
  var tokens = tokenize("sakin bir orman manzarası");
  assert.equal(extractNumberNear(tokens, ["zombi", "düşman"]), null);
});

test("extractNumberNear: yazıyla yazılmış sayılar ('beş') KAPSAM DIŞI — bilinçli olarak null döner (basit/güvenli extraction)", function () {
  var tokens = tokenize("ormanda beş zombi var");
  assert.equal(extractNumberNear(tokens, ["zombi"]), null);
});

test("detectTheme: forest/dungeon/space/neutral hâlâ doğru tespit ediliyor (bu round'da davranış değişmedi)", function () {
  assert.equal(detectTheme("a forest survival game"), "forest");
  assert.equal(detectTheme("zindanda hayatta kal"), "dungeon");
  assert.equal(detectTheme("uzayda hayatta kal"), "space");
  assert.equal(detectTheme("hiçbir tema ipucu yok"), "neutral");
});

test("buildMockSpec: kullanıcının örnek promptu ('Ormanda 5 zombi ve 10 altın...') -> theme=forest, enemies.count=5, 10 collectible, goal=survive, lose=healthZero", function () {
  var spec = buildMockSpec("Ormanda 5 zombi ve 10 altın bulunan bir hayatta kalma oyunu yap.");
  assert.equal(spec.theme, "forest");
  assert.deepEqual(spec.enemies, { count: 5 });
  assert.equal(spec.collectibles.length, 10);
  spec.collectibles.forEach(function (p) {
    assert.equal(typeof p.x, "number");
    assert.equal(typeof p.y, "number");
  });
  assert.equal(spec.obstacles.length, 0);
  assert.equal(spec.goal.type, "survive");
  assert.deepEqual(spec.lose, { type: "healthZero" });
});

test("buildMockSpec: obstacle count da (İngilizce/Türkçe anahtar kelimelerle) çıkarılıp yerleştiriliyor", function () {
  var spec = buildMockSpec("A dungeon game with 6 rocks blocking the way and 4 gems to collect.");
  assert.equal(spec.obstacles.length, 6);
  assert.equal(spec.collectibles.length, 4);
});

test("buildMockSpec: hiçbir açık sayı/goal sinyali YOKSA hiçbir şey UYDURULMAZ (enemies alanı hiç set edilmez, collectibles/obstacles boş kalır, goal default 'survive')", function () {
  var spec = buildMockSpec("A top-down game where you survive, avoiding danger.");
  assert.equal(spec.enemies, undefined);
  assert.deepEqual(spec.collectibles, []);
  assert.deepEqual(spec.obstacles, []);
  assert.equal(spec.goal.type, "survive");
});

test("buildMockSpec: goal type önceliği -> 'eliminate' anahtar kelimesi varsa 'eliminate' seçilir", function () {
  var spec = buildMockSpec("A forest game where you eliminate all zombies.");
  assert.equal(spec.goal.type, "eliminate");
});

test("buildMockSpec: goal type önceliği -> 'topla' + collectible varsa 'collect' seçilir (collectible YOKSA asla 'collect' seçilmez, ulaşılamaz hedef üretilmez)", function () {
  var withCollectibles = buildMockSpec("Ormanda 8 altın toplaman gereken bir oyun.");
  assert.equal(withCollectibles.goal.type, "collect");

  var withoutCollectibles = buildMockSpec("Ormanda altın toplaman gereken bir oyun."); // sayı yok -> collectibles üretilmez
  assert.equal(withoutCollectibles.collectibles.length, 0);
  assert.notEqual(withoutCollectibles.goal.type, "collect");
});

test("buildMockSpec: goal type önceliği -> 'puan/skor' anahtar kelimesi varsa 'score' seçilir", function () {
  var spec = buildMockSpec("A space game where you score as many points as possible.");
  assert.equal(spec.goal.type, "score");
});

test("buildMockSpec: süre ('saniye'/'seconds') ve hedef skor ('puan'/'points') sayıları da doğru çıkarılır", function () {
  var durationSpec = buildMockSpec("Survive for 45 seconds in the forest.");
  assert.equal(durationSpec.goal.duration, 45);

  var scoreSpec = buildMockSpec("Score 200 points in the dungeon.");
  assert.equal(scoreSpec.goal.targetScore, 200);
});

test("buildMockSpec: PLACEMENT GÜVENLİĞİ -> üretilen TÜM collectible/obstacle noktaları world sınırları içinde ve player spawn (world merkezi) etrafında bir dışlama bölgesinde HİÇ nokta yok", function () {
  var spec = buildMockSpec("Ormanda 12 zombi, 15 altın ve 9 kaya olan bir oyun.");
  var WORLD_W = 2000, WORLD_H = 1400;
  var centerX = WORLD_W / 2, centerY = WORLD_H / 2;
  var SPAWN_EXCLUSION_RADIUS = 220;

  spec.collectibles.concat(spec.obstacles).forEach(function (p) {
    assert.ok(p.x >= 0 && p.x <= WORLD_W, "x world sınırları içinde olmalı: " + JSON.stringify(p));
    assert.ok(p.y >= 0 && p.y <= WORLD_H, "y world sınırları içinde olmalı: " + JSON.stringify(p));
    var dist = Math.sqrt(Math.pow(p.x - centerX, 2) + Math.pow(p.y - centerY, 2));
    assert.ok(dist >= SPAWN_EXCLUSION_RADIUS - 1, "player spawn noktası bloklanmamalı: " + JSON.stringify(p) + " dist=" + dist);
  });
});

test("buildMockSpec: aynı prompt HER ZAMAN aynı Spec'i üretir (deterministik — Math.random YOK)", function () {
  var prompt = "Ormanda 7 zombi ve 6 altın olan bir oyun.";
  var spec1 = buildMockSpec(prompt);
  var spec2 = buildMockSpec(prompt);
  assert.deepEqual(spec1, spec2);
});

test("/api/generate (mock modda): kullanıcının örnek promptu ile UÇTAN UCA gerçek Spec kontrolü (theme/enemies/collectibles/goal/lose/assets)", async function () {
  var ctx = await startTestServer();
  try {
    var res = await postJson(ctx.port, "/api/generate", {
      prompt: "Ormanda 5 zombi ve 10 altın bulunan bir hayatta kalma oyunu yap.",
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.meta.pipeline, "topdown-runtime");
    var spec = res.body.meta.gameSpec;
    assert.equal(spec.theme, "forest");
    assert.equal(spec.enemies.count, 5);
    assert.equal(spec.collectibles.length, 10);
    assert.equal(spec.goal.type, "survive");
    assert.equal(spec.lose.type, "healthZero");
    // Asset Library round'undan gelen davranış — theme'e göre otomatik
    // resolve edilmiş, GERÇEK asset yolları (bu round'da DOKUNULMADI):
    assert.equal(typeof spec.assets.player, "string");
    assert.equal(typeof spec.assets.enemy, "string");
    assert.equal(typeof spec.assets.collectible, "string");
  } finally {
    ctx.restore();
    ctx.server.close();
  }
});

test("/api/generate (mock modda): açık sayılı bir DUNGEON TopDown promptu -> theme=dungeon, enemies.count doğru, collectible/obstacle çakışmadan (obstacle içine collectible yerleşmeden) sanitize sonrası da tam sayıda hayatta kalır", async function () {
  var ctx = await startTestServer();
  try {
    var res = await postJson(ctx.port, "/api/generate", {
      prompt: "Zindanda 8 canavardan kaçarak hayatta kaldığın, 6 kaya engeli ve 4 elmas olan bir oyun.",
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.meta.pipeline, "topdown-runtime");
    var spec = res.body.meta.gameSpec;
    assert.equal(spec.theme, "dungeon");
    assert.equal(spec.enemies.count, 8);
    assert.equal(spec.obstacles.length, 6);
    assert.equal(spec.collectibles.length, 4);
    // dungeon-rpg paketinin bilinen boşluğu (background yok) korunmalı:
    assert.equal(spec.assets.background, null);

    // Güvenlik: sanitize SONRASI hiçbir collectible bir obstacle'ın içinde
    // değil (specSchema.js'in obstacle-önce-collectible sırası + filtreleme
    // mantığı, bu round'un ürettiği zengin veriyle de doğru çalışıyor).
    spec.collectibles.forEach(function (c) {
      spec.obstacles.forEach(function (o) {
        var insideX = c.x >= o.x - o.width / 2 && c.x <= o.x + o.width / 2;
        var insideY = c.y >= o.y - o.height / 2 && c.y <= o.y + o.height / 2;
        assert.ok(!(insideX && insideY), "collectible bir obstacle'ın içinde kalmamalı: " + JSON.stringify({ c: c, o: o }));
      });
    });
  } finally {
    ctx.restore();
    ctx.server.close();
  }
});

// ================== 7) WORLD RENDERING & CAMERA VISUAL OVERHAUL ==================

test("resolveTopDownGroundTile: 'dungeon' teması -> tinydungeon_tile_floor (platform rolünden, GERÇEK, manifestte var olan bir asset)", function () {
  var asset = resolveTopDownGroundTile("dungeon");
  assert.ok(asset);
  assert.equal(asset.id, "tinydungeon_tile_floor");
  assert.equal(toGroundTilePath(asset), "/assets/packs/tiny-dungeon/tiles/floor.png");
});

test("resolveTopDownGroundTile: 'space' teması -> background rolünden GERÇEK bir starfield asset'i (dungeon'ın platform'undan FARKLI bir role bakıyor)", function () {
  var asset = resolveTopDownGroundTile("space");
  assert.ok(asset);
  assert.equal(asset.category, "background");
  assert.equal(typeof toGroundTilePath(asset), "string");
});

test("resolveTopDownGroundTile: 'forest' teması -> BİLEREK null (background rolündeki 3 asset yan-bakış platformer parallax katmanı, top-down zeminde tekrarlanmaya uygun DEĞİL — renderer.js primitive/prosedürel zemine güvenle düşer)", function () {
  assert.equal(resolveTopDownGroundTile("forest"), null);
});

test("resolveTopDownGroundTile: 'neutral'/bilinmeyen/undefined tema -> null (uydurulmaz)", function () {
  ["neutral", "not-a-real-theme", undefined, null, 42].forEach(function (theme) {
    assert.equal(resolveTopDownGroundTile(theme), null);
  });
});

test("resolveTopDownDecorationAssets: 'forest' teması -> forest-platformer'ın decoration havuzu, obstacle havuzundan (rock/tree) TAMAMEN AYRI/farklı id'ler", function () {
  var decorations = resolveTopDownDecorationAssets("forest");
  assert.ok(decorations.length > 0);
  var ids = decorations.map(function (a) { return a.id; });
  assert.ok(ids.indexOf("sunnyland_rock") === -1, "obstacle rolündeki rock decoration'a KARIŞMAMALI");
  assert.ok(ids.indexOf("sunnyland_tree") === -1, "obstacle rolündeki tree decoration'a KARIŞMAMALI");
});

test("resolveTopDownDecorationAssets: 'dungeon' teması -> dungeon-rpg'nin decoration havuzu, obstacle (enemy) havuzundan AYRI", function () {
  var decorations = resolveTopDownDecorationAssets("dungeon");
  assert.ok(decorations.length > 0);
  decorations.forEach(function (a) {
    assert.notEqual(a.category, "enemy", "dekorasyon havuzunda bir düşman sprite'ı OLMAMALI");
  });
});

test("resolveTopDownDecorationAssets: 'space'/'neutral'/bilinmeyen tema -> boş dizi (bu kitlerde/temalarda hiç 'decoration' rolü tanımlı değil, uydurulmaz)", function () {
  ["space", "neutral", "not-a-real-theme", undefined].forEach(function (theme) {
    assert.deepEqual(resolveTopDownDecorationAssets(theme), []);
  });
});

test("toDecorationPaths: asset objelerini düz path string dizisine indirger, path'i olmayanları sessizce atlar", function () {
  var paths = toDecorationPaths(resolveTopDownDecorationAssets("forest"));
  assert.ok(paths.length > 0);
  paths.forEach(function (p) {
    assert.equal(typeof p, "string");
    assert.ok(p.length > 0);
  });
});

test("generateWorldDecorations: AYNI girdi HER ZAMAN aynı çıktıyı üretir (deterministik — Math.random YOK)", function () {
  var world = { width: 2000, height: 1400, tileSize: 64 };
  var obstacles = [{ x: 500, y: 500, width: 64, height: 64 }];
  var collectibles = [{ x: 800, y: 800, radius: 12 }];
  var assets = ["/a.png", "/b.png"];

  var d1 = generateWorldDecorations(world, obstacles, collectibles, assets);
  var d2 = generateWorldDecorations(world, obstacles, collectibles, assets);
  assert.deepEqual(d1, d2);
  assert.ok(d1.length > 0, "makul bir dünyada en az bir dekorasyon üretilmeli");
});

test("generateWorldDecorations: decorationAssets boşsa (o tema/kit için hiç decoration yoksa) boş dizi döner", function () {
  var world = { width: 2000, height: 1400, tileSize: 64 };
  assert.deepEqual(generateWorldDecorations(world, [], [], []), []);
  assert.deepEqual(generateWorldDecorations(world, [], [], null), []);
});

test("generateWorldDecorations: player spawn'ın (world merkezi) etrafındaki dışlama bölgesine HİÇ dekorasyon yerleştirmez", function () {
  var world = { width: 2000, height: 1400, tileSize: 64 };
  var decorations = generateWorldDecorations(world, [], [], ["/a.png"]);
  var centerX = world.width / 2, centerY = world.height / 2;
  var SPAWN_EXCLUSION_RADIUS = 240;
  decorations.forEach(function (d) {
    var dist = Math.sqrt(Math.pow(d.x - centerX, 2) + Math.pow(d.y - centerY, 2));
    assert.ok(dist >= SPAWN_EXCLUSION_RADIUS, "spawn dışlama bölgesi ihlal edildi: " + JSON.stringify(d) + " dist=" + dist);
  });
});

test("generateWorldDecorations: obstacle/collectible'ların üzerine (margin dahil) HİÇ dekorasyon bindirmez, world sınırları içinde kalır", function () {
  var world = { width: 2000, height: 1400, tileSize: 64 };
  var obstacles = [{ x: 300, y: 900, width: 80, height: 80 }, { x: 1200, y: 300, width: 64, height: 64 }];
  var collectibles = [{ x: 1600, y: 1000, radius: 12 }];
  var decorations = generateWorldDecorations(world, obstacles, collectibles, ["/a.png", "/b.png", "/c.png"]);

  assert.ok(decorations.length > 0);
  decorations.forEach(function (d) {
    assert.ok(d.x >= 0 && d.x <= world.width, "world sınırları içinde olmalı: " + JSON.stringify(d));
    assert.ok(d.y >= 0 && d.y <= world.height, "world sınırları içinde olmalı: " + JSON.stringify(d));
    obstacles.forEach(function (o) {
      var insideX = d.x >= o.x - 24 && d.x <= o.x + o.width + 24;
      var insideY = d.y >= o.y - 24 && d.y <= o.y + o.height + 24;
      assert.ok(!(insideX && insideY), "dekorasyon bir obstacle'ı (margin dahil) kapatmamalı: " + JSON.stringify({ d: d, o: o }));
    });
    collectibles.forEach(function (c) {
      var dist = Math.sqrt(Math.pow(d.x - c.x, 2) + Math.pow(d.y - c.y, 2));
      assert.ok(dist >= c.radius + 40, "dekorasyon bir collectible'ı (margin dahil) kapatmamalı: " + JSON.stringify({ d: d, c: c }));
    });
  });
});

test("generateWorldDecorations: üretilen dekorasyon sayısı bir üst sınırla (64) SINIRLANIR, çok büyük bir dünyada bile — WORLD DENSITY round: eski sınır (36) yoğunluk artışıyla 64'e çıkarıldı", function () {
  var world = { width: 20000, height: 20000, tileSize: 64 };
  var decorations = generateWorldDecorations(world, [], [], ["/a.png"]);
  assert.ok(decorations.length <= 64);
});

test("generateWorldDecorations: kapak (cap) uygulansa BİLE, kırpılmış küme dünyanın TAMAMINA yayılmış kalır — eski 'sadece sol-üst köşe dolar' mekansal önyargısı DÜZELTİLDİ", function () {
  var world = { width: 20000, height: 20000, tileSize: 64 };
  var decorations = generateWorldDecorations(world, [], [], ["/a.png"]);
  assert.ok(decorations.length > 0);
  var xs = decorations.map(function (d) { return d.x; });
  var ys = decorations.map(function (d) { return d.y; });
  var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
  var minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
  // Dünyanın büyük çoğunluğuna (en az %80'ine) yayılmış olmalı — eskiden
  // sadece ilk birkaç satır/sütun (dünyanın küçük bir köşesi) dolardı.
  assert.ok(maxX - minX > world.width * 0.8, "x yayılımı yetersiz: " + (maxX - minX));
  assert.ok(maxY - minY > world.height * 0.8, "y yayılımı yetersiz: " + (maxY - minY));
});

test("generateWorldDecorations: her öğe [0.75, 1.35] aralığında deterministik bir 'scale' taşır (hepsi aynı büyüklükte görünmesin)", function () {
  var world = { width: 2000, height: 1400, tileSize: 64 };
  var decorations = generateWorldDecorations(world, [], [], ["/a.png", "/b.png"]);
  assert.ok(decorations.length > 0);
  var scales = {};
  decorations.forEach(function (d) {
    assert.equal(typeof d.scale, "number");
    assert.ok(d.scale >= 0.75 && d.scale <= 1.35, "scale aralık dışı: " + d.scale);
    scales[d.scale.toFixed(3)] = true;
  });
  assert.ok(Object.keys(scales).length > 1, "TÜM dekorasyonlar aynı scale'e sahip olmamalı");
});

test("generateWorldDecorations: birden fazla asset varken, komşu (sol/üst) hücrelerle AYNI asset'in art arda tekrarı azaltılır (tam bir tekdüzelik olmaz)", function () {
  var world = { width: 3000, height: 3000, tileSize: 64 };
  var assets = ["/a.png", "/b.png", "/c.png"];
  var decorations = generateWorldDecorations(world, [], [], assets);
  assert.ok(decorations.length > 5);
  var counts = {};
  decorations.forEach(function (d) { counts[d.path] = (counts[d.path] || 0) + 1; });
  var uniquePaths = Object.keys(counts).length;
  assert.ok(uniquePaths > 1, "birden fazla asset türü kullanılmalı: " + JSON.stringify(counts));
  // Hiçbir tek asset toplamın aşırı büyük bir kısmını (ör. >%70) domine
  // etmemeli — çeşitliliğin gerçekten etkili olduğunun kaba bir kanıtı.
  Object.keys(counts).forEach(function (path) {
    assert.ok(counts[path] / decorations.length < 0.7, "bir asset toplamı domine ediyor: " + JSON.stringify(counts));
  });
});

test("generateWorldDecorations: player spawn'ın HEMEN dışında (SPAWN_EXCLUSION_RADIUS ile world composition'ın 'orta halka'sı arasında) da düşük yoğunlukla 'nispeten temiz' kalır", function () {
  var world = { width: 4000, height: 4000, tileSize: 64 };
  var decorations = generateWorldDecorations(world, [], [], ["/a.png"]);
  var centerX = world.width / 2, centerY = world.height / 2;
  var referenceRadius = Math.min(world.width, world.height) / 2;
  var nearZoneRadius = referenceRadius * 0.32;

  var inNearZone = decorations.filter(function (d) {
    var dist = Math.sqrt(Math.pow(d.x - centerX, 2) + Math.pow(d.y - centerY, 2));
    return dist >= 240 && dist < nearZoneRadius;
  });
  var inMidZone = decorations.filter(function (d) {
    var dist = Math.sqrt(Math.pow(d.x - centerX, 2) + Math.pow(d.y - centerY, 2));
    return dist >= nearZoneRadius && dist < referenceRadius * 0.78;
  });
  // Orantılı olarak orta halka, yakın halkadan daha yoğun dolmalı (aynı
  // halka genişliğine normalize edilmiş yaklaşık bir yoğunluk kıyaslaması).
  assert.ok(inMidZone.length > inNearZone.length, "orta halka yakın halkadan daha yoğun olmalı: near=" + inNearZone.length + " mid=" + inMidZone.length);
});

test("/api/generate (mock modda): eligible bir FOREST TopDown prompt -> spec.assets.ground=null (background primitive/prosedürel zemine düşer), spec.decorations dolu ve geçerli yollara sahip", async function () {
  var ctx = await startTestServer();
  try {
    var res = await postJson(ctx.port, "/api/generate", {
      prompt: "A top-down game where you survive in a forest, avoiding zombies, for 30 seconds.",
    });

    assert.equal(res.status, 200);
    var spec = res.body.meta.gameSpec;
    assert.equal(spec.theme, "forest");
    assert.equal(spec.assets.ground, null);
    // background alanı bu round'da HİÇ DEĞİŞMEDİ (geriye dönük uyumlu):
    assert.equal(typeof spec.assets.background, "string");
    assert.ok(Array.isArray(spec.decorations));
    // WORLD DENSITY round: eski dünyada (2000x1400) ~27 civarı üretiliyordu
    // — yoğunluk artışıyla belirgin şekilde daha dolu bir dünya bekleniyor.
    assert.ok(spec.decorations.length >= 30, "dünya yeterince dolu olmalı (WORLD DENSITY round): " + spec.decorations.length);
    var seenScales = {};
    spec.decorations.forEach(function (d) {
      assert.equal(typeof d.x, "number");
      assert.equal(typeof d.y, "number");
      assert.equal(typeof d.path, "string");
      assert.equal(typeof d.scale, "number");
      assert.ok(d.scale >= 0.6 && d.scale <= 1.6, "scale specSchema.js sınırları içinde olmalı: " + d.scale);
      seenScales[d.scale.toFixed(3)] = true;
      assert.ok(res.body.html.indexOf(d.path) !== -1, "dekorasyon path'i gömülü spec JSON'ında da yer almalı");
    });
    assert.ok(Object.keys(seenScales).length > 1, "dekorasyonların hepsi aynı büyüklükte olmamalı (WORLD DENSITY round HEDEF 2)");
  } finally {
    ctx.restore();
    ctx.server.close();
  }
});

test("/api/generate (mock modda): eligible bir DUNGEON TopDown prompt -> spec.assets.ground GERÇEK bir zemin karosu (floor.png), spec.decorations dolu", async function () {
  var ctx = await startTestServer();
  try {
    var res = await postJson(ctx.port, "/api/generate", {
      prompt: "Zindanda 8 canavardan kaçarak hayatta kaldığın bir oyun.",
    });

    assert.equal(res.status, 200);
    var spec = res.body.meta.gameSpec;
    assert.equal(spec.theme, "dungeon");
    assert.equal(spec.assets.ground, "/assets/packs/tiny-dungeon/tiles/floor.png");
    assert.ok(res.body.html.indexOf(spec.assets.ground) !== -1);
    assert.ok(Array.isArray(spec.decorations));
    assert.ok(spec.decorations.length > 0);
  } finally {
    ctx.restore();
    ctx.server.close();
  }
});

test("/api/generate (mock modda): eligible bir SPACE TopDown prompt -> spec.assets.ground GERÇEK bir starfield asset'i, spec.decorations BOŞ (space-shooter kitinde hiç decoration rolü yok)", async function () {
  var ctx = await startTestServer();
  try {
    var res = await postJson(ctx.port, "/api/generate", {
      prompt: "Uzayda 6 düşman gemisinden kaçarak hayatta kaldığın bir top-down oyun.",
    });

    assert.equal(res.status, 200);
    var spec = res.body.meta.gameSpec;
    assert.equal(spec.theme, "space");
    assert.equal(typeof spec.assets.ground, "string");
    assert.ok(spec.assets.ground.indexOf("kenney-space-shooter") !== -1);
    assert.ok(Array.isArray(spec.decorations));
    assert.equal(spec.decorations.length, 0);
  } finally {
    ctx.restore();
    ctx.server.close();
  }
});

test("/api/generate (mock modda): eligible OLMAYAN (space-shooter Free-HTML) bir prompt akışında meta.gameSpec hiç YOK — REGRESSION (ground/decorations mantığı Free-HTML yoluna hiç karışmaz)", async function () {
  var ctx = await startTestServer();
  try {
    var res = await postJson(ctx.port, "/api/generate", { prompt: "Create a 5-second space shooter game with asteroids." });
    assert.equal(res.status, 200);
    assert.equal(res.body.meta.gameSpec, undefined);
    assert.equal(res.body.meta.pipeline, undefined);
  } finally {
    ctx.restore();
    ctx.server.close();
  }
});
