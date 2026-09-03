const express = require("express");
const { refinePlayableAd } = require("../services/refine");
const { validatePlayable } = require("../services/validate");

const router = express.Router();

/**
 * Validation check listesinden AI'a verilecek okunabilir bir düzeltme
 * talimatı üretir. Sadece pass olmayan (warning/fail) kontrolleri hedefler.
 */
function buildFixInstruction(checks) {
  var problems = (checks || []).filter(function (c) {
    return c.status === "fail" || c.status === "warning";
  });

  if (problems.length === 0) {
    return "Genel kaliteyi ve etkileşimi iyileştir.";
  }

  var lines = problems.map(function (c) {
    return "- " + c.name + (c.detail ? " (" + c.detail + ")" : "");
  });

  return "Aşağıdaki sorunları düzelt, oyunun geri kalanını olabildiğince koru:\n" + lines.join("\n");
}

// POST /api/autofix  { html, prompt, checks }
router.post("/autofix", async function (req, res) {
  var html = req.body && req.body.html;
  var prompt = (req.body && req.body.prompt) || "";
  var checks = (req.body && req.body.checks) || [];

  if (!html || typeof html !== "string") {
    return res.status(400).json({ error: "html alanı gerekli." });
  }

  try {
    var instruction = buildFixInstruction(checks);

    // GENERATE(fix) -> VALIDATE AGAIN
    var result = await refinePlayableAd(html, instruction);
    var validation = validatePlayable(result.html, prompt);

    return res.json({
      applied: result.applied,
      mock: result.mock,
      message: result.message,
      html: result.html,
      validation: validation,
    });
  } catch (err) {
    console.error("[autofix] hata:", err.message);
    return res.status(500).json({ error: err.message || "Beklenmeyen bir hata oluştu." });
  }
});

module.exports = router;
