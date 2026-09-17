/**
 * ROUND L — Gameplay Mechanic (Intent) Detection.
 *
 * server/services/gameTypeDetection.js İLE KARIŞTIRILMAMALI — o dosya
 * "hangi ASSET KİTİNİ kullanmalıyım?" sorusuna cevap verir ve assetKits.js'
 * teki TAM 8 kitle birebir eşlenmiş, KİLİTLİ bir anahtar kümesi taşır
 * (server/tests/gameTypeDetection.test.js'in "scores nesnesi 8 kitin
 * TAMAMI için sayı döndürüyor" testi tam bunu doğruluyor — o dosyaya yeni
 * bir mekanik anahtarı (ör. "memory"/"math"/"collection") EKLEMEK bu testi
 * kırardı, çünkü bu üçünün assetKits.js'te karşılığı olan bir kiti YOK).
 *
 * Bu dosya FARKLI bir soruya cevap veriyor: "Free-HTML mock modu bu prompt
 * için HANGİ OYNANABİLİR MEKANİĞİ üretmeli?" (görev md.8: "asset kit
 * varlığı = gameplay varlığı" DEĞİLDİR — Math Quiz/Memory'nin hiç asset
 * kiti yok ama kendi gerçek mekaniklerine ihtiyaçları var).
 *
 * Felsefe AYNI (server/services/gameTypeDetection.js ve
 * server/services/topdown/eligibility.js ile): deterministik, LLM-siz, düz
 * anahtar-kelime skorlaması. En yüksek puanlı mekanik döner; 0 puan veya
 * EŞİTLİK durumunda mechanic: null döner ("emin olmadığında tahmin etme")
 * ve çağıran taraf (openrouter.js) mevcut, DEĞİŞMEMİŞ genel tap-grid
 * şablonuna (buildMockGameHtml) güvenli şekilde düşer.
 *
 * İlişki gameTypeDetection.js ile TAMAMEN KOPUK değil: openrouter.js,
 * ASSET seçimi için hâlâ (değişmeyen) gameTypeDetection.js sonucunu
 * kullanır — bu dosya SADECE hangi mekanik ŞABLONUNUN inşa edileceğine
 * karar verir. Bir dungeon-rpg kiti eşleşse bile, mekanik olarak "survival"
 * (TopDown Runtime'a has) ile "dungeon" (key/door/exit) birbirinden
 * TAMAMEN farklı olabilir — bu yüzden ayrı bir katman şart.
 */

var MECHANIC_KEYWORDS = {
  platformer: [
    "platform", "platformer", "jump", "jumping", "hop", "hopping",
    "zıpla", "zıplama", "zıplayarak", "yere düş", "yerçekimi",
  ],
  racing: [
    "race", "racing", "car", "cars", "track", "drift", "finish line",
    "yarış", "araba yarışı", "araba", "araç", "direksiyon",
    "sağa sola sür", "rakip araç", "pist",
  ],
  "space-shooter": [
    "space", "spaceship", "space ship", "shoot", "shooter", "asteroid",
    "laser", "alien", "galaxy", "rocket", "blaster",
    "uzay gemisi", "uzay", "ateş et", "ateş etmek", "vur", "düşman gemisi",
    "mermi", "lazer",
  ],
  // NOT: "collection" BİLEREK en düşük öncelikli/en genel kategori (bkz.
  // aşağıdaki PRIORITY_ORDER) — "topla"/"coin"/"yıldız" gibi kelimeler
  // neredeyse HER toplanabilir-içeren oyun türünde (platformer/dungeon/
  // space-shooter) de doğal olarak geçer. Salt bu kelimeler yüzünden daha
  // SPESİFİK bir mekanik sinyalinin (ör. "zıpla"+"platform") ezilmemesi
  // için "collection" SADECE hiçbir başka mekanik eşit ya da daha yüksek
  // puan almadığında seçilir (bkz. resolveTie).
  collection: [
    "collect", "collecting", "collectible", "gather", "gathering",
    "meyve", "meyveleri", "yıldız", "yıldızları", "altın", "coin",
    "topla", "toplamak", "toplayarak",
  ],
  memory: [
    "memory", "memory game", "match the cards", "matching pairs",
    "hafıza", "hafıza oyunu", "eşleştir", "eşleştirme",
    "kartları eşleştir", "çiftleri bul",
  ],
  // NOT: "toplama"/"çıkarma"/"çarpma"/"bölme" (dört işlem) BİLEREK dışarıda
  // bırakıldı — Türkçede bu kelimelerin kökleri (topla-/çarp-) "toplamak"
  // (collect) ve "çarpmak" (to hit/collide) fiilleriyle de örtüştüğü için
  // (ör. "düşmana çarpmadan" -> "çarpma" alt-dizesini İÇERİR ama matematik
  // ile alakası yok) yanlış-pozitif riski taşıyorlardı. "matematik"/"soru"/
  // "cevap"/"işlem" zaten math'i güvenle ayırt etmeye yetiyor.
  math: [
    "math", "math quiz", "arithmetic", "question", "questions",
    "matematik", "matematik oyunu", "soru", "cevap", "doğru cevap", "işlem",
  ],
  cooking: [
    "cooking", "cook", "kitchen", "chef", "recipe", "ingredient",
    "yemek", "yemek yap", "yemek hazırlama", "tarif", "malzeme",
    "malzemeleri", "sırayla seç",
  ],
  // NOT: kısa/bariz-belirsiz İngilizce kelimeler ("key","door","exit")
  // BİLEREK dışarıda bırakıldı — "key" gibi bir alt-dize "keywords" gibi
  // TAMAMEN alakasız kelimelerin İÇİNDE de geçiyor (mockAssetSelector.js'in
  // containsWord() ile tam olarak bu yüzden kelime-sınırı kullandığı AYNI
  // problem, bkz. o dosyanın yorumu) — bu yüzden burada daha SPESİFİK,
  // çok-kelimeli İngilizce ifadeler kullanılıyor.
  dungeon: [
    "find the key", "locked door", "reach the exit", "dungeon",
    "zindan", "anahtar", "kapı", "çıkış", "kilitli kapı",
  ],
};

// Eşitlik (tie) durumunda hangi mekaniğin kazanacağını belirleyen sabit
// öncelik sırası — EN SPESİFİK hareket/mekanik sinyalinden EN GENEL
// ("collection", neredeyse her toplanabilir-içeren türde doğal olarak
// geçen kelimeler taşıdığı için) sinyale doğru sıralı. Örn: "platform
// oyununda ... zıplasın, 10 coin toplasın" hem platformer (platform+zıpla)
// hem collection (coin+topla) kelimeleri taşır — bu listede platformer
// collection'dan ÖNCE geldiği için tie'de platformer kazanır (görevin
// kendi B) PLATFORMER örneği tam bu cümle).
var PRIORITY_ORDER = [
  "platformer", "dungeon", "space-shooter", "racing", "cooking", "memory", "math", "collection",
];

/**
 * prompt: kullanıcının ham prompt metni.
 * Dönüş: { mechanic: string|null, confidence: number, scores: {key:number} }
 *
 * gameTypeDetection.js/eligibility.js'in "eşitlikte tahmin etme" ilkesinden
 * BİLEREK sapıyor: skor 0'sa hâlâ mechanic:null (generic fallback) döner,
 * ama TIE durumunda null'a düşmek yerine PRIORITY_ORDER'a göre bir seçim
 * yapılır — çünkü buradaki kategoriler (gameTypeDetection.js'in kitlerinin
 * aksine) birbirini DIŞLAMIYOR: bir platformer'ın coin toplaması, bir
 * dungeon oyununun düşman içermesi gayet normal. Null'a düşmek bu
 * durumlarda promptu yanlışlıkla eski, kırık genel şablona geri
 * gönderirdi — bu da Round L'nin çözmeye çalıştığı problemin ta kendisi.
 */
function detectGameplayMechanic(prompt) {
  var text = (prompt || "").toLowerCase();
  var scores = {};

  Object.keys(MECHANIC_KEYWORDS).forEach(function (key) {
    var matched = MECHANIC_KEYWORDS[key].filter(function (kw) {
      return text.indexOf(kw) !== -1;
    });
    scores[key] = matched.length;
  });

  var bestScore = 0;
  Object.keys(scores).forEach(function (key) {
    if (scores[key] > bestScore) bestScore = scores[key];
  });

  if (bestScore === 0) {
    return { mechanic: null, confidence: 0, scores: scores };
  }

  var tiedKeys = Object.keys(scores).filter(function (key) { return scores[key] === bestScore; });
  var bestKey = tiedKeys.length === 1
    ? tiedKeys[0]
    : PRIORITY_ORDER.filter(function (key) { return tiedKeys.indexOf(key) !== -1; })[0] || tiedKeys[0];

  return { mechanic: bestKey, confidence: bestScore, scores: scores };
}

module.exports = {
  detectGameplayMechanic: detectGameplayMechanic,
  MECHANIC_KEYWORDS: MECHANIC_KEYWORDS,
};
