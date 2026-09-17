/**
 * Game Asset Pipeline MVP — LLM'e gösterilecek "AVAILABLE GAME ASSETS"
 * bloğunu ve kullanım kuralını üreten küçük, bağımsız bir yardımcı.
 *
 * Bilerek server/prompts/systemPrompt.js'in dışında, ayrı bir dosyada:
 * systemPrompt.js sabit/statik bir metin, bu ise manifest'ten DİNAMİK
 * olarak üretiliyor. openrouter.js bunu ayrı bir "system" mesajı olarak
 * ekliyor (bkz. o dosyadaki not) — böylece mevcut sabit sistem promptuna
 * dokunmadan (küçük bir istisna notu hariç, bkz. systemPrompt.js) asset
 * listesi eklenebiliyor.
 *
 * İLERİDEKİ GENİŞLEME (ŞİMDİ IMPLEMENT EDİLMEDİ):
 * Şu an manifest tamamen elle tanımlı. İleride "bilinmeyen asset dosyası
 * -> image captioning modeli -> otomatik caption/tag -> manifest'e ekleme"
 * şeklinde bir adım eklenebilir; bu durumda bu dosyanın DEĞİŞMESİ
 * GEREKMEZ — sadece assetManifest.js'in nasıl dolduğu değişir, format
 * (id/path/category/tags) aynı kalır.
 */
const { ASSET_MANIFEST } = require("../config/assetManifest");
const { resolveKitRoles } = require("../config/assetKits");
// CUSTOM ASSET LIBRARY round — additive: şirketlerin yüklediği custom
// assetleri LLM'in context'ine dahil eden AYRI bir fonksiyon (bkz. aşağı,
// buildCustomAssetContextMessage). buildAssetContextMessage/
// buildAssetContextMessageForKit YUKARIDA HİÇ DEĞİŞMEDİ.
const customAssetLibrary = require("./customAssetLibrary");

var USAGE_RULE = [
  "Use available game assets when they match the user's requested game.",
  "Do not invent asset paths.",
  "Only reference asset paths from the AVAILABLE GAME ASSETS list.",
  "If a suitable asset does not exist, you may use simple CSS/HTML/SVG fallback graphics.",
  "Do not claim that an unavailable asset exists.",
].join(" ");

/**
 * "AVAILABLE GAME ASSETS:\n- id\n  category: ...\n  tags: ...\n  path: ...\n..."
 * formatında, LLM'e verilecek tam metni döner (kural + liste).
 */
function buildAssetContextMessage() {
  if (!ASSET_MANIFEST || ASSET_MANIFEST.length === 0) return null;

  var lines = ["AVAILABLE GAME ASSETS:"];
  ASSET_MANIFEST.forEach(function (asset) {
    lines.push("- " + asset.id);
    lines.push("  category: " + asset.category);
    lines.push("  tags: " + asset.tags.join(", "));
    lines.push("  path: " + asset.path);
  });

  return USAGE_RULE + "\n\n" + lines.join("\n");
}

/** Manifetteki tüm geçerli path'lerin Set'i — validation check'inin kullanması için. */
function getKnownAssetPaths() {
  var set = {};
  ASSET_MANIFEST.forEach(function (asset) {
    set[asset.path] = true;
  });
  return set;
}

// ================== PHASE 3B: kit-daraltılmış asset context (CANLI AKIŞTA) ==================
// Phase 3A'da bu fonksiyon hazırlanmış ama HİÇBİR yere bağlanmamıştı.
// Phase 3B'de server/services/openrouter.js -> resolveAssetContextForGameType()
// üzerinden gerçek generatePlayableAd() çağrısına bağlandı (bkz. o dosya).
// Format BİLEREK tek satır/asset olacak şekilde sıkıştırıldı (Phase 3A'daki
// 5 satır/asset — id, role, category, tags, path — yerine): rol zaten
// LLM'e assetin ne için kullanılacağını söylüyor, bu daraltılmış/küratörlü
// bağlamda category ve tags ayrıca tekrar etmek gereksiz token maliyeti —
// tags'in asıl işlevi (39 assetlik geniş listede anlam çıkarımına yardım
// etmek) burada zaten gereksiz çünkü liste elle küratörlü ve rol açık.
function buildAssetContextMessageForKit(kitKey) {
  var resolved = resolveKitRoles(kitKey);
  if (!resolved) return null;

  var lines = ["AVAILABLE GAME ASSETS FOR THIS GAME TYPE (" + resolved.name + "):"];
  var any = false;

  Object.keys(resolved.roles).forEach(function (role) {
    var value = resolved.roles[role];
    if (!value) return; // null rol -> bu kitte o slot için gerçek asset yok, LLM'e YAZILMIYOR (uydurma değer verilmez)
    var assets = Array.isArray(value) ? value : [value];
    assets.forEach(function (asset) {
      any = true;
      lines.push("- " + role + ": " + asset.id + " -> " + asset.path);
    });
  });

  if (!any) return null;

  return USAGE_RULE + "\n\n" + lines.join("\n");
}

// ================== CUSTOM ASSET LIBRARY round ==================
// Şirketlerin yüklediği custom assetleri, MEVCUT (default) asset context'in
// (yukarıdaki iki fonksiyondan biri) YANINA, AYRI bir blok olarak ekler.
// "Bütün custom library'yi körlemesine LLM'e gönderme" (görev md.9)
// kısıtı için: gameType/kit eşleşmesi varsa SADECE o kite `kit` alanıyla
// bağlı custom assetler; yoksa customAssetLibrary.js'in basit anahtar-kelime
// ön-filtresiyle prompta en alakalı olanlar (üst sınır MAX_CUSTOM_ASSETS_
// IN_CONTEXT) kullanılır. Hiç custom library yüklenmemişse (varsayılan/
// mevcut durum) bu fonksiyon HER ZAMAN null döner — mevcut davranış SIFIR
// etkilenir.
var MAX_CUSTOM_ASSETS_IN_CONTEXT = 12;

function buildCustomAssetContextMessage(gameType, prompt) {
  var kitMatched = gameType ? customAssetLibrary.getCustomAssetsForKit(gameType) : [];
  var selected = kitMatched.length > 0
    ? kitMatched.slice(0, MAX_CUSTOM_ASSETS_IN_CONTEXT)
    : customAssetLibrary.getCustomAssetsRelevantToPrompt(prompt, MAX_CUSTOM_ASSETS_IN_CONTEXT);

  if (!selected || selected.length === 0) return null;

  var lines = [
    "CUSTOM COMPANY ASSETS AVAILABLE (uploaded separately from the default library).",
    "Use these if they fit the user's request. Do not invent paths beyond what is listed here.",
    "",
  ];
  selected.forEach(function (asset) {
    lines.push("- " + (asset.role || asset.category) + ": " + asset.id + " -> " + asset.path);
  });

  return lines.join("\n");
}

module.exports = {
  buildAssetContextMessage: buildAssetContextMessage,
  getKnownAssetPaths: getKnownAssetPaths,
  buildAssetContextMessageForKit: buildAssetContextMessageForKit,
  buildCustomAssetContextMessage: buildCustomAssetContextMessage,
};
