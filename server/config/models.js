/**
 * Tüm OpenRouter model/parametre ayarları TEK yerden yönetilir.
 * Kod içinde başka hiçbir yerde model adı hard-code edilmemeli;
 * değişiklik gerektiğinde sadece bu dosya güncellenir (veya .env'deki
 * OPENROUTER_MODEL değişkeni set edilir).
 *
 * ROUND 19 NOTU (Part A/B): DEFAULT_MODEL "anthropic/claude-3.5-sonnet"
 * idi — Ali Bey'in token maliyeti nedeniyle Anthropic modellerini
 * OpenRouter hesabında kısıtlaması sonucu "No endpoints found for
 * anthropic/claude-3.5-sonnet" hatasına yol açıyordu. .env'deki
 * OPENROUTER_MODEL boş bırakıldığı için kod bu eski default'a
 * düşüyordu, hiçbir fallback/provider mekanizması da yoktu.
 * Non-Anthropic, maliyet-etkin bir ilk test modeli olarak
 * "qwen/qwen3.8-flash" seçilmişti (id VARSAYILMADI, OpenRouter'ın canlı
 * /api/v1/models endpoint'inden doğrulandı).
 *
 * ROUND 19 NOTU (Part D): qwen/qwen3.8-flash gerçek makinede test
 * edilirken "429: temporarily rate-limited upstream" hatası alındı —
 * provider_name: Alibaba, limit_source: upstream_provider_shared_pool.
 * OpenRouter'ın kendi model sayfası bu modelin TEK provider'ı olduğunu
 * doğruluyor ("hosted by one provider... no routing decisions to
 * make") — yani Qwen ailesi yapısal olarak tek-provider'a bağımlı,
 * rate limit tekrarlanabilir ve BYOK olmadan alternatif provider'a
 * geçiş imkânı yok. Bu nedenle DEFAULT_MODEL
 * "deepseek/deepseek-v4-flash-0731" olarak değiştirildi — id
 * VARSAYILMADI, OpenRouter'ın canlı /api/v1/models + model sayfasından
 * doğrulandı: 28 farklı provider (DeepSeek, DeepInfra, Fireworks,
 * Together, Baseten, Cloudflare, vb.) üzerinden sunuluyor, yani tek bir
 * provider'ın shared-pool rate limit'i artık tüm isteği bloklamıyor —
 * OpenRouter'ın KENDİ varsayılan routing/fallback davranışı üzerinden
 * (kod tarafında özel bir provider sıralaması/parametresi EKLENMEDİ).
 * Fiyat Qwen3.8-Flash ile aynı seviyede/daha ucuz (~$0.07-0.22/M input,
 * ~$0.18-0.66/M output, provider'a göre değişir), context çok daha
 * geniş (1.3M). qwen/qwen3.8-flash SİLİNMEDİ (bkz. .env.example) —
 * sorun modelin kendisi değil tek-provider yapısıydı; istenirse
 * .env'deki OPENROUTER_MODEL ile tekrar seçilebilir.
 *
 * ROUND 19 NOTU (Part E): deepseek/deepseek-v4-flash-0731 gerçek makinede
 * test edilirken content boş geldi — güvenli tanı (bkz. openrouterClient.js
 * Part C tanı logu) şunu gösterdi: finishReason: "length", reasoning ~22.487
 * karakter, content tipi "object" (boş/parçasız). DeepSeek'in KENDİ resmi
 * API dokümantasyonu (api-docs.deepseek.com/guides/thinking_mode) bu modelde
 * "Thinking mode is enabled by default, with the default effort being
 * high" diyor — yani model, max_tokens bütçesinin tamamını "reasoning"
 * aşamasında tüketip finish_reason:"length" ile kesiliyor, final HTML/CSS/JS
 * için hiç bütçe kalmıyor. AYNI dokümantasyon "none" değerinin thinking
 * mode'u TAMAMEN KAPATTIĞINI doğruluyor ("none" disables thinking mode) —
 * yani reasoning tamamen KAPATILABİLİYOR, en düşük effort'a düşmeye gerek
 * yok. OpenRouter'ın reasoning parametresi evrensel olarak {effort: ...}
 * şeklini destekliyor (bkz. openrouter.ai/docs/use-cases/reasoning-tokens)
 * ve "none" değeri OpenRouter'ın DeepSeek V4 ailesi için kabul ettiği
 * enum'da (xhigh/high/medium/low/minimal/none) yer alıyor. Bu nedenle
 * aşağıya reasoning:{effort:"none"} eklendi — max_tokens KÖRLEMESİNE
 * yükseltilmedi, model DEĞİŞTİRİLMEDİ, reasoning metni asla content
 * olarak kullanılmıyor (bkz. openrouterClient.js extractRawContent —
 * SADECE message.content okur, message.reasoning'e hiç dokunmaz).
 */

const DEFAULT_MODEL = "deepseek/deepseek-v4-flash-0731";

const config = {
  // .env -> OPENROUTER_MODEL varsa onu kullan, yoksa DEFAULT_MODEL
  model: process.env.OPENROUTER_MODEL || DEFAULT_MODEL,

  // LLM üretim parametreleri
  // max_tokens 4000 -> 6500: özellikle "sorting" tipi promptlarda (çoklu
  // düşen obje + hedef alan + çarpışma mantığı) üretilen HTML/JS 4000
  // token sınırının ortasında kesiliyordu (</script>/</html> hiç
  // kapanmıyordu). 6500 bir üst sınır — normal/kısa üretimlerin maliyetini
  // artırmaz, sadece uzun üretimlerin kesilme riskini azaltır. temperature
  // ve model bilerek değiştirilmedi.
  temperature: 0.7,
  max_tokens: 6500,

  // ROUND 19 (Part E): DeepSeek V4 Flash 0731 varsayılan olarak thinking
  // mode AÇIK geliyor (DeepSeek resmi dokümantasyonu: default effort
  // "high") — bu, max_tokens bütçesinin reasoning'de tükenip content'in
  // boş kalmasına yol açtı (finish_reason: "length"). effort:"none"
  // DeepSeek'in kendi dokümantasyonuna göre thinking mode'u TAMAMEN
  // kapatıyor; böylece max_tokens bütçesinin tamamı final HTML/CSS/JS
  // üretimine ayrılıyor. SADECE bu görev için (playable ad üretimi kısa/
  // deterministik bir görev, uzun zincirleme reasoning'e ihtiyaç yok).
  reasoning: { effort: "none" },

  // OpenRouter endpoint'i (nadiren değişir, yine de tek yerde)
  apiUrl: "https://openrouter.ai/api/v1/chat/completions",

  // OpenRouter, istek başlıklarında referer/başlık ister (rate-limit ve
  // dashboard görünürlüğü için); prototipte sabit değerler yeterli.
  appName: "Playable Ad Generator (MVP)",
  appUrl: "https://localhost",
};

module.exports = config;
