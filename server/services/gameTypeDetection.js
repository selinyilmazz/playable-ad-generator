/**
 * PHASE 3A — Game Type Detection.
 *
 * BİLEREK yeni bir LLM çağrısı YOK. Bu, tamamen deterministik, düz
 * anahtar-kelime skorlamasıdır — frontend'deki public/app.js
 * GAMEPLAY_BLOCKS ile aynı felsefede (AI/NLP "anlama" değil, string
 * eşleştirme), ama burada amaç blok tespiti değil, prompt'u 4 sabit
 * Game Kit'ten (bkz. assetKits.js) biriyle eşlemek.
 *
 * Skorlama: her game type için tanımlı anahtar kelimelerden kaçı prompt
 * içinde geçiyorsa o kadar puan alır. En yüksek puanlı game type
 * döndürülür. Hiçbir kelime eşleşmezse veya en yüksek puan birden fazla
 * game type arasında EŞİTSE (belirsiz durum), gameType: null döner —
 * "emin olmadığında tahmin etme" ilkesi.
 */

var GAME_TYPE_KEYWORDS = {
  "endless-runner": [
    "runner", "running", "run", "endless", "city", "barrier", "barriers",
    "dash", "auto-run", "subway", "sidewalk", "street",
  ],
  "space-shooter": [
    "space", "spaceship", "space ship", "ship", "shoot", "shooter",
    "asteroid", "asteroids", "laser", "alien", "galaxy", "rocket", "blaster",
  ],
  "forest-platformer": [
    "forest", "jump", "jumping", "platform", "platformer", "jungle",
    "hop", "hopping",
  ],
  "fruit-puzzle": [
    "fruit", "fruits", "match", "matching", "puzzle", "basket", "sort",
    "sorting", "vegetable", "vegetables",
  ],
  // ROUND 23 — assetPacks.js'teki racing paketinin (artık aktif)
  // suggestedKeywords'ü ile birebir aynı liste, saf keyword-veri eklemesi
  // (hiçbir yeni branching/if(gameType==="racing") mantığı YOK — diğer
  // türlerle aynı skorlama mekanizmasından geçiyor).
  racing: [
    "race", "racing", "car", "cars", "track", "drift", "speed", "finish line",
    "yarış", "araba",
  ],
  // ROUND 24 — assetPacks.js'teki eski "dungeon" planned kaydının
  // suggestedKeywords'üne dayanıyor (+ görevin kendi örnek kelimeleri:
  // rpg/warrior/knight/mage/monster), saf keyword-veri eklemesi (hiçbir
  // yeni branching/if(gameType==="dungeon-rpg") mantığı YOK).
  "dungeon-rpg": [
    "dungeon", "dungeons", "crawler", "rpg", "warrior", "knight", "mage",
    "wizard", "torch", "trap", "underground", "labyrinth", "maze", "monster",
    "zindan", "mahzen",
  ],
  // ROUND 25 — assetPacks.js'teki car-kit/city-kit-roads/city-kit-industrial
  // paketlerinin beslediği "city" kitine karşılık gelen saf keyword-veri
  // eklemesi (hiçbir yeni branching/if(gameType==="city") mantığı YOK).
  // "car"/"cars"/"araba" BİLİNÇLİ OLARAK dahil edilmedi — racing kitinin
  // keyword listesinde zaten var, ikisinde birden olsaydı "a car game"
  // gibi bir promptta skor eşitliği (tie) oluşup gameType null'a
  // düşebilirdi; city'nin kendine özgü (racing'de olmayan) kelimeleriyle
  // ayrıştırıldı.
  city: [
    "city", "cities", "urban", "town", "street", "streets", "traffic",
    "building", "buildings", "şehir", "kasaba", "trafik",
  ],
  // ROUND 25 — food-kit paketinin beslediği "cooking" kitine karşılık gelen
  // saf keyword-veri eklemesi (hiçbir yeni branching mantığı YOK).
  cooking: [
    "cooking", "cook", "kitchen", "chef", "recipe", "food", "restaurant",
    "meal", "yemek", "mutfak", "aşçı",
  ],
};

/**
 * prompt: kullanıcının ham prompt metni (herhangi bir dil/case).
 * Dönüş: { gameType: string|null, confidence: number, scores: {key: number} }
 *   confidence, en yüksek skorun kaç anahtar kelimeden geldiğini gösterir
 *   (mutlak sayı — 0/1/2/3... — normalize edilmiş bir olasılık DEĞİL,
 *   yanlışlıkla "yüzde güven" gibi yorumlanmaması için bilerek düz sayı).
 */
function detectGameType(prompt) {
  var text = (prompt || "").toLowerCase();
  var scores = {};

  Object.keys(GAME_TYPE_KEYWORDS).forEach(function (key) {
    var matched = GAME_TYPE_KEYWORDS[key].filter(function (kw) {
      return text.indexOf(kw) !== -1;
    });
    scores[key] = matched.length;
  });

  var bestKey = null;
  var bestScore = 0;
  var tie = false;

  Object.keys(scores).forEach(function (key) {
    if (scores[key] > bestScore) {
      bestKey = key;
      bestScore = scores[key];
      tie = false;
    } else if (scores[key] > 0 && scores[key] === bestScore) {
      tie = true;
    }
  });

  if (bestScore === 0 || tie) {
    return { gameType: null, confidence: 0, scores: scores };
  }

  return { gameType: bestKey, confidence: bestScore, scores: scores };
}

module.exports = {
  detectGameType: detectGameType,
  GAME_TYPE_KEYWORDS: GAME_TYPE_KEYWORDS,
};
