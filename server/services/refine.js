/**
 * Auto-Fix (Phase 3) ve Improve with AI (Phase 4) için paylaşılan servis.
 * İkisi de aynı şekli takip eder: mevcut HTML + bir talimat -> güncellenmiş HTML.
 *
 * OPENROUTER_API_KEY yokken GERÇEK bir AI çağrısı YAPMAZ — bunun yerine
 * "applied: false" ile birlikte şeffaf bir mock mesajı döner. Key eklendiğinde
 * hiçbir kod değişikliği gerekmeden gerçek OpenRouter çağrısı devreye girer
 * (callOpenRouterForHtml zaten key'in var/yok olduğuna göre davranıyor).
 */
const { callOpenRouterForHtml } = require("./openrouterClient");
const { buildRefineSystemPrompt, buildRefineUserMessage } = require("../prompts/refinePrompt");

// ROUND G (IMPROVE WITH AI) — modelOverride/apiKeyOverride: GERİYE DÖNÜK
// UYUMLU, OPSİYONEL 3./4. parametreler. autofix.js HÂLÂ 2 argümanla çağırıyor
// (bkz. o dosya) — bu durumda davranış BİREBİR ÖNCEKİ round'la aynı:
// callOpenRouterForHtml kendi varsayılanlarına (modelConfig.model /
// process.env.OPENROUTER_API_KEY) düşer. routes/improve.js ise (görev md.5:
// "Improve with AI, Generate ile AYNI model-selection sistemini kullanmalı")
// bu iki parametreyi GERÇEK, doğrulanmış model id'si + (varsa) kullanıcının
// BYOK key'i ile geçirir — callOpenRouterForHtml zaten bunları destekliyor,
// burada YENİ bir doğrulama/İstemci mantığı YAZILMIYOR.
async function refinePlayableAd(html, instruction, modelOverride, apiKeyOverride) {
  var result = await callOpenRouterForHtml(
    [
      { role: "system", content: buildRefineSystemPrompt() },
      { role: "user", content: buildRefineUserMessage(html, instruction) },
    ],
    modelOverride,
    apiKeyOverride
  );

  if (!result) {
    return {
      applied: false,
      mock: true,
      html: html,
      model: null,
      finishReason: null,
      message:
        "OpenRouter key henüz bağlı değil. Bu istek gerçek bir AI çağrısı yapmadı; " +
        "key eklendiğinde bu buton aynı mimari üzerinden otomatik olarak gerçek düzenlemeyi yapacak.",
    };
  }

  return {
    applied: true,
    mock: false,
    html: result.html,
    model: result.model,
    finishReason: result.finishReason,
    message: "Güncellendi.",
  };
}

module.exports = { refinePlayableAd: refinePlayableAd };
