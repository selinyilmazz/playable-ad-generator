/**
 * PERSISTENT USER OPENROUTER API KEYS (Phase 3) — /api/keys/:provider CRUD.
 *
 * routes/games.js İLE AYNI desen: bu router'ın TÜM route'ları kimlik
 * doğrulaması İSTER (requireAuth) -- attachUser'ın "hiçbir isteği
 * reddetme" genel kuralından KASITLI bir istisna, çünkü stored API key
 * KENDİSİ bir hesap gerektiren bir özellik. Anonim kullanıcılar bu
 * endpoint'lere hiç istek ATMAZ (frontend SADECE signed-in iken çağırır).
 *
 * GÜVENLİK (KESİN):
 *  - userId/accessToken HİÇBİR route handler'da req.body/req.query'den
 *    OKUNMAZ -- HER ZAMAN req.userId/req.accessToken (attachUser'ın
 *    doğruladığı) kullanılır. req.body.userId/req.body.user_id BURADA
 *    HİÇ OKUNMUYOR (koddan aramayla doğrulanabilir).
 *  - Hiçbir response HİÇBİR ZAMAN şunları içermez: apiKey, plaintext,
 *    encrypted_key, ciphertext, nonce, authTag, master key. Bu router
 *    services/userApiKeyPersistence.js'in getUserApiKey() (server-içi,
 *    plaintext döndüren) fonksiyonunu HİÇ IMPORT ETMİYOR/ÇAĞIRMIYOR --
 *    sadece saveUserApiKey/getUserApiKeyStatus/deleteUserApiKey (hiçbiri
 *    plaintext/ciphertext döndürmez) kullanılıyor.
 */
const express = require("express");
const userApiKeyPersistence = require("../services/userApiKeyPersistence");
const { validateApiKey } = require("../services/openrouterKeyValidation");

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.userId || !req.accessToken) {
    return res.status(401).json({ error: "Sign in required to manage your API keys." });
  }
  next();
}

function requireSupportedProvider(req, res, next) {
  if (!userApiKeyPersistence.isSupportedProvider(req.params.provider)) {
    return res.status(400).json({ error: "Unsupported provider." });
  }
  next();
}

function handlePersistenceError(res, err) {
  if (err instanceof userApiKeyPersistence.PersistenceUnavailableError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err instanceof userApiKeyPersistence.PersistenceError) {
    return res.status(err.status).json({ error: err.message });
  }
  // Beklenmeyen bir hata -- err.message Postgrest/SDK hatası olduğu için
  // secret/token TAŞIMAZ, ama yine de tüm err objesini/header'ları DEĞİL
  // sadece mesajı logluyoruz (games.js İLE AYNI konvansiyon).
  console.error("[apiKeys] unexpected error:", err && err.message);
  return res.status(500).json({ error: "Could not complete this request right now." });
}

router.use("/keys", requireAuth);

// POST /api/keys/:provider  { apiKey: string }
// Dönüş: { provider, hasKey: true, updatedAt } -- apiKey/plaintext/ciphertext
// HİÇBİR ZAMAN response'a yazılmaz.
router.post("/keys/:provider", requireSupportedProvider, async function (req, res) {
  var apiKey = req.body && typeof req.body.apiKey === "string" ? req.body.apiKey.trim() : "";
  if (!apiKey) {
    return res.status(400).json({ error: "apiKey is required." });
  }

  try {
    // Kaydetmeden ÖNCE hafif bir doğrulama -- openrouterKeyValidation.js
    // (BYOK modalının "Use API Key" akışının ZATEN kullandığı AYNI, sabit/
    // key-free hata metinleri döndüren servis) -- açıkça geçersiz bir key
    // hesaba KAYDEDİLMEDEN reddedilir. OpenRouter'a ULAŞILAMAZSA (ağ hatası)
    // validateApiKey ASLA throw etmez, sadece {valid:false, error: sabit
    // metin} döner -- bu durumda kayıt reddedilir (güvenli/muhafazakâr
    // taraf), kullanıcı tekrar deneyebilir.
    var validation = await validateApiKey(apiKey);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error || "Invalid API key." });
    }

    var result = await userApiKeyPersistence.saveUserApiKey(req.accessToken, req.userId, req.params.provider, apiKey);
    return res.status(200).json({ provider: result.provider, hasKey: true, updatedAt: result.updatedAt });
  } catch (err) {
    handlePersistenceError(res, err);
  }
});

// GET /api/keys/:provider/status
// Dönüş: { provider, hasKey: boolean, updatedAt } -- SADECE metadata,
// hiçbir secret alanı yok (userApiKeyPersistence.getUserApiKeyStatus
// zaten ciphertext/nonce/authTag'i hiç SELECT ETMİYOR).
router.get("/keys/:provider/status", requireSupportedProvider, async function (req, res) {
  try {
    var status = await userApiKeyPersistence.getUserApiKeyStatus(req.accessToken, req.userId, req.params.provider);
    return res.json(status);
  } catch (err) {
    handlePersistenceError(res, err);
  }
});

// DELETE /api/keys/:provider
// Dönüş: { provider, hasKey: false } -- satır var olsun ya da olmasın
// (idempotent, aynı dürüst şekil).
router.delete("/keys/:provider", requireSupportedProvider, async function (req, res) {
  try {
    await userApiKeyPersistence.deleteUserApiKey(req.accessToken, req.userId, req.params.provider);
    return res.json({ provider: req.params.provider, hasKey: false });
  } catch (err) {
    handlePersistenceError(res, err);
  }
});

module.exports = router;
