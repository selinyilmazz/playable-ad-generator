const SYSTEM_PROMPT = require("../prompts/systemPrompt");
const { callOpenRouterForHtml } = require("./openrouterClient");
// Game Asset Pipeline MVP: manifestten üretilen "AVAILABLE GAME ASSETS"
// bloğu + kullanım kuralı. Mevcut sabit SYSTEM_PROMPT'a dokunmuyoruz —
// ayrı, ikinci bir system mesajı olarak ekleniyor (bkz. assetContext.js).
const { buildAssetContextMessage, buildAssetContextMessageForKit, buildCustomAssetContextMessage } = require("./assetContext");
// PHASE 5: mock mod artık statik bir örnek dosya OKUMUYOR — gameType'a
// (veya kit eşleşmezse best-effort bir anahtar kelime taramasına) göre
// GERÇEK asset dosyalarını kullanan bir oyun üretiyor (bkz. o iki dosyadaki
// notlar). fs/path importları bu yüzden artık gereksiz, kaldırıldı.
const { selectRolesForMock } = require("./mockAssetSelector");
const { buildMockGameHtml } = require("./mockGameTemplate");
// ROUND L — Free-HTML Mock Gameplay Upgrade (additive): getMockResponse()
// artık, mümkünse, mekanik-özel bir şablon (platformer/racing/space-shooter/
// collection/memory/math/cooking/dungeon) kullanıyor — bkz. o dosyanın
// başındaki not. mockGameplayIntent.js SADECE "hangi mekanik?" sorusuna
// cevap verir, HİÇBİR asset-kit/gameType mantığına dokunmaz (bu fonksiyonun
// zaten hesapladığı selectRolesForMock()/gameType TAMAMEN DEĞİŞMEDEN
// kullanılmaya devam ediyor). Mekanik null'sa veya BUILDERS'ta karşılığı
// yoksa buildMechanicGame() null döner ve aşağıdaki kod MEVCUT, DEĞİŞMEMİŞ
// buildMockGameHtml()'e düşer — REQUIREMENTS (görev md.10): "prompt açıkça
// desteklenen bir türe işaret ediyorsa SESSİZCE generic şablona düşülmemeli"
// kuralı, mockGameplayIntent.js'in EŞİTLİKTE BİLE null DÖNMEYEN (bkz. o
// dosyanın PRIORITY_ORDER notu) tasarımıyla karşılanıyor.
const { detectGameplayMechanic } = require("./mockGameplayIntent");
const { buildMechanicGame } = require("./mockGameplayTemplates");

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
 *
 * prompt (CUSTOM ASSET LIBRARY round, OPSİYONEL 2. parametre): GERİYE
 * DÖNÜK UYUMLU — verilmezse (bu dosyanın kendi test dosyası dahil, mevcut
 * tüm çağıranlar) davranış BİREBİR ÖNCEKİ round'la aynı: hiç custom library
 * yüklenmemişse buildCustomAssetContextMessage() HER ZAMAN null döner (bkz.
 * assetContext.js) ve bu fonksiyon SADECE baseContext'i döner. Verilirse,
 * yüklü custom asset'ler varsa (kit eşleşmesi veya prompt alakalılığı
 * üzerinden) baseContext'in ALTINA, AYRI bir blok olarak eklenir.
 */
function resolveAssetContextForGameType(gameType, prompt) {
  var kitContext = gameType ? buildAssetContextMessageForKit(gameType) : null;
  var baseContext = kitContext || buildAssetContextMessage();

  var customContext = buildCustomAssetContextMessage(gameType, prompt);
  if (!customContext) return baseContext;

  return baseContext ? baseContext + "\n\n" + customContext : customContext;
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
  var templateOptions = {
    prompt: userPrompt || "",
    kitName: selection.kitName || "Playable Game",
    roles: selection.roles,
    usedFallback: selection.usedFallback,
  };

  // ROUND L: mekanik-özel bir şablon varsa ONU kullan (gerçek klavye/
  // fizik/mekanik + prompttaki sayıları onurlandıran bir oyun); yoksa
  // (mechanic: null veya desteklenmeyen bir mekanik) MEVCUT, DEĞİŞMEMİŞ
  // genel tap-grid şablonuna düş.
  var mechanicResult = detectGameplayMechanic(userPrompt || "");
  var html = buildMechanicGame(mechanicResult.mechanic, templateOptions);
  if (!html) {
    html = buildMockGameHtml(templateOptions);
  }

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
      // ROUND L additive alan: hangi Free-HTML mekanik şablonu kullanıldı
      // (null = mevcut genel tap-grid şablonu). Şeffaflık için — hiçbir
      // mevcut alanı değiştirmiyor/silmiyor.
      mockMechanic: mechanicResult.mechanic,
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
 *
 * modelOverride (AI MODEL SELECTOR round, OPSİYONEL 3. parametre): GERİYE
 * DÖNÜK UYUMLU — verilmezse davranış BİREBİR ÖNCEKİ round'la aynı
 * (callOpenRouterForHtml kendi varsayılanına düşer). routes/generate.js
 * BURAYA SADECE server/config/models.js'in ZATEN doğruladığı bir id
 * geçirir — bu fonksiyon ayrıca bir doğrulama YAPMAZ.
 * apiKeyOverride (OPENROUTER MODEL CATALOG + BYOK round, OPSİYONEL 4.
 * parametre): GERİYE DÖNÜK UYUMLU — verilmezse callOpenRouterForHtml
 * process.env.OPENROUTER_API_KEY'e düşer (ÖNCEKİ round'la birebir aynı).
 * Verilirse aynen callOpenRouterForHtml'e iletilir — bu fonksiyon key
 * üzerinde HİÇBİR işlem/log/saklama yapmaz, sadece taşır.
 */
async function generatePlayableAd(userPrompt, gameType, modelOverride, apiKeyOverride) {
  var messages = [{ role: "system", content: SYSTEM_PROMPT }];

  // Asset context varsa (manifest boş değilse) ikinci bir system mesajı
  // olarak ekleniyor. resolveAssetContextForGameType() null dönerse
  // (manifest boşsa) hiçbir şey eklenmiyor — davranış eskisiyle birebir
  // aynı kalır. gameType verilmemişse (mevcut çağrı biçimi) bu fonksiyon
  // doğrudan buildAssetContextMessage()'a düşer — Phase 3A/öncesi ile
  // FARKSIZ.
  var assetContext = resolveAssetContextForGameType(gameType, userPrompt);
  if (assetContext) {
    messages.push({ role: "system", content: assetContext });
  }

  messages.push({ role: "user", content: userPrompt });

  var result = await callOpenRouterForHtml(messages, modelOverride, apiKeyOverride);

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
