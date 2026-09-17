const express = require("express");
const { refinePlayableAd } = require("../services/refine");
const { validatePlayable } = require("../services/validate");
// ROUND G — IMPROVE WITH AI: yapılandırılmış instruction inşası SAF bir
// yardımcıda yaşıyor (bkz. o dosyanın başı) — burada AYRI bir AI çağrı yolu
// YOK, sadece refinePlayableAd'a geçirilecek instruction METNİ zenginleşti.
const { buildImprovementInstruction, IMPROVEMENT_OPTION_LABELS } = require("../services/improvementPrompt");
// AI MODEL SELECTOR / BYOK round'larıyla AYNI, tek paylaşılan doğrulama
// noktaları — routes/generate.js İLE BİREBİR aynı desen (görev md.5:
// "Improve with AI, Generate ile AYNI model-selection sistemini kullanmalı,
// ayrı bir model state oluşturma"). Kendi kopyamız YAZILMIYOR.
const modelCatalog = require("../services/modelCatalog");

const router = express.Router();

var VALID_IMPROVEMENT_KEYS = Object.keys(IMPROVEMENT_OPTION_LABELS);

// POST /api/improve
//
// ESKİ (Phase 4) sözleşme — HİÇ DEĞİŞMEDİ, birebir aynı davranış:
//   { html, prompt, instruction }
//
// ROUND G (YENİ, opsiyonel/additive) sözleşme — `instruction` YERİNE:
//   { html, prompt, meta, improvements: string[], customText, model, apiKey }
//   Bu durumda yapılandırılmış bir instruction SUNUCU TARAFINDA inşa edilir
//   (bkz. improvementPrompt.js — "CURRENT GAME / ORIGINAL USER IDEA /
//   IMPROVEMENT REQUEST / USER CUSTOM REQUEST / RULES"). İkisi birden
//   gelirse (olmamalı, ama güvenlik için) `instruction` ÖNCELİKLİDİR —
//   böylece eski davranışa güvenen HİÇBİR çağıran (test dahil) etkilenmez.
router.post("/improve", async function (req, res) {
  var html = req.body && req.body.html;
  var prompt = (req.body && req.body.prompt) || "";
  var rawInstruction = req.body && req.body.instruction;

  if (!html || typeof html !== "string") {
    return res.status(400).json({ error: "html alanı gerekli." });
  }

  // ROUND G alanları — hepsi OPSİYONEL, hiçbiri yoksa (eski çağıran) bu blok
  // hiçbir şey değiştirmez.
  var improvements = [];
  if (req.body && Array.isArray(req.body.improvements)) {
    improvements = req.body.improvements.filter(function (key) {
      return typeof key === "string" && VALID_IMPROVEMENT_KEYS.indexOf(key) !== -1;
    });
  }
  var customText =
    req.body && typeof req.body.customText === "string" ? req.body.customText.trim() : "";
  var meta = (req.body && req.body.meta && typeof req.body.meta === "object") ? req.body.meta : null;

  var instruction;
  if (typeof rawInstruction === "string" && rawInstruction.trim().length > 0) {
    // Eski davranış — BİREBİR AYNI.
    instruction = rawInstruction.trim();
  } else if (improvements.length > 0 || customText.length > 0) {
    instruction = buildImprovementInstruction({
      originalPrompt: prompt,
      meta: meta,
      optionKeys: improvements,
      customText: customText,
    });
  } else {
    return res.status(400).json({
      error: "instruction alanı, ya da en az bir improvement seçeneği/customText gerekli.",
    });
  }

  // md.5 — Generate (routes/generate.js) İLE BİREBİR AYNI, tek paylaşılan
  // doğrulama noktaları: id güvenli formatta + (canlı/önbelleğe alınmış)
  // kataloğun GERÇEK üyesi değilse SESSİZCE mevcut varsayılana düşer; boş/
  // whitespace-only bir apiKey YOKSAYILIR (ENV fallback'in devreye girmesi
  // için). Bu satırlar ASLA throw etmez.
  var selectedModel = modelCatalog.resolveRequestedModelFromCache(req.body && req.body.model);
  var selectedApiKey =
    req.body && typeof req.body.apiKey === "string" && req.body.apiKey.trim() ? req.body.apiKey.trim() : null;

  try {
    var result = await refinePlayableAd(html, instruction, selectedModel, selectedApiKey);
    var validation = validatePlayable(result.html, prompt);

    return res.json({
      applied: result.applied,
      mock: result.mock,
      message: result.message,
      html: result.html,
      validation: validation,
      // ROUND G — frontend'in (Generate'te olduğu gibi) badge/metadata'yı
      // yeni versiyona göre güncelleyebilmesi için EKLENEN, additive alan.
      // Eski çağıranlar (varsa) bu alanı okumadığı için hiçbir şey kırılmaz.
      model: result.model || selectedModel,
    });
  } catch (err) {
    // GÜVENLİK (md: API key değeri hiçbir şekilde loglama/response'a
    // koyma): err.message SADECE openrouterClient.js'in ürettiği, key
    // İÇERMEYEN metinlerden gelir (bkz. o dosyadaki throw satırları) —
    // selectedApiKey/process.env.OPENROUTER_API_KEY hiçbir zaman buraya
    // interpolate edilmez.
    console.error("[improve] hata:", err.message);
    return res.status(500).json({ error: err.message || "Beklenmeyen bir hata oluştu." });
  }
});

module.exports = router;
