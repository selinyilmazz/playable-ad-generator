/**
 * Pipeline'ın "validate" adımı — tek giriş noktası: validatePlayable(html, userPrompt).
 *
 * Gerçek kontrol tanımları server/services/validation/checks.js içinde,
 * skor hesaplama server/services/validation/score.js içinde. Bu dosya
 * sadece ikisini birleştiren ince bir orchestrator'dır (küçük, modüler
 * servisler kuralı).
 */
const { CHECKS } = require("./validation/checks");
const { computeScore } = require("./validation/score");

function validatePlayable(html, userPrompt) {
  var ctx = {
    html: html || "",
    lowerHtml: (html || "").toLowerCase(),
    userPrompt: userPrompt || "",
    lowerPrompt: (userPrompt || "").toLowerCase(),
  };

  var checks = CHECKS.map(function (def) {
    var result = def.run(ctx);
    return {
      key: def.key,
      name: def.name,
      critical: !!def.critical,
      status: result.status,
      detail: result.detail || null,
    };
  });

  var hasCriticalFail = checks.some(function (c) {
    return c.critical && c.status === "fail";
  });

  var warnings = checks
    .filter(function (c) {
      return c.status !== "pass";
    })
    .map(function (c) {
      return c.name + (c.detail ? ": " + c.detail : "");
    });

  return {
    valid: !hasCriticalFail,
    score: computeScore(checks),
    checks: checks,
    warnings: warnings,
  };
}

module.exports = { validatePlayable: validatePlayable };
