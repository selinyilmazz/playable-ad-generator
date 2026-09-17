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
// PROMPT -> SPEC -> RUNTIME entegrasyonu (additive): eligible promptlar
// için mevcut Free-HTML LLM üretimi yerine bu üç servis kullanılır. Hiçbiri
// generatePlayableAd/openrouter.js/openrouterClient.js/systemPrompt.js'e
// dokunmuyor — tamamen ayrı, yeni bir dal (bkz. aşağıdaki 0.5 adımı).
const { detectTopDownEligibility } = require("../services/topdown/eligibility");
const { generateTopDownSpec } = require("../services/topdown/specGenerator");
const { normalizeSpec } = require("../services/topdown/specSchemaBridge");
const { buildTopDownHtml } = require("../services/topdown/buildHtml");
// ASSET LIBRARY round — mevcut asset library'yi (assetKits.js), TopDown
// spec'inin `theme` alanına göre, gerçek asset URL'lerine çözer. Yeni bir
// asset registry DEĞİL (bkz. o dosyanın başı) — sadece MEVCUT
// resolveKitRoles()'ü çağıran ince bir eşleme katmanı.
const {
  resolveTopDownAssets,
  toAssetPaths,
  resolveTopDownGroundTile,
  resolveTopDownDecorationAssets,
  toGroundTilePath,
  toDecorationPaths,
} = require("../services/topdown/assetResolver");
// WORLD RENDERING & CAMERA VISUAL OVERHAUL round — dekoratif (SADECE görsel)
// sahne objesi yerleşimini üreten, TAMAMEN BAĞIMSIZ/additive servis (bkz. o
// dosyanın başı). Gameplay sistemlerinin (eligibility/spec generation/
// normalizeSpec'in KENDİSİ) HİÇBİRİNE dokunmuyor — normalizeSpec()'ten SONRA
// çağrılan, saf bir ek katman.
const { generateWorldDecorations } = require("../services/topdown/worldDecorations");
// AI MODEL SELECTOR round — server/config/models.js'in ZATEN tuttuğu
// resolveRequestedModel() TEK, paylaşılan doğrulama noktası (bkz. o
// dosyanın yorumu) — burada KENDİ kopyamız YAZILMIYOR.
const modelConfig = require("../config/models");
// OPENROUTER MODEL CATALOG + BYOK round — model doğrulaması artık (varsa)
// CANLI/önbelleğe alınmış OpenRouter kataloğuna karşı da yapılabiliyor,
// bkz. modelCatalog.resolveRequestedModelFromCache() yorumu: önbellek
// boşsa (henüz hiç GET /api/models çağrılmadıysa) modelConfig.
// resolveRequestedModel() İLE BİREBİR AYNI eski davranışa düşer — YENİ bir
// ağ isteği ASLA tetiklemez.
const modelCatalog = require("../services/modelCatalog");

const router = express.Router();

// POST /api/generate  { prompt: string, model?: string }
router.post("/generate", async function (req, res) {
  var prompt = req.body && req.body.prompt;

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return res.status(400).json({ error: "Prompt boş olamaz." });
  }

  // AI MODEL SELECTOR round — Frontend'den gelen `model` alanına KÖRÜ
  // KÖRÜNE güvenilmiyor. OPENROUTER MODEL CATALOG + BYOK round'da bu artık
  // modelCatalog.resolveRequestedModelFromCache() üzerinden geçiyor: id
  // GÜVENLİ formatta DEĞİLSE veya (canlı/önbelleğe alınmış) kataloğun
  // GERÇEKTEN üyesi DEĞİLSE SESSİZCE mevcut varsayılana (modelConfig.model
  // — .env override'ı dahil) düşer. Bu satır ASLA throw etmez — request
  // hiçbir zaman bu yüzden çökmez.
  var selectedModel = modelCatalog.resolveRequestedModelFromCache(req.body && req.body.model);

  // OPENROUTER MODEL CATALOG + BYOK round — kullanıcının kendi OpenRouter
  // key'i (BYOK). GÜVENLİK (görev md.6/md.16): bu değer SADECE bu isteğin
  // yaşam süresi boyunca bellekte tutulur; hiçbir log/response/dosya/DB'ye
  // yazılmaz (bkz. aşağıdaki catch bloğu — err.message'a ASLA eklenmez, ve
  // final res.json() çağrılarının HİÇBİRİ selectedApiKey'i içermez).
  // Boş/whitespace-only bir değer YOKSAYILIR (ENV fallback'in devreye
  // girmesi için) — sadece GERÇEKTEN dolu bir string kabul edilir.
  var selectedApiKey =
    req.body && typeof req.body.apiKey === "string" && req.body.apiKey.trim() ? req.body.apiKey.trim() : null;

  try {
    var trimmedPrompt = prompt.trim();

    // 0.5) PROMPT -> SPEC -> RUNTIME (additive, İLK AŞAMA: sadece TopDown).
    // detectTopDownEligibility() 0) adımındaki detectGameType()'tan TAMAMEN
    // BAĞIMSIZ, farklı bir soruya cevap veren, aynı felsefede (keyword-
    // skorlama, LLM yok) bir kapı. Eligible DEĞİLSE (varsayılan/güvenli
    // durum) bu blok hiç çalışmaz ve aşağıdaki MEVCUT Free-HTML akışı
    // (0, 1, 2, 2.5, 2.75, 3) BİREBİR ESKİSİ GİBİ devam eder.
    var topDownEligibility = detectTopDownEligibility(trimmedPrompt);
    if (topDownEligibility.eligible) {
      var specResult = await generateTopDownSpec(trimmedPrompt, selectedModel, selectedApiKey);
      // COLLECTIBLES+OBSTACLES round — collectibles/obstacles artık
      // normalizeSpec()'TEN ÖNCE ham spec'e eklenir (eskiden SONRA
      // ekleniyordu ve specSchema.js'in yeni sanitizeCollectibles/
      // sanitizeObstacles mantığını (merkez->köşe dönüşümü, dünya
      // sınırlarına kelepçeleme, obstacle-içi collectible filtreleme)
      // TAMAMEN ATLIYORDU — bu artık normalizeSpec() ÜZERİNDEN geçiyor,
      // specGenerator.js'in ürettiği ham {x,y} noktaları tam olarak
      // sanitizeObstacles/sanitizeCollectibles'ın beklediği girdi biçimi).
      // ASSET LIBRARY round — assets, collectibles/obstacles İLE AYNI
      // desende, normalizeSpec()'TEN ÖNCE ham spec'e eklenir (specSchema.js'in
      // sanitizeAssets()'i üzerinden geçsin diye). Seçim SADECE spec'in
      // (henüz normalize edilmemiş) theme alanına bakar — LLM'e/prompta HİÇ
      // dokunmaz, tamamen deterministik (bkz. assetResolver.js).
      var resolvedAssets = resolveTopDownAssets(specResult.spec && specResult.spec.theme);
      var rawSpecWithFields = Object.assign({}, specResult.spec, {
        collectibles: specResult.collectibles,
        obstacles: specResult.obstacles,
        assets: toAssetPaths(resolvedAssets),
      });
      var normalizedSpec = normalizeSpec(rawSpecWithFields);

      // WORLD RENDERING & CAMERA VISUAL OVERHAUL round — "ground" (zemin
      // karosu) ve "decorations" (dekoratif sahne objeleri), normalizeSpec()'
      // TEN SONRA eklenir (collectibles/obstacles/assets'in AKSİNE) — çünkü
      // generateWorldDecorations() kaçınma (avoidance) mantığı için
      // obstacles/collectibles'ın GERÇEK, ZATEN sanitize edilmiş (dünya
      // sınırlarına kelepçelenmiş, merkez->köşe dönüşümü tamamlanmış) halini
      // kullanır (bkz. worldDecorations.js dosya başı notu). Bu iki alan da
      // YİNE specSchema.js'in normalizeSpec()'i İÇİNDEN geçmiş sayılır —
      // çünkü public/runtime/topdown/runtime.js tarayıcıda normalizeSpec()'i
      // TEKRAR çalıştırır (bkz. runtime.js create()) ve o ikinci geçiş,
      // burada eklenen `assets.ground`/`decorations` alanlarını KENDİ
      // sanitizeAssets()/sanitizeDecorations()'ından geçirir — bu yüzden
      // burada normalizedSpec'e DOĞRUDAN atama yapmak güvenlidir, ekstra bir
      // sanitizasyon adımına gerek yoktur.
      var theme = normalizedSpec.theme;
      var groundAsset = resolveTopDownGroundTile(theme);
      normalizedSpec.assets = Object.assign({}, normalizedSpec.assets, {
        ground: toGroundTilePath(groundAsset),
      });
      var decorationAssetPaths = toDecorationPaths(resolveTopDownDecorationAssets(theme));
      normalizedSpec.decorations = generateWorldDecorations(
        normalizedSpec.world,
        normalizedSpec.obstacles,
        normalizedSpec.collectibles,
        decorationAssetPaths
      );

      var topDownHtml = buildTopDownHtml(normalizedSpec);
      var topDownValidation = validatePlayable(topDownHtml, trimmedPrompt);

      return res.json({
        html: topDownHtml,
        validation: topDownValidation,
        meta: {
          mock: specResult.mock,
          model: specResult.model,
          finishReason: specResult.finishReason,
          assetRetryApplied: false,
          // Mevcut gameType/assetKit alanlarıyla (asset-kit sınıflandırması)
          // KARIŞTIRILMASIN diye bilerek null bırakılıyor — TopDown Runtime
          // hiçbir asset-kit kullanmıyor. Yeni, ayrı bir alan (`pipeline`)
          // bu yanıtın Free-HTML değil, runtime tabanlı olduğunu belirtiyor.
          gameType: null,
          assetKit: null,
          pipeline: "topdown-runtime",
          gameSpec: normalizedSpec,
        },
      });
    }

    // 0) GAME TYPE DETECTION (additive, deterministik, LLM-SİZ) — GENERATE'DEN
    // ÖNCE hesaplanıyor ki sonucu generatePlayableAd()'a geçirebilelim.
    // detectGameType() prompt'u 4 sabit kitten biriyle eşler veya (emin
    // değilse) null döner; null durumunda aşağıdaki generatePlayableAd()
    // çağrısı gameType=null alır ve mevcut TAM 39 assetlik davranışa
    // güvenli şekilde düşer (bkz. openrouter.js resolveAssetContextForGameType).
    var gameTypeResult = detectGameType(trimmedPrompt);

    // 1) GENERATE
    var result = await generatePlayableAd(trimmedPrompt, gameTypeResult.gameType, selectedModel, selectedApiKey);

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
      var retryResult = await callOpenRouterForHtml(fixMessages, selectedModel, selectedApiKey);

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
    // GÜVENLİK (görev md.6/md.16): err.message SADECE bu dosyanın/
    // openrouterClient.js'in/specGenerator.js'in KENDİ ürettiği metinlerden
    // (HTTP status + OpenRouter'ın hata gövdesi) gelir — selectedApiKey
    // (veya process.env.OPENROUTER_API_KEY) HİÇBİR throw/Error metnine asla
    // interpolate edilmiyor (bkz. o iki dosyadaki throw satırları), bu
    // yüzden burada da hiçbir zaman loglanmıyor/response'a yazılmıyor.
    console.error("[generate] hata:", err.message);
    return res.status(500).json({ error: err.message || "Beklenmeyen bir hata oluştu." });
  }
});

module.exports = router;
