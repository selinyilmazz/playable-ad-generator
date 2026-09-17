/**
 * OPENROUTER MODEL CATALOG + BYOK round — canlı OpenRouter model kataloğunu
 * (GET https://openrouter.ai/api/v1/models, PUBLIC/auth'suz bir uç nokta)
 * çeken, bu uygulamanın text->text üretim hattına UYGUN modellere süzen,
 * kısa süreliğine önbelleğe alan ve OpenRouter erişilemezse GÜVENLİ şekilde
 * server/config/models.js'in MEVCUT statik 2 modeline (DeepSeek/Qwen)
 * düşen, TAMAMEN AYRI/additive bir servis.
 *
 * BİLEREK server/config/models.js'e DOKUNULMADI: o dosyanın senkron
 * sözleşmesi (config.models/config.defaultModel/isSupportedModel/
 * resolveRequestedModel) mevcut çağıranlar (routes/generate.js'in eski
 * senkron kullanımı, server/tests/modelSelector.test.js'in doğrudan
 * çağırdığı unit testler) için BİREBİR aynı kalmalı — bu dosya o statik
 * listeyi SADECE "her zaman var olması garanti edilen son çare" (fallback)
 * katmanı olarak OKUYOR, hiçbir şeyini DEĞİŞTİRMİYOR.
 *
 * Ağ/proxy notu: bu bulut sandbox'ının egress proxy'si openrouter.ai'ye
 * CONNECT izni vermiyor (organization policy, 403) — yani bu servisin
 * "canlı katalog alınamazsa güvenli fallback'e düş" yolu, geliştirme
 * sırasında GERÇEKTEN, her seferinde egzersiz edilmiş oluyor. Bu, canlı
 * OpenRouter yanıt şeklinin bu ortamda uçtan uca DOĞRULANAMADIĞI anlamına
 * gelir (final raporda "limitation" olarak belirtiliyor) — ayrıştırma
 * mantığı OpenRouter'ın belgelenmiş/bilinen /api/v1/models şekline göre
 * yazıldı (id, name, context_length, pricing:{prompt,completion},
 * architecture:{input_modalities,output_modalities}) ve HER alan
 * savunmacı şekilde (tip kontrolüyle) okunuyor — beklenmedik/eksik bir
 * alan asla throw etmez, sadece o modeli/alanı atlar.
 */
const modelConfig = require("../config/models");

var CATALOG_URL = "https://openrouter.ai/api/v1/models";

// Görev md.10: "5-15 dakika arası kısa bir server-side cache". 10 dakika
// seçildi — aralığın ortası, sayfa her açıldığında OpenRouter'a gitmeyi
// önlemeye yeter, aşırı bayat da değil.
var CACHE_TTL_MS = 10 * 60 * 1000;

// Modül-seviyesi tekil (singleton) önbellek — process ömrü boyunca paylaşılır
// (assetContext.js/customAssetLibrary.js'teki AYNI desen). Testler
// _resetCacheForTests() ile bunu sıfırlayıp deterministik başlar.
var cache = { data: null, fetchedAt: 0 };

// Bu üretim hattının KULLANAMAYACAĞI model tiplerine karşı ikinci, savunmacı
// bir güvenlik ağı (görev md.1: "image/video/audio/embedding/reranker tipi
// modelleri FİLTRELE"). Asıl süzme input/output_modalities üzerinden
// yapılıyor (aşağıdaki isTextToText) — bu liste SADECE modalite alanları
// eksik/hatalı gelirse devreye giren bir ek güvenlik katmanı.
var DENYLIST_ID_PATTERNS = [
  /embed/i,
  /rerank/i,
  /moderation/i,
  /whisper/i,
  /\btts\b/i,
  /speech/i,
  /dall-?e/i,
  /stable-diffusion/i,
  /\bflux\b/i,
  /sdxl/i,
  /\bvideo\b/i,
  /\bocr\b/i,
];

function isDenylistedId(id) {
  return DENYLIST_ID_PATTERNS.some(function (re) {
    return re.test(id);
  });
}

/**
 * Bu pipeline SADECE metin prompt'u gönderip metin (HTML/CSS/JS) bekliyor —
 * bu yüzden hem girişin hem çıkışın "text" içermesi ZORUNLU (görev md.1:
 * "text input destekliyor, chat/completion için kullanılabilir"). Görsel
 * girişi de kabul eden ama metin çıktısı üreten modeller (ör. vision+text->
 * text) BİLEREK reddedilmiyor (görsel göndermiyoruz ama zararı da yok);
 * sadece çıktısı metin OLMAYAN (embedding/rerank/ses/görsel-üretim) modeller
 * elenir.
 */
function isTextToText(raw) {
  var arch = raw && raw.architecture;
  var inputs = arch && Array.isArray(arch.input_modalities) ? arch.input_modalities : null;
  var outputs = arch && Array.isArray(arch.output_modalities) ? arch.output_modalities : null;
  if (!outputs || outputs.indexOf("text") === -1) return false;
  if (!inputs || inputs.indexOf("text") === -1) return false;
  return true;
}

/** "openai/gpt-4o" -> "openai". Format beklenmedikse zararsız bir varsayılana düşer. */
function deriveProvider(id) {
  if (typeof id !== "string" || id.indexOf("/") === -1) return "openrouter";
  return id.split("/")[0];
}

/**
 * OpenRouter'ın `name` alanı genelde "Sağlayıcı: Model Adı" şeklinde gelir
 * (ör. "OpenAI: GPT-4o") — dar rozette/dropdown'da GEREKSİZ tekrar
 * (sağlayıcı zaten ayrı gösteriliyor, bkz. UI) olmasın diye ": " sonrası
 * kısım alınır. `name` hiç yoksa id'nin "/" sonrası kısmına düşülür —
 * hiçbir zaman boş/undefined bir isim döndürülmez.
 */
function deriveDisplayName(raw) {
  var name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : null;
  if (name && name.indexOf(": ") !== -1) {
    return name.split(": ").slice(1).join(": ");
  }
  if (name) return name;
  if (typeof raw.id === "string" && raw.id.indexOf("/") !== -1) {
    return raw.id.split("/").slice(1).join("/");
  }
  return raw.id || "Unknown model";
}

/**
 * Ham OpenRouter katalog girdisini frontend'e gidecek KÜÇÜK/temiz şekle
 * indirger — görev md.1: "gereksiz büyük metadata göndermeye gerek yok".
 * description/created/per_request_limits gibi kullanılmayan alanlar
 * BİLEREK dışarıda bırakılıyor.
 */
function sanitizeEntry(raw) {
  if (!raw || typeof raw.id !== "string" || !raw.id) return null;
  return {
    id: raw.id,
    displayName: deriveDisplayName(raw),
    provider: deriveProvider(raw.id),
    contextLength: typeof raw.context_length === "number" && isFinite(raw.context_length) ? raw.context_length : null,
    pricing:
      raw.pricing && typeof raw.pricing === "object"
        ? {
            prompt: typeof raw.pricing.prompt === "string" ? raw.pricing.prompt : null,
            completion: typeof raw.pricing.completion === "string" ? raw.pricing.completion : null,
          }
        : null,
    inputModalities:
      raw.architecture && Array.isArray(raw.architecture.input_modalities) ? raw.architecture.input_modalities : ["text"],
    outputModalities:
      raw.architecture && Array.isArray(raw.architecture.output_modalities) ? raw.architecture.output_modalities : ["text"],
  };
}

/**
 * server/config/models.js'in ZATEN doğrulanmış statik 2 modelini (DeepSeek/
 * Qwen) katalogla AYNI zengin şekle (provider/contextLength/pricing/
 * modaliteler) taşır — böylece GET /api/models'in döndürdüğü her girdi,
 * kaynağı (canlı katalog ya da statik fallback) ne olursa olsun AYNI
 * alanlara sahip olur; frontend ikisi arasında ayrım yapmak ZORUNDA kalmaz.
 */
function staticFallbackModels() {
  return modelConfig.models.map(function (m) {
    return {
      id: m.id,
      displayName: m.displayName,
      provider: deriveProvider(m.id),
      contextLength: null,
      pricing: null,
      inputModalities: ["text"],
      outputModalities: ["text"],
    };
  });
}

/**
 * Görev md.10: "OpenRouter erişilemezse... asla DeepSeek/Qwen'i tamamen
 * kaybetme". Canlı katalog GERÇEKTEN dönse bile (ör. OpenRouter geçici
 * olarak bu iki id'yi listeden çıkarmışsa) bu iki id'nin döndürülen listede
 * HER ZAMAN bulunduğunu garanti eder — zaten varsa hiçbir şey eklenmez
 * (tekrar/duplicate yok).
 */
function ensureStaticModelsPresent(list) {
  var ids = list.map(function (m) {
    return m.id;
  });
  var missing = staticFallbackModels().filter(function (m) {
    return ids.indexOf(m.id) === -1;
  });
  return missing.length ? list.concat(missing) : list;
}

async function fetchLiveCatalog() {
  var response = await fetch(CATALOG_URL, { method: "GET" });
  if (!response.ok) {
    throw new Error("OpenRouter model kataloğu isteği başarısız (" + response.status + ")");
  }
  var data = await response.json();
  var list = data && Array.isArray(data.data) ? data.data : [];
  var filtered = list.filter(function (m) {
    return m && typeof m.id === "string" && !isDenylistedId(m.id) && isTextToText(m);
  });
  var sanitized = filtered.map(sanitizeEntry).filter(Boolean);
  return sanitized;
}

/**
 * Dönüş: { models: [...], source: "cache"|"live"|"stale-cache"|"static-fallback" }.
 * `source` SADECE gözlemsel/debug amaçlı — hiçbir response'a/secret'a
 * dokunmuyor, çağıranlar (routes/models.js) isterse loglayabilir, isterse
 * yok sayabilir. ASLA throw etmez.
 */
async function getModelCatalog() {
  var now = Date.now();
  if (cache.data && now - cache.fetchedAt < CACHE_TTL_MS) {
    return { models: cache.data, source: "cache" };
  }

  try {
    var live = await fetchLiveCatalog();
    if (!live.length) {
      throw new Error("canlı katalog boş/ayrıştırılamadı döndü");
    }
    var merged = ensureStaticModelsPresent(live);
    cache = { data: merged, fetchedAt: now };
    return { models: merged, source: "live" };
  } catch (err) {
    console.error("[modelCatalog] canlı OpenRouter kataloğu alınamadı, güvenli fallback kullanılıyor:", err.message);
    if (cache.data) {
      // Süresi dolmuş ama daha önce başarıyla alınmış bir katalog varsa,
      // hiç katalog göstermemektense/statik 2 modele düşmektense onu
      // kullanmak tercih edilir (görev md.10: "varsa son başarılı listeyi
      // sun").
      return { models: cache.data, source: "stale-cache" };
    }
    return { models: staticFallbackModels(), source: "static-fallback" };
  }
}

// Görev md.11: "frontend'den gelen model id'sine körü körüne güvenme...
// güvenli formatta olmalı". OpenRouter id'leri her zaman "sağlayıcı/model"
// şeklindedir — bu, gerçek bir doğrulama/whitelist DEĞİL (o hâlâ aşağıdaki
// katalog-üyeliği kontrolü), sadece açıkça bozuk/enjeksiyon girişimi olan
// string'leri (çok uzun, kontrol karakteri içeren, "/" olmayan) daha
// katalog aramasına bile girmeden elemek için ek bir savunma katmanı.
var SAFE_MODEL_ID_RE = /^[a-zA-Z0-9]([a-zA-Z0-9._-]{0,80})\/[a-zA-Z0-9]([a-zA-Z0-9._:-]{0,120})$/;

function isSafeModelIdFormat(id) {
  return typeof id === "string" && id.length <= 200 && SAFE_MODEL_ID_RE.test(id);
}

/**
 * requestedModel: frontend'den gelen GÜVENİLMEYEN bir model id adayı.
 * Senkron/ağsız — /api/generate'in HER isteğinde YENİ bir ağ çağrısı
 * TETİKLEMEZ (görev md.10'un "gereksiz istek atma" ruhu + mevcut testlerin
 * fetch stub'ını bozmama gerekçesi, bkz. modelCatalog.js dosya başı notu).
 * Sadece HÂLİHAZIRDA önbellekte olan (daha önce bir GET /api/models isteği
 * tarafından doldurulmuş) kataloğa bakar; önbellek boşsa (henüz hiç GET
 * /api/models çağrılmadıysa) modelConfig.resolveRequestedModel() İLE BİREBİR
 * AYNI, mevcut/eski senkron davranışa düşer — bu da modelSelector.test.js'in
 * MEVCUT (bu round'da hiç değiştirilmeyen) testlerinin, o testler kendi
 * sunucularında hiç GET /api/models çağırmadığı için, ÖNCEKİ round'la
 * BİREBİR aynı şekilde geçmeye devam etmesini sağlar.
 */
function resolveRequestedModelFromCache(requestedModel) {
  if (!isSafeModelIdFormat(requestedModel)) {
    return modelConfig.model;
  }
  if (cache.data) {
    var found = cache.data.some(function (m) {
      return m.id === requestedModel;
    });
    return found ? requestedModel : modelConfig.model;
  }
  return modelConfig.resolveRequestedModel(requestedModel);
}

function _resetCacheForTests(seedModels) {
  cache = seedModels ? { data: seedModels, fetchedAt: Date.now() } : { data: null, fetchedAt: 0 };
}

module.exports = {
  getModelCatalog: getModelCatalog,
  resolveRequestedModelFromCache: resolveRequestedModelFromCache,
  isSafeModelIdFormat: isSafeModelIdFormat,
  isTextToText: isTextToText,
  isDenylistedId: isDenylistedId,
  sanitizeEntry: sanitizeEntry,
  staticFallbackModels: staticFallbackModels,
  CACHE_TTL_MS: CACHE_TTL_MS,
  _resetCacheForTests: _resetCacheForTests,
};
