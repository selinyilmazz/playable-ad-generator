/**
 * PROMPT -> SPEC -> RUNTIME entegrasyonu — MOCK Game Specification üretici.
 *
 * OPENROUTER_API_KEY yokken (veya gerçek LLM çağrısı/JSON parse başarısız
 * olursa) kullanılır — böylece Prompt -> Spec -> Runtime akışı, key
 * olmadan da (mevcut generate/autofix/improve mock davranışıyla AYNI
 * ruhta) uçtan uca test edilebilir.
 *
 * SPEC CONTENT EXTRACTION round: theme'e ek olarak artık promptun AÇIKÇA
 * belirttiği basit sinyalleri de çıkarır — enemy count, collectible count
 * (+ güvenli yerleşim), obstacle count (+ güvenli yerleşim), goal type,
 * hedef skor/süre. TÜM extraction BİLEREK BASİT ve GÜVENLİ tutuldu (görev
 * talimatı: "Basit ve güvenli extraction yeterli. Gereksiz karmaşıklaştırma")
 * — hiçbir NLP/parsing kütüphanesi yok, SADECE eligibility.js/
 * gameTypeDetection.js İLE AYNI substring/anahtar-kelime felsefesi + "bir
 * sayı token'ından hemen sonra ilgili kelime var mı" kontrolü. Sadece DİGİT
 * biçimindeki sayılar ("5", "10") tanınır — yazıyla yazılmış sayılar
 * ("beş", "five") kapsam dışı: bu durumda o alan için hiçbir şey
 * DÖNDÜRÜLMEZ ve specSchemaBridge.js'in çağıracağı normalizeSpec() zaten
 * specSchema.js'in kendi güvenli varsayılanına (DEFAULTS) düşer — hiçbir
 * şey UYDURULMAZ, hiçbir şey ÇÖKMEZ.
 */

var THEME_KEYWORDS = {
  forest: ["forest", "orman", "jungle", "woods", "jungle"],
  dungeon: ["dungeon", "zindan", "cave", "mağara", "crypt", "dungeons"],
  space: ["space", "uzay", "galaxy", "alien", "spaceship"],
};

var THEME_ORDER = ["forest", "dungeon", "space"];

function detectTheme(promptLower) {
  for (var i = 0; i < THEME_ORDER.length; i++) {
    var theme = THEME_ORDER[i];
    var keywords = THEME_KEYWORDS[theme];
    for (var j = 0; j < keywords.length; j++) {
      if (promptLower.indexOf(keywords[j]) !== -1) return theme;
    }
  }
  return "neutral";
}

// ================== SAYI + ANAHTAR-KELİME EXTRACTION ==================

// \p{L}/\p{N} (Unicode harf/rakam) kullanılıyor ki Türkçe karakterler
// ("ı", "ğ", "ş", "ü", "ö", "ç") kelime ayırma sırasında BOZULMASIN
// ("altın" -> "altın", "zıplama" -> "zıplama", tek parça kalır).
var WORD_SPLIT_RE = /[^\p{L}\p{N}]+/u;

function tokenize(promptLower) {
  return promptLower.split(WORD_SPLIT_RE).filter(Boolean);
}

function containsAny(promptLower, keywords) {
  return keywords.some(function (kw) {
    return promptLower.indexOf(kw) !== -1;
  });
}

// Bir sayı token'ından SONRAKİ en fazla bu kadar kelimeye bakılır — "5
// zombi", "10 tane altın", "eliminate all 8 guards" gibi (sayı GENELDE
// ismin ÖNÜNDE gelir, hem Türkçe hem İngilizce'de) çoğu gerçek promptu
// kapsayan basit bir pencere.
var NUMBER_KEYWORD_WINDOW = 3;

/**
 * tokens içinde, hemen ardından (NUMBER_KEYWORD_WINDOW kelime içinde)
 * `keywords`'ten biri geçen İLK sayı token'ını sayıya çevirip döner.
 * Bulunamazsa `null` (— "bulamadım" ile "0 bulundu" AYNI şey DEĞİL, bu
 * yüzden 0 değil null döner; çağıran taraf null'u "spec'e hiç ekleme, doğal
 * varsayılana bırak" olarak yorumlar).
 */
function extractNumberNear(tokens, keywords) {
  for (var i = 0; i < tokens.length; i++) {
    if (!/^\d+$/.test(tokens[i])) continue;
    var windowText = tokens.slice(i + 1, i + 1 + NUMBER_KEYWORD_WINDOW).join(" ");
    var matched = keywords.some(function (kw) {
      return windowText.indexOf(kw) !== -1;
    });
    if (matched) return parseInt(tokens[i], 10);
  }
  return null;
}

var ENEMY_COUNT_KEYWORDS = [
  "zombie", "zombies", "zombi", "zombiler",
  "enemy", "enemies", "düşman", "düşmanlar", "dusman", "dusmanlar",
  "monster", "monsters", "canavar", "canavarlar",
  "guard", "guards", "muhafız", "muhafızlar",
  "creature", "creatures", "yaratık", "yaratıklar",
];

var COLLECTIBLE_COUNT_KEYWORDS = [
  "coin", "coins", "gold", "para",
  "altın", "altin", "altınlar", "altinlar",
  "gem", "gems", "elmas", "elmaslar",
  "star", "stars", "yıldız", "yıldızlar", "yildiz", "yildizlar",
  "item", "items", "eşya", "eşyalar",
  "treasure", "treasures", "hazine", "hazineler",
  "fruit", "fruits", "meyve", "meyveler",
  "key", "keys", "anahtar", "anahtarlar",
];

var OBSTACLE_COUNT_KEYWORDS = [
  "rock", "rocks", "kaya", "kayalar",
  "wall", "walls", "duvar", "duvarlar",
  "obstacle", "obstacles", "engel", "engeller",
  "barrier", "barriers", "bariyer", "bariyerler",
  "tree", "trees", "ağaç", "ağaçlar", "agac", "agaclar",
  "crate", "crates", "sandık", "sandıklar",
];

// Öncelik sırası (üstten alta İLK eşleşen kazanır): "eliminate" > "collect"
// (collectible SAYISI > 0 İSE) > "score" > "survive" > (hiçbiri yoksa)
// specSchema.js'in KENDİ varsayılanı ("survive"). Sadece collectible'lar
// VARSA "collect" düşünülür — aksi halde "topla" gibi bir kelime tesadüfen
// geçse bile toplanacak hiçbir şey olmayan bir "collect" hedefi ÜRETİLMEZ
// (bkz. gameState.js'in "collect" win condition'ı: collectibles.length=0
// ise ASLA won olmaz — anlamsızca bitmeyen bir oyun üretmemek için).
var ELIMINATE_GOAL_KEYWORDS = [
  "eliminate", "kill all", "defeat all", "destroy all",
  "yok et", "hepsini yok", "hepsini yen", "hepsini öldür",
];
var COLLECT_GOAL_KEYWORDS = [
  "collect", "gather", "topla", "toplaman", "toplaması", "toplayarak", "pick up",
];
var SCORE_GOAL_KEYWORDS = ["score", "points", "point", "puan", "skor", "high score"];
var SURVIVE_GOAL_KEYWORDS = ["survive", "survival", "hayatta kal", "hayatta kalma"];

var DURATION_KEYWORDS = ["second", "seconds", "sec", "saniye", "sn"];
var SCORE_TARGET_KEYWORDS = ["point", "points", "puan", "skor"];

// specSchema.js'in KENDİ MAX_COLLECTIBLES/MAX_OBSTACLES (50) sınırından
// BİLEREK biraz daha muhafazakar: tek bir reklam sahnesi için zaten makul
// bir üst sınır — "1000000 altın" gibi absürt bir prompt, specSchema'nın
// güvenle 50'ye keseceği ama YİNE DE gereksiz büyük bir ara dizi
// oluşturmayı BAŞTAN önler (performans/israf, güvenlik değil — specSchema
// zaten tek başına da çökmeyi engelliyor).
var MAX_GENERATED_ITEMS = 30;

// Mock'un yerleşim hesaplarken varsaydığı dünya boyutu — specSchema.js'in
// DEFAULTS.world.width/height (2000x1400) İLE AYNI DEĞER, BİLEREK yerel bir
// sabit olarak kopyalandı (bu dosya specSchema.js'e (bir tarayıcı dosyasına)
// BAĞIMLI DEĞİL ve buildMockSpec() zaten `world` alanını hiç döndürmüyor —
// gerçek normalize edilmiş dünya de facto BU olacak). Bu değer ileride
// specSchema'da değişirse bile ÇÖKMEZ: yerleşim noktaları sadece biraz daha
// az "ortalanmış" görünür — sanitizeObstacles/sanitizeCollectibles HER
// İHTİMALDE gerçek dünya sınırlarına güvenle kelepçeler.
var ASSUMED_WORLD_WIDTH = 2000;
var ASSUMED_WORLD_HEIGHT = 1400;

// Player HER ZAMAN tam dünya merkezinde doğar (bkz. runtime.js
// resetEntities) — bu round'un "player spawn noktasını bloke etme" güvenlik
// kuralı BURADA karşılanıyor: bu yarıçapın içine düşen bir yerleşim noktası
// merkezden UZAĞA itilir (bkz. nudgeAwayFromSpawn).
var SPAWN_EXCLUSION_RADIUS = 220;

function distance(x1, y1, x2, y2) {
  var dx = x1 - x2;
  var dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

function nudgeAwayFromSpawn(x, y, worldWidth, worldHeight) {
  var centerX = worldWidth / 2;
  var centerY = worldHeight / 2;
  if (distance(x, y, centerX, centerY) >= SPAWN_EXCLUSION_RADIUS) return { x: x, y: y };

  // Merkeze göre yönü koru (0'a bölme olmasın diye tam merkezdeyse sabit
  // bir yön seç) — rastgelelik YOK, mock'un öngörülebilir/test edilebilir
  // kalması BİLİNÇLİ bir tercih.
  var dx = x - centerX || 1;
  var dy = y - centerY || 1;
  var len = Math.sqrt(dx * dx + dy * dy) || 1;
  var pushedX = x + (dx / len) * SPAWN_EXCLUSION_RADIUS;
  var pushedY = y + (dy / len) * SPAWN_EXCLUSION_RADIUS;
  return {
    x: Math.max(0, Math.min(worldWidth, pushedX)),
    y: Math.max(0, Math.min(worldHeight, pushedY)),
  };
}

/**
 * count adet {x,y} noktasını dünya üzerine BİR IZGARA olarak dağıtır
 * (rastgelelik YOK — deterministik, test edilebilir, aynı prompt HER ZAMAN
 * aynı Spec'i üretir). `offsetPhase` (0..1), collectibles/obstacles
 * IZGARALARININ birbiriyle ÇAKIŞMA OLASILIĞINI azaltmak için hücre içinde
 * farklı bir yatay konum kullanır — kesin bir çakışmazlık GARANTİSİ değil
 * (o garanti zaten specSchema.js'in sanitizeCollectibles'ında var: bir
 * obstacle'ın içine düşen collectible sessizce elenir), sadece "mümkün
 * olduğunca az elensin" için ucuz bir iyileştirme.
 */
function generateGridPlacement(count, worldWidth, worldHeight, offsetPhase) {
  if (!(count > 0)) return [];
  var n = Math.min(count, MAX_GENERATED_ITEMS);
  var margin = 180;
  var cols = Math.max(1, Math.ceil(Math.sqrt(n)));
  var rows = Math.max(1, Math.ceil(n / cols));
  var cellW = (worldWidth - margin * 2) / cols;
  var cellH = (worldHeight - margin * 2) / rows;

  var points = [];
  for (var i = 0; i < n; i++) {
    var col = i % cols;
    var row = Math.floor(i / cols);
    var x = margin + cellW * (col + 0.5 + offsetPhase * 0.3);
    x = Math.max(margin, Math.min(worldWidth - margin, x));
    // offsetPhase y'yi de kaydırır (SADECE x'i değil) — collectibles
    // (offsetPhase=0.5) ve obstacles (offsetPhase=0) SIK SIK aynı satır
    // sayısına düşüyor (ör. n=4 ve n=6 ikisi de rows=2 üretiyor); x-only
    // kaydırma bazen ikisini de aynı hücreye yakın bırakabiliyor. y'yi de
    // hafifçe kaydırmak (basit, deterministik, ekstra karmaşıklık YOK) bu
    // çakışmayı pratikte büyük ölçüde azaltır. Gerçek/tek güvenlik ağı yine
    // specSchema.js'in obstacle-içi-collectible filtrelemesi.
    var y = margin + cellH * (row + 0.5 + offsetPhase * 0.3);
    y = Math.max(margin, Math.min(worldHeight - margin, y));
    var nudged = nudgeAwayFromSpawn(x, y, worldWidth, worldHeight);
    points.push({ x: Math.round(nudged.x), y: Math.round(nudged.y) });
  }
  return points;
}

/**
 * hasCollectibles: bu promptta ZATEN bir collectible sayısı bulunup
 * bulunmadığı (bkz. dosya başı "collect" önceliği notu).
 */
function detectGoal(promptLower, tokens, hasCollectibles) {
  var type = "survive"; // specSchema.js DEFAULTS.goal.type İLE AYNI güvenli varsayılan
  if (containsAny(promptLower, ELIMINATE_GOAL_KEYWORDS)) {
    type = "eliminate";
  } else if (hasCollectibles && containsAny(promptLower, COLLECT_GOAL_KEYWORDS)) {
    type = "collect";
  } else if (containsAny(promptLower, SCORE_GOAL_KEYWORDS)) {
    type = "score";
  } else if (containsAny(promptLower, SURVIVE_GOAL_KEYWORDS)) {
    type = "survive";
  }

  var goal = { type: type };
  var duration = extractNumberNear(tokens, DURATION_KEYWORDS);
  if (duration != null) goal.duration = duration;
  var targetScore = extractNumberNear(tokens, SCORE_TARGET_KEYWORDS);
  if (targetScore != null) goal.targetScore = targetScore;
  return goal;
}

/**
 * prompt: kullanıcının ham prompt metni.
 * Dönüş: normalizeSpec()'e verilecek, KISMİ (eksik alanlı) ama geçerli bir
 * ham spec objesi. Promptta AÇIKÇA belirtilmeyen HER ALAN dönüş objesine
 * HİÇ KONULMAZ (undefined bırakılır) — specSchemaBridge.js'in çağıracağı
 * normalizeSpec() bu eksik alanları KENDİ güvenli varsayılanlarıyla
 * (specSchema.js DEFAULTS) doldurur. Hiçbir şey UYDURULMAZ.
 */
function buildMockSpec(prompt) {
  var raw = prompt || "";
  var lower = raw.toLowerCase();
  var tokens = tokenize(lower);

  var spec = {
    gameType: "topDown",
    theme: detectTheme(lower),
    collectibles: [],
    obstacles: [],
  };

  var enemyCount = extractNumberNear(tokens, ENEMY_COUNT_KEYWORDS);
  if (enemyCount != null) {
    spec.enemies = { count: enemyCount };
  }

  var collectibleCount = extractNumberNear(tokens, COLLECTIBLE_COUNT_KEYWORDS);
  if (collectibleCount != null && collectibleCount > 0) {
    spec.collectibles = generateGridPlacement(collectibleCount, ASSUMED_WORLD_WIDTH, ASSUMED_WORLD_HEIGHT, 0.5);
  }

  var obstacleCount = extractNumberNear(tokens, OBSTACLE_COUNT_KEYWORDS);
  if (obstacleCount != null && obstacleCount > 0) {
    spec.obstacles = generateGridPlacement(obstacleCount, ASSUMED_WORLD_WIDTH, ASSUMED_WORLD_HEIGHT, 0);
  }

  spec.goal = detectGoal(lower, tokens, spec.collectibles.length > 0);
  // specSchema.js'in TEK desteklediği değer (LOSE_TYPES = ["healthZero"]) —
  // extract edilecek başka bir seçenek YOK, bu yüzden hep sabit.
  spec.lose = { type: "healthZero" };

  return spec;
}

module.exports = {
  buildMockSpec: buildMockSpec,
  detectTheme: detectTheme,
  extractNumberNear: extractNumberNear,
  tokenize: tokenize,
};
