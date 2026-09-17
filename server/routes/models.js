/**
 * AI MODEL SELECTOR round — GET /api/models.
 * OPENROUTER MODEL CATALOG + BYOK round — bu round'da EK olarak:
 *  - GET /api/models artık server/services/modelCatalog.js üzerinden
 *    CANLI OpenRouter kataloğunu (metin->metin süzülmüş, temizlenmiş) döner;
 *    canlı katalog alınamazsa modelCatalog.js'in KENDİ, güvenli fallback'i
 *    (statik DeepSeek/Qwen) devreye girer — bu route ayrıca bir fallback
 *    mantığı YAZMIYOR, sadece modelCatalog'un ZATEN garanti ettiği "asla
 *    boş/hatalı dönmez" sözleşmesine güveniyor (ek bir try/catch SADECE
 *    beklenmeyen bir hataya karşı son bir güvenlik ağı olarak var).
 *  - POST /api/models/validate-key: kullanıcının kendi OpenRouter key'ini
 *    KAYDETMEDEN doğrular (bkz. openrouterKeyValidation.js).
 *
 * GÜVENLİK (DEĞİŞMEDİ + genişletildi): GET /api/models yanıtı hâlâ SADECE
 * `models`/`defaultModel` taşır — apiUrl/apiKey/appName/reasoning/
 * temperature/max_tokens gibi hiçbir dahili/secret alan response'a GİRMEZ.
 * Her model girdisi artık id/displayName'e EK OLARAK provider/contextLength/
 * pricing/inputModalities/outputModalities taşıyor (görev md.1/md.2) — ama
 * bunların HİÇBİRİ secret DEĞİL (OpenRouter'ın zaten PUBLIC kataloğundan
 * geliyor). validate-key endpoint'i, GÖNDERİLEN key'i YANITA ASLA yazmaz
 * (bkz. router.post aşağıda — sadece {valid, error} döner).
 */
const express = require("express");
const modelConfig = require("../config/models");
const modelCatalog = require("../services/modelCatalog");
const { validateApiKey } = require("../services/openrouterKeyValidation");

const router = express.Router();

router.get("/models", async function (req, res) {
  try {
    var result = await modelCatalog.getModelCatalog();
    res.json({
      models: result.models,
      defaultModel: modelConfig.defaultModel,
    });
  } catch (err) {
    // modelCatalog.getModelCatalog() zaten kendi içinde try/catch'li ve
    // ASLA throw etmiyor — bu blok sadece beklenmedik bir durumda bile
    // (ör. modelConfig'in kendisinde bir sorun) request'in asla 500 ile
    // çökmemesini, hep ÇALIŞAN eski statik listeye düşmesini garanti eden
    // ekstra bir güvenlik ağı.
    console.error("[models] GET /api/models beklenmedik hata, statik listeye düşülüyor:", err.message);
    res.json({ models: modelConfig.models, defaultModel: modelConfig.defaultModel });
  }
});

// POST /api/models/validate-key  { apiKey: string }
// GÜVENLİK (görev md.5/md.7/md.16): apiKey burada HİÇBİR YERE yazılmaz/
// loglanmaz/saklanmaz — sadece validateApiKey()'e (tek kullanımlık, ağa
// giden bir istek için) geçirilir ve fonksiyondan çıkar çıkmaz referans
// bırakılmaz. Yanıt SADECE {valid, error?} — key'in kendisi ASLA yanıtta
// yer almaz.
router.post("/models/validate-key", async function (req, res) {
  var apiKey = req.body && req.body.apiKey;
  var result = await validateApiKey(apiKey);
  if (result.valid) {
    return res.json({ valid: true });
  }
  return res.json({ valid: false, error: result.error || "Invalid OpenRouter API key" });
});

module.exports = router;
