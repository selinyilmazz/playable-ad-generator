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

async function refinePlayableAd(html, instruction) {
  var result = await callOpenRouterForHtml([
    { role: "system", content: buildRefineSystemPrompt() },
    { role: "user", content: buildRefineUserMessage(html, instruction) },
  ]);

  if (!result) {
    return {
      applied: false,
      mock: true,
      html: html,
      message:
        "OpenRouter key henüz bağlı değil. Bu istek gerçek bir AI çağrısı yapmadı; " +
        "key eklendiğinde bu buton aynı mimari üzerinden otomatik olarak gerçek düzenlemeyi yapacak.",
    };
  }

  return {
    applied: true,
    mock: false,
    html: result.html,
    message: "Güncellendi.",
  };
}

module.exports = { refinePlayableAd: refinePlayableAd };
