/**
 * PROMPT -> SPEC -> RUNTIME entegrasyonu — Game Specification üretici.
 *
 * server/services/openrouterClient.js'in ("Mevcut ... OpenRouter/model
 * config'e GEREKSİZ dokunma" kısıtı) TAMAMEN AYRI, KENDİ küçük OpenRouter
 * çağrısı — o dosyaya (veya server/services/openrouter.js'e) HİÇ
 * dokunulmadı. Sebep: callOpenRouterForHtml() dönen içeriği
 * normalizeGeneratedHtml() ile HTML'e özel şekilde işliyor (kod fence
 * temizleme + <html> çıkarma + head-script taşıma) — bizim ihtiyacımız
 * (ham JSON metni) bundan FARKLI, o yüzden ayrı, minimal bir fetch
 * kullanılıyor (aynı server/config/models.js'i, SADECE OKUYARAK, paylaşıyor).
 *
 * API key yoksa VEYA gerçek çağrı/JSON parse başarısız olursa
 * mockSpecGenerator.js'e (asla çökmeyen, güvenli) düşer — generatePlayableAd()
 * ile AYNI "mock'a düş" felsefesi.
 */
const modelConfig = require("../../config/models");
const { buildMockSpec } = require("./mockSpecGenerator");
const { TOPDOWN_SPEC_SYSTEM_PROMPT } = require("../../prompts/topDownSpecPrompt");

var MAX_POINT_ARRAY_LENGTH = 50;

function stripJsonFences(raw) {
  var text = (raw || "").trim();
  text = text.replace(/^```(?:json)?\s*/i, "");
  text = text.replace(/```\s*$/i, "");
  return text.trim();
}

/**
 * value: LLM/mock'tan gelen ham collectibles/obstacles dizisi adayı.
 * Sadece { x: number, y: number } şeklindeki, GEÇERLİ (finite) noktaları
 * tutar — her şey başka (dizi değil, eleman obje değil, x/y sayı değil)
 * SESSİZCE atlanır. Makul bir üst sınırla (50) sınırlandırılır — runtime
 * bu alanları HENÜZ render ETMİYOR (bkz. runtime.js), bu yüzden bu sadece
 * "genişletilebilir şema" için güvenli bir ön-temizlik.
 */
function sanitizePointArray(value) {
  if (!Array.isArray(value)) return [];
  var out = [];
  for (var i = 0; i < value.length && out.length < MAX_POINT_ARRAY_LENGTH; i++) {
    var item = value[i];
    if (
      item &&
      typeof item === "object" &&
      typeof item.x === "number" && isFinite(item.x) &&
      typeof item.y === "number" && isFinite(item.y)
    ) {
      out.push({ x: item.x, y: item.y });
    }
  }
  return out;
}

/**
 * raw: LLM/mock'tan gelen ham (henüz normalize edilmemiş) spec objesi.
 * specSchema.js'in normalizeSpec()'i "loseCondition" alanını BİLMİYOR
 * (o alanın adı "lose") — bu SADECE bir isim eşlemesi, hiçbir değer icat
 * edilmiyor/kaybolmuyor. raw zaten "lose" göndermişse (ileride/elle) o
 * korunur, "loseCondition" öncelikli değildir.
 */
function adaptRawSpecForRuntime(raw) {
  var adapted = raw && typeof raw === "object" ? Object.assign({}, raw) : {};
  if (adapted.loseCondition && !adapted.lose) {
    adapted.lose = adapted.loseCondition;
  }
  return adapted;
}

function extractContent(message) {
  if (!message) return null;
  if (typeof message.content === "string") return message.content;
  if (Array.isArray(message.content)) {
    return message.content
      .map(function (part) {
        return part && typeof part.text === "string" ? part.text : "";
      })
      .join("");
  }
  return null;
}

/**
 * Dönüş: { raw: string, model: string, finishReason: string|null } ya da
 * (API key yoksa) null. callOpenRouterForHtml() ile AYNI "key yoksa null"
 * sözleşmesi — mock'a düşme kararı çağıranın (generateTopDownSpec) işi.
 *
 * modelOverride (AI MODEL SELECTOR round, OPSİYONEL 2. parametre): GERİYE
 * DÖNÜK UYUMLU — verilmezse modelConfig.model (mevcut varsayılan) kullanılır.
 * routes/generate.js BURAYA SADECE server/config/models.js'in ZATEN
 * doğruladığı bir id geçirir — bu fonksiyon ayrıca bir doğrulama YAPMAZ.
 * openrouterClient.js'e (callOpenRouterForHtml) DOKUNULMADI — bu, o
 * dosyanın dosya başı notunun da açıkladığı gibi TAMAMEN AYRI bir küçük
 * OpenRouter çağrısı, SADECE aynı model seçimi mantığını PAYLAŞIYOR.
 *
 * apiKeyOverride (OPENROUTER MODEL CATALOG + BYOK round, OPSİYONEL 3.
 * parametre): openrouterClient.js'in apiKeyOverride'ı İLE AYNI desen —
 * verilmezse process.env.OPENROUTER_API_KEY (ÖNCEKİ round'la birebir aynı),
 * verilirse kullanıcının BYOK key'i kullanılır. Loglanmaz/saklanmaz.
 */
async function callLlmForSpec(prompt, modelOverride, apiKeyOverride) {
  var apiKey = apiKeyOverride || process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  var effectiveModel = modelOverride || modelConfig.model;

  var body = {
    model: effectiveModel,
    temperature: modelConfig.temperature,
    // JSON bir Game Specification, tam bir HTML/CSS/JS oyunundan ÇOK daha
    // kısa — modelConfig.max_tokens (6500) burada gereksiz; küçük, sabit
    // bir üst sınır yeterli ve daha hızlı/ucuz.
    max_tokens: 2000,
    messages: [
      { role: "system", content: TOPDOWN_SPEC_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
  };
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
    throw new Error("OpenRouter (topdown-spec) isteği başarısız (" + response.status + "): " + errText);
  }

  var data = await response.json();
  var choice = data && data.choices && data.choices[0] ? data.choices[0] : null;
  var content = extractContent(choice ? choice.message : null);

  if (!content) {
    throw new Error("OpenRouter (topdown-spec) yanıtında beklenen içerik bulunamadı.");
  }

  return {
    raw: content,
    // AI MODEL SELECTOR round — body.model'in KENDİSİ (effectiveModel)
    // döndürülür (openrouterClient.js callOpenRouterForHtml İLE AYNI
    // düzeltme/gerekçe) — modelOverride verilmediyse ikisi zaten AYNI.
    model: effectiveModel,
    finishReason: choice ? choice.finish_reason || null : null,
  };
}

function mockResult(prompt, model, finishReason) {
  var mockSpec = buildMockSpec(prompt);
  return {
    spec: adaptRawSpecForRuntime(mockSpec),
    collectibles: sanitizePointArray(mockSpec.collectibles),
    obstacles: sanitizePointArray(mockSpec.obstacles),
    mock: true,
    model: model || null,
    finishReason: finishReason || null,
  };
}

/**
 * prompt: kullanıcının ham prompt metni (zaten eligibility gate'i geçmiş).
 * modelOverride (AI MODEL SELECTOR round, OPSİYONEL 2. parametre): GERİYE
 * DÖNÜK UYUMLU — verilmezse davranış BİREBİR ÖNCEKİ round'la aynı.
 * apiKeyOverride (OPENROUTER MODEL CATALOG + BYOK round, OPSİYONEL 3.
 * parametre): callLlmForSpec'e AYNEN iletilir, bkz. o fonksiyonun yorumu.
 * Dönüş: { spec, collectibles, obstacles, mock, model, finishReason }.
 * `spec`, HENÜZ normalize EDİLMEMİŞ (adapt edilmiş) bir objedir —
 * routes/generate.js bunu specSchemaBridge.normalizeSpec()'e verir.
 * ASLA throw etmez — LLM/parse hatası her zaman güvenli mock'a düşer.
 */
async function generateTopDownSpec(prompt, modelOverride, apiKeyOverride) {
  var llmResult = null;
  try {
    llmResult = await callLlmForSpec(prompt, modelOverride, apiKeyOverride);
  } catch (err) {
    console.error("[topdown specGenerator] LLM hatası, mock spec'e düşülüyor:", err.message);
    llmResult = null;
  }

  if (!llmResult) {
    return mockResult(prompt, null, null);
  }

  var parsed = null;
  try {
    parsed = JSON.parse(stripJsonFences(llmResult.raw));
  } catch (err) {
    console.error("[topdown specGenerator] JSON parse hatası, mock spec'e düşülüyor:", err.message);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return mockResult(prompt, llmResult.model, llmResult.finishReason);
  }

  return {
    spec: adaptRawSpecForRuntime(parsed),
    collectibles: sanitizePointArray(parsed.collectibles),
    obstacles: sanitizePointArray(parsed.obstacles),
    mock: false,
    model: llmResult.model,
    finishReason: llmResult.finishReason,
  };
}

module.exports = {
  generateTopDownSpec: generateTopDownSpec,
  adaptRawSpecForRuntime: adaptRawSpecForRuntime,
  sanitizePointArray: sanitizePointArray,
  stripJsonFences: stripJsonFences,
};
