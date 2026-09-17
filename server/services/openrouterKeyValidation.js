/**
 * OPENROUTER MODEL CATALOG + BYOK round — kullanıcının kendi OpenRouter API
 * key'ini, HİÇBİR YERE kaydetmeden/loglamadan, hafif bir istekle doğrular.
 *
 * OpenRouter'ın kendi "key info" uç noktası (GET /api/v1/auth/key,
 * Authorization: Bearer <key>) kullanılıyor — chat/completions gibi
 * ücretli/üretken bir istek GÖNDERMİYORUZ (görev md.7: "gereksiz ek API
 * çağrısı oluşturma" ruhu), sadece key'in GEÇERLİ olup olmadığını soran en
 * ucuz/en hafif uç nokta.
 *
 * GÜVENLİK (görev md.16): apiKey parametresi bu dosyanın DIŞINA asla
 * loglanmadan/response'a yazılmadan çıkmaz — dönen obje SADECE
 * {valid, error} taşır, error mesajları SABİT/genel metinlerdir (OpenRouter'ın
 * ham hata gövdesi asla aynen geri döndürülmez, çünkü bazı sağlayıcı hata
 * gövdeleri isteğin başlıklarını/parçalarını yansıtabilir — bu riski baştan
 * önlemek için biz KENDİ sabit metnimizi kullanıyoruz).
 */
var VALIDATE_URL = "https://openrouter.ai/api/v1/auth/key";

/**
 * apiKey: kullanıcının girdiği, GÜVENİLMEYEN/HAM key string'i.
 * Dönüş: { valid: true } ya da { valid: false, error: "<kullanıcıya
 * gösterilebilir, key İÇERMEYEN, sabit bir metin>" }. ASLA throw etmez.
 */
async function validateApiKey(apiKey) {
  if (typeof apiKey !== "string" || !apiKey.trim()) {
    return { valid: false, error: "API key boş olamaz." };
  }
  // Çok kısa/çok uzun/beklenmedik karakter içeren bir string'i ağa hiç
  // göndermeden reddet — ne bir doğrulama sonucu bekletir ne de anlamsız
  // bir istek gönderir.
  var trimmed = apiKey.trim();
  if (trimmed.length < 10 || trimmed.length > 400) {
    return { valid: false, error: "Invalid OpenRouter API key" };
  }

  try {
    var response = await fetch(VALIDATE_URL, {
      method: "GET",
      headers: { Authorization: "Bearer " + trimmed },
    });
    if (response.ok) {
      return { valid: true };
    }
    if (response.status === 401 || response.status === 403) {
      return { valid: false, error: "Invalid OpenRouter API key" };
    }
    return { valid: false, error: "OpenRouter key doğrulaması şu anda yapılamıyor, lütfen tekrar deneyin." };
  } catch (err) {
    return { valid: false, error: "OpenRouter'a ulaşılamadı, key doğrulanamadı." };
  }
}

module.exports = { validateApiKey: validateApiKey };
