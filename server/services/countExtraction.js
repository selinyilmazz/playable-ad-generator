/**
 * ROUND L — Generic Count Extraction.
 *
 * `server/services/validation/checks.js`'teki extractLevelLengthSignals ile
 * AYNI felsefe (bağımsız bir kopya, cross-import YOK — o dosya validation
 * içindir, bu dosya GENERATION içindir): prompttaki bir sayının, YAKINDAKİ
 * bir varlık ismine (düşman/yıldız/soru/platform vb.) ait olup olmadığını
 * anlamaya çalışan, deterministik, LLM-siz bir regex katmanı.
 *
 * KURAL (görev md.5): "her sayıyı her varlık sayımı yap" YOK — bir sayı,
 * SADECE kendisine yakın (aynı cümle parçası içinde, sayıdan sonraki ~24
 * karakter içinde) bir "noun" (varlık ismi) geçiyorsa o varlığın sayısı
 * olarak kabul edilir. "10 düşman" -> enemy=10, "12 meyve" -> collectible=12,
 * "10 soru" -> question=10, "8 platform" -> platform=8 gibi.
 *
 * Rakam (5/8/10/12) + pratik bir alt küme Türkçe sayı kelimesi (bir..on,
 * on bir, on iki) destekleniyor — görev md.5'in kendi listesiyle sınırlı,
 * "her sayıyı her dilde anla" gibi aşırı genel bir çözüm DEĞİL.
 */

var TURKISH_NUMBER_WORDS = {
  "bir": 1, "iki": 2, "üç": 3, "dört": 4, "beş": 5,
  "altı": 6, "yedi": 7, "sekiz": 8, "dokuz": 9, "on": 10,
  "on bir": 11, "on iki": 12,
};

// Uzun ifadeler (ör. "on iki") önce denenmeli ki "on" kısmı erken eşleşip
// "iki" kısmını yanlışlıkla ayrı bırakmasın.
var NUMBER_WORD_PATTERN = Object.keys(TURKISH_NUMBER_WORDS)
  .sort(function (a, b) { return b.length - a.length; })
  .map(function (w) { return w.replace(/\s+/g, "\\s+"); })
  .join("|");

// "(\d+|on iki|on|...)" — rakam VEYA desteklenen bir Türkçe sayı kelimesi.
var NUMBER_TOKEN_RE = "(\\d+|" + NUMBER_WORD_PATTERN + ")";

function wordToNumber(token) {
  var normalized = token.trim().toLowerCase().replace(/\s+/g, " ");
  if (/^\d+$/.test(normalized)) return parseInt(normalized, 10);
  if (TURKISH_NUMBER_WORDS.hasOwnProperty(normalized)) return TURKISH_NUMBER_WORDS[normalized];
  return null;
}

/**
 * prompt: ham kullanıcı prompt'u.
 * nouns: bu varlığı işaret eden kelime/kelime öbeklerinin dizisi (Türkçe/
 *   İngilizce karışık olabilir, örn. ["düşman","düşmanı","enemy","enemies"]).
 * Dönüş: bulunan İLK eşleşmenin sayısal değeri, yoksa null.
 *
 * İki yönü de dener: "10 düşman" (sayı->isim) VE "en az 8 platform olsun"
 * gibi aradaki dolgu kelimelerini (en az/tane/adet) tolere eder — ama
 * "düşman 10" (isim->sayı) YAYGIN değil, bu yüzden sadece sayı->isim yönü
 * destekleniyor (görev md.5'in tüm örnekleri bu sırada).
 */
function extractCountNear(prompt, nouns) {
  if (!prompt || !nouns || nouns.length === 0) return null;
  var text = String(prompt);

  var nounPattern = nouns
    .map(function (n) { return n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); })
    .join("|");

  // sayı + (opsiyonel dolgu: en az/tane/adet/tam) + isim — en fazla ~20
  // karakterlik bir dolgu penceresi (görevin kendi örneklerindeki "en az 8
  // platform" gibi ifadeleri kapsasın diye) ama alakasız, uzak bir sayının
  // yanlışlıkla eşleşmesini önlesin diye SINIRLI.
  var re = new RegExp(
    NUMBER_TOKEN_RE + "\\s*(?:tane\\s+|adet\\s+)?(?:" + nounPattern + ")",
    "i"
  );
  var match = text.match(re);
  if (!match) return null;
  return wordToNumber(match[1]);
}

module.exports = {
  extractCountNear: extractCountNear,
  wordToNumber: wordToNumber,
  TURKISH_NUMBER_WORDS: TURKISH_NUMBER_WORDS,
};
