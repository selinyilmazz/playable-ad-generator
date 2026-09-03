const SYSTEM_PROMPT = require("../prompts/systemPrompt");
const { callOpenRouterForHtml } = require("./openrouterClient");
// Game Asset Pipeline MVP: manifestten üretilen "AVAILABLE GAME ASSETS"
// bloğu + kullanım kuralı. Mevcut sabit SYSTEM_PROMPT'a dokunmuyoruz —
// ayrı, ikinci bir system mesajı olarak ekleniyor (bkz. assetContext.js).
const { buildAssetContextMessage, buildAssetContextMessageForKit } = require("./assetContext");
// PHASE 5: mock mod artık statik bir örnek dosya OKUMUYOR — gameType'a
// (veya kit eşleşmezse best-effort bir anahtar kelime taramasına) göre
// GERÇEK asset dosyalarını kullanan bir oyun üretiyor (bkz. o iki dosyadaki
// notlar). fs/path importları bu yüzden artık gereksiz, kaldırıldı.
const { selectRolesForMock } = require("./mockAssetSelector");
const { buildMockGameHtml } = require("./mockGameTemplate");

/**
 * PHASE 3B: bir gameType (veya null) için gönderilecek asset context'ini
 * seçer. Tek, test edilebilir seçim noktası — generatePlayableAd()
 * BUNU çağırıyor, mantığı kendi içinde tekrarlamıyor.
 *
 * Kural: gameType verilmişse VE o kit için gerçek (null olmayan) en az bir
 * asset varsa -> daraltılmış kit context. Aksi halde (gameType null,
 * kit bulunamadı, veya kitin hiçbir rolü dolu değilse) -> mevcut, TAM
 * 39 assetlik davranışa güvenli fallback (buildAssetContextMessage() hiç
 * değişmedi, bkz. assetContext.js).
 */
function resolveAssetContextForGameType(gameType) {
  var kitContext = gameType ? buildAssetContextMessageForKit(gameType) : null;
  return kitContext || buildAssetContextMessage();
}

/**
 * Key yokken kullanılan mock mod: gerçek OpenRouter çağrısı yapmadan,
 * gameType'a (verilmişse) göre GERÇEK asset dosyalarını kullanan bir oyun
 * üretir — böylece pipeline (frontend -> server -> preview) key gelmeden de
 * uçtan uca test edilebilir VE mock çıktı, meta.gameType/meta.assetKit ile
 * tutarlı kalır (PHASE 5, REQUIREMENTS #11/#12 — eskiden hep aynı statik
 * "Fruit Tap Puzzle" örneği dönerdi, gameType ne olursa olsun).
 *
 * userPrompt/gameType OPSİYONEL: hiç verilmezse (eski çağrı biçimi) bile
 * selectRolesForMock(null, "") çökmez — kit eşleşmez, fallback tarayıcı da
 * boş metinde hiçbir şey bulamaz, en genel/nötr collectible setine düşer
 * (bkz. mockAssetSelector.js) — davranış her zaman GÜVENLİ.
 */
function getMockResponse(userPrompt, gameType) {
  var selection = selectRolesForMock(gameType || null, userPrompt || "");
  var html = buildMockGameHtml({
    prompt: userPrompt || "",
    kitName: selection.kitName || "Playable Game",
    roles: selection.roles,
    usedFallback: selection.usedFallback,
  });
  return {
    html: html,
    // assetRetryApplied: additive alan (Game Asset Pipeline MVP) — meta
    // şeklinin her yanıtta tutarlı olması için burada da false olarak
    // tanımlı; mock modda hiçbir retry tetiklenmez. mock/model/finishReason
    // davranışı değişmedi.
    meta: {
      mock: true,
      model: null,
      finishReason: null,
      assetRetryApplied: false,
      // PHASE 5 additive alan: mock üretimi kit eşleşmesi yerine best-effort
      // anahtar kelime taramasına mı düştü? Gerçek LLM modunda bu alan hiç
      // yok (undefined) — sadece mock'a özel, şeffaflık için.
      mockAssetSource: selection.source,
    },
  };
}

/**
 * Kullanıcı promptundan playable ad HTML'i üretir.
 * OPENROUTER_API_KEY tanımlı değilse mock moda düşer (uygulamayı bloklamaz).
 *
 * gameType (PHASE 3B, OPSİYONEL): routes/generate.js'in deterministik
 * gameTypeDetection sonucu. Verilmezse (undefined/null) davranış Phase 3A
 * ile birebir aynı: tam 39 assetlik context. Verilmişse VE o kite gerçek
 * bir asset karşılık geliyorsa, SADECE o kitin assetleri gönderilir.
 */
async function generatePlayableAd(userPrompt, gameType) {
  var messages = [{ role: "system", content: SYSTEM_PROMPT }];

  // Asset context varsa (manifest boş değilse) ikinci bir system mesajı
  // olarak ekleniyor. resolveAssetContextForGameType() null dönerse
  // (manifest boşsa) hiçbir şey eklenmiyor — davranış eskisiyle birebir
  // aynı kalır. gameType verilmemişse (mevcut çağrı biçimi) bu fonksiyon
  // doğrudan buildAssetContextMessage()'a düşer — Phase 3A/öncesi ile
  // FARKSIZ.
  var assetContext = resolveAssetContextForGameType(gameType);
  if (assetContext) {
    messages.push({ role: "system", content: assetContext });
  }

  messages.push({ role: "user", content: userPrompt });

  var result = await callOpenRouterForHtml(messages);

  if (!result) {
    return getMockResponse(userPrompt, gameType);
  }

  return {
    html: result.html,
    // assetRetryApplied burada her zaman false: bu, İLK üretim denemesi.
    // routes/generate.js, asset-paths-valid fail verip retry uygulanırsa
    // final meta'da bunu true'ya çevirir (additive, mock/model/finishReason
    // değişmez).
    meta: {
      mock: false,
      model: result.model,
      finishReason: result.finishReason,
      assetRetryApplied: false,
    },
  };
}

module.exports = {
  generatePlayableAd: generatePlayableAd,
  // PHASE 3B: test edilebilirlik için additive export — generatePlayableAd()
  // dışına ek bir API sözleşmesi eklemiyor, sadece iç seçim mantığını
  // testlerin doğrudan çağırabilmesi için dışa açıyor.
  resolveAssetContextForGameType: resolveAssetContextForGameType,
};
