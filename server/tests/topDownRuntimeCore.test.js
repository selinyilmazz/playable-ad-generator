/**
 * TOP-DOWN PLAYABLE GAME RUNTIME — çekirdek (DOM'suz) mantık testleri.
 *
 * public/runtime/topdown/*.js dosyaları tarayıcı için yazıldı (window
 * namespace'i), ama bu dosyalardan bir kısmı (utils/collision/specSchema/
 * entity/player/enemy/particles/gameState) SAF MANTIKTIR — canvas/DOM/
 * requestAnimationFrame'e hiç dokunmaz. Bu yüzden bu session'ın "Horizontal
 * Movement Fix" turunda kurulan AYNI desenle (bkz. movementInputBehavior.
 * test.js) Node'un YERLEŞİK `vm` modülüyle gerçekten YÜKLENİP çalıştırılıp
 * test edilebilirler — yeni bir bağımlılık (jsdom vb.) EKLEMEDEN.
 *
 * inputManager.js / camera.js / renderer.js / hud.js / gameLoop.js /
 * runtime.js gerçek `window`/`document`/canvas/`requestAnimationFrame`
 * gerektirdiği için BURADA test edilmiyor — bunlar canlı bir tarayıcıda
 * (Playwright) ayrıca doğrulandı (bkz. teslim raporu).
 *
 * Bu dosya server/routes|services altındaki HİÇBİR ŞEYİ import ETMİYOR —
 * mevcut free-HTML pipeline'ıyla sıfır bağlantı, sadece `npm test`'in
 * (node --test server/tests/*.test.js) topladığı bağımsız bir test dosyası.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");

var RUNTIME_DIR = path.join(__dirname, "..", "..", "public", "runtime", "topdown");
var CORE_FILES = [
  "utils.js",
  "collision.js",
  "specSchema.js",
  "entity.js",
  "player.js",
  "enemy.js",
  // VISUAL QUALITY round — SAF mantık (entity.state/entity.facing'i okur,
  // DOM/canvas'a dokunmaz), diğer core dosyalarla AYNI vm sandbox'ında
  // test edilebilir.
  "animation.js",
  "particles.js",
  "gameState.js",
  // COLLECTIBLES+OBSTACLES round — ikisi de SAF mantık (DOM/canvas'a
  // dokunmaz), diğer core dosyalarla AYNI vm sandbox'ında test edilebilir.
  "collectibles.js",
  "obstacles.js",
];

/**
 * Her testte TEMİZ bir sandbox: dosyalar `window.TopDownRuntime = ...`
 * şeklinde yazıldığı için sandbox'ın kendisini `window` olarak veriyoruz
 * (tarayıcıdaki gibi `window.TopDownRuntime` tüm dosyalar arasında AYNI
 * objeye işaret ediyor).
 */
function loadRuntimeCore() {
  var sandbox = { Math: Math, console: console };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  CORE_FILES.forEach(function (file) {
    var code = fs.readFileSync(path.join(RUNTIME_DIR, file), "utf8");
    vm.runInContext(code, sandbox, { filename: file });
  });
  return sandbox.window.TopDownRuntime;
}

// ================== Utils ==================

test("Utils.clamp: sınırların dışına taşan değerleri kelepçeler", function () {
  var Runtime = loadRuntimeCore();
  assert.equal(Runtime.Utils.clamp(5, 0, 10), 5);
  assert.equal(Runtime.Utils.clamp(-5, 0, 10), 0);
  assert.equal(Runtime.Utils.clamp(15, 0, 10), 10);
});

test("Utils.normalize: sıfır vektör için {0,0} döner (0'a bölme hatası yok), aksi halde birim uzunluk", function () {
  var Runtime = loadRuntimeCore();
  var zero = Runtime.Utils.normalize(0, 0);
  assert.equal(zero.x, 0);
  assert.equal(zero.y, 0);

  var v = Runtime.Utils.normalize(3, 4);
  var len = Math.sqrt(v.x * v.x + v.y * v.y);
  assert.ok(Math.abs(len - 1) < 1e-9);
});

// ================== Collision ==================

test("Collision.circleIntersect: çakışan/çakışmayan daireleri doğru ayırt eder", function () {
  var Runtime = loadRuntimeCore();
  var a = { x: 0, y: 0, radius: 10 };
  var bOverlap = { x: 15, y: 0, radius: 10 }; // dx=15, radiusSum=20 -> çakışır
  var bFar = { x: 30, y: 0, radius: 10 }; // dx=30, radiusSum=20 -> çakışmaz
  assert.equal(Runtime.Collision.circleIntersect(a, bOverlap), true);
  assert.equal(Runtime.Collision.circleIntersect(a, bFar), false);
});

test("Collision.rectIntersect ve rectCircleIntersect temel senaryolar", function () {
  var Runtime = loadRuntimeCore();
  var r1 = { x: 0, y: 0, width: 10, height: 10 };
  var r2 = { x: 5, y: 5, width: 10, height: 10 };
  var r3 = { x: 100, y: 100, width: 10, height: 10 };
  assert.equal(Runtime.Collision.rectIntersect(r1, r2), true);
  assert.equal(Runtime.Collision.rectIntersect(r1, r3), false);

  var circleInside = { x: 5, y: 5, radius: 2 };
  var circleFar = { x: 500, y: 500, radius: 2 };
  assert.equal(Runtime.Collision.rectCircleIntersect(r1, circleInside), true);
  assert.equal(Runtime.Collision.rectCircleIntersect(r1, circleFar), false);
});

// ================== SpecSchema ==================

test("normalizeSpec: Selin'in örnek spec'i birebir kabul edilir ve eksik alanlar (world.tileSize, lose, score, enemies.onPlayerCollision) güvenli varsayılanlarla doldurulur", function () {
  var Runtime = loadRuntimeCore();
  var exampleSpec = {
    gameType: "topDown",
    theme: "forest",
    player: { speed: 220, health: 3 },
    enemies: { count: 5, speed: 80 },
    world: { width: 2400, height: 1600 },
    goal: { type: "survive", duration: 30 },
  };

  var normalized = Runtime.normalizeSpec(exampleSpec);

  assert.equal(normalized.gameType, "topDown");
  assert.equal(normalized.theme, "forest");
  assert.equal(normalized.player.speed, 220);
  assert.equal(normalized.player.health, 3);
  assert.equal(normalized.enemies.count, 5);
  assert.equal(normalized.enemies.speed, 80);
  assert.equal(normalized.world.width, 2400);
  assert.equal(normalized.world.height, 1600);
  assert.equal(normalized.goal.type, "survive");
  assert.equal(normalized.goal.duration, 30);

  // Kullanıcı hiç belirtmedi -> güvenli varsayılanlar
  assert.equal(normalized.world.tileSize, Runtime.SPEC_DEFAULTS.world.tileSize);
  assert.equal(normalized.lose.type, "healthZero");
  assert.equal(normalized.enemies.onPlayerCollision, "damagePlayer");
  assert.ok(normalized.score.pointsPerSecond > 0);
});

test("normalizeSpec: boş/undefined/null spec çökme YERİNE tam varsayılan bir spec döner", function () {
  var Runtime = loadRuntimeCore();
  [undefined, null, {}, "not-an-object", 42].forEach(function (bad) {
    var normalized = Runtime.normalizeSpec(bad);
    assert.equal(normalized.gameType, "topDown");
    assert.equal(normalized.theme, "neutral");
    assert.ok(normalized.player.speed > 0);
    assert.ok(normalized.world.width > 0);
  });
});

test("normalizeSpec: mantıksız değerler (negatif hız, NaN health, bilinmeyen goal.type) güvenli aralığa/varsayılana düşer, ASLA NaN/negatif üretmez", function () {
  var Runtime = loadRuntimeCore();
  var malformed = {
    player: { speed: -500, health: NaN },
    enemies: { count: -10, speed: "fast" },
    world: { width: -1, height: 0 },
    goal: { type: "totally-unknown-goal-type", duration: -5 },
  };
  var normalized = Runtime.normalizeSpec(malformed);

  assert.ok(normalized.player.speed > 0);
  assert.ok(!isNaN(normalized.player.health) && normalized.player.health >= 1);
  assert.ok(normalized.enemies.count >= 0);
  assert.ok(!isNaN(normalized.enemies.speed) && normalized.enemies.speed >= 0);
  assert.ok(normalized.world.width > 0);
  assert.ok(normalized.world.height > 0);
  assert.equal(Runtime.SPEC_GOAL_TYPES.indexOf(normalized.goal.type) !== -1, true);
  assert.ok(normalized.goal.duration > 0);
});

test("normalizeSpec: girdi objesini MUTATE ETMEZ", function () {
  var Runtime = loadRuntimeCore();
  var raw = { player: { speed: -50 } };
  Runtime.normalizeSpec(raw);
  assert.equal(raw.player.speed, -50, "orijinal obje değişmemiş olmalı");
});

// ================== Entity / Player / Enemy ==================

test("Entity.move: dünya sınırlarının dışına asla çıkmaz (radius kadar içeride kelepçelenir)", function () {
  var Runtime = loadRuntimeCore();
  var e = new Runtime.Entity({ x: 50, y: 50, radius: 10 });
  e.move(-1000, -1000, 200, 200); // çok büyük negatif hareket
  assert.equal(e.x, 10); // radius
  assert.equal(e.y, 10);

  e.move(10000, 10000, 200, 200); // çok büyük pozitif hareket
  assert.equal(e.x, 190); // 200 - radius
  assert.equal(e.y, 190);
});

test("Entity.update: hareket varken state 'moving', yokken 'idle' olur; hitFlashTimer zamanla söner", function () {
  var Runtime = loadRuntimeCore();
  var e = new Runtime.Entity({ x: 0, y: 0 });
  e.vx = 100;
  e.vy = 0;
  e.update(0.1);
  assert.equal(e.state, "moving");

  e.vx = 0;
  e.vy = 0;
  e.update(0.1);
  assert.equal(e.state, "idle");

  e.triggerHitFlash(0.3);
  assert.ok(e.hitFlashTimer > 0);
  e.update(0.5); // flash süresinden uzun bir dt
  assert.equal(e.hitFlashTimer, 0);
});

test("Player.takeHit: kısa süreli dokunulmazlık verir, süre dolunca kalkar", function () {
  var Runtime = loadRuntimeCore();
  var p = new Runtime.Player({ x: 0, y: 0, speed: 200 });
  assert.equal(p.isInvulnerable(), false);

  p.takeHit(1.0);
  assert.equal(p.isInvulnerable(), true);

  p.update(0.5);
  assert.equal(p.isInvulnerable(), true); // hâlâ süre var

  p.update(0.6);
  assert.equal(p.isInvulnerable(), false); // süre doldu
});

test("Enemy.seek: hedefe doğru ilerler (hedefe olan mesafe azalır) ve dünya sınırına kelepçelenir", function () {
  var Runtime = loadRuntimeCore();
  var enemy = new Runtime.Enemy({ x: 0, y: 0, speed: 100 });
  var distBefore = Runtime.Utils.distance(enemy.x, enemy.y, 500, 500);
  enemy.seek(500, 500, 0.1, 2000, 2000);
  var distAfter = Runtime.Utils.distance(enemy.x, enemy.y, 500, 500);
  assert.ok(distAfter < distBefore, "seek sonrası hedefe olan mesafe azalmalı");

  // Dünya sınırına doğru zorlanan bir seek, sınırın dışına ÇIKMAMALI.
  var edgeEnemy = new Runtime.Enemy({ x: 990, y: 990, speed: 5000, radius: 10 });
  edgeEnemy.seek(999999, 999999, 1, 1000, 1000);
  assert.ok(edgeEnemy.x <= 990); // radius kadar içeride kelepçeli (1000-10)
  assert.ok(edgeEnemy.y <= 990);
});

// ================== VISUAL QUALITY round — Entity.facing + Animation ==================

test("Entity: başlangıçta facing=1 (sağ), belirgin bir SAĞA hız bileşeni facing'i 1'de tutar/yapar", function () {
  var Runtime = loadRuntimeCore();
  var e = new Runtime.Entity({ x: 0, y: 0 });
  assert.equal(e.facing, 1);

  e.vx = 50; // eşiğin (6) üzerinde, belirgin sağa hareket
  e.vy = 0;
  e.update(0.1);
  assert.equal(e.facing, 1);
});

test("Entity: belirgin bir SOLA hız bileşeni facing'i -1 yapar (flip için)", function () {
  var Runtime = loadRuntimeCore();
  var e = new Runtime.Entity({ x: 0, y: 0 });
  e.vx = -50;
  e.vy = 0;
  e.update(0.1);
  assert.equal(e.facing, -1);
});

test("Entity: SADECE dikey hareket (vx=0) veya durma facing'i DEĞİŞTİRMEZ — son yatay yönü doğal şekilde korur", function () {
  var Runtime = loadRuntimeCore();
  var e = new Runtime.Entity({ x: 0, y: 0 });

  // Önce belirgin şekilde sola dön.
  e.vx = -50;
  e.vy = 0;
  e.update(0.1);
  assert.equal(e.facing, -1);

  // Şimdi SADECE yukarı hareket et (vx=0) — facing -1'de KALMALI.
  e.vx = 0;
  e.vy = -80;
  e.update(0.1);
  assert.equal(e.facing, -1, "salt dikey hareket facing'i değiştirmemeli");

  // Dur (idle) — facing YİNE -1'de kalmalı.
  e.vx = 0;
  e.vy = 0;
  e.update(0.1);
  assert.equal(e.facing, -1, "idle iken facing son bilinen yönü korumalı");
});

test("Entity: çok küçük (gürültü seviyesinde) bir vx facing'i DEĞİŞTİRMEZ (eşik altı)", function () {
  var Runtime = loadRuntimeCore();
  var e = new Runtime.Entity({ x: 0, y: 0 });
  e.vx = -50;
  e.vy = 0;
  e.update(0.1);
  assert.equal(e.facing, -1);

  e.vx = 2; // FACING_VELOCITY_EPSILON'un (6) altında
  e.vy = 100;
  e.update(0.1);
  assert.equal(e.facing, -1, "eşik altı bir vx facing'i tetiklememeli");
});

test("Enemy.seek: hedefe doğru hareket ederken de facing güncellenir (Entity'den generic olarak miras alınır, Enemy'ye özel kod YOK)", function () {
  var Runtime = loadRuntimeCore();
  var enemy = new Runtime.Enemy({ x: 500, y: 500, speed: 100 });
  enemy.seek(0, 500, 0.1, 2000, 2000); // hedef solda -> vx negatif olmalı
  enemy.update(0.1);
  assert.equal(enemy.facing, -1);
});

test("Animation.resolveVisualState: entity.state/facing'i doğru bir visual descriptor'a indirger", function () {
  var Runtime = loadRuntimeCore();
  var e = new Runtime.Entity({ x: 0, y: 0 });

  var idleState = Runtime.Animation.resolveVisualState(e);
  assert.equal(idleState.moving, false);
  assert.equal(idleState.flipX, false);
  assert.equal(idleState.facing, 1);

  e.vx = -50;
  e.vy = 0;
  e.update(0.1);
  var movingLeftState = Runtime.Animation.resolveVisualState(e);
  assert.equal(movingLeftState.moving, true);
  assert.equal(movingLeftState.flipX, true);
  assert.equal(movingLeftState.facing, -1);
});

test("Animation.supportsFrameAnimation: bugün HİÇBİR animationType için true dönmez (hiçbir asset gerçek frame verisi taşımıyor — dürüst/uydurmasız)", function () {
  var Runtime = loadRuntimeCore();
  assert.equal(Runtime.Animation.supportsFrameAnimation("static"), false);
  assert.equal(Runtime.Animation.supportsFrameAnimation("spritesheet"), false);
  assert.equal(Runtime.Animation.supportsFrameAnimation(undefined), false);
});

// ================== Particles ==================

test("Particles: spawnBurst istenen sayıda parçacık üretir, update() ömrü dolanları temizler", function () {
  var Runtime = loadRuntimeCore();
  var particles = new Runtime.Particles();
  particles.spawnBurst(0, 0, "#ff0000", 8);
  assert.equal(particles.list.length, 8);

  particles.update(2); // ömürleri (max ~0.8s) fazlasıyla aşan bir dt
  assert.equal(particles.list.length, 0);
});

// ================== GameState (win / lose) ==================

function makeSpec(overrides) {
  var base = {
    player: { health: 3 },
    enemies: { count: 2 },
    goal: { type: "survive", duration: 5, targetScore: 50 },
    lose: { type: "healthZero" },
    score: { pointsPerSecond: 10, pointsPerEnemyDefeated: 25 },
  };
  return Object.assign({}, base, overrides || {});
}

test("GameState.reset: health/score/elapsed/status'u başlangıç değerlerine döner", function () {
  var Runtime = loadRuntimeCore();
  var state = new Runtime.GameState(makeSpec());
  assert.equal(state.health, 3);
  assert.equal(state.score, 0);
  assert.equal(state.elapsed, 0);
  assert.equal(state.status, "playing");
});

test("GameState: health 0'a inince status 'lost' olur", function () {
  var Runtime = loadRuntimeCore();
  var state = new Runtime.GameState(makeSpec());
  state.applyDamage(3);
  state.update(0.1);
  assert.equal(state.status, "lost");
});

test("GameState: 'survive' hedefi süre dolunca 'won' olur", function () {
  var Runtime = loadRuntimeCore();
  var state = new Runtime.GameState(makeSpec());
  state.update(6); // duration=5'i aşan tek bir büyük adım
  assert.equal(state.status, "won");
});

test("GameState: 'score' hedefi targetScore'a ulaşınca 'won' olur", function () {
  var Runtime = loadRuntimeCore();
  var state = new Runtime.GameState(makeSpec({ goal: { type: "score", duration: 999, targetScore: 20 } }));
  state.addScore(25);
  state.update(0.01);
  assert.equal(state.status, "won");
});

test("GameState: 'eliminate' hedefi tüm düşmanlar yok edilince 'won' olur", function () {
  var Runtime = loadRuntimeCore();
  var state = new Runtime.GameState(makeSpec({ enemies: { count: 2 }, goal: { type: "eliminate", duration: 999, targetScore: 999 } }));
  state.enemyDefeated();
  state.update(0.01);
  assert.equal(state.status, "playing"); // hâlâ 1 düşman kaldı
  state.enemyDefeated();
  state.update(0.01);
  assert.equal(state.status, "won");
});

test("GameState: status 'playing' olmadığında update() artık elapsed/score/win-lose'u DEĞİŞTİRMEZ (donmuş kalır)", function () {
  var Runtime = loadRuntimeCore();
  var state = new Runtime.GameState(makeSpec());
  state.applyDamage(3);
  state.update(0.1);
  assert.equal(state.status, "lost");
  var frozenElapsed = state.elapsed;
  var frozenScore = state.score;
  state.update(5);
  assert.equal(state.elapsed, frozenElapsed);
  assert.equal(state.score, frozenScore);
  assert.equal(state.status, "lost");
});

// ================== COLLECTIBLES + OBSTACLES ==================

test("normalizeSpec: GOAL_TYPES artık 'collect'i içerir ve goal.type='collect' aynen kabul edilir", function () {
  var Runtime = loadRuntimeCore();
  assert.ok(Runtime.SPEC_GOAL_TYPES.indexOf("collect") !== -1);
  var normalized = Runtime.normalizeSpec({ goal: { type: "collect" } });
  assert.equal(normalized.goal.type, "collect");
});

test("normalizeSpec: obstacles merkez-nokta {x,y} olarak verilir, sol-üst köşe {x,y,width,height} dikdörtgenine çevrilir", function () {
  var Runtime = loadRuntimeCore();
  var normalized = Runtime.normalizeSpec({
    world: { width: 1000, height: 1000, tileSize: 64 },
    obstacles: [{ x: 500, y: 500, width: 100, height: 60 }],
  });
  assert.equal(normalized.obstacles.length, 1);
  var ob = normalized.obstacles[0];
  // merkez (500,500), width=100,height=60 -> sol-üst (450, 470)
  assert.equal(ob.x, 450);
  assert.equal(ob.y, 470);
  assert.equal(ob.width, 100);
  assert.equal(ob.height, 60);
});

test("normalizeSpec: obstacles width/height verilmezse tileSize'a dayalı makul bir varsayılan boyut kullanılır (sınırlar içinde)", function () {
  var Runtime = loadRuntimeCore();
  var normalized = Runtime.normalizeSpec({
    world: { width: 1000, height: 1000, tileSize: 64 },
    obstacles: [{ x: 500, y: 500 }],
  });
  var ob = normalized.obstacles[0];
  assert.ok(ob.width >= 16 && ob.width <= 400);
  assert.ok(ob.height >= 16 && ob.height <= 400);
});

test("normalizeSpec: obstacles dünya sınırları dışına taşmayacak şekilde kelepçelenir", function () {
  var Runtime = loadRuntimeCore();
  var normalized = Runtime.normalizeSpec({
    world: { width: 200, height: 200, tileSize: 64 },
    obstacles: [{ x: 0, y: 0, width: 100, height: 100 }, { x: 200, y: 200, width: 100, height: 100 }],
  });
  normalized.obstacles.forEach(function (ob) {
    assert.ok(ob.x >= 0 && ob.x + ob.width <= normalized.world.width);
    assert.ok(ob.y >= 0 && ob.y + ob.height <= normalized.world.height);
  });
});

test("normalizeSpec: bir obstacle'ın İÇİNE düşen collectible sessizce atlanır (ulaşılamaz hedef bırakılmaz)", function () {
  var Runtime = loadRuntimeCore();
  var normalized = Runtime.normalizeSpec({
    world: { width: 1000, height: 1000, tileSize: 64 },
    obstacles: [{ x: 500, y: 500, width: 100, height: 100 }],
    collectibles: [
      { x: 500, y: 500 }, // obstacle'ın tam içinde -> atlanmalı
      { x: 10, y: 10 }, // obstacle'ın dışında -> kalmalı
    ],
  });
  assert.equal(normalized.collectibles.length, 1);
  assert.equal(normalized.collectibles[0].x, 10);
  assert.equal(normalized.collectibles[0].y, 10);
});

test("normalizeSpec: collectibles/obstacles içindeki geçersiz (x/y sayı olmayan, obje olmayan) öğeler SESSİZCE atlanır, çökme olmaz", function () {
  var Runtime = loadRuntimeCore();
  // NOT: geçerli collectible (1900,1300) ve geçerli obstacle (20,20)
  // BİLEREK dünyanın karşıt köşelerine konuldu — aksi halde obstacle'ın
  // varsayılan boyutu (tileSize'a dayalı) yanlışlıkla collectible'ı içine
  // alıp "obstacle içinde" filtresini (ayrı bir testte doğrulanan, İSTENEN
  // bir davranış) tetikleyip bu testin amacını (sadece geçersiz öğelerin
  // atlandığını doğrulamak) bozabilirdi.
  var normalized = Runtime.normalizeSpec({
    collectibles: [null, "not-an-object", { x: "abc", y: 5 }, { x: NaN, y: 5 }, { x: 1900, y: 1300 }],
    obstacles: [undefined, 42, { x: Infinity, y: 5 }, { x: 20, y: 20 }],
  });
  assert.equal(normalized.collectibles.length, 1);
  assert.equal(normalized.obstacles.length, 1);
});

test("normalizeSpec: collectibles/obstacles verilmezse boş dizi (varsayılan) döner ve çökmez", function () {
  var Runtime = loadRuntimeCore();
  var normalized = Runtime.normalizeSpec({});
  assert.ok(Array.isArray(normalized.collectibles) && normalized.collectibles.length === 0);
  assert.ok(Array.isArray(normalized.obstacles) && normalized.obstacles.length === 0);
});

test("normalizeSpec: score.pointsPerCollectible güvenli bir varsayılanla dolar", function () {
  var Runtime = loadRuntimeCore();
  var normalized = Runtime.normalizeSpec({});
  assert.ok(normalized.score.pointsPerCollectible > 0);
});

test("CollectibleField: collectAt() player ile çakışan öğeyi listeden çıkarır ve döner; çakışma yoksa null döner", function () {
  var Runtime = loadRuntimeCore();
  var field = new Runtime.CollectibleField([
    { x: 0, y: 0, radius: 10, type: "generic", value: 1 },
    { x: 500, y: 500, radius: 10, type: "generic", value: 1 },
  ]);
  assert.equal(field.list.length, 2);

  var player = { x: 5, y: 0, radius: 10 }; // ilk collectible ile çakışır
  var far = { x: 9999, y: 9999, radius: 10 };

  assert.equal(field.collectAt(far), null);
  assert.equal(field.list.length, 2);

  var collected = field.collectAt(player);
  assert.ok(collected);
  assert.equal(collected.x, 0);
  assert.equal(field.list.length, 1); // toplanan listeden çıkarıldı
});

test("CollectibleField: update(dt) her öğenin bobPhase'ini ilerletir (bob/pulse animasyonu için)", function () {
  var Runtime = loadRuntimeCore();
  var field = new Runtime.CollectibleField([{ x: 0, y: 0, radius: 10 }]);
  var before = field.list[0].bobPhase;
  field.update(0.5);
  assert.ok(field.list[0].bobPhase > before);
});

test("ObstacleField.blocksCircle: obstacle ile çakışan/çakışmayan daireleri doğru ayırt eder", function () {
  var Runtime = loadRuntimeCore();
  var field = new Runtime.ObstacleField([{ x: 100, y: 100, width: 50, height: 50 }]);
  assert.equal(field.blocksCircle({ x: 120, y: 120, radius: 5 }), true); // içeride
  assert.equal(field.blocksCircle({ x: 900, y: 900, radius: 5 }), false); // uzakta
});

test("ObstacleField.resolveMovement: obstacles listesi BOŞKEN, Entity.move() ile MATEMATİKSEL OLARAK BİREBİR AYNI sonucu üretir (eşdeğerlik garantisi)", function () {
  var Runtime = loadRuntimeCore();
  var field = new Runtime.ObstacleField([]);

  var viaObstacleField = new Runtime.Entity({ x: 50, y: 50, radius: 10 });
  field.resolveMovement(viaObstacleField, -1000, -1000, 200, 200);

  var viaMove = new Runtime.Entity({ x: 50, y: 50, radius: 10 });
  viaMove.move(-1000, -1000, 200, 200);

  assert.equal(viaObstacleField.x, viaMove.x);
  assert.equal(viaObstacleField.y, viaMove.y);

  // Pozitif yönde de aynı doğrulama.
  var viaObstacleField2 = new Runtime.Entity({ x: 50, y: 50, radius: 10 });
  field.resolveMovement(viaObstacleField2, 10000, 10000, 200, 200);
  var viaMove2 = new Runtime.Entity({ x: 50, y: 50, radius: 10 });
  viaMove2.move(10000, 10000, 200, 200);
  assert.equal(viaObstacleField2.x, viaMove2.x);
  assert.equal(viaObstacleField2.y, viaMove2.y);
});

test("ObstacleField.resolveMovement: bir obstacle varken, entity onun İÇİNDEN GEÇEMEZ (o eksende hareket iptal edilir, diğer eksende devam eder)", function () {
  var Runtime = loadRuntimeCore();
  // (100,100)'de player'ın sağında duran bir duvar.
  var field = new Runtime.ObstacleField([{ x: 120, y: 80, width: 40, height: 200 }]);
  var entity = new Runtime.Entity({ x: 100, y: 100, radius: 10 });

  field.resolveMovement(entity, 50, 0, 1000, 1000); // sağa, duvara doğru
  assert.equal(entity.x, 100, "duvar X hareketini engellemeli");

  field.resolveMovement(entity, 0, 50, 1000, 1000); // aşağı, duvar yok -> serbest
  assert.equal(entity.y, 150, "Y ekseninde engel yoksa serbestçe hareket etmeli");
});

test("Enemy.seek: obstacleField verilirse (yeni opsiyonel 6. parametre) obstacle'ın içinden geçmez; verilmezse (eski 5-arg çağrı) davranış ÖNCEKİ round'la birebir aynı kalır", function () {
  var Runtime = loadRuntimeCore();

  // Eski çağrı biçimi (5 argüman) — geriye dönük UYUMLULUK, hiç kırılmamalı.
  var enemyOld = new Runtime.Enemy({ x: 0, y: 0, speed: 100 });
  enemyOld.seek(500, 0, 0.1, 2000, 2000);
  assert.ok(enemyOld.x > 0, "obstacleField verilmezse normal seek çalışmaya devam etmeli");

  // Yeni çağrı biçimi (6. parametre) — bir duvar enemy'nin ilerlemesini
  // durdurmalı. Enemy dünya kenarından (radius kelepçesinden) yeterince
  // uzakta başlatıldı ki gözlemlenen engelleme GERÇEKTEN obstacle'dan
  // kaynaklansın, dünya-sınırı kelepçesinden değil; hız/dt de tek bir
  // adımda duvarın TAMAMINI atlayıp "tünelleme" yapmayacak kadar küçük
  // tutuldu (bkz. ObstacleField.resolveMovement'ın hedef-konum bazlı,
  // süpürme/sweep OLMAYAN basit doğası).
  var field = new Runtime.ObstacleField([{ x: 115, y: -50, width: 40, height: 100 }]);
  var enemyNew = new Runtime.Enemy({ x: 100, y: 0, speed: 80, radius: 10 });
  enemyNew.seek(9999, 0, 0.1, 2000, 2000, field);
  assert.equal(enemyNew.x, 100, "obstacle enemy'nin X ekseninde ilerlemesini engellemeli");
});

test("GameState: 'collect' hedefi TÜM collectible'lar toplanınca 'won' olur, kalan varken 'playing' kalır", function () {
  var Runtime = loadRuntimeCore();
  var spec = makeSpec({
    goal: { type: "collect", duration: 999, targetScore: 999 },
    collectibles: [{ x: 0, y: 0 }, { x: 10, y: 10 }],
    score: { pointsPerSecond: 0, pointsPerEnemyDefeated: 0, pointsPerCollectible: 5 },
  });
  var state = new Runtime.GameState(spec);
  assert.equal(state.collectiblesRemaining, 2);

  state.collectItem();
  state.update(0.01);
  assert.equal(state.status, "playing");
  assert.equal(state.collectiblesRemaining, 1);
  assert.equal(state.score, 5);

  state.collectItem();
  state.update(0.01);
  assert.equal(state.status, "won");
  assert.equal(state.collectiblesRemaining, 0);
  assert.equal(state.score, 10);
});

test("GameState: 'collect' hedefi collectibles boşken (spec.collectibles=[]) ASLA 'won' tetiklemez (anlamsızca hiç bitmez, ama çökmez)", function () {
  var Runtime = loadRuntimeCore();
  var spec = makeSpec({ goal: { type: "collect", duration: 999, targetScore: 999 }, collectibles: [] });
  var state = new Runtime.GameState(spec);
  state.update(10);
  assert.equal(state.status, "playing");
});

test("GameState.collectItem: collectiblesRemaining'i asla negatife düşürmez (fazladan çağrılsa bile)", function () {
  var Runtime = loadRuntimeCore();
  var spec = makeSpec({ collectibles: [{ x: 0, y: 0 }] });
  var state = new Runtime.GameState(spec);
  state.collectItem();
  state.collectItem(); // fazladan çağrı
  assert.equal(state.collectiblesRemaining, 0);
});

// ================== ASSET LIBRARY (specSchema.js sanitizeAssets) ==================

test("normalizeSpec: assets verilmezse TÜM roller null olan bir varsayılan obje döner (primitive fallback güvenli)", function () {
  var Runtime = loadRuntimeCore();
  var normalized = Runtime.normalizeSpec({});
  assert.equal(normalized.assets.player, null);
  assert.equal(normalized.assets.enemy, null);
  assert.equal(normalized.assets.collectible, null);
  assert.equal(normalized.assets.obstacle, null);
  assert.equal(normalized.assets.background, null);
});

test("normalizeSpec: assets içindeki geçerli string URL'ler AYNEN korunur", function () {
  var Runtime = loadRuntimeCore();
  var normalized = Runtime.normalizeSpec({
    assets: {
      player: "/assets/packs/sunnyland-forest/characters/player.png",
      enemy: "/assets/packs/sunnyland-forest/enemies/bee.png",
      collectible: "/assets/packs/sunnyland-forest/objects/carrot.png",
      obstacle: "/assets/packs/sunnyland-forest/objects/rock.png",
      background: "/assets/packs/sunnyland-forest/backgrounds/forest.png",
    },
  });
  assert.equal(normalized.assets.player, "/assets/packs/sunnyland-forest/characters/player.png");
  assert.equal(normalized.assets.enemy, "/assets/packs/sunnyland-forest/enemies/bee.png");
  assert.equal(normalized.assets.collectible, "/assets/packs/sunnyland-forest/objects/carrot.png");
  assert.equal(normalized.assets.obstacle, "/assets/packs/sunnyland-forest/objects/rock.png");
  assert.equal(normalized.assets.background, "/assets/packs/sunnyland-forest/backgrounds/forest.png");
});

test("normalizeSpec: assets içindeki geçersiz değerler (boş string, sayı, obje, null, undefined) SESSİZCE null'a düşer, çökme olmaz", function () {
  var Runtime = loadRuntimeCore();
  var normalized = Runtime.normalizeSpec({
    assets: { player: "", enemy: 42, collectible: {}, obstacle: null, background: undefined },
  });
  assert.equal(normalized.assets.player, null);
  assert.equal(normalized.assets.enemy, null);
  assert.equal(normalized.assets.collectible, null);
  assert.equal(normalized.assets.obstacle, null);
  assert.equal(normalized.assets.background, null);
});

test("normalizeSpec: assets KISMİ verilirse (sadece bazı roller) eksik roller null'a düşer (hiçbiri undefined kalmaz)", function () {
  var Runtime = loadRuntimeCore();
  var normalized = Runtime.normalizeSpec({
    assets: { player: "/assets/packs/tiny-dungeon/characters/knight.png" },
  });
  assert.equal(normalized.assets.player, "/assets/packs/tiny-dungeon/characters/knight.png");
  assert.equal(normalized.assets.enemy, null);
  assert.equal(normalized.assets.collectible, null);
  assert.equal(normalized.assets.obstacle, null);
  assert.equal(normalized.assets.background, null);
});

test("normalizeSpec: assets alanının kendisi geçersizse (string/dizi/sayı) çökmez, tüm roller null olur", function () {
  var Runtime = loadRuntimeCore();
  ["not-an-object", 42, [1, 2, 3], null, undefined].forEach(function (bad) {
    var normalized = Runtime.normalizeSpec({ assets: bad });
    assert.equal(normalized.assets.player, null);
    assert.equal(normalized.assets.background, null);
  });
});

test("normalizeSpec: girdi objesini (assets dahil) MUTATE ETMEZ", function () {
  var Runtime = loadRuntimeCore();
  var raw = { assets: { player: "/foo.png" } };
  Runtime.normalizeSpec(raw);
  assert.equal(raw.assets.player, "/foo.png");
  assert.equal(raw.assets.enemy, undefined, "orijinal objeye hiçbir yeni alan eklenmemiş olmalı");
});

// ================== WORLD RENDERING & CAMERA VISUAL OVERHAUL round ==================

test("Utils.deterministicHash01: AYNI (x,y,salt) HER ZAMAN aynı sonucu üretir (determinizm)", function () {
  var Runtime = loadRuntimeCore();
  var a = Runtime.Utils.deterministicHash01(5, 12, 3);
  var b = Runtime.Utils.deterministicHash01(5, 12, 3);
  assert.equal(a, b);
});

test("Utils.deterministicHash01: sonuç her zaman [0, 1) aralığında bir sayıdır", function () {
  var Runtime = loadRuntimeCore();
  for (var x = 0; x < 20; x++) {
    for (var y = 0; y < 5; y++) {
      var v = Runtime.Utils.deterministicHash01(x, y, 7);
      assert.ok(typeof v === "number" && isFinite(v), "sayı olmalı");
      assert.ok(v >= 0 && v < 1, "0 <= v < 1 olmalı, aldı: " + v);
    }
  }
});

test("Utils.deterministicHash01: farklı salt değerleri (aynı x,y için) BAĞIMSIZ/farklı sonuçlar üretir", function () {
  var Runtime = loadRuntimeCore();
  var v1 = Runtime.Utils.deterministicHash01(3, 4, 1);
  var v2 = Runtime.Utils.deterministicHash01(3, 4, 2);
  assert.notEqual(v1, v2);
});

test("Utils.deterministicHash01: farklı (x,y) çiftleri genel olarak farklı sonuçlar üretir (iyi dağılım, hepsi aynı sabite kilitlenmez)", function () {
  var Runtime = loadRuntimeCore();
  var seen = {};
  for (var x = 0; x < 10; x++) {
    for (var y = 0; y < 10; y++) {
      seen[Runtime.Utils.deterministicHash01(x, y, 99).toFixed(6)] = true;
    }
  }
  assert.ok(Object.keys(seen).length > 90, "100 girdiden en az 90'ı farklı bir değer üretmeli");
});

test("normalizeSpec: assets.ground verilmezse null olur, geçerli bir string verilirse AYNEN korunur (background İLE AYNI sözleşme, AYRI bir rol)", function () {
  var Runtime = loadRuntimeCore();
  var withoutGround = Runtime.normalizeSpec({ assets: { background: "/bg.png" } });
  assert.equal(withoutGround.assets.ground, null);
  assert.equal(withoutGround.assets.background, "/bg.png", "background alanı AYNEN korunmalı (ground'dan bağımsız)");

  var withGround = Runtime.normalizeSpec({
    assets: { background: "/bg.png", ground: "/assets/packs/tiny-dungeon/tiles/floor.png" },
  });
  assert.equal(withGround.assets.ground, "/assets/packs/tiny-dungeon/tiles/floor.png");
  assert.equal(withGround.assets.background, "/bg.png");
});

test("normalizeSpec: decorations verilmezse boş dizi (varsayılan) döner, çökmez", function () {
  var Runtime = loadRuntimeCore();
  var normalized = Runtime.normalizeSpec({});
  assert.ok(Array.isArray(normalized.decorations));
  assert.equal(normalized.decorations.length, 0);
});

test("normalizeSpec: decorations içindeki geçerli {x,y,path} öğeleri dünya sınırlarına kelepçelenerek AYNEN korunur", function () {
  var Runtime = loadRuntimeCore();
  var normalized = Runtime.normalizeSpec({
    world: { width: 1000, height: 800 },
    decorations: [
      { x: 500, y: 400, path: "/tree.png" },
      { x: -50, y: 2000, path: "/rock.png" }, // sınır dışı -> kelepçelenir, ATLANMAZ
    ],
  });
  assert.equal(normalized.decorations.length, 2);
  assert.equal(normalized.decorations[0].x, 500);
  assert.equal(normalized.decorations[0].y, 400);
  assert.equal(normalized.decorations[0].path, "/tree.png");
  assert.equal(normalized.decorations[1].x, 0, "negatif x 0'a kelepçelenmeli");
  assert.equal(normalized.decorations[1].y, 800, "dünya sınırını aşan y, world.height'a kelepçelenmeli");
});

// ================== WORLD DENSITY & GAMEPLAY READABILITY round ==================

test("normalizeSpec: decorations[].scale verilmezse varsayılan 1 olur (eski davranışla BİREBİR aynı boyut)", function () {
  var Runtime = loadRuntimeCore();
  var normalized = Runtime.normalizeSpec({ decorations: [{ x: 10, y: 10, path: "/x.png" }] });
  assert.equal(normalized.decorations[0].scale, 1);
});

test("normalizeSpec: decorations[].scale geçerli bir sayıysa AYNEN korunur, [0.6, 1.6] dışındaysa kelepçelenir", function () {
  var Runtime = loadRuntimeCore();
  var normalized = Runtime.normalizeSpec({
    decorations: [
      { x: 10, y: 10, path: "/a.png", scale: 1.2 },
      { x: 10, y: 10, path: "/b.png", scale: 5 },
      { x: 10, y: 10, path: "/c.png", scale: -3 },
    ],
  });
  assert.equal(normalized.decorations[0].scale, 1.2);
  assert.equal(normalized.decorations[1].scale, 1.6, "üst sınırı aşan scale 1.6'ya kelepçelenmeli");
  assert.equal(normalized.decorations[2].scale, 0.6, "alt sınırın altındaki scale 0.6'ya kelepçelenmeli");
});

test("normalizeSpec: decorations[].scale geçersizse (string/NaN/obje) çökmez, varsayılan 1'e düşer", function () {
  var Runtime = loadRuntimeCore();
  ["not-a-number", NaN, {}, null, undefined].forEach(function (bad) {
    var normalized = Runtime.normalizeSpec({ decorations: [{ x: 10, y: 10, path: "/x.png", scale: bad }] });
    assert.equal(normalized.decorations[0].scale, 1);
  });
});

test("normalizeSpec: decorations içindeki geçersiz öğeler (x/y sayı değil, path boş/string değil, obje değil) SESSİZCE atlanır, çökme olmaz", function () {
  var Runtime = loadRuntimeCore();
  var normalized = Runtime.normalizeSpec({
    decorations: [
      { x: "a", y: 10, path: "/x.png" },
      { x: 10, y: 10, path: "" },
      { x: 10, y: 10, path: 42 },
      { x: 10, y: 10 },
      null,
      "not-an-object",
      42,
      { x: 10, y: 10, path: "/ok.png" },
    ],
  });
  assert.equal(normalized.decorations.length, 1);
  assert.equal(normalized.decorations[0].path, "/ok.png");
});

test("normalizeSpec: decorations alanının kendisi geçersizse (string/obje/sayı) çökmez, boş dizi döner", function () {
  var Runtime = loadRuntimeCore();
  ["not-an-array", 42, {}, null, undefined].forEach(function (bad) {
    var normalized = Runtime.normalizeSpec({ decorations: bad });
    assert.ok(Array.isArray(normalized.decorations));
    assert.equal(normalized.decorations.length, 0);
  });
});

test("normalizeSpec: decorations MAX_DECORATIONS (80) ile SINIRLANIR — fazlası sessizce kırpılır, çökme olmaz", function () {
  var Runtime = loadRuntimeCore();
  var many = [];
  for (var i = 0; i < 200; i++) {
    many.push({ x: 10, y: 10, path: "/deco" + i + ".png" });
  }
  var normalized = Runtime.normalizeSpec({ world: { width: 2000, height: 2000 }, decorations: many });
  assert.equal(normalized.decorations.length, 80);
});

test("normalizeSpec: girdi objesini (decorations dahil) MUTATE ETMEZ", function () {
  var Runtime = loadRuntimeCore();
  var raw = { decorations: [{ x: 5, y: 5, path: "/x.png" }] };
  Runtime.normalizeSpec(raw);
  assert.equal(raw.decorations.length, 1);
  assert.equal(Object.keys(raw.decorations[0]).length, 3, "orijinal decoration öğesine yeni alan eklenmemiş olmalı");
});
