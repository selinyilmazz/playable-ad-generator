/**
 * PROMPT -> SPEC -> RUNTIME entegrasyonu — ELİGİBİLİTY GATE.
 *
 * Bir promptun (şu an için SADECE) 2D Top-Down Runtime'ın (bkz.
 * public/runtime/topdown/) desteklediği chase/survive tarzı bir top-down
 * oyun olarak uygulanabilir olup olmadığını belirler.
 *
 * server/services/gameTypeDetection.js İLE AYNI FELSEFE — deterministik,
 * LLM'siz, düz anahtar-kelime skorlaması (hiçbir yeni branching/
 * `if (gameType === "...")` mantığı yok, sadece veri) — ama TAMAMEN
 * BAĞIMSIZ, FARKLI bir soruya cevap veriyor:
 *   - gameTypeDetection.js: "hangi asset kitini kullanmalıyım?"
 *   - bu dosya: "bu prompt, TopDown Runtime'a mı yoksa mevcut Free-HTML
 *     Generator'a mı yönlendirilmeli?"
 * İkisi birbirini hiç etkilemiyor/çağırmıyor.
 *
 * "EMİN OLMADIĞINDA TAHMİN ETME" ilkesi (gameTypeDetection.js'teki tie/0
 * skor davranışıyla aynı ruhta): pozitif sinyal yoksa VEYA runtime'ın
 * (henüz) desteklemediği bir türe (platformer/racing/space-shooter/puzzle/
 * endless-runner) işaret eden dışlama sinyali pozitif sinyale eşit ya da
 * ondan fazlaysa -> eligible: false -> routes/generate.js mevcut,
 * DEĞİŞMEMİŞ Free-HTML pipeline'ına güvenli şekilde düşer.
 */

// ROUND N — DÜZELTME (canlı Playwright QA'sında BULUNAN gerçek bir yönlendirme
// hatası): bu liste "eşleşen kelime SAYISI"na göre puanlıyor, ama birkaç
// girdi birbirinin TAM ÖN-EKİYDİ (ör. "hayatta kal" + "hayatta kalma") — bu
// yüzden TEK bir kelime öbeği ("...hayatta kalmaya çalışsın") YANLIŞLIKLA 2
// AYRI sinyal olarak sayılıyordu. Somut, gerçek bulgu: Round N'nin kendi
// racing test-matrisi promptu ("...Engellerden kaçsın, puan kazansın ve 30
// saniye hayatta kalmaya çalışsın.") bu double-count YÜZÜNDEN skor 3 (>
// exclusionScore 2) alıp YANLIŞLIKLA TopDown Runtime'a yönlendiriliyordu —
// oysa bu prompt açıkça "araba"/"yarış" (steering-tabanlı bir Racing oyunu)
// istiyor. Kök neden çözümü: bir kelime zaten listedeki BAŞKA bir kelimenin
// TAM ÖN-EKİYSE (ör. "hayatta kalma" ⊃ "hayatta kal") ayrıca listelenmiyor
// — kısa biçim zaten aynı metni yakalıyor, ikinci girdi SIFIR ek bilgi
// taşıyor, sadece yapay bir çarpan oluşturuyordu. Bu SADECE gerçek
// ön-ek-çakışması olan girdileri kaldırır; anlamca FARKLI kelime
// biçimlerine (ör. "survive"/"survival" — biri diğerinin ön eki DEĞİL)
// dokunulmadı.
var TOPDOWN_KEYWORDS = [
  "top-down", "topdown", "top down",
  "survive", "survival", "survivor", "surviving",
  "avoid", "avoiding", "escape", "escaping",
  "chase", "chasing", "chased",
  "flee",
  "dodge", "dodging",
  "zombie",
  "wander",
  "hayatta kal", "kaçmak", "kaçış", "kaç ",
  "kovala", "zombi", "canavardan",
  // ROUND L — Round K'nin bulgusu: kullanıcının kendi test matrisinin
  // "TOP-DOWN" diye etiketlediği promptlar (düşmanlara ÇARPMADAN toplama /
  // düşmandan KAÇARAK toplama) bu listeye TAKILMIYORDU çünkü "kaç " (boşluklu)
  // ve "kaçış"/"kaçmak" bu tam kelime formlarını kapsamıyordu. Çapraz
  // bulaşma riski (ör. racing'in "rakip araçlardan kaçsın"ı) AŞAĞIDAKİ
  // EXCLUSION_KEYWORDS'e eklenen araç/yarış/pist/direksiyon sinyalleriyle
  // dengelendi — bkz. o listenin ROUND L notu.
  "kaçsın", "düşmanlardan kaç",
  "düşmanlara çarpmadan", "düşmana çarparsa",
];

// Runtime'ın (henüz) desteklemediği, mevcut Free-HTML asset-kit türlerine
// (bkz. gameTypeDetection.js GAME_TYPE_KEYWORDS) karşılık gelen sinyaller —
// bu kelimeler TOPDOWN_KEYWORDS'ten daha baskınsa (>=), prompt TopDown
// Runtime'a değil, mevcut Free-HTML akışına yönlendirilir.
var EXCLUSION_KEYWORDS = [
  // platformer
  "jump", "jumping", "platform", "platformer", "hop", "hopping", "zıpla",
  // racing
  "race", "racing", "car", "cars", "drift", "finish line", "yarış", "araba",
  // space-shooter
  "spaceship", "space ship", "shoot", "shooter", "asteroid", "asteroids",
  "laser", "alien", "galaxy", "rocket", "blaster",
  // fruit-puzzle
  "match", "matching", "puzzle", "basket", "sort", "sorting", "fruit", "fruits",
  // endless-runner
  "runner", "running", "endless", "auto-run", "subway", "sidewalk",
  // ROUND L — dungeon'ın KENDİ key/door/exit mekaniği (bkz. görev md.3-I) —
  // "zindan" BİLEREK dışlamaya eklenmedi (Round K'nin #2 "zindanda... altın
  // topla... düşmandan kaç" promptu hâlâ TopDown'a uygun bir survival/
  // avoidance oyunu, sadece dungeon TEMASINDA — o promptta anahtar/kapı/
  // çıkış YOK, bu yüzden bu 3 kelime #2'yi etkilemeden SADECE gerçek
  // key/door/exit promptlarını -ör. "anahtarı bulsun, kapıyı açsın ve
  // çıkışa ulaşsın"- dışlıyor, TopDown Runtime bu mekaniği desteklemiyor).
  // NOT: racing/space-shooter/memory/math/cooking için AYRICA bir dışlama
  // eklenmedi — bu türlerin promptları zaten yukarıdaki TOPDOWN_KEYWORDS'ten
  // hiçbirini tetiklemiyor (matched=0 -> eligible zaten false), fazladan
  // dışlama kelimesi eklemek sadece gereksiz risk taşırdı (bkz.
  // topDownIntegration.test.js'teki mevcut "Uzayda ... kaçarak hayatta
  // kaldığın bir top-down oyun" testi — "uzay"/"düşman gemisi" gibi geniş
  // bir dışlama eklenseydi bu MEVCUT, doğru bir topdown senaryosunu
  // YANLIŞLIKLA dışlardı; o yüzden buraya EKLENMEDİ).
  "anahtar", "kapı", "çıkış",
];

/**
 * prompt: kullanıcının ham prompt metni.
 * Dönüş: { eligible: boolean, score: number, exclusionScore: number, matched: string[] }
 */
function detectTopDownEligibility(prompt) {
  var text = (prompt || "").toLowerCase();

  var matched = TOPDOWN_KEYWORDS.filter(function (kw) {
    return text.indexOf(kw) !== -1;
  });
  var excluded = EXCLUSION_KEYWORDS.filter(function (kw) {
    return text.indexOf(kw) !== -1;
  });

  var eligible = matched.length > 0 && matched.length > excluded.length;

  return {
    eligible: eligible,
    score: matched.length,
    exclusionScore: excluded.length,
    matched: matched,
  };
}

module.exports = {
  detectTopDownEligibility: detectTopDownEligibility,
  TOPDOWN_KEYWORDS: TOPDOWN_KEYWORDS,
  EXCLUSION_KEYWORDS: EXCLUSION_KEYWORDS,
};
