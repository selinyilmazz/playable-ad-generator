/**
 * Game Asset Pipeline MVP — Asset-Path Retry.
 *
 * asset-paths-valid kontrolü fail verdiğinde (LLM manifestte olmayan bir
 * /assets/... path'i "uydurduğunda") modele gönderilecek DÜZELTME
 * mesajlarını inşa eder. Bu dosya SADECE mesaj inşa eder — gerçek API
 * çağrısını (callOpenRouterForHtml) ve retry'nin "en fazla 1 kez"
 * çalışmasını sağlayan kontrolü bilerek routes/generate.js'de tutuyoruz
 * (bkz. o dosyadaki not) — katman ayrımı: burası SADECE prompt/mesaj
 * inşası, orkestrasyon route'ta.
 *
 * refine.js / refinePrompt.js'e KASITLI olarak dokunulmadı/karıştırılmadı:
 * refinePlayableAd() genel amaçlı (kullanıcı talimatlarıyla) çalışıyor ve
 * asset context'ini hiç içermiyor — bu yüzden asset-özel düzeltme için
 * ayrı, dar kapsamlı bu fonksiyon kullanılıyor.
 */
const SYSTEM_PROMPT = require("../prompts/systemPrompt");
const { buildAssetContextMessage } = require("./assetContext");

/**
 * html: bir önceki (asset-paths-valid'de fail vermiş) üretimin HTML'i.
 * failedCheckDetail: asset-paths-valid check'inin detail metni (hangi
 *   path'lerin geçersiz olduğunu zaten isim isim listeliyor — burada
 *   tekrar hesaplanmıyor, olduğu gibi kullanılıyor).
 *
 * Dönüş: callOpenRouterForHtml'e doğrudan verilebilecek messages dizisi.
 */
function buildAssetFixMessages(html, failedCheckDetail) {
  // Mevcut AVAILABLE GAME ASSETS listesi ELLE KOPYALANMIYOR — aynı
  // assetContext.js/assetManifest.js'ten, aynen ilk üretimde kullanılan
  // fonksiyonla yeniden üretiliyor.
  var assetContext = buildAssetContextMessage();

  var problemLine =
    failedCheckDetail ||
    "Manifestte olmayan/uydurulmuş bir veya daha fazla /assets/... path'i kullanılmış.";

  var instruction = [
    "ÖNCEKİ ÜRETİMDE ASSET HATASI VAR.",
    "Sorun: " + problemLine,
    "",
    "Aşağıdaki HTML'i şu kurallara göre düzelt:",
    "- Yalnızca AVAILABLE GAME ASSETS listesinde GERÇEKTEN var olan path'leri kullan.",
    "- Listede uygun bir asset yoksa (örneğin listede meyve/sebze asseti YOKSA), o nesne için " +
      "CSS shapes, inline SVG, emoji veya canvas ile kendi görselini oluştur.",
    "- Kesinlikle YENİ bir /assets/... path'i uydurma. Örnek: eğer 'apple.svg' listede yoksa, " +
      "'/assets/objects/apple.svg' gibi bir yol kendi başına YAZMA — bunun yerine elma için " +
      "CSS/SVG/emoji fallback kullan.",
    "- Oyunun geri kalan mantığını, görünümünü ve davranışını mümkün olduğunca koru — sadece " +
      "hatalı asset referanslarını düzelt.",
    "- Sadece güncellenmiş, tam ve tek dosyalık HTML'i döndür; açıklama veya markdown ekleme.",
    "",
    "DÜZELTİLECEK HTML:",
    html,
  ].join("\n");

  var messages = [{ role: "system", content: SYSTEM_PROMPT }];
  if (assetContext) {
    messages.push({ role: "system", content: assetContext });
  }
  messages.push({ role: "user", content: instruction });

  return messages;
}

module.exports = { buildAssetFixMessages: buildAssetFixMessages };
