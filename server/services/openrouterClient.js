/**
 * OpenRouter ile konuşan TEK düşük seviye yer. generatePlayableAd (generate)
 * ve refinePlayableAd (auto-fix / improve) bu ortak fonksiyonu kullanır —
 * böylece OpenRouter'a nasıl bağlanılacağı tek bir yerde tanımlı olur ve
 * yeni bir "AI çağrısı" özelliği eklemek sadece bu client'ı çağırmak kadar
 * kolay olur.
 *
 * API key yoksa null döner; mock/fallback davranışına karar vermek
 * çağıran servisin işidir (generate her zaman mock'a düşer, refine ise
 * "applied: false" ile bunu şeffaf şekilde bildirir).
 */
const modelConfig = require("../config/models");
const { normalizeGeneratedHtml } = require("./htmlNormalizer");

/**
 * ROUND 19 (Part C) — OpenRouter/sağlayıcıya göre değişen message.content
 * şeklini güvenli şekilde düz metne indirger. Beklenen/bilinen şekil düz
 * string'dir; bazı sağlayıcılar (OpenAI-uyumlu ama sağlayıcıya göre değişen,
 * belgelenmiş bir davranış) content'i parça (content-part) DİZİSİ olarak da
 * döndürebiliyor, örn. [{type:"text", text:"..."}]. Bu fonksiyon SADECE bu
 * iki şekli okur — davranış/model/prompt hiç değişmiyor, aynı içerik doğru
 * okunuyor. Saf fonksiyon (network yok) — server/tests/openrouterClient.test.js
 * bunu doğrudan test eder.
 */
function extractRawContent(message) {
  if (!message) return null;
  var content = message.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map(function (part) {
        return part && typeof part.text === "string" ? part.text : "";
      })
      .join("");
  }
  return null;
}

/**
 * PRODUCTION BYOK SECURITY FIX — TEK, MERKEZİ API key çözümleme kuralı.
 *
 * ÖNCEKİ (GÜVENSİZ) davranış: `apiKeyOverride || process.env.OPENROUTER_API_KEY`
 * — kullanıcı kendi key'ini girmediğinde (BYOK yok) server, KOŞULSUZ olarak
 * .env'deki OPENROUTER_API_KEY'e (sahibinin kendi, ücretli OpenRouter
 * hesabı) düşüyordu. Production'da bu, siteye giren HERKESİN, hiçbir key
 * girmeden, sahibinin hesabından generation yapabilmesi demekti (kritik
 * maliyet/güvenlik açığı).
 *
 * YENİ davranış: server-side key'in kullanılabilmesi artık EXPLICIT bir
 * opt-in flag'e (ALLOW_SERVER_API_KEY==="true") bağlı:
 *   - apiKeyOverride varsa (kullanıcının kendi BYOK key'i) HER ZAMAN o
 *     kullanılır — bu, ALLOW_SERVER_API_KEY'den bağımsız, hiç değişmedi.
 *   - apiKeyOverride YOKSA (veya boş/whitespace-only bir string'se, ki
 *     "" değeri zaten falsy olduğu için aşağıdaki || bunu otomatik
 *     kapsar), server-side OPENROUTER_API_KEY SADECE
 *     ALLOW_SERVER_API_KEY==="true" iken kullanılır; aksi halde (flag
 *     false/undefined — PRODUCTION VARSAYILANI) null döner ve çağıran
 *     taraf (generatePlayableAd/refinePlayableAd/generateTopDownSpec)
 *     ZATEN MEVCUT olan "key yok -> mock moda düş" davranışına güvenli
 *     şekilde düşer — mock mod hiçbir gerçek/ücretli AI çağrısı yapmaz,
 *     bu yüzden BYOK'suz kullanıcılar için davranış hâlâ "çöker" değil
 *     "mock'a düşer" (mevcut, DEĞİŞMEMİŞ mimari).
 *   - Local development'ta .env'e ALLOW_SERVER_API_KEY=true eklenerek
 *     ESKİ (server key fallback'li) davranış BİLİNÇLİ OLARAK geri
 *     açılabilir — bu, geliştiricinin kendi makinesinde/kendi key'iyle
 *     hâlâ eskisi gibi çalışabilmesini sağlar.
 *
 * callOpenRouterForHtml() (bu dosya) VE server/services/topdown/
 * specGenerator.js'in callLlmForSpec()'i (KENDİ, AYRI bir OpenRouter
 * çağrısı — bkz. o dosyanın başındaki not, callOpenRouterForHtml'i
 * KASITLI OLARAK kullanmıyor çünkü dönen içerik HTML değil ham JSON)
 * AYNI bu fonksiyonu çağırır — kural TEK bir yerde tanımlı, iki yerde
 * KOPYALANMIYOR (bu, tam da bu güvenlik açığının aynı hatanın ikinci bir
 * kopyasında sessizce hayatta kalmasını önler).
 *
 * apiKey hiçbir şekilde loglanmaz/response'a yazılmaz/saklanmaz — bu
 * fonksiyon SADECE hangi string'in (override/env/null) kullanılacağına
 * karar verir, değeri hiçbir yere yazmaz.
 */
function resolveEffectiveApiKey(apiKeyOverride) {
  if (apiKeyOverride) return apiKeyOverride;
  return process.env.ALLOW_SERVER_API_KEY === "true" ? process.env.OPENROUTER_API_KEY : null;
}

/**
 * messages: [{ role: "system"|"user", content: string }, ...]
 * modelOverride (AI MODEL SELECTOR round, OPSİYONEL 2. parametre): GERİYE
 * DÖNÜK UYUMLU — verilmezse (autofix/improve gibi mevcut çağıranlar HİÇ
 * DEĞİŞMEDİ) davranış BİREBİR ÖNCEKİ round'la aynı: modelConfig.model
 * (.env OPENROUTER_MODEL override'ı dahil mevcut varsayılan) kullanılır.
 * Verilirse (routes/generate.js'in ZATEN server/config/models.js'in
 * isSupportedModel()/resolveRequestedModel() ile DOĞRULADIĞI bir id) o
 * kullanılır — bu fonksiyonun KENDİSİ ayrıca bir doğrulama YAPMAZ (güvenme
 * sınırı çağıranda, tek bir yerde: models.js).
 * apiKeyOverride (OPENROUTER MODEL CATALOG + BYOK round, OPSİYONEL 3.
 * parametre): GERİYE DÖNÜK UYUMLU — verilmezse (autofix/improve gibi mevcut
 * TÜM çağıranlar HİÇ DEĞİŞMEDİ) davranış BİREBİR ÖNCEKİ round'la aynı:
 * process.env.OPENROUTER_API_KEY kullanılır. Verilirse (kullanıcının kendi
 * BYOK key'i — routes/generate.js req.body.apiKey'den okuyup geçirir) O
 * kullanılır. Bu key ASLA loglanmaz/response'a yazılmaz/saklanmaz — sadece
 * bu fonksiyonun yaşam süresi boyunca, tek bir Authorization başlığı
 * oluşturmak için bellekte tutulur (görev md.16).
 * Dönüş: { html, model, finishReason } ya da (hiçbir key yoksa) null.
 */
async function callOpenRouterForHtml(messages, modelOverride, apiKeyOverride) {
  var apiKey = resolveEffectiveApiKey(apiKeyOverride);
  if (!apiKey) {
    return null;
  }

  var effectiveModel = modelOverride || modelConfig.model;

  var body = {
    model: effectiveModel,
    temperature: modelConfig.temperature,
    max_tokens: modelConfig.max_tokens,
    messages: messages,
  };

  // ROUND 19 (Part E) — bkz. models.js "ROUND 19 NOTU (Part E)": bazı
  // modeller (ör. DeepSeek V4 Flash 0731) varsayılan olarak thinking mode
  // açık geliyor ve max_tokens bütçesini reasoning'de tüketip content'i
  // boş bırakabiliyor. modelConfig.reasoning SADECE tanımlıysa body'ye
  // eklenir — models.js'te tanımlı değilse (gelecekte başka bir model
  // reasoning parametresi istemezse) davranış hiç değişmez.
  if (modelConfig.reasoning) {
    body.reasoning = modelConfig.reasoning;
  }

  var response = await fetch(modelConfig.apiUrl, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
      "HTTP-Referer": modelConfig.appUrl,
      "X-Title": modelConfig.appName,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    var errText = await response.text();
    throw new Error("OpenRouter isteği başarısız (" + response.status + "): " + errText);
  }

  var data = await response.json();
  var choice = data && data.choices && data.choices[0] ? data.choices[0] : null;
  var message = choice ? choice.message : null;
  var rawContent = extractRawContent(message);

  if (!rawContent) {
    // ROUND 19 (Part C) — TANISAL log, SECRET İÇERMEZ (API key/prompt/HTML
    // içeriği YOK — sadece alan adları/tipleri/uzunlukları). Amaç: content
    // neden boş, GÖRÜNÜR kılmak. Bilinen bir olasılık: reasoning-capable
    // modeller (Qwen3 ailesi dahil) token bütçesini "reasoning" aşamasında
    // tüketirse content boş kalabiliyor (bkz. finish_reason "length" +
    // reasoning dolu) — bu satırlar SADECE bu ihtimali teşhis etmek için;
    // reasoning metni ASLA content yerine kullanılmıyor (bu, gerçekte
    // tamamlanmamış bir çıktıyı tamammış gibi göstermek olurdu).
    var reasoningText = message && typeof message.reasoning === "string" ? message.reasoning : null;
    var diag = {
      finishReason: choice ? choice.finish_reason || null : null,
      hasMessage: !!message,
      contentType: message ? (Array.isArray(message.content) ? "array(" + message.content.length + ")" : typeof message.content) : "yok",
      hasReasoningText: !!reasoningText,
      reasoningTextLength: reasoningText ? reasoningText.length : 0,
      hasReasoningDetails: !!(message && Array.isArray(message.reasoning_details) && message.reasoning_details.length > 0),
      topLevelKeys: data ? Object.keys(data) : [],
      choiceKeys: choice ? Object.keys(choice) : [],
      messageKeys: message ? Object.keys(message) : [],
      topLevelError: data && data.error ? String(data.error.message || data.error) : null,
    };
    console.error("[openrouterClient] içerik bulunamadı — güvenli tanı:", JSON.stringify(diag));
    throw new Error("OpenRouter yanıtında beklenen içerik bulunamadı.");
  }

  // finishReason: SADECE tanısal/gözlemsel bir alan — hiçbir davranışı,
  // skoru veya prompt'u değiştirmiyor. "Sorting hâlâ kesiliyor mu, kesiliyorsa
  // gerçekten max_tokens yüzünden mi (finish_reason: 'length') yoksa başka bir
  // sebepten mi (örn. 'stop', bir hata, ağ kesintisi)?" sorusuna kanıta dayalı
  // cevap vermek için eklendi (root cause tespiti). API key/secret içermez.
  var finishReason = choice ? choice.finish_reason || null : null;

  return {
    // stripCodeFence (markdown fence temizleme) artık normalizeGeneratedHtml
    // içinde yapılıyor — tek yerden, htmlNormalizer.js (fence temizleme +
    // <html>...</html> çıkarma + head-script taşıma). Oyunun kod mantığına
    // dokunulmuyor, sadece güvenli yapısal normalization.
    html: normalizeGeneratedHtml(rawContent),
    // AI MODEL SELECTOR round — body.model'in KENDİSİ (effectiveModel)
    // döndürülür (modelConfig.model DEĞİL) — böylece frontend'e/meta'ya
    // giden `model` alanı OpenRouter'a GERÇEKTEN gönderilen id'yi yansıtır.
    // modelOverride verilmediyse ikisi zaten AYNI (mevcut davranış korunur).
    model: effectiveModel,
    finishReason: finishReason,
  };
}

module.exports = {
  callOpenRouterForHtml: callOpenRouterForHtml,
  extractRawContent: extractRawContent,
  // PRODUCTION BYOK SECURITY FIX — dışa açılıyor ki server/services/topdown/
  // specGenerator.js (KENDİ, ayrı OpenRouter çağrısı) AYNI güvenlik kuralını
  // KOPYALAMADAN, buradan İTHAL ederek kullansın (merkezi çözüm).
  resolveEffectiveApiKey: resolveEffectiveApiKey,
};
