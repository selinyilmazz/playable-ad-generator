/**
 * WORLD RENDERING & CAMERA VISUAL OVERHAUL round — dünya DEKORASYON
 * (SADECE görsel, sıfır gameplay etkisi) yerleşimini üreten servis.
 *
 * AMAÇ: forest/dungeon gibi bir `decoration` asset havuzu olan temalarda
 * (bkz. server/services/topdown/assetResolver.js resolveTopDownDecorationAssets)
 * dünyayı, gameplay'e HİÇ dokunmadan (input/collision/enemy-AI/collectible/
 * obstacle/win-lose-restart sistemlerinin HİÇBİRİ bu diziyi okumuyor —
 * SADECE public/runtime/topdown/renderer.js'in drawDecorations() metodu
 * çizer, bkz. o dosyanın notu) sahne objeleriyle (ağaç/çalı/mantar/varil/...)
 * doldurmak.
 *
 * NEDEN normalizeSpec()'TEN SONRA çağrılıyor (server/routes/generate.js'te):
 * bu fonksiyon obstacles/collectibles'ın GERÇEK, zaten sanitize edilmiş
 * (dünya sınırlarına kelepçelenmiş, merkez->köşe dönüşümü tamamlanmış)
 * halini kullanır — bu sayede kendi kaçınma (avoidance) mantığı, spec
 * yazarının (LLM/mock) ham/mantıksız girdi verebileceği bir aşamada değil,
 * runtime'ın gerçekten çizeceği KESİN rakamlarla çalışır. Decorations'ın
 * KENDİSİ specSchema.js'in sanitizeDecorations()'ından YİNE geçer (bkz. o
 * dosyanın notu) — ama SADECE şekil/sınır güvenliği için, çünkü bu üretici
 * zaten güvenilir/kendi çıktımız (LLM/kullanıcıdan gelen ham girdi değil).
 *
 * DETERMİNİZM: Math.random() KULLANILMAZ — public/runtime/topdown/utils.js
 * ile AYNI karıştırma tekniğinin (bkz. o dosyanın deterministicHash01 notu)
 * bağımsız bir Node kopyası burada kullanılıyor (bu dosya server tarafında,
 * tarayıcı runtime'ının window.TopDownRuntime namespace'ine bağımlı OLAMAZ).
 * Aynı (world, obstacles, collectibles, decorationAssets) girdisi HER ZAMAN
 * aynı çıktıyı üretir — "aynı oyun sırasında deterministik tut" isteğinin
 * ötesinde, burada tam bir SAF FONKSİYON (yan etkisi yok, çağrılar arası
 * hafıza tutmuyor).
 *
 * WORLD DENSITY & GAMEPLAY READABILITY round — bu round ÜÇ şeyi değiştirdi
 * (mimari/sözleşme AYNI kaldı — hâlâ [{x,y,path}] üreten saf bir fonksiyon,
 * SADECE her öğeye opsiyonel bir `scale` alanı eklendi):
 *   1. WORLD COMPOSITION (HEDEF 9): sabit tek bir PLACEMENT_CHANCE yerine,
 *      dünya merkezine (player spawn) olan mesafeye göre üç halkalı bir
 *      yoğunluk fonksiyonu (bkz. zoneChanceFor) — merkeze yakın seyrek
 *      ("başlangıç alanı nispeten temiz"), orta halka yoğun, kenara yakın
 *      halka biraz daha yoğun. SPAWN_EXCLUSION_RADIUS İÇİNDE yerleşim HÂLÂ
 *      MUTLAK olarak yasak (sert bir kural, yoğunluk fonksiyonundan
 *      BAĞIMSIZ) — bu round'da GEVŞETİLMEDİ.
 *   2. DECORATION VARIETY (HEDEF 2): komşu hücrelerin (sol/üst) SEÇTİĞİ
 *      asset ile AYNI asset'in art arda tekrarını, mümkünse deterministik
 *      bir kaydırmayla önler (bkz. pickVariedAssetIndex).
 *   3. CAP/SPATIAL BIAS DÜZELTMESİ: eski sürüm, üretim SIRASINDA (satır-
 *      sütun taraması) MAX_DECORATIONS'a ulaşır ulaşmaz DURUYORDU — bu,
 *      büyük bir dünyada dünyanın sadece SOL-ÜST köşesinin doldurulup geri
 *      kalanının BOŞ kalmasına (mekansal önyargı) yol açıyordu. Şimdi ÖNCE
 *      TÜM adaylar toplanır, SONRA (gerekirse) listenin TAMAMINA eşit
 *      aralıklarla yayılan deterministik bir örnekleme (bkz. thinEvenly)
 *      ile kırpılır — kapak HER ZAMAN dünyanın tamamına yayılmış kalır.
 */

var CELL_SIZE_MULTIPLIER = 2.6;
var MAX_DECORATIONS = 64;
var SPAWN_EXCLUSION_RADIUS = 240;
var OBSTACLE_MARGIN = 24;
var COLLECTIBLE_MARGIN = 40;
var WORLD_EDGE_MARGIN = 40;

// WORLD DENSITY & GAMEPLAY READABILITY round — HEDEF 9 "world composition":
// merkeze (player spawn) olan mesafe / referans yarıçap oranına göre 3
// halka. Sınırlar BİLEREK SPAWN_EXCLUSION_RADIUS'tan (240) GENİŞ tutuldu —
// spawn'ın hemen dışı da (sert kural olmasa da) düşük yoğunlukla "nispeten
// temiz" kalsın diye. Orta halka en yoğun (ana oynanış alanı zenginleşsin),
// kenar halkası biraz daha yoğun ama orta kadar değil (görev: "world edge
// biraz daha yoğun olabilir").
var NEAR_ZONE_RATIO = 0.32;
var MID_ZONE_RATIO = 0.78;
var NEAR_ZONE_CHANCE = 0.22;
var MID_ZONE_CHANCE = 0.66;
var EDGE_ZONE_CHANCE = 0.5;

// HEDEF 2 "hepsi aynı büyüklükte ... görünmemeli" — her dekorasyona
// deterministik bir görsel ölçek çarpanı (renderer.js'in DECORATION_TILE_
// MULTIPLIER'ına ÇARPILIR, bkz. o dosyanın notu).
var DECORATION_SCALE_MIN = 0.75;
var DECORATION_SCALE_MAX = 1.35;

function hash01(x, y, salt) {
  var h = (x | 0) * 374761393 + (y | 0) * 668265263 + (salt | 0) * 2246822519;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}

function isFiniteNumber(value) {
  return typeof value === "number" && isFinite(value);
}

function distance(x1, y1, x2, y2) {
  var dx = x2 - x1;
  var dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

function overlapsObstacle(x, y, obstacles, margin) {
  for (var i = 0; i < obstacles.length; i++) {
    var ob = obstacles[i];
    if (
      x >= ob.x - margin &&
      x <= ob.x + ob.width + margin &&
      y >= ob.y - margin &&
      y <= ob.y + ob.height + margin
    ) {
      return true;
    }
  }
  return false;
}

function overlapsCollectible(x, y, collectibles, margin) {
  for (var i = 0; i < collectibles.length; i++) {
    var c = collectibles[i];
    var r = (isFiniteNumber(c.radius) ? c.radius : 0) + margin;
    if (distance(x, y, c.x, c.y) <= r) return true;
  }
  return false;
}

/**
 * WORLD DENSITY & GAMEPLAY READABILITY round — dist: merkeze (player
 * spawn) olan mesafe. referenceRadius: dünyanın merkezden en yakın kenara
 * olan mesafesi (min(w,h)/2) — "1.0" bunu ifade eder, köşelere doğru 1'i
 * aşabilir (dikdörtgen dünyada normal). Üç sabit halka — HEDEF 9'un
 * "merkezden dışarı doğru doğal bir composition" isteğinin doğrudan
 * karşılığı. Sadece bir OLASILIK döner — SPAWN_EXCLUSION_RADIUS/obstacle/
 * collectible/kenar kontrolleri BUNDAN TAMAMEN BAĞIMSIZ, HÂLÂ ayrıca
 * uygulanır (bkz. generateWorldDecorations).
 */
function zoneChanceFor(dist, referenceRadius) {
  var r = referenceRadius > 0 ? dist / referenceRadius : 0;
  if (r < NEAR_ZONE_RATIO) return NEAR_ZONE_CHANCE;
  if (r < MID_ZONE_RATIO) return MID_ZONE_CHANCE;
  return EDGE_ZONE_CHANCE;
}

/**
 * WORLD DENSITY & GAMEPLAY READABILITY round — HEDEF 2 "decoration variety":
 * col/row hücresi için deterministik bir "ilk tercih" asset index'i
 * (hash01 üzerinden) hesaplar; bu tercih SOL (col-1,row) veya ÜST
 * (col,row-1) komşusunun ZATEN seçtiği index İLE AYNIYSA (ve havuzda
 * birden fazla asset VARSA), deterministik olarak bir SONRAKİ index'e
 * kaydırılır (en fazla assets.length-1 deneme — sonsuz döngü YOK). Bu,
 * "aynı dekorasyonun art arda çok fazla tekrar etmesini" (görev metni)
 * komşuluk bazında azaltır — TAM bir rastgelelik/karışıklık garantisi
 * DEĞİL (deterministik kalması gerektiği için), ama gözle görülür bir
 * iyileştirme.
 */
function pickVariedAssetIndex(col, row, assetsLength, placedIndexByKey) {
  var preferred = Math.floor(hash01(col, row, 404) * assetsLength);
  if (preferred >= assetsLength) preferred = assetsLength - 1;
  if (assetsLength <= 1) return preferred;

  var leftIndex = placedIndexByKey[(col - 1) + "," + row];
  var topIndex = placedIndexByKey[col + "," + (row - 1)];
  var index = preferred;
  var attempts = 0;
  while ((index === leftIndex || index === topIndex) && attempts < assetsLength) {
    index = (index + 1) % assetsLength;
    attempts++;
  }
  return index;
}

/**
 * WORLD DENSITY & GAMEPLAY READABILITY round — candidates.length,
 * MAX_DECORATIONS'ı AŞIYORSA, listenin TAMAMINA (baştan sona) eşit
 * aralıklarla yayılan bir örnekleme ile kırpar (bkz. dosya başı "CAP/
 * SPATIAL BIAS DÜZELTMESİ" notu) — candidates ZATEN satır-sütun (yani
 * kabaca mekansal) sırada üretildiği için bu, eski "ilk N'i al" yönteminin
 * aksine, kırpılmış küme sonrası da dünyanın TAMAMINA yayılmış kalır.
 */
function thinEvenly(candidates, max) {
  if (candidates.length <= max) return candidates;
  var out = [];
  var step = candidates.length / max;
  for (var i = 0; i < max; i++) {
    out.push(candidates[Math.floor(i * step)]);
  }
  return out;
}

/**
 * world: { width, height, tileSize } (normalizeSpec()'in normalizedWorld'ü).
 * obstacles: sanitizeObstacles() çıktısı — [{x, y, width, height}] (sol-üst
 * köşe dikdörtgeni).
 * collectibles: sanitizeCollectibles() çıktısı — [{x, y, radius, ...}]
 * (merkez nokta + yarıçap).
 * decorationAssets: string[] — assetResolver.js'in resolveTopDownDecorationAssets()
 * + toDecorationPaths()'ünün ürettiği, theme'e ait gerçek asset path'leri.
 * Boşsa (ör. space/neutral — bu temalarda hiç `decoration` rolü tanımlı
 * değil) SESSİZCE boş dizi döner — UYDURULMUŞ/manifestte olmayan bir path
 * asla üretilmez.
 *
 * Dönüş: [{x, y, path, scale}] — specSchema.js'in sanitizeDecorations()'ının
 * beklediği giriş şekli (scale opsiyonel/additive).
 */
function generateWorldDecorations(world, obstacles, collectibles, decorationAssets) {
  var w = world && isFiniteNumber(world.width) ? world.width : 0;
  var h = world && isFiniteNumber(world.height) ? world.height : 0;
  var tileSize = world && isFiniteNumber(world.tileSize) && world.tileSize > 0 ? world.tileSize : 64;
  var assets = Array.isArray(decorationAssets) ? decorationAssets.filter(function (p) {
    return typeof p === "string" && p.length > 0;
  }) : [];

  if (w <= 0 || h <= 0 || assets.length === 0) return [];

  var safeObstacles = Array.isArray(obstacles) ? obstacles : [];
  var safeCollectibles = Array.isArray(collectibles) ? collectibles : [];
  var cell = tileSize * CELL_SIZE_MULTIPLIER;
  var cols = Math.max(1, Math.floor(w / cell));
  var rows = Math.max(1, Math.floor(h / cell));
  var centerX = w / 2;
  var centerY = h / 2;
  var referenceRadius = Math.min(w, h) / 2;

  var candidates = [];
  var placedIndexByKey = {};

  for (var row = 0; row < rows; row++) {
    for (var col = 0; col < cols; col++) {
      var jitterX = hash01(col, row, 202);
      var jitterY = hash01(col, row, 303);
      var x = col * cell + jitterX * cell;
      var y = row * cell + jitterY * cell;

      if (x < WORLD_EDGE_MARGIN || x > w - WORLD_EDGE_MARGIN) continue;
      if (y < WORLD_EDGE_MARGIN || y > h - WORLD_EDGE_MARGIN) continue;

      var distFromCenter = distance(x, y, centerX, centerY);
      if (distFromCenter < SPAWN_EXCLUSION_RADIUS) continue;

      var roll = hash01(col, row, 101);
      if (roll > zoneChanceFor(distFromCenter, referenceRadius)) continue;

      if (overlapsObstacle(x, y, safeObstacles, OBSTACLE_MARGIN)) continue;
      if (overlapsCollectible(x, y, safeCollectibles, COLLECTIBLE_MARGIN)) continue;

      var assetIndex = pickVariedAssetIndex(col, row, assets.length, placedIndexByKey);
      placedIndexByKey[col + "," + row] = assetIndex;

      var scale = DECORATION_SCALE_MIN + hash01(col, row, 505) * (DECORATION_SCALE_MAX - DECORATION_SCALE_MIN);

      candidates.push({ x: x, y: y, path: assets[assetIndex], scale: scale });
    }
  }

  return thinEvenly(candidates, MAX_DECORATIONS);
}

module.exports = {
  generateWorldDecorations: generateWorldDecorations,
};
