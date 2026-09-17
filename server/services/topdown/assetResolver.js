/**
 * ASSET LIBRARY -> TOPDOWN RUNTIME entegrasyonu — ASSET SEÇİM/RESOLUTION
 * katmanı.
 *
 * AMAÇ: TopDown oyunları artık sadece primitive/geometrik çizim yerine,
 * MEVCUT asset library'deki (server/config/assetKits.js + assetManifest.js)
 * gerçek, kürasyonu yapılmış assetleri kullanabilsin. Bu dosya YENİ/paralel
 * bir asset registry DEĞİL — sadece MEVCUT `resolveKitRoles()` fonksiyonunu
 * (assetKits.js, zaten test edilmiş, zaten 6 farklı Free-HTML kiti tarafından
 * kullanılıyor) TopDown'ın theme'ine göre çağıran, ince bir eşleme katmanı.
 *
 * NEDEN "theme -> mevcut kit key" eşlemesi (yeni bir "topDown" GAME_KITS
 * girdisi DEĞİL): TopDown Runtime'ın 4 teması (neutral/forest/dungeon/space,
 * bkz. public/runtime/topdown/renderer.js THEMES) her biri GÖRSEL OLARAK
 * FARKLI bir pakete karşılık geliyor — bu, assetKits.js'teki forest-platformer/
 * dungeon-rpg/space-shooter kitlerinin ZATEN elle kürasyonu yapılmış rol
 * eşlemeleriyle BİREBİR aynı ayrım. Yeni bir "topDown" kit anahtarı eklemek
 * bu 3 mevcut kiti KOPYALAMAK/tekrarlamak olurdu (assetManifest.js'in kendi
 * dosya başı notu: "aynı kaynaktan iki farklı elle senkronize liste değil").
 * Bunun yerine, AYNI kaynak veriyi (assetKits.js) farklı bir oyun türünden
 * (topDown) DA okunabilir kılıyoruz — Selin'in "aynı asset'i farklı oyun
 * türlerinde kullanılabilir hale getirecek genel bir yapı kur" isteğinin
 * doğrudan karşılığı.
 *
 * "enemy" vs "obstacle" ayrımı: assetKits.js'teki her kitin `roles.obstacle`
 * dizisi (kendi dosya başı yorumlarında açıkça belirtildiği gibi) HEM
 * gerçek engelleri (rock/tree/asteroid) HEM düşmanları (bee/orc/UFO) TEK bir
 * havuzda birleştiriyor (mockGameTemplate.js'in normalizeRoles() OR-precedence
 * kısıtı yüzünden). TopDown Runtime'ın ise AYRI bir "enemy" ve "obstacle"
 * rolü var — bu yüzden burada o havuz, her assetin ZATEN taşıdığı GERÇEK
 * `category` alanına (assetManifest.js'in orijinal, değişmemiş verisi:
 * "enemy" | "obstacle") göre ikiye ayrılıyor. Bu, kit verisine HİÇ
 * dokunmadan, sadece OKUYARAK yapılan, tamamen additive bir filtreleme.
 *
 * theme.type == null/neutral/bilinmeyen -> hiçbir kit eşleşmez -> TÜM roller
 * `null` -> runtime GÜVENLE primitive fallback'e döner (bkz. specSchema.js
 * sanitizeAssets ve public/runtime/topdown/assets.js).
 */
const { resolveKitRoles } = require("../../config/assetKits");
// CUSTOM ASSET LIBRARY round — additive: şirketlerin yüklediği, manifest'te
// `kit`/`role` alanlarıyla BEYAN EDİLMİŞ custom assetleri, TopDown resolution
// sürecine dahil eder (görev md.10). assetKits.js/resolveKitRoles() KENDİSİ
// HİÇ değişmedi — sadece bu dosyanın kendi pick*() fonksiyonlarının SONUCU,
// aşağıda ayrı bir adımda custom assetlerle ZENGİNLEŞTİRİLİYOR.
const customAssetLibrary = require("../customAssetLibrary");

var TOPDOWN_ASSET_ROLES = ["player", "enemy", "collectible", "obstacle", "background"];

// theme (specSchema.js'in tanıdığı 4 değer) -> assetKits.js'teki MEVCUT,
// görsel olarak o temaya karşılık gelen kit anahtarı. "neutral" BİLEREK
// eşlemesiz bırakıldı — nötr bir top-down teması için kürasyonu yapılmış,
// gerçekten uygun bir asset kiti YOK (uydurmak yerine primitive fallback).
var THEME_TO_KIT_KEY = {
  forest: "forest-platformer",
  dungeon: "dungeon-rpg",
  space: "space-shooter",
};

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value) return [value];
  return [];
}

function first(list) {
  return list.length > 0 ? list[0] : null;
}

/**
 * pool: resolveKitRoles()'ün bir rolü için döndürdüğü, gerçek asset
 * objelerinden oluşan dizi (veya boş dizi). Sadece belirtilen gerçek
 * `category` değerine sahip olanları döner — kit verisini HİÇ DEĞİŞTİRMEZ,
 * sadece filtreler.
 */
function filterByCategory(pool, category) {
  return pool.filter(function (asset) {
    return asset && asset.category === category;
  });
}

/**
 * dungeon-rpg kitinde `roles.obstacle` TAMAMEN düşmanlardan oluşuyor (bkz.
 * assetKits.js'in kendi notu: "Pakette AYRI bir hazard/trap sprite'ı yok") —
 * yani category==="obstacle" havuzu HER ZAMAN boş olacak. Bunun için tek,
 * genel (dungeon'a ÖZEL hardcode DEĞİL — herhangi bir kit için aynı mantık
 * çalışır) bir fallback zinciri: önce `tile` rolündeki "duvar" benzeri bir
 * asset (id'sinde "wall" geçen), yoksa `tile` rolünün ilk elemanı, o da
 * yoksa `decoration` rolünün ilk elemanı (barrel/crate gibi sahne objeleri
 * de mantıklı bir "engel" görseli olur).
 */
function pickObstacleAsset(resolvedRoles) {
  var direct = filterByCategory(toArray(resolvedRoles.obstacle), "obstacle");
  if (direct.length > 0) return direct[0];

  var tiles = toArray(resolvedRoles.tile);
  var wallTile = tiles.filter(function (asset) {
    return asset && /wall/i.test(asset.id);
  })[0];
  if (wallTile) return wallTile;
  if (tiles.length > 0) return tiles[0];

  var decorations = toArray(resolvedRoles.decoration);
  if (decorations.length > 0) return decorations[0];

  return null;
}

function pickEnemyAsset(resolvedRoles) {
  var pool = filterByCategory(toArray(resolvedRoles.obstacle), "enemy");
  return first(pool);
}

function pickPlayerAsset(resolvedRoles) {
  return first(toArray(resolvedRoles.player));
}

function pickCollectibleAsset(resolvedRoles) {
  return first(toArray(resolvedRoles.collectible));
}

function pickBackgroundAsset(resolvedRoles) {
  return first(toArray(resolvedRoles.background));
}

/**
 * WORLD RENDERING round — `background` rolü (yukarıdaki pickBackgroundAsset)
 * ile KARIŞTIRILMAMALI: bu TAMAMEN YENİ, PARALEL bir kavram. `background`
 * mevcut haliyle DOKUNULMADAN kalıyor (topDownIntegration.test.js'in forest
 * için `resolved.background`'ın gerçek bir asset olmasını bekleyen mevcut
 * testleri bunu gerektiriyor). `ground` ise renderer.js'in artık ZEMİN
 * DÖŞEMESİ için gerçekten TÜKETTİĞİ, AYRI bir rol.
 *
 * Neden bir ALLOWLIST (denylist DEĞİL): forest'in `background` rolündeki 3
 * asset (forest.png/sky.png/middleground.png) görsel olarak DOĞRULANDI —
 * bunlar yan-bakış platformer parallax sahne katmanları, top-down zemin
 * karosu olarak TEKRARLANMAYA (tiling) uygun DEĞİL (bkz. proje notları/rapor).
 * Bu yüzden forest/neutral için BİLEREK hiçbir eşleme YOK -> `null` ->
 * renderer.js primitive/prosedürel zemine güvenle düşer. Sadece GERÇEKTEN
 * görsel olarak doğrulanmış, tekrarlanabilir dokular allowlist'e girdi:
 *   - dungeon: `platform` rolü (tinydungeon_tile_floor, 16x16, gerçek bir
 *     zemin karosu — dungeon-rpg kitinin KENDİ mock şablonu için zaten
 *     "#platform-row" olarak kullandığı AYNI asset).
 *   - space: `background` rolü (spaceshooter_background_deep/nebula) — bu
 *     ikisi GERÇEKTEN dağınık bir yıldız alanı dokusu (yönlü şerit YOK,
 *     görsel olarak doğrulandı), bu yüzden mevcut `background` rolünden
 *     OKUNUYOR ama SADECE space için (forest'in background'ı gibi yanlışlıkla
 *     tekrarlanmıyor).
 * Manifestte OLMAYAN bir path asla üretilmez — sadece resolveKitRoles()'ün
 * ZATEN döndürdüğü gerçek asset objelerinden okunuyor.
 */
var GROUND_TILE_SOURCE = {
  dungeon: { role: "platform" },
  space: { role: "background" },
};

function pickGroundTileAsset(resolvedRoles, role) {
  return first(toArray(resolvedRoles[role]));
}

/**
 * theme: ham tema string'i. Dönüş: gerçek bir asset objesi (id/path/category/
 * ...) veya `null` (theme için allowlist'te bir kayıt yoksa, kit
 * bulunamazsa, ya da rol boşsa — HER DURUMDA sessizce `null`, asla throw
 * etmez/uydurmaz).
 */
function resolveTopDownGroundTile(theme) {
  var kitKey = typeof theme === "string" ? THEME_TO_KIT_KEY[theme] : null;
  var source = typeof theme === "string" ? GROUND_TILE_SOURCE[theme] : null;
  if (!kitKey || !source) return null;

  var resolved = resolveKitRoles(kitKey);
  if (!resolved || !resolved.roles) return null;

  return pickGroundTileAsset(resolved.roles, source.role);
}

/**
 * WORLD RENDERING round — theme'in kitindeki MEVCUT `decoration` rol
 * havuzunu (assetKits.js'te ZATEN tanımlı, `obstacle` havuzundan AYRI —
 * bkz. forest-platformer/dungeon-rpg kitlerinin kendi yorumları) OLDUĞU
 * GİBİ döner. space-shooter/neutral için bu kitte/temada hiç `decoration`
 * rolü TANIMLI DEĞİL -> boş dizi (primitive/prosedürel dekorasyon fallback'i
 * server/services/topdown/worldDecorations.js'te, asset olmadan da devreye
 * girebilir).
 */
function resolveTopDownDecorationAssets(theme) {
  var kitKey = typeof theme === "string" ? THEME_TO_KIT_KEY[theme] : null;
  if (!kitKey) return [];

  var resolved = resolveKitRoles(kitKey);
  var defaultDecorations = resolved && resolved.roles ? toArray(resolved.roles.decoration) : [];

  // CUSTOM ASSET LIBRARY round — custom "decoration" rolündeki assetler
  // default havuzun SONUNA EKLENİR (bir slotu doldurmuyorlar, decoration
  // zaten bir HAVUZ/dizi — worldDecorations.js bunların hepsinden rastgele
  // seçim yapar, bkz. o dosya). Default decoration'lar hiç DEĞİŞMEDEN kalır.
  var customDecorations = customAssetLibrary.getCustomAssetsForKitRole(kitKey, "decoration");

  return defaultDecorations.concat(customDecorations);
}

function toGroundTilePath(asset) {
  return asset && typeof asset.path === "string" ? asset.path : null;
}

function toDecorationPaths(assets) {
  return toArray(assets)
    .map(function (asset) {
      return asset && typeof asset.path === "string" ? asset.path : null;
    })
    .filter(Boolean);
}

/**
 * theme: ham (henüz normalize edilmemiş olabilir) tema string'i — geçersiz/
 * bilinmeyen/undefined bir değer TOPDOWN_ASSET_ROLES'ün hepsi için `null`
 * ile SESSİZCE sonuçlanır (asla throw etmez).
 * Dönüş: { player, enemy, collectible, obstacle, background } — her biri
 * ya GERÇEK bir asset objesi (id/path/category/name/...) ya `null`.
 */
function resolveTopDownAssets(theme) {
  var result = { player: null, enemy: null, collectible: null, obstacle: null, background: null };

  var kitKey = typeof theme === "string" ? THEME_TO_KIT_KEY[theme] : null;
  if (!kitKey) return result;

  var resolved = resolveKitRoles(kitKey);
  if (resolved && resolved.roles) {
    result.player = pickPlayerAsset(resolved.roles);
    result.enemy = pickEnemyAsset(resolved.roles);
    result.collectible = pickCollectibleAsset(resolved.roles);
    result.obstacle = pickObstacleAsset(resolved.roles);
    result.background = pickBackgroundAsset(resolved.roles);
  }

  // CUSTOM ASSET LIBRARY round — SADECE default kitin BOŞ bıraktığı
  // (null) slotları, manifest'te `kit === kitKey` VE `role === <bu rol>`
  // olarak BEYAN EDİLMİŞ bir custom asset varsa doldurur. Default'un ZATEN
  // doldurduğu bir slotun üzerine ASLA yazmaz — "mevcut görünümü bozma"
  // kısıtının doğrudan karşılığı; bu sadece gerçek bir BOŞLUĞU dolduruyor.
  TOPDOWN_ASSET_ROLES.forEach(function (role) {
    if (result[role]) return;
    var customMatch = customAssetLibrary.getCustomAssetsForKitRole(kitKey, role)[0];
    if (customMatch) result[role] = customMatch;
  });

  return result;
}

/**
 * resolveTopDownAssets()'in çıktısını, specSchema.js'in sanitizeAssets()'inin
 * beklediği düz `{ role: url|null }` haritasına indirger (server/routes/
 * generate.js'in ham spec'e eklediği tam şekil).
 */
function toAssetPaths(resolved) {
  var out = {};
  TOPDOWN_ASSET_ROLES.forEach(function (role) {
    var asset = resolved[role];
    out[role] = asset && typeof asset.path === "string" ? asset.path : null;
  });
  return out;
}

module.exports = {
  TOPDOWN_ASSET_ROLES: TOPDOWN_ASSET_ROLES,
  THEME_TO_KIT_KEY: THEME_TO_KIT_KEY,
  resolveTopDownAssets: resolveTopDownAssets,
  toAssetPaths: toAssetPaths,
  // WORLD RENDERING round — additive, existing exports yukarıda DEĞİŞMEDİ.
  GROUND_TILE_SOURCE: GROUND_TILE_SOURCE,
  resolveTopDownGroundTile: resolveTopDownGroundTile,
  resolveTopDownDecorationAssets: resolveTopDownDecorationAssets,
  toGroundTilePath: toGroundTilePath,
  toDecorationPaths: toDecorationPaths,
};
