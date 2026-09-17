/**
 * TOP-DOWN PLAYABLE GAME RUNTIME — Game Specification şeması.
 *
 * Runtime'ın "prompt'tan bağımsız" olmasının anahtarı burası: dışarıdan
 * (bugün elle yazılmış, ileride bir LLM'den gelecek) HAM bir JSON objesi
 * alır ve runtime'ın güvenle çalışabileceği, TÜM alanları doldurulmuş bir
 * kopya döner. Eksik/hatalı/mantıksız (negatif, NaN, tanımsız bir goal.type
 * vb.) alanlar SESSİZCE güvenli varsayılanlara düşer — kaynağı ne olursa
 * olsun (elle mi yazıldı, AI mi ürettti) runtime ASLA çökmemeli.
 *
 * GİRDİYİ ASLA MUTATE ETMEZ — yeni bir obje döner (bkz. server/tests/
 * topDownRuntimeCore.test.js'teki "does not mutate input" testi).
 *
 * Selin'in verdiği örnek spec (aynen desteklenir):
 *   {
 *     "gameType": "topDown",
 *     "theme": "forest",
 *     "player": { "speed": 220, "health": 3 },
 *     "enemies": { "count": 5, "speed": 80 },
 *     "world": { "width": 2400, "height": 1600 },
 *     "goal": { "type": "survive", "duration": 30 }
 *   }
 *
 * Genişletilebilirlik: yeni bir goal.type veya enemies.onPlayerCollision
 * modu eklemek, SADECE burada bir izin-listesi girdisi + gameState.js'te
 * (WIN_CONDITIONS/LOSE_CONDITIONS) veya runtime.js'te (handleCollisions)
 * karşılık gelen bir strateji eklemek anlamına gelir — hiçbir yerde
 * `if (gameType === "...")` tarzı, tek bir oyuna özel hardcode YOK.
 *
 * COLLECTIBLES + OBSTACLES (additive round): bu iki alan da AYNI güvenli-
 * normalize felsefesiyle burada işlenir — tek kaynak burası (bkz.
 * server/services/topdown/specGenerator.js'in artık BURAYA delege ettiği
 * ham collectibles/obstacles dizileri). Her iki alan da SPEC yazarına
 * (LLM/mock/elle) göre "merkez nokta" (x, y) olarak sunulur — player/enemy
 * ile AYNI konvansiyon; obstacle'lar internal olarak collision.js'in
 * beklediği sol-üst köşe dikdörtgenine burada çevrilir (bkz.
 * sanitizeObstacles). Bir collectible, sanitize edilmiş bir obstacle'ın
 * İÇİNE düşerse (asla ulaşılamaz bir hedef olmasın diye) SESSİZCE atlanır.
 */
window.TopDownRuntime = window.TopDownRuntime || {};

(function (ns) {
  "use strict";

  var DEFAULTS = {
    gameType: "topDown",
    theme: "neutral",
    player: { speed: 200, health: 3, radius: 16 },
    enemies: { count: 5, speed: 80, radius: 14, onPlayerCollision: "damagePlayer" },
    world: { width: 2000, height: 1400, tileSize: 64 },
    goal: { type: "survive", duration: 30, targetScore: 100 },
    lose: { type: "healthZero" },
    score: { pointsPerSecond: 10, pointsPerEnemyDefeated: 25, pointsPerCollectible: 15 },
    collectibles: [],
    obstacles: [],
    // ASSET LIBRARY round — her rol için varsayılan "asset yok" (null):
    // primitive rendering GÜVENLİ FALLBACK olarak çalışmaya devam eder (bkz.
    // sanitizeAssets ve renderer.js/assets.js). Buradaki değer bir URL/yol
    // DEĞİL — sadece şemanın "bu alanlar var, varsayılanı null" sözleşmesini
    // belgelemek için.
    // WORLD RENDERING round — "ground" EKLENDİ: "background" İLE AYNI
    // {url|null} sözleşmesi, ama FARKLI bir amaç için — küçük, GERÇEKTEN
    // döşenebilir (seamless) bir zemin karosu (ör. dungeon'ın 16x16 floor
    // tile'ı). "background" bazı temalarda (forest) aslında bir YAN-BAKIŞ
    // platformer sahne katmanı olduğu ve top-down'da döşendiğinde "yatay
    // şerit" görsel hatası ürettiği için (bkz. server/services/topdown/
    // assetResolver.js dosya başı notu) renderer.js artık zemin döşemesi
    // için "background" YERİNE "ground"u kullanıyor — "background" alanı
    // geriye dönük uyumluluk için AYNEN kalıyor (mevcut testler/tüketiciler
    // hiç bozulmadı), sadece zemin ÇİZİMİNDE artık kullanılmıyor.
    assets: { player: null, enemy: null, collectible: null, obstacle: null, background: null, ground: null },
  };

  var ASSET_ROLES = ["player", "enemy", "collectible", "obstacle", "background", "ground"];

  // WORLD RENDERING round — dekoratif (SADECE görsel) sahne objeleri için
  // makul bir üst sınır — collectibles/obstacles'ın kendi MAX_* sabitleriyle
  // AYNI "waste-avoidance" gerekçesi (gerçek güvenlik ağı zaten aşağıdaki
  // sanitizeDecorations'ın kendisi, bu sadece pahalı/anlamsız büyük dizileri
  // önceden kırpar).
  var MAX_DECORATIONS = 80;

  var GOAL_TYPES = ["survive", "score", "eliminate", "collect"];
  var COLLISION_MODES = ["damagePlayer", "removeOnContact"];
  var LOSE_TYPES = ["healthZero"];

  var MAX_COLLECTIBLES = 50;
  var MAX_OBSTACLES = 50;
  var DEFAULT_COLLECTIBLE_RADIUS = 12;
  var DEFAULT_COLLECTIBLE_VALUE = 1;
  var MIN_OBSTACLE_SIZE = 16;
  var MAX_OBSTACLE_SIZE = 400;

  function numberOr(value, fallback, min, max) {
    var n = typeof value === "number" && isFinite(value) ? value : fallback;
    if (typeof min === "number" && n < min) n = min;
    if (typeof max === "number" && n > max) n = max;
    return n;
  }

  function oneOf(value, allowed, fallback) {
    return allowed.indexOf(value) !== -1 ? value : fallback;
  }

  // Utils.clamp İLE AYNI, ama BİLEREK yerel/bağımsız bir kopya — specSchema.js
  // hiçbir başka runtime dosyasına (ns.Utils dahil) bağımlı DEĞİL (bkz. dosya
  // başı notu ve server/services/topdown/specSchemaBridge.js: sadece BU
  // dosyayı, tek başına, node:vm ile yüklüyor — bir dış bağımlılık eklemek
  // o köprüyü kırardı).
  function clampNumber(value, min, max) {
    if (value < min) return min;
    if (value > max) return max;
    return value;
  }

  function isFiniteNumber(value) {
    return typeof value === "number" && isFinite(value);
  }

  /**
   * value: ham collectibles dizisi adayı (LLM/mock/elle). Her öğe { x, y }
   * (dünya merkez koordinatı) + opsiyonel { radius, type, value } olabilir.
   * Geçersiz (x/y sayı değil) öğeler SESSİZCE atlanır — hiçbiri runtime'ı
   * çökertmez. obstacles varsa, bir obstacle'ın İÇİNE düşen collectible'lar
   * da atlanır (asla ulaşılamaz bir hedef bırakmamak için).
   */
  function sanitizeCollectibles(value, worldWidth, worldHeight, sanitizedObstacles) {
    if (!Array.isArray(value)) return [];
    var out = [];
    for (var i = 0; i < value.length && out.length < MAX_COLLECTIBLES; i++) {
      var item = value[i];
      if (!item || typeof item !== "object") continue;
      if (!isFiniteNumber(item.x) || !isFiniteNumber(item.y)) continue;

      var x = clampNumber(item.x, 0, worldWidth);
      var y = clampNumber(item.y, 0, worldHeight);
      var radius = numberOr(item.radius, DEFAULT_COLLECTIBLE_RADIUS, 4, 64);

      var insideObstacle = false;
      for (var j = 0; j < sanitizedObstacles.length; j++) {
        var ob = sanitizedObstacles[j];
        if (x >= ob.x && x <= ob.x + ob.width && y >= ob.y && y <= ob.y + ob.height) {
          insideObstacle = true;
          break;
        }
      }
      if (insideObstacle) continue;

      out.push({
        x: x,
        y: y,
        radius: radius,
        type: typeof item.type === "string" && item.type ? item.type : "generic",
        value: numberOr(item.value, DEFAULT_COLLECTIBLE_VALUE, 0, 100000),
      });
    }
    return out;
  }

  /**
   * value: ham obstacles dizisi adayı. Her öğe { x, y } (dünya merkez
   * koordinatı, player/enemy/collectible İLE AYNI konvansiyon) + opsiyonel
   * { width, height } olabilir. Internal olarak collision.js'in beklediği
   * { x, y, width, height } (SOL-ÜST köşe) şekline çevrilir — bu çeviri
   * SADECE burada olur, spec yazarı hep merkez nokta düşünür.
   */
  function sanitizeObstacles(value, worldWidth, worldHeight, tileSize) {
    if (!Array.isArray(value)) return [];
    var defaultSize = clampNumber(Math.round(tileSize * 0.75), MIN_OBSTACLE_SIZE, MAX_OBSTACLE_SIZE);
    var out = [];
    for (var i = 0; i < value.length && out.length < MAX_OBSTACLES; i++) {
      var item = value[i];
      if (!item || typeof item !== "object") continue;
      if (!isFiniteNumber(item.x) || !isFiniteNumber(item.y)) continue;

      var width = numberOr(item.width, defaultSize, MIN_OBSTACLE_SIZE, MAX_OBSTACLE_SIZE);
      var height = numberOr(item.height, defaultSize, MIN_OBSTACLE_SIZE, MAX_OBSTACLE_SIZE);
      var centerX = clampNumber(item.x, 0, worldWidth);
      var centerY = clampNumber(item.y, 0, worldHeight);

      out.push({
        x: clampNumber(centerX - width / 2, 0, Math.max(0, worldWidth - width)),
        y: clampNumber(centerY - height / 2, 0, Math.max(0, worldHeight - height)),
        width: width,
        height: height,
      });
    }
    return out;
  }

  /**
   * ASSET LIBRARY round — value: ham `{ player, enemy, collectible, obstacle,
   * background }` adayı (server tarafında assetResolver.js'in theme'e göre
   * ürettiği bir URL haritası, veya elle/LLM'den gelen KISMİ bir obje).
   * Runtime'ın bilmesi gereken TEK şey: her rol için ya geçerli, boş-olmayan
   * bir string (asset URL'i) ya da `null` (primitive fallback). Hiçbir dosya
   * yolu doğrulaması/varlık kontrolü YAPILMAZ (bu dosya DOM'a/ağa dokunmaz,
   * saf mantık) — geçersiz bir URL en kötü ihtimalle assets.js'te sessizce
   * "yüklenemedi" (fallback'e düşer) olur, ASLA çökmez.
   */
  function sanitizeAssets(value) {
    var raw = value && typeof value === "object" ? value : {};
    var out = {};
    ASSET_ROLES.forEach(function (role) {
      var v = raw[role];
      out[role] = typeof v === "string" && v.length > 0 ? v : null;
    });
    return out;
  }

  // WORLD DENSITY & GAMEPLAY READABILITY round — dekorasyonların "hepsi
  // aynı büyüklükte görünmemeli" isteğinin şema tarafı: opsiyonel bir
  // `scale` çarpanı (server/services/topdown/worldDecorations.js'in
  // deterministik ürettiği, [0.6, 1.6] aralığında bir sayı). Bu SADECE
  // görsel bir boyut çarpanı — hiçbir collision/gameplay hesabına girmiyor
  // (decorations zaten hiçbir yerde collision için okunmuyor, bkz. aşağıki
  // ana yorum). Eksik/geçersiz bir değer SESSİZCE varsayılana (1 — eski
  // davranışla BİREBİR aynı boyut) düşer, ASLA çökmez.
  var DEFAULT_DECORATION_SCALE = 1;
  var MIN_DECORATION_SCALE = 0.6;
  var MAX_DECORATION_SCALE = 1.6;

  /**
   * WORLD RENDERING round — value: ham dekorasyon dizisi adayı. Her öğe
   * { x, y, path } (dünya merkez koordinatı + asset URL'i) — collectibles/
   * obstacles İLE AYNI savunmacı felsefe: geçersiz (x/y sayı değil, path
   * boş/string değil) öğeler SESSİZCE atlanır, ASLA çökmez. Bu diziyi HİÇBİR
   * gameplay/collision sistemi OKUMAZ (SADECE renderer.js çizer) — bu yüzden
   * (collectibles/obstacles'ın aksine) obstacle-içi-mi/spawn'ı bloke mi
   * ediyor kontrolü BURADA YOK: server/services/topdown/worldDecorations.js
   * bu yerleşimi ZATEN güvenli (spawn'dan uzak, obstacle/collectible'ı
   * kapatmayan) üretiyor — burası sadece şekil/sınır güvenliği sağlıyor
   * (ör. elle yazılmış bir spec, dünya sınırları dışında bir nokta versin).
   *
   * WORLD DENSITY & GAMEPLAY READABILITY round — opsiyonel `scale` (bkz.
   * yukarıdaki sabitler) additive olarak eklendi; `{x,y,path}` sözleşmesi
   * HİÇ değişmedi (eski scale'sız decoration objeleri de aynen geçerli).
   */
  function sanitizeDecorations(value, worldWidth, worldHeight) {
    if (!Array.isArray(value)) return [];
    var out = [];
    for (var i = 0; i < value.length && out.length < MAX_DECORATIONS; i++) {
      var item = value[i];
      if (!item || typeof item !== "object") continue;
      if (!isFiniteNumber(item.x) || !isFiniteNumber(item.y)) continue;
      if (typeof item.path !== "string" || !item.path) continue;

      out.push({
        x: clampNumber(item.x, 0, worldWidth),
        y: clampNumber(item.y, 0, worldHeight),
        path: item.path,
        scale: numberOr(item.scale, DEFAULT_DECORATION_SCALE, MIN_DECORATION_SCALE, MAX_DECORATION_SCALE),
      });
    }
    return out;
  }

  function normalizeSpec(rawSpec) {
    var raw = rawSpec && typeof rawSpec === "object" ? rawSpec : {};
    var player = (raw.player && typeof raw.player === "object") ? raw.player : {};
    var enemies = (raw.enemies && typeof raw.enemies === "object") ? raw.enemies : {};
    var world = (raw.world && typeof raw.world === "object") ? raw.world : {};
    var goal = (raw.goal && typeof raw.goal === "object") ? raw.goal : {};
    var lose = (raw.lose && typeof raw.lose === "object") ? raw.lose : {};
    var score = (raw.score && typeof raw.score === "object") ? raw.score : {};

    var normalizedWorld = {
      width: numberOr(world.width, DEFAULTS.world.width, 400, 20000),
      height: numberOr(world.height, DEFAULTS.world.height, 400, 20000),
      tileSize: numberOr(world.tileSize, DEFAULTS.world.tileSize, 16, 512),
    };

    // obstacles ÖNCE sanitize edilir — collectibles'ın "bir obstacle'ın
    // içine düşme" kontrolü (bkz. sanitizeCollectibles) buna bağlı.
    var normalizedObstacles = sanitizeObstacles(
      raw.obstacles, normalizedWorld.width, normalizedWorld.height, normalizedWorld.tileSize
    );
    var normalizedCollectibles = sanitizeCollectibles(
      raw.collectibles, normalizedWorld.width, normalizedWorld.height, normalizedObstacles
    );

    return {
      gameType: typeof raw.gameType === "string" && raw.gameType ? raw.gameType : DEFAULTS.gameType,
      theme: typeof raw.theme === "string" && raw.theme ? raw.theme : DEFAULTS.theme,
      player: {
        speed: numberOr(player.speed, DEFAULTS.player.speed, 20, 2000),
        health: Math.max(1, Math.round(numberOr(player.health, DEFAULTS.player.health, 1, 20))),
        radius: numberOr(player.radius, DEFAULTS.player.radius, 4, 128),
      },
      enemies: {
        count: Math.max(0, Math.round(numberOr(enemies.count, DEFAULTS.enemies.count, 0, 200))),
        speed: numberOr(enemies.speed, DEFAULTS.enemies.speed, 0, 2000),
        radius: numberOr(enemies.radius, DEFAULTS.enemies.radius, 4, 128),
        onPlayerCollision: oneOf(enemies.onPlayerCollision, COLLISION_MODES, DEFAULTS.enemies.onPlayerCollision),
      },
      world: normalizedWorld,
      goal: {
        type: oneOf(goal.type, GOAL_TYPES, DEFAULTS.goal.type),
        duration: numberOr(goal.duration, DEFAULTS.goal.duration, 1, 3600),
        targetScore: numberOr(goal.targetScore, DEFAULTS.goal.targetScore, 1, 1000000),
      },
      lose: {
        type: oneOf(lose.type, LOSE_TYPES, DEFAULTS.lose.type),
      },
      score: {
        pointsPerSecond: numberOr(score.pointsPerSecond, DEFAULTS.score.pointsPerSecond, 0, 10000),
        pointsPerEnemyDefeated: numberOr(score.pointsPerEnemyDefeated, DEFAULTS.score.pointsPerEnemyDefeated, 0, 100000),
        pointsPerCollectible: numberOr(score.pointsPerCollectible, DEFAULTS.score.pointsPerCollectible, 0, 100000),
      },
      collectibles: normalizedCollectibles,
      obstacles: normalizedObstacles,
      assets: sanitizeAssets(raw.assets),
      // WORLD RENDERING round — additive, SADECE görsel (bkz. sanitizeDecorations
      // notu). Belirtilmezse boş dizi — hiçbir şey uydurulmaz, hiçbir şey
      // çökmez, renderer.js boş diziyi zaten güvenle no-op olarak ele alır.
      decorations: sanitizeDecorations(raw.decorations, normalizedWorld.width, normalizedWorld.height),
    };
  }

  ns.normalizeSpec = normalizeSpec;
  ns.SPEC_DEFAULTS = DEFAULTS;
  ns.SPEC_GOAL_TYPES = GOAL_TYPES;
  ns.SPEC_COLLISION_MODES = COLLISION_MODES;
  ns.SPEC_ASSET_ROLES = ASSET_ROLES;
})(window.TopDownRuntime);
