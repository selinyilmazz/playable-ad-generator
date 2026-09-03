const express = require("express");
const { generatePlayableAd } = require("../services/openrouter");
const { validatePlayable } = require("../services/validate");
// Game Asset Pipeline MVP — asset-paths-valid fail verirse EN FAZLA 1 kez
// düzeltme isteği göndermek için (bkz. aşağıdaki "ASSET RETRY" bloğu).
const { buildAssetFixMessages } = require("../services/assetRetry");
const { callOpenRouterForHtml } = require("../services/openrouterClient");
// PHASE 3A/3B: prompt'u 4 sabit Game Kit'ten (bkz. server/config/assetKits.js)
// biriyle eşleyen deterministik, LLM-SİZ sınıflandırma. Phase 3A'da sadece
// final meta'ya ekleniyordu; Phase 3B'de AYNI sonuç artık generatePlayableAd()'a
// da geçiriliyor (bkz. aşağıdaki 1) GENERATE adımı) — validate/retry akışının
// KENDİSİ hiç değişmedi, sadece generatePlayableAd()'ın hangi asset context'ini
// göndereceğini artık bu sonuç belirliyor.
const { detectGameType } = require("../services/gameTypeDetection");
const { getKit } = require("../config/assetKits");

const router = express.Router();

// POST /api/generate  { prompt: string }
router.post("/generate", async function (req, res) {
  var prompt = req.body && req.body.prompt;

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return res.status(400).json({ error: "Prompt boş olamaz." });
  }

  try {
    var trimmedPrompt = prompt.trim();

    // 0) GAME TYPE DETECTION (additive, deterministik, LLM-SİZ) — GENERATE'DEN
    // ÖNCE hesaplanıyor ki sonucu generatePlayableAd()'a geçirebilelim.
    // detectGameType() prompt'u 4 sabit kitten biriyle eşler veya (emin
    // değilse) null döner; null durumunda aşağıdaki generatePlayableAd()
    // çağrısı gameType=null alır ve mevcut TAM 39 assetlik davranışa
    // güvenli şekilde düşer (bkz. openrouter.js resolveAssetContextForGameType).
    var gameTypeResult = detectGameType(trimmedPrompt);

    // 1) GENERATE
    var result = await generatePlayableAd(trimmedPrompt, gameTypeResult.gameType);

    // 2) VALIDATE (AI Validation Pipeline — skor + check listesi)
    var validation = validatePlayable(result.html, trimmedPrompt);

    // 2.5) ASSET RETRY (Game Asset Pipeline MVP) — SADECE asset-paths-valid
    // fail verdiyse, modele EN FAZLA 1 kez düzeltme isteği gönderilir.
    // Bilerek while/for YOK: bu dal yapısal olarak en fazla bir kez
    // çalışabilir — retry başarısız olsa (ikinci deneme de invalid çıksa)
    // bile başka bir retry TETİKLENMEZ, mevcut invalid-gate (frontend)
    // PLAY'i olduğu gibi engellemeye devam eder. js-syntax-valid, has-js
    // vb. başka kritik fail'ler bu dalı hiç tetiklemez — sadece
    // asset-paths-valid'e özel.
    var assetCheck = validation.checks.find(function (check) {
      return check.key === "asset-paths-valid";
    });

    if (assetCheck && assetCheck.status === "fail") {
      var fixMessages = buildAssetFixMessages(result.html, assetCheck.detail);
      // callOpenRouterForHtml, OPENROUTER_API_KEY yoksa null döner — bu
      // durumda hiçbir ek LLM çağrısı yapılmaz (mock modda retry devreye
      // girmez, madde 5).
      var retryResult = await callOpenRouterForHtml(fixMessages);

      if (retryResult) {
        // callOpenRouterForHtml zaten dönen html'i normalizeGeneratedHtml
        // ile normalize ediyor (bkz. openrouterClient.js) — ayrıca bir
        // normalize çağrısına gerek yok.
        result = {
          html: retryResult.html,
          meta: {
            mock: result.meta.mock,
            model: retryResult.model,
            finishReason: retryResult.finishReason,
            assetRetryApplied: true,
          },
        };
        // İkinci sonuç TEKRAR validate edilir ve final result olarak
        // kullanılır.
        validation = validatePlayable(result.html, trimmedPrompt);
      }
    }

    // 2.75) gameTypeResult zaten adım 0'da hesaplandı (generatePlayableAd()'a
    // da o geçirildi) — burada SADECE final meta'ya koymak için kit tanımı
    // çözülüyor. Bilerek result.meta İÇİNE yazılmıyor — result.meta, ASSET
    // RETRY dalı (yukarıda) tetiklenirse TAMAMEN yeniden oluşturuluyor; bu
    // alanların o rebuild'de sessizce kaybolmaması için final yanıt
    // nesnesine ayrı olarak ekleniyor.
    var assetKit = gameTypeResult.gameType ? getKit(gameTypeResult.gameType) : null;

    // 3) PREVIEW (asıl render işi frontend'de iframe.srcdoc ile yapılır;
    //    server sadece doğrulanmış HTML'i ve meta bilgiyi döner)
    return res.json({
      html: result.html,
      validation: validation,
      // meta'nın MEVCUT tüm alanları (mock/model/finishReason/
      // assetRetryApplied) birebir korunuyor — gameType/assetKit sadece
      // EKLENİYOR, hiçbir mevcut alan değişmiyor/silinmiyor.
      meta: Object.assign({}, result.meta, {
        gameType: gameTypeResult.gameType,
        assetKit: assetKit,
      }),
    });
  } catch (err) {
    console.error("[generate] hata:", err.message);
    return res.status(500).json({ error: err.message || "Beklenmeyen bir hata oluştu." });
  }
});

module.exports = router;
