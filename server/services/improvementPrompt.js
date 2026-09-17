/**
 * ROUND G — IMPROVE WITH AI.
 *
 * Bu dosya YENİ bir AI çağrısı/generation pipeline'ı DEĞİL — mevcut Auto-Fix
 * / Improve with AI mimarisinin ("mevcut HTML + bir talimat -> güncellenmiş
 * HTML", bkz. server/services/refine.js + server/prompts/refinePrompt.js)
 * paylaşılan tek AI-çağrı yoluna geçirilecek, ZENGİN ve YAPILANDIRILMIŞ bir
 * "instruction" METNİ inşa eden SAF bir yardımcı (network yok, side-effect
 * yok, state tutmuyor). routes/improve.js bu string'i doğrudan
 * refinePlayableAd(html, instruction, model, apiKey)'e geçirir — o da
 * (DEĞİŞMEDEN) buildRefineUserMessage(html, instruction) üzerinden
 * "TALİMAT:\n<instruction>\n\nMEVCUT HTML:\n<html>" şeklini oluşturur. Yani
 * kod tabanına YENİ bir prompt inşa / AI çağrı yolu EKLENMİYOR — sadece
 * "TALİMAT" kısmına ne yazılacağı zenginleştiriliyor.
 */

// Görev md.2/md.17 — panelde gösterilen 6 hazır seçenek ile BİREBİR aynı
// metin/anlam. Anahtarlar (visual/gameplay/fun/challenge/effects/content),
// hem frontend'in gönderdiği `improvements` dizisiyle hem de burada
// eşleşir — tek doğruluk kaynağı burası.
var IMPROVEMENT_OPTION_LABELS = {
  visual: "Visual Quality — make the game more polished and visually appealing.",
  gameplay: "Gameplay — improve controls, interactions and game feel.",
  fun: "Make It More Fun — add more engaging interactions, feedback and variety.",
  challenge: "Increase Challenge — make the gameplay more challenging while keeping it fair.",
  effects: "Add Effects — add visual feedback, particles, animations and polish.",
  content: "Add More Content — add more levels, obstacles, collectibles or gameplay variety where appropriate.",
};

// Görev md.4 (prompt architecture) için gerçek bir üst sınır — gameSpec'in
// (TopDown Runtime pipeline'ında) teorik olarak büyük olabileceği durumlar
// için: LLM'e gönderilen instruction metni sınırsız büyümesin diye
// KESİLİYOR (çökme değil, sessiz/güvenli bir kırpma — mevcut MAX_DECORATIONS
// vb. sınırlar sayesinde pratikte NADİREN tetiklenir).
var MAX_GAME_SPEC_JSON_CHARS = 12000;

function describeImprovementOptions(optionKeys) {
  return (optionKeys || [])
    .map(function (key) {
      return IMPROVEMENT_OPTION_LABELS[key];
    })
    .filter(Boolean);
}

/**
 * meta: routes/generate.js'in ürettiği ve frontend'in lastResult.meta olarak
 * sakladığı AYNI obje (gameType/assetKit/pipeline/gameSpec/mock/model/...).
 * Buradan SADECE ilgili/kompakt alanlar okunur — assetKit'in tüm `roles`
 * eşlemesi gibi büyük/alakasız kısımları BİLEREK dahil edilmez.
 */
function buildCurrentGameSummary(meta) {
  var lines = [
    "Analyze the CURRENT HTML/JS provided below (after MEVCUT HTML) to understand this game's " +
      "actual objective, controls, entities, assets, scoring, health/lives, timer, levels, " +
      "difficulty and overall structure before making any change. Do not guess — read the code.",
  ];

  if (meta && meta.gameType) {
    lines.push("Game type (detected): " + meta.gameType);
  }
  if (meta && meta.assetKit && meta.assetKit.name) {
    lines.push(
      "Asset kit: " + meta.assetKit.name + (meta.assetKit.description ? " — " + meta.assetKit.description : "")
    );
  }
  if (meta && meta.pipeline === "topdown-runtime" && meta.gameSpec) {
    var specJson = JSON.stringify(meta.gameSpec);
    if (specJson.length > MAX_GAME_SPEC_JSON_CHARS) {
      specJson = specJson.slice(0, MAX_GAME_SPEC_JSON_CHARS) + "…(truncated)";
    }
    lines.push(
      "Structured game spec (JSON — world size, entities, collectibles, obstacles, decorations, difficulty, etc.):\n" +
        specJson
    );
  }

  return lines.join("\n");
}

/**
 * params: {
 *   originalPrompt: string,
 *   meta: object|null,          // lastResult.meta (bkz. yukarı)
 *   optionKeys: string[],       // seçili hazır improvement seçenekleri
 *   customText: string,         // opsiyonel serbest metin
 * }
 * Dönüş: refinePlayableAd()'a `instruction` olarak geçirilecek TEK string.
 */
function buildImprovementInstruction(params) {
  var originalPrompt = (params && params.originalPrompt) || "";
  var meta = (params && params.meta) || null;
  var optionDescriptions = describeImprovementOptions(params && params.optionKeys);
  var customText = (params && params.customText && String(params.customText).trim()) || "";

  var requestBlock = optionDescriptions.length
    ? optionDescriptions
        .map(function (d) {
          return "- " + d;
        })
        .join("\n")
    : "General improvement — use your best judgment within the RULES below.";

  var sections = [
    "CURRENT GAME:\n" + buildCurrentGameSummary(meta),
    "ORIGINAL USER IDEA:\n" + (originalPrompt || "(not available)"),
    "IMPROVEMENT REQUEST:\n" + requestBlock,
  ];

  if (customText) {
    sections.push("USER CUSTOM REQUEST:\n" + customText);
  }

  sections.push(
    "RULES:\n" +
      "- Preserve the core game concept described in ORIGINAL USER IDEA — do not turn this into a different kind of game.\n" +
      "- Preserve working controls unless the improvement request explicitly requires changing them.\n" +
      "- Preserve compatible existing assets where possible.\n" +
      "- Improve ONLY the requested area(s) above — do not make unrelated changes.\n" +
      "- Do not remove working gameplay unnecessarily.\n" +
      "- Keep the game playable end-to-end.\n" +
      "- Keep win/lose conditions coherent.\n" +
      "- Keep mobile responsiveness.\n" +
      "- Keep all existing generation constraints (single file, no external resources, no storage APIs, etc.)."
  );

  return sections.join("\n\n");
}

module.exports = {
  IMPROVEMENT_OPTION_LABELS: IMPROVEMENT_OPTION_LABELS,
  buildImprovementInstruction: buildImprovementInstruction,
};
