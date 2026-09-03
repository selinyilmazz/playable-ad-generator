const express = require("express");
const { refinePlayableAd } = require("../services/refine");
const { validatePlayable } = require("../services/validate");

const router = express.Router();

// POST /api/improve  { html, prompt, instruction }
router.post("/improve", async function (req, res) {
  var html = req.body && req.body.html;
  var prompt = (req.body && req.body.prompt) || "";
  var instruction = req.body && req.body.instruction;

  if (!html || typeof html !== "string") {
    return res.status(400).json({ error: "html alanı gerekli." });
  }
  if (!instruction || typeof instruction !== "string" || instruction.trim().length === 0) {
    return res.status(400).json({ error: "instruction alanı gerekli." });
  }

  try {
    var result = await refinePlayableAd(html, instruction.trim());
    var validation = validatePlayable(result.html, prompt);

    return res.json({
      applied: result.applied,
      mock: result.mock,
      message: result.message,
      html: result.html,
      validation: validation,
    });
  } catch (err) {
    console.error("[improve] hata:", err.message);
    return res.status(500).json({ error: err.message || "Beklenmeyen bir hata oluştu." });
  }
});

module.exports = router;
