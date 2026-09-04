/**
 * Game Asset Pipeline — merkezi asset metadata listesi.
 *
 * ROUND 18 — "Multi-Genre Professional Asset Library Architecture".
 * Bu dosya artık asset verisinin KENDİSİNİ taşımıyor — bir AGGREGATOR
 * (birleştirici). Gerçek veri, her biri kendi paketine ait
 * server/config/packs/<pack>.js dosyalarında yaşıyor:
 *   - packs/legacy-core.js          — orijinal 39 kayıt (paketsiz, düz
 *                                      public/assets/ altında)
 *   - packs/sunnyland-forest.js     — ROUND 14, 17 kayıt (CC0)
 *   - packs/kenney-space-shooter.js — ROUND 16, 22 kayıt (CC0)
 *
 * Bu, Selin'in "10 farklı tür için asset kiti gerekecek, tek dosya
 * yönetilemez hale gelir" mimari isteğinin doğrudan karşılığı: yeni bir
 * pack eklemek artık BU DOSYAYI büyütmüyor, sadece packs/ altına YENİ bir
 * dosya ekleyip aşağıdaki ACTIVE_PACK_MODULES listesine bir satır eklemek
 * demek — mevcut paketlerin hiçbiri (satır sayısı yüzlerce/binlerce olsa
 * bile) etkilenmiyor, diff'ler izole kalıyor.
 *
 * HİÇBİR id/path/category/name/tags/compatibleGameTypes/visualStyle/
 * animationType/gameplayRole/pack/theme değeri bu refactor'da DEĞİŞMEDİ —
 * sadece dosya organizasyonu değişti (bkz. her pack dosyasının kendi "ROUND
 * 18 NOTU"). ASSET_MANIFEST'in içeriği (ve varsayılan sırası: legacy-core,
 * sonra sunnyland-forest, sonra kenney-space-shooter — ekleniş sırasıyla
 * birebir aynı) REFACTOR ÖNCESİYLE BİREBİR AYNI kalacak şekilde birleştirildi.
 *
 * category (ROUND 18 ile 9'dan 14 değere genişletilen enum):
 *   "character"   — oyuncu tarafından kontrol edilen/oyuncuyu temsil eden figür
 *   "enemy"        — düşman/engel-figür (rakip karakter)
 *   "collectible"  — toplanabilir/ödül/eşya (coin, gem, meyve, ekipman parçası...)
 *   "obstacle"     — çarpışma/kaçınma amaçlı sahne objesi
 *   "platform"     — zemin/basamak/yapısal seviye elemanı
 *   "projectile"   — atılan/fırlatılan, hareket eden saldırı objesi
 *   "background"   — tam ekran arka plan sahnesi
 *   "effect"       — geri bildirim/görsel efekt (çarpışma, parlama, duman...)
 *   "game-object"  — yukarıdakilerin hiçbirine tam oturmayan, oyun içi
 *                    işlevsel obje (örn. sepet/hedef kabı)
 *   "tile"         — YENİ (ROUND 18): tekrarlanabilir zemin/duvar/döşeme
 *                    karosu (dungeon/farming/racing gibi tile-tabanlı
 *                    türler için) — "platform"tan farkı: platform tek bir
 *                    "basamak" parçası, tile bir yüzeyi DÖŞEMEK için
 *                    tekrarlanan birim.
 *   "powerup"      — YENİ (ROUND 18): geçici bir oyun-içi yetenek/durum
 *                    değişikliği veren toplanabilir (örn. hız artışı, ateş
 *                    hızı) — "collectible"tan farkı: collectible skor/
 *                    ilerleme için toplanır, powerup MEKANİĞİ DEĞİŞTİRİR.
 *   "weapon"       — YENİ (ROUND 18): oyuncunun kullandığı/taşıdığı saldırı
 *                    aracı görseli (kılıç, tabanca, yay...) — "projectile"
 *                    ile karıştırılmasın: weapon silahın KENDİSİ, projectile
 *                    o silahtan FIRLAYAN mermi/ok/lazer.
 *   "vehicle"      — YENİ (ROUND 18): oyuncunun bindiği/kullandığı araç
 *                    (araba, tekne, uçak...) — racing gibi türler için.
 *   "ui"           — YENİ (ROUND 18): oyun içi arayüz elemanı (buton,
 *                    ikon, HUD parçası) — ASSET_GROUPS'ta zaten "UI" grubu
 *                    hazır bekliyordu (bkz. aşağıda), şimdi category
 *                    tarafında da resmi bir karşılığı var.
 *   Bu 5 yeni değer bugün HİÇBİR assette KULLANILMIYOR (mevcut 78 kaydın
 *   hiçbiri kategorisini değiştirmedi) — sadece gelecekte eklenecek
 *   paketlerin (bkz. server/config/assetPacks.js "planned" paketler)
 *   assetlerinin doğru sınıflandırılabilmesi için şema ÖNCEDEN hazırlandı.
 *
 * gameplayRole (OPSİYONEL): category tek başına yetmediğinde eklenen ince
 * ayar. Belirtilmemişse category ile aynı kabul edilir.
 *
 * compatibleGameTypes: assetKits.js'teki GAME_KITS tanımlarıyla birebir
 * tutarlı. Değerler: "endless-runner" | "space-shooter" | "forest-platformer"
 * | "fruit-puzzle" (ROUND 18 itibarıyla planlanan yeni türler henüz AKTİF
 * DEĞİL — bkz. server/config/plannedGameKits.js — bu yüzden burada
 * kullanılmıyorlar; bir tür GAME_KITS'e eklenmeden hiçbir asset ona
 * "compatible" olarak işaretlenmeyecek).
 *
 * visualStyle / animationType: pack başına sabit (bkz. her pack dosyası).
 */
const { LEGACY_CORE_ASSETS } = require("./packs/legacy-core");
const { SUNNYLAND_FOREST_ASSETS } = require("./packs/sunnyland-forest");
const { KENNEY_SPACE_SHOOTER_ASSETS } = require("./packs/kenney-space-shooter");
const { RACING_ASSETS } = require("./packs/racing");
const { TINY_DUNGEON_ASSETS } = require("./packs/tiny-dungeon");
const { CAR_KIT_ASSETS } = require("./packs/car-kit");
const { CITY_KIT_ROADS_ASSETS } = require("./packs/city-kit-roads");
const { CITY_KIT_INDUSTRIAL_ASSETS } = require("./packs/city-kit-industrial");
const { FOOD_KIT_ASSETS } = require("./packs/food-kit");
const { RETRO_FANTASY_ASSETS } = require("./packs/retro-fantasy");
const { RETRO_TEXTURES_FANTASY_ASSETS } = require("./packs/retro-textures-fantasy");
const { PARTICLE_PACK_ASSETS } = require("./packs/particle-pack");

// Aktif paket modüllerinin TEK listesi — yeni bir pack eklerken sadece
// yukarıya bir require() ve buraya bir satır eklenir, başka HİÇBİR YER
// değişmez (assetPacks.js registry'si bu diziyi build zamanında değil,
// kendi başına, aynı kaynaktan türetir — bkz. o dosya).
// ROUND 23 — RACING_ASSETS eklendi (bkz. packs/racing.js). ROUND 24 —
// TINY_DUNGEON_ASSETS eklendi (bkz. packs/tiny-dungeon.js). ROUND 25 — 7
// yeni pack birden eklendi (bkz. packs/car-kit.js, city-kit-roads.js,
// city-kit-industrial.js, food-kit.js, retro-fantasy.js,
// retro-textures-fantasy.js, particle-pack.js). Önceki paketler ve
// sıraları HİÇ değişmedi, sadece sona eklendi.
var ASSET_MANIFEST = [].concat(
  LEGACY_CORE_ASSETS,
  SUNNYLAND_FOREST_ASSETS,
  KENNEY_SPACE_SHOOTER_ASSETS,
  RACING_ASSETS,
  TINY_DUNGEON_ASSETS,
  CAR_KIT_ASSETS,
  CITY_KIT_ROADS_ASSETS,
  CITY_KIT_INDUSTRIAL_ASSETS,
  FOOD_KIT_ASSETS,
  RETRO_FANTASY_ASSETS,
  RETRO_TEXTURES_FANTASY_ASSETS,
  PARTICLE_PACK_ASSETS
);

/**
 * PHASE 5 — "Professional Game Asset System" genişletmesi.
 *
 * Yukarıdaki kayıtlar (id/path/category/name/tags/compatibleGameTypes/
 * visualStyle/animationType/gameplayRole) HİÇBİR ŞEKİLDE elle değiştirilmedi.
 * Aşağıdaki adımlar ASSET LİSTESİNİ TEK BİR YERDEN, additive bir
 * post-processing katmanıyla zenginleştiriyor.
 *
 * Yeni alanlar (her asset için):
 *   type      — "image" (bugün TÜM assetler tek-kare statik görsel/SVG/PNG).
 *   preview   — küçük resim/liste görünümünde kullanılacak önizleme yolu.
 *   animation — karakter/düşman (group: CHARACTERS) assetleri için, ileride
 *               gerçek sprite-frame verisi eklenebilecek boş bir state
 *               iskeleti: { idle, run, jump, attack, hit, death }, hepsi
 *               `null`.
 *   group     — Selin'in istediği profesyonel taksonomi: CHARACTERS /
 *               ENVIRONMENTS / PLATFORMS / OBJECTS / COLLECTIBLES / EFFECTS
 *               / UI. `category` enum'unun YERİNE geçmiyor, sadece dışa
 *               dönük (frontend/`/api/assets`) profesyonel görünüm için.
 */
var ASSET_GROUPS = [
  "CHARACTERS",
  "ENVIRONMENTS",
  "PLATFORMS",
  "OBJECTS",
  "COLLECTIBLES",
  "EFFECTS",
  "UI",
];

// category (14 değer, yukarıda tanımlı) -> group (7 değer) eşlemesi. Tek
// kaynak — her iki alan da BURADAN türetilir.
var CATEGORY_TO_GROUP = {
  character: "CHARACTERS",
  enemy: "CHARACTERS",
  collectible: "COLLECTIBLES",
  obstacle: "OBJECTS",
  platform: "PLATFORMS",
  // projectile: gameplay olarak kısa ömürlü, saldırı/görsel-geri-bildirim
  // amaçlı (bkz. fireball notu yukarıda) — EFFECTS grubuna en yakın.
  projectile: "EFFECTS",
  background: "ENVIRONMENTS",
  effect: "EFFECTS",
  "game-object": "OBJECTS",
  // ---- ROUND 18: yeni 5 category'nin group eşlemesi (bugün 0 asset
  // taşıyor, ileride gerçek paket assetleri eklendiğinde otomatik doğru
  // gruba düşsünler diye şimdiden tanımlı) ----
  // tile: PLATFORMS'a en yakın — ikisi de "zemin/yapı" işlevi görüyor.
  tile: "PLATFORMS",
  // powerup: collectible'ın bir alt-türü (toplanıyor) — COLLECTIBLES.
  powerup: "COLLECTIBLES",
  // weapon: oyuncunun taşıdığı bir OBJECT (karakterin kendisi değil).
  weapon: "OBJECTS",
  // vehicle: oyuncunun bindiği/kontrol ettiği ana figür — bir "character"a
  // gameplay olarak en yakın (racing'de araba = "player" rolünü dolduran
  // şey), bu yüzden weapon/tile gibi bir "OBJECT" değil, CHARACTERS.
  vehicle: "CHARACTERS",
  // ui: ASSET_GROUPS'ta zaten hazır bekleyen "UI" grubu — ilk gerçek
  // eşleşmesi.
  ui: "UI",
};

function categoryToGroup(category) {
  return CATEGORY_TO_GROUP[category] || "OBJECTS";
}

// Karakter/düşman/vehicle grubundaki assetler için "hazır ama boş"
// animasyon state iskeleti — hiçbir gerçek frame verisi YOK, sadece
// ileride bu alanların dolabileceğini gösteren bir sözleşme.
// ROUND 18: "vehicle" da CHARACTERS grubuna girdiği ve gerçek bir araç da
// (araba/tekne) idle/hareket state'leri taşıyabileceği için buraya eklendi
// — bugün hiçbir vehicle asseti yok, bu satırın hiçbir etkisi yok, sadece
// şema hazır.
function buildAnimationSkeleton(category) {
  if (category !== "character" && category !== "enemy" && category !== "vehicle") return null;
  return {
    idle: null,
    run: null,
    jump: null,
    attack: null,
    hit: null,
    death: null,
  };
}

var ASSET_MANIFEST_ENRICHED = ASSET_MANIFEST.map(function (asset) {
  return Object.assign({}, asset, {
    type: "image",
    preview: asset.path,
    animation: buildAnimationSkeleton(asset.category),
    group: categoryToGroup(asset.category),
  });
});

module.exports = {
  // ASSET_MANIFEST: geriye dönük uyumluluk için AYNEN korunuyor — sadece 9
  // orijinal alan (+ pack/theme/gameplayRole gibi opsiyonel eklemeler).
  ASSET_MANIFEST: ASSET_MANIFEST,
  ASSET_MANIFEST_ENRICHED: ASSET_MANIFEST_ENRICHED,
  ASSET_GROUPS: ASSET_GROUPS,
  CATEGORY_TO_GROUP: CATEGORY_TO_GROUP,
  categoryToGroup: categoryToGroup,
};
