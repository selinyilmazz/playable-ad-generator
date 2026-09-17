/**
 * Playable ad validation için kontrol tanımları.
 *
 * Her kontrol saf bir fonksiyondur: (ctx) => { status: "pass"|"warning"|"fail", detail? }
 * ctx = { html, lowerHtml, userPrompt, lowerPrompt }
 *
 * Bunlar GERÇEK, statik analiz tabanlı kontrollerdir (regex/heuristik) —
 * kodu gerçekten çalıştırmıyoruz, bu yüzden bazıları ("Win Condition",
 * "No Infinite Loop Risk" gibi) kesin değil, en iyi çabayla tahmindir.
 * Yeni bir kontrol eklemek için bu listeye bir öğe eklemek yeterli;
 * validate.js ve frontend otomatik olarak bunu da işleyecek.
 */
const fs = require("fs");
const path = require("path");
const { getKnownAssetPaths } = require("../assetContext");
// ROUND M — VALIDATION & QUALITY SCORE ACCURACY: aynı, DEĞİŞMEMİŞ mekanik
// dedektörünü (Round L) ve sayı çıkarımını (Round L) yeniden kullanıyoruz —
// ikinci bir dedektör/algoritma İCAT ETMİYORUZ, sadece validation katmanının
// KENDİ SORUSUNU ("bu prompt hangi mekaniği istiyor, ve o mekanik üretilen
// HTML'de GERÇEKTEN var mı?") cevaplamak için mevcut, saf/deterministik
// yardımcı fonksiyonları çağırıyoruz.
const { detectGameplayMechanic } = require("../mockGameplayIntent");
const { extractCountNear } = require("../countExtraction");

// PHASE 5 — Asset Integrity: asset-paths-valid'in "bu path manifestte var
// mı?" sorusundan farklı olarak, "bu path GERÇEKTEN diskte, desteklenen bir
// formatta ve makul boyutta bir dosyaya karşılık geliyor mu?" sorusuna
// bakar (REQUIREMENTS #8: file exists / valid path / supported format /
// loadable / reasonable file size).
var SUPPORTED_ASSET_FORMATS = ["svg", "png", "jpg", "jpeg", "gif", "webp"];
var MAX_ASSET_BYTES = 500 * 1024; // tek bir 2D oyun asseti için makul üst sınır
var PUBLIC_DIR = path.join(__dirname, "..", "..", "..", "public");

var STOPWORDS = [
  "the", "and", "for", "with", "that", "this", "from", "your", "have",
  "will", "then", "when", "what", "show", "screen", "game", "player",
  "create", "simple", "short", "with", "into", "some", "each", "them",
  "olan", "yapan", "için", "bir", "ile", "oluştur", "göster", "ekran",
  "oyun", "oyuncu", "kısa", "olsun", "gibi",
];

function extractKeywords(prompt) {
  if (!prompt) return [];
  var words = prompt
    .toLowerCase()
    .replace(/[^a-z0-9çğıöşü\s]/gi, " ")
    .split(/\s+/)
    .filter(function (w) {
      return w.length >= 4 && STOPWORDS.indexOf(w) === -1;
    });

  var seen = {};
  var unique = [];
  words.forEach(function (w) {
    if (!seen[w]) {
      seen[w] = true;
      unique.push(w);
    }
  });
  return unique.slice(0, 8);
}

function extractDurationSeconds(prompt) {
  if (!prompt) return null;
  var match = prompt.match(/(\d+)\s*(?:-|to)?\s*(?:second|saniye)/i);
  return match ? parseInt(match[1], 10) : null;
}

// ================== LEVEL LENGTH SIGNALS (Round F) ==================
// PROBLEM 2 (sabit/kısa level uzunluğu) için: `extractDurationSeconds` ile
// AYNI, zaten kabul edilmiş desen — prompttaki GENERIC sayı/birim/endless
// sinyallerini regex ile çıkarmak (gameType'a göre DALLANMIYOR, sadece
// promptun kendi dilini okuyor). Bu, üretilen HTML'i regex'le "doğrulamak"
// değildir (o yasak) — sadece kullanıcı isteğini yorumlamaktır, tıpkı
// extractKeywords/extractDurationSeconds gibi.
var ENDLESS_SIGNAL_RE =
  /\b(endless|infinite|forever|as\s+long\s+as\s+possible|high\s*score|sonsuz|hayatta\s*kal|olabildiğince\s*uzun)\b/i;

var LEVEL_LENGTH_TARGET_UNITS =
  "stars?|coins?|items?|targets?|collectibles?|yıldız(?:lar)?|para|öğe|hedef|nesne|obje";
var LEVEL_LENGTH_STAGE_UNITS =
  "platforms?|platformlu|stages?|sections?|rounds?|bölüm(?:lük)?|kısım|tur";

var TARGET_COUNT_RE = new RegExp("(\\d+)\\s*(?:" + LEVEL_LENGTH_TARGET_UNITS + ")\\b", "i");
var STAGE_COUNT_RE = new RegExp("(\\d+)\\s*(?:" + LEVEL_LENGTH_STAGE_UNITS + ")\\b", "i");
// Fallback: "10 tane topla" / "collect 10" gibi, birim isim geçmeyen ama
// collect/topla fiiline yakın bir sayı içeren promptlar için.
var TARGET_COLLECT_FALLBACK_RE = /(\d+)\D{0,12}(?:tane\s+)?(?:topla|collect)/i;

function extractLevelLengthSignals(prompt) {
  if (!prompt) return { endless: false, targetCount: null, stageCount: null };
  var endless = ENDLESS_SIGNAL_RE.test(prompt);
  var targetMatch = prompt.match(TARGET_COUNT_RE) || prompt.match(TARGET_COLLECT_FALLBACK_RE);
  var stageMatch = prompt.match(STAGE_COUNT_RE);
  return {
    endless: endless,
    targetCount: targetMatch ? parseInt(targetMatch[1], 10) : null,
    stageCount: stageMatch ? parseInt(stageMatch[1], 10) : null,
  };
}

// ================== MOVEMENT INPUT SIGNAL (Horizontal Movement Fix) ==================
// PROBLEM: prompt sürekli/yönlü (continuous/directional) bir hareket
// istiyorsa (örn. "sağa ve sola hareket etsin", "move left and right",
// "arrow keys", "A/D ile hareket", "move horizontally"), üretilen oyunun
// GERÇEKTEN klavye/tuş-basılı-tutma tabanlı bir yatay hareket uygulaması
// beklenir — tek bir tıklama/dokunma (sadece zıplama) YETERLİ DEĞİLDİR.
// `extractLevelLengthSignals` ile TAMAMEN AYNI, zaten kabul edilmiş desen:
// gameType'a göre DALLANMIYOR, sadece promptun kendi dilini (generic
// keyword/regex) okuyor — üretilen HTML'i değil.
var MOVEMENT_SIGNAL_RE = new RegExp(
  "(" +
    "sağ[a-zçğıöşü]*\\s+(?:ve\\s+)?sol[a-zçğıöşü]*" + "|" +
    "sol[a-zçğıöşü]*\\s+(?:ve\\s+)?sağ[a-zçğıöşü]*" + "|" +
    "move\\s+(?:left\\s+and\\s+right|right\\s+and\\s+left|horizontally)" + "|" +
    "\\bleft\\s+and\\s+right\\b" + "|" +
    "\\barrow\\s*keys?\\b" + "|" +
    "\\ba\\s*\\/\\s*d\\b" + "|" +
    "\\bwasd\\b" + "|" +
    "klavye" + "|" +
    "yön\\s*tuş" +
  ")",
  "i"
);

function extractMovementInputSignal(prompt) {
  if (!prompt) return { requiresHorizontalMovement: false };
  return { requiresHorizontalMovement: MOVEMENT_SIGNAL_RE.test(prompt) };
}

// ================== GAMEPLAY CONSISTENCY (Round 21) ==================
// systemPrompt.js'teki yeni, additive "21. GAMEPLAY CONSISTENCY" bölümü
// LLM'e opsiyonel olarak, ana oyun <script>'ine KARIŞMAYAN, inert bir
// <script type="application/json" id="gameplay-config"> bloğu üretmesini
// öneriyor (SADECE zıplama/platform mekaniği kullanıyorsa). Bu blok VARSA
// ve platformer-tipi alanları (gravity/jumpVelocity/moveSpeed/platforms)
// içeriyorsa, basit bir fizik formülüyle ardışık platform geçişlerinin
// YAKLAŞIK olarak ulaşılabilir olup olmadığı kontrol edilir.
//
// BİLEREK KISITLI: bu KESİN bir physics engine/simülasyon DEĞİLDİR — LLM'in
// KENDİ BEYAN ETTİĞİ (self-reported) değerler üzerinden yaklaşık bir
// tutarlılık kontrolüdür. Bu yüzden:
//   - eval/new Function/herhangi bir kod ÇALIŞTIRMA yok — sadece JSON.parse.
//   - config yoksa VEYA platformer'a özgü alanları içermiyorsa "pass" döner
//     (asset-paths-valid/asset-integrity'nin "0 bulunursa pass" deseniyle
//     bilerek aynı felsefe — kullanım/format ZORUNLU değil).
//   - config bozuk JSON'sa "warning" döner (asla fail).
//   - reachability sorunu bulunsa bile SADECE "warning" döner, asla
//     critical fail — Play'i asla engellemez, mevcut asset-retry akışını
//     (SADECE asset-paths-valid'e bağlı) hiç tetiklemez.
// Game type bilgisi ctx'te YOK (validate.js/generate.js'e dokunulmadı) —
// bu yüzden "sadece platformer'da çalışsın" kuralı, gameType'a değil,
// config'in İÇERİĞİNE (gravity/jumpVelocity/moveSpeed/platforms var mı) göre
// güvenli şekilde uygulanıyor: içerik platformer'a benzemiyorsa check kendini
// devre dışı bırakır (pass).
var GAMEPLAY_CONFIG_RE = /<script[^>]*id=["']gameplay-config["'][^>]*>([\s\S]*?)<\/script>/i;
var JUMP_TOLERANCE = 1.18; // ~%18 tolerans (istenen %15-20 aralığında) — self-reported/deltaTime farkları için güvenlik payı

// ROUND F — hazard/collectible alanları da SELF-REPORTED, opsiyonel ve
// additive'dir (isPlatformerConfig gate'i DEĞİŞMEDİ — hâlâ sadece
// gravity/jumpVelocity/moveSpeed/platforms şart koşuyor). "İki nokta
// pratikte aynı yerde mi?" sorusu için kaba bir piksel toleransı.
var HAZARD_OVERLAP_TOLERANCE = 24; // px — bir hazard/collectible'ın bir platform/spawn/goal noktasıyla "çakıştığı" kabul edilen mesafe

// ================== SCRIPT TYPE HELPERS (ROUND M) ==================
// KÖK SORUN (Round L'de keşfedildi, burada düzeltiliyor): hem "has-js" hem
// "js-syntax-valid", type attribute'una BAKMAKSIZIN HER <script> etiketini
// "bu JavaScript'tir" varsayarak ele alıyordu. Ama systemPrompt.js'in
// belgelediği <script type="application/json" id="gameplay-config">
// self-report bloğu bir JSON OBJECT LITERAL'dır — `new Function(code)` ile
// bir JS PROGRAM GÖVDESİ olarak parse edilmeye çalışıldığında ("Unexpected
// token ':'") KESİN olarak SyntaxError fırlatır. Sonuç: bu (opsiyonel,
// belgelenmiş, zararsız) blok var olduğu sürece js-syntax-valid HER ZAMAN
// kritik olarak fail ediyordu — gerçek oyun kodu tamamen sağlam olsa bile.
// Düzeltme: SADECE "veri" tipi script blokları (application/json,
// application/ld+json ve benzeri "*/*+json" type'lar) hem has-js hem
// js-syntax-valid'in JS-parse taramasının DIŞINA çıkarılıyor — bunlar zaten
// AYRI bir check'te (gameplay-config-valid, aşağıda) kendi JSON-özel
// kurallarıyla doğrulanıyor. type attribute'u YOKSA veya bilinen bir JS
// type'sa (text/javascript, application/javascript, module, vb.) davranış
// BİREBİR ÖNCEKİ GİBİ kalır (taranır/parse edilir) — mevcut hiçbir gerçek
// oyun script'i bu değişiklikten etkilenmez.
var NON_JS_SCRIPT_TYPE_RE = /^(?:[a-z0-9.+-]+\/(?:ld\+)?json)$/i;

function getScriptTagType(openTagAttrs) {
  var m = (openTagAttrs || "").match(/\btype\s*=\s*["']([^"']+)["']/i);
  return m ? m[1].trim().toLowerCase() : "";
}

function isNonJsScriptType(type) {
  return !!type && NON_JS_SCRIPT_TYPE_RE.test(type);
}

function isFiniteNumber(n) {
  return typeof n === "number" && isFinite(n);
}

function isValidPoint(p) {
  return !!p && typeof p === "object" && isFiniteNumber(p.x) && isFiniteNumber(p.y);
}

function nearPoint(a, b, tolerance) {
  return Math.abs(a.x - b.x) <= tolerance && Math.abs(a.y - b.y) <= tolerance;
}

function extractGameplayConfigJson(html) {
  var match = html.match(GAMEPLAY_CONFIG_RE);
  if (!match) return { found: false };
  var raw = match[1].trim();
  if (!raw) return { found: false };
  try {
    // SADECE JSON.parse — eval/new Function YOK, hiçbir kod çalıştırılmıyor.
    var parsed = JSON.parse(raw);
    return { found: true, parsed: parsed };
  } catch (err) {
    return { found: true, parseError: err.message };
  }
}

function isPlatformerConfig(cfg) {
  return !!(
    cfg &&
    typeof cfg === "object" &&
    isFiniteNumber(cfg.gravity) && cfg.gravity > 0 &&
    isFiniteNumber(cfg.jumpVelocity) && cfg.jumpVelocity > 0 &&
    isFiniteNumber(cfg.moveSpeed) && cfg.moveSpeed >= 0 &&
    Array.isArray(cfg.platforms) &&
    cfg.platforms.length > 0 &&
    cfg.platforms.every(isValidPoint)
  );
}

function evaluatePlatformerReachability(cfg) {
  var maxJumpHeight = (cfg.jumpVelocity * cfg.jumpVelocity) / (2 * cfg.gravity);
  var maxJumpDistance = cfg.moveSpeed * ((2 * cfg.jumpVelocity) / cfg.gravity);
  var allowedHeight = maxJumpHeight * JUMP_TOLERANCE;
  var allowedDistance = maxJumpDistance * JUMP_TOLERANCE;

  var points = cfg.platforms.slice();
  if (isValidPoint(cfg.playerStart)) points.push(cfg.playerStart);
  if (isValidPoint(cfg.goal)) points.push(cfg.goal);
  // x'e göre sırala — self-reported koordinatların soldan sağa bir sahne
  // düzenini temsil ettiği varsayımıyla (yaygın 2D platformer konvansiyonu).
  points.sort(function (a, b) { return a.x - b.x; });

  var problems = [];
  for (var i = 1; i < points.length; i++) {
    var prev = points[i - 1];
    var next = points[i];
    var dx = Math.abs(next.x - prev.x);
    // dyUp > 0 -> next, prev'den daha YUKARIDA (y ekseni aşağı doğru artan
    // standart DOM/canvas konvansiyonu varsayılıyor). Aşağı inişte (dyUp<=0)
    // yükseklik bir kısıt değil, sadece yatay mesafe kontrol ediliyor.
    var dyUp = prev.y - next.y;
    var dxFail = dx > allowedDistance;
    var dyFail = dyUp > allowedHeight;
    if (dxFail || dyFail) {
      problems.push(
        "(" + Math.round(prev.x) + "," + Math.round(prev.y) + ")->(" +
          Math.round(next.x) + "," + Math.round(next.y) + "): dx=" + Math.round(dx) +
          "/izin~" + Math.round(allowedDistance) +
          (dyFail ? ", dy(yukarı)=" + Math.round(dyUp) + "/izin~" + Math.round(allowedHeight) : "")
      );
    }
  }

  // ================== ROUND F (additive) ==================
  // Yukarıdaki `problems` hesaplaması HİÇ DEĞİŞMEDİ. Aşağısı, AYNI
  // self-reported config üzerinde, PROBLEM 1'in generic prensiplerini
  // (hazard placement / collectible placement / reachability / target
  // count tutarlılığı) kapsayan YENİ, ayrı sonuç alanlarıdır. cfg'de
  // hazards/collectibles/targetCount YOKSA bu alanlar sadece boş dizi
  // döner — mevcut hiçbir davranış/format bozulmaz.
  var hazards = Array.isArray(cfg.hazards) ? cfg.hazards.filter(isValidPoint) : [];
  var collectibles = Array.isArray(cfg.collectibles) ? cfg.collectibles.filter(isValidPoint) : [];

  // HAZARD PLACEMENT: bir hazard, oyuncunun UĞRAMAK ZORUNDA olduğu bir
  // noktayla (platform/playerStart/goal) çakışıyorsa, o zorunlu rota
  // kaçınılmaz biçimde bloklanmış demektir (kabaca — kesin bir collision
  // simülasyonu değil, self-reported koordinat çakışması kontrolü).
  var hazardProblems = [];
  hazards.forEach(function (hz) {
    points.forEach(function (p) {
      if (nearPoint(hz, p, HAZARD_OVERLAP_TOLERANCE)) {
        hazardProblems.push(
          "hazard(" + Math.round(hz.x) + "," + Math.round(hz.y) + ") gerekli bir rota noktasıyla (" +
            Math.round(p.x) + "," + Math.round(p.y) + ") çakışıyor — zorunlu ilerleme rotası tamamen bloklanmış olabilir"
        );
      }
    });
  });

  // COLLECTIBLE PLACEMENT / REACHABILITY: aynı zıplama mesafe/yükseklik
  // formülünü, platformlar arası geçiş yerine "herhangi bir rota
  // noktasından bu collectible'a ulaşılabiliyor mu?" sorusu için tekrar
  // kullanıyoruz (yeni bir fizik modeli icat etmiyoruz).
  function reachableFromAnyPoint(target) {
    return points.some(function (p) {
      var dx = Math.abs(target.x - p.x);
      var dyUp = p.y - target.y; // target, p'den daha YUKARIDAysa pozitif
      return dx <= allowedDistance && dyUp <= allowedHeight;
    });
  }

  var collectibleProblems = [];
  collectibles.forEach(function (col) {
    if (col.required === false) return; // sadece required (veya flag belirtilmemiş) collectible'lar kontrol edilir
    if (!reachableFromAnyPoint(col)) {
      collectibleProblems.push(
        "collectible(" + Math.round(col.x) + "," + Math.round(col.y) +
          "): hesaplanan zıplama sınırları içinde hiçbir platform/başlangıç/goal noktasından ulaşılamıyor"
      );
      return;
    }
    var overlapsHazard = hazards.some(function (hz) {
      return nearPoint(col, hz, HAZARD_OVERLAP_TOLERANCE);
    });
    if (overlapsHazard) {
      collectibleProblems.push(
        "collectible(" + Math.round(col.x) + "," + Math.round(col.y) +
          ") bir hazard ile çakışıyor — toplamak kaçınılmaz hasar/çarpışma gerektirebilir"
      );
    }
  });

  // TARGET COUNT TUTARLILIĞI: win condition'ın dayandığı targetCount,
  // config'in KENDİ İÇİNDE tanımladığı gerçek (required) collectible
  // sayısıyla eşleşmeli — aksi halde oyun matematiksel olarak
  // tamamlanamaz (örn. "10 topla" ama sadece 4 tanesi tanımlı).
  var targetCountProblems = [];
  if (isFiniteNumber(cfg.targetCount) && cfg.targetCount > 0 && collectibles.length > 0) {
    var requiredCollectibleCount = collectibles.filter(function (c) {
      return c.required !== false;
    }).length;
    if (requiredCollectibleCount < cfg.targetCount) {
      targetCountProblems.push(
        "targetCount=" + cfg.targetCount + " ama config'te sadece " + requiredCollectibleCount +
          " required collectible tanımlı — win condition, gerçek level state'iyle eşleşmiyor"
      );
    }
  }

  return {
    maxJumpHeight: maxJumpHeight,
    maxJumpDistance: maxJumpDistance,
    problems: problems,
    hazardProblems: hazardProblems,
    collectibleProblems: collectibleProblems,
    targetCountProblems: targetCountProblems,
  };
}

// ================== ROUND M — MECHANIC-SPECIFIC GAMEPLAY VALIDATION ==================
// KÖK SORUN (Round K'de kanıtlandı): teknik check'lerin (valid HTML/JS,
// interactive, no-storage, vb.) hepsi geçse bile, üretilen oyun TALEP
// EDİLEN mekaniği (platformer/racing/shooter/vb.) HİÇ İÇERMEYEBİLİR — ve
// eskiden buna bakan HİÇBİR check yoktu, bu yüzden "Ormanda...WASD...
// yıldız...düşman" gibi bir prompt, gerçekte jenerik bir tap-grid şablonuna
// düşse bile 95/100 "Excellent" alabiliyordu.
//
// Bu bölüm, promptun HANGİ mekaniği işaret ettiğine (mockGameplayIntent.js
// — Round L'nin AYNI, DEĞİŞMEMİŞ dedektörü, İKİNCİ bir dedektör İCAT
// EDİLMEDİ) bakıp, üretilen HTML'de o mekanik için GERÇEKTEN beklenen,
// tamamen deterministik (regex/substring, HİÇBİR semantik/AI değerlendirmesi
// yok — görev md.7) kod/metin sinyallerinin var olup olmadığını tarar.
//
// Felsefe (mevcut platformer-gameplay-consistency/level-length-consistency/
// movement-input-consistency ile AYNI): HER ZAMAN non-critical (asla
// .valid'i false yapmaz — sadece skor + detay); mekanik bu promptla
// alakasızsa (ctx.gameplayMechanic bu check'in mekaniğiyle eşleşmiyorsa)
// SESSİZCE "pass" (görev md.6: "Do NOT require every signal for every
// game"); bir sayı istenmemişse numeric sinyal sayıma HİÇ dahil edilmez
// (görev md.8: "Do not penalize games where the prompt did not specify a
// number"). Skorlama: uygulanabilir sinyallerin TAMAMI bulunursa pass,
// HİÇBİRİ bulunamazsa fail (güçlü kanıt: talep edilen mekanik AÇIKÇA yok),
// aradaki her şey warning.
var MOVE_KEY_SUBSTRINGS_4DIR = ["arrowup", "arrowdown", "arrowleft", "arrowright", "keyw", "keya", "keys", "keyd"];
var MOVE_KEY_SUBSTRINGS_LR = ["arrowleft", "arrowright", "keya", "keyd"];

function hasAny(haystack, needles) {
  return needles.some(function (n) { return haystack.indexOf(n) !== -1; });
}

function hasKeyListener(h) {
  return /addeventlistener\s*\(\s*['"](keydown|keyup)['"]/i.test(h);
}

// ctx, TEK bir validatePlayable() çağrısı boyunca TÜM check'ler arasında
// AYNI obje örneği olarak paylaşılıyor (bkz. ../validate.js) — mekanik
// tespiti promptun kendisinden (HTML'den değil) türetildiği için sabittir,
// bu yüzden ctx üzerinde bir kez hesaplanıp önbelleğe alınır (8 ayrı check
// aynı promptu 8 kez yeniden taramaz).
function getMechanic(ctx) {
  if (ctx.__mechanicCache === undefined) {
    ctx.__mechanicCache = detectGameplayMechanic(ctx.userPrompt || "").mechanic;
  }
  return ctx.__mechanicCache;
}

// signals: [{ label, ok, applicable? }] — applicable:false olan sinyaller
// (ör. promptta hiç sayı istenmemişse numeric sinyal) sayıma HİÇ dahil
// edilmez.
function summarizeSignals(mechanicLabel, signals) {
  var applicable = signals.filter(function (s) { return s.applicable !== false; });
  if (applicable.length === 0) {
    return { status: "pass", detail: mechanicLabel + ": doğrulanacak somut/sayısal bir sinyal yok (pass)." };
  }
  var found = applicable.filter(function (s) { return s.ok; });
  var missing = applicable.filter(function (s) { return !s.ok; });

  if (missing.length === 0) {
    return {
      status: "pass",
      detail: mechanicLabel + ": beklenen tüm gerçek sinyaller bulundu (" +
        found.map(function (s) { return s.label; }).join(", ") + ").",
    };
  }
  if (found.length === 0) {
    return {
      status: "fail",
      detail: mechanicLabel + ": prompt bu mekaniği açıkça istiyor ama üretilen HTML'de " +
        "HİÇBİR beklenen sinyal (" + missing.map(function (s) { return s.label; }).join(", ") +
        ") bulunamadı — güçlü kanıt: gerekli oynanış eksik.",
    };
  }
  return {
    status: "warning",
    detail: mechanicLabel + ": " + found.length + "/" + applicable.length +
      " beklenen sinyal bulundu. Eksik/doğrulanamayan: " +
      missing.map(function (s) { return s.label; }).join(", ") + ".",
  };
}

// Reuse: countExtraction.js (Round L, GENERATION için) — burada AYNI saf
// fonksiyon, VALİDASYON tarafında "promptun istediği sayı, üretilen HTML'de
// bir yerde geçiyor mu?" sorusu için kullanılıyor (görev md.8).
//
// ROUND M DÜZELTMESİ (canlı sanity-check sırasında BULUNDU): sayının HTML
// içinde SADECE "bir yerde" (\bNUMBER\b, bağlamdan bağımsız) geçmesini
// aramak YANLIŞ POZİTİF üretiyordu — ör. "10 düşman yok et" isteyen ama
// GERÇEKTE düşman/ateş mantığı içermeyen jenerik bir oyun, sırf skor eşiği
// için `if (score >= 10)` gibi ALAKASIZ bir "10" içerdiği için bu sinyali
// yanlışlıkla "bulundu" sayıyordu (bkz. final rapor "SCORE SANITY CHECK").
// Düzeltme: countExtraction.js'in prompt tarafında zaten uyguladığı "noun
// context" prensibinin AYNISI, HTML tarafına da uygulanıyor — sayı, bu
// mekaniğin kendi bağlam kelimelerinden (contextTokens; verilmezse nouns'un
// kendisi + evrensel "target" — üretim şablonlarının hepsi hedef sayısını
// `TARGET`/`targetCount` adıyla tutuyor) BİRİNE yakın (≤30 karakter) olarak
// geçmiyorsa artık "bulunamadı" sayılır. İkinci, ayrı bir sayı-çıkarma
// sistemi İCAT EDİLMEDİ — sadece AYNI yakınlık prensibi iki tarafa da
// (prompt VE html) uygulanıyor.
function escapeRegExpLiteral(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function numericSignal(prompt, html, nouns, label, contextTokens) {
  var requested = extractCountNear(prompt, nouns);
  if (requested == null) return { label: label, ok: false, applicable: false };
  var tokens = (contextTokens || nouns).concat(["target"]);
  var tokenPattern = tokens.map(escapeRegExpLiteral).join("|");
  var numPattern = escapeRegExpLiteral(String(requested));
  var re = new RegExp(
    "(?:" + tokenPattern + ")[^<>]{0,30}\\b" + numPattern + "\\b" +
      "|\\b" + numPattern + "\\b[^<>]{0,30}(?:" + tokenPattern + ")",
    "i"
  );
  return { label: label + " (" + requested + ")", ok: re.test(html), applicable: true };
}

function evaluatePlatformerTextSignals(ctx) {
  var h = ctx.lowerHtml;
  return [
    { label: "yön hareketi (keydown/keyup + sol/sağ tuş)", ok: hasKeyListener(h) && hasAny(h, MOVE_KEY_SUBSTRINGS_LR) },
    { label: "zıplama (jump)", ok: hasAny(h, ["jump", "zıpla"]) && hasKeyListener(h) },
    { label: "platform referansı", ok: hasAny(h, ["platform"]) },
    numericSignal(ctx.userPrompt, ctx.html, ["yıldız", "star", "coin", "coins"], "toplanabilir sayısı"),
  ];
}

function evaluateRacingSignals(ctx) {
  var h = ctx.lowerHtml;
  return [
    { label: "direksiyon/şerit değiştirme (keydown/keyup + sol/sağ tuş)", ok: hasKeyListener(h) && hasAny(h, MOVE_KEY_SUBSTRINGS_LR) },
    { label: "engel/rakip araç referansı", ok: hasAny(h, ["traffic", "obstacle", "opponent", "engel", "araç", "rakip"]) },
    { label: "skor/süre göstergesi", ok: hasAny(h, ["score", "time"]) },
  ];
}

function evaluateSpaceShooterSignals(ctx) {
  var h = ctx.lowerHtml;
  return [
    { label: "hareket (keydown/keyup + sol/sağ tuş)", ok: hasKeyListener(h) && hasAny(h, MOVE_KEY_SUBSTRINGS_LR) },
    { label: "ateş etme/mermi", ok: hasAny(h, ["fire", "shoot", "bullet", "mermi", "ateş", "lazer", "laser"]) },
    { label: "düşman/enemy referansı", ok: hasAny(h, ["enem", "düşman", "alien", "asteroid", "ufo"]) },
    numericSignal(ctx.userPrompt, ctx.html, ["düşman", "enemy", "enemies"], "düşman hedef sayısı"),
  ];
}

function evaluateCollectionSignals(ctx) {
  var h = ctx.lowerHtml;
  return [
    { label: "4 yönlü hareket (keydown/keyup + yön tuşları)", ok: hasKeyListener(h) && hasAny(h, MOVE_KEY_SUBSTRINGS_4DIR) },
    { label: "toplanabilir referansı", ok: hasAny(h, ["collect", "topla", "meyve", "fruit", "coin", "star", "yıldız", "altın"]) },
    { label: "skor göstergesi", ok: hasAny(h, ["score"]) },
    numericSignal(ctx.userPrompt, ctx.html, ["meyve", "yıldız", "altın", "coin", "gem", "fruit", "star"], "toplanabilir hedef sayısı"),
  ];
}

function evaluateMemorySignals(ctx) {
  var h = ctx.lowerHtml;
  return [
    { label: "kart referansı", ok: hasAny(h, ["card", "kart"]) },
    { label: "çevirme/eşleştirme", ok: hasAny(h, ["reveal", "flip", "match", "eşleş"]) },
    { label: "hamle sayacı", ok: hasAny(h, ["move", "hamle"]) },
  ];
}

function evaluateMathSignals(ctx) {
  var h = ctx.lowerHtml;
  return [
    { label: "soru referansı", ok: hasAny(h, ["question", "soru"]) },
    { label: "cevap/seçenek referansı", ok: hasAny(h, ["answer", "cevap", "option", "seçenek"]) },
    { label: "skor göstergesi", ok: hasAny(h, ["score"]) },
    numericSignal(ctx.userPrompt, ctx.html, ["soru", "question", "questions"], "soru sayısı"),
  ];
}

function evaluateCookingSignals(ctx) {
  var h = ctx.lowerHtml;
  return [
    { label: "malzeme referansı", ok: hasAny(h, ["ingredient", "malzeme"]) },
    { label: "tarif/sıra referansı", ok: hasAny(h, ["recipe", "tarif", "step", "sıra"]) },
    { label: "doğru/yanlış değerlendirmesi", ok: hasAny(h, ["correct", "wrong", "doğru", "yanlış"]) },
  ];
}

function evaluateDungeonSignals(ctx) {
  var h = ctx.lowerHtml;
  return [
    { label: "4 yönlü hareket (keydown/keyup + yön tuşları)", ok: hasKeyListener(h) && hasAny(h, MOVE_KEY_SUBSTRINGS_4DIR) },
    // NOT: bare "key" alt-dizesi BİLEREK kullanılmıyor — "keydown"/"keyup"
    // TÜM oyunların paylaşılan runtime'ında zaten HER ZAMAN mevcut, bu
    // yüzden \bkey\b (kelime sınırı) kullanılıyor: "keydown" içinde "key"
    // ile "down" arasında kelime sınırı YOK (ikisi de \w), bu yüzden EŞLEŞMEZ
    // — ama "key-item" gibi kendi sınıf adımızda (tire kelime sınırı sayılır)
    // DOĞRU şekilde eşleşir. mockGameplayIntent.js'in AYNI sınıf hatayı
    // ("keywords" içindeki bare "key") bulup düzelttiği Round L'deki
    // mantıkla birebir aynı.
    { label: "anahtar (key) referansı", ok: /\bkey\b/i.test(h) || h.indexOf("anahtar") !== -1 },
    { label: "kapı (door) referansı", ok: hasAny(h, ["door", "kapı"]) },
    { label: "çıkış (exit) referansı", ok: hasAny(h, ["exit", "çıkış"]) },
  ];
}

var MECHANIC_CHECK_DEFS = [
  { key: "racing-gameplay-consistency", name: "Racing Gameplay Consistency", mechanic: "racing", label: "Racing", evaluate: evaluateRacingSignals },
  { key: "space-shooter-gameplay-consistency", name: "Space Shooter Gameplay Consistency", mechanic: "space-shooter", label: "Space Shooter", evaluate: evaluateSpaceShooterSignals },
  { key: "collection-gameplay-consistency", name: "Collection Gameplay Consistency", mechanic: "collection", label: "Collection", evaluate: evaluateCollectionSignals },
  { key: "memory-gameplay-consistency", name: "Memory Gameplay Consistency", mechanic: "memory", label: "Memory", evaluate: evaluateMemorySignals },
  { key: "math-gameplay-consistency", name: "Math Quiz Gameplay Consistency", mechanic: "math", label: "Math Quiz", evaluate: evaluateMathSignals },
  { key: "cooking-gameplay-consistency", name: "Cooking Gameplay Consistency", mechanic: "cooking", label: "Cooking", evaluate: evaluateCookingSignals },
  { key: "dungeon-gameplay-consistency", name: "Dungeon Gameplay Consistency", mechanic: "dungeon", label: "Dungeon", evaluate: evaluateDungeonSignals },
];

var MECHANIC_CHECKS = MECHANIC_CHECK_DEFS.map(function (def) {
  return {
    key: def.key,
    name: def.name,
    critical: false,
    run: function (ctx) {
      var mechanic = getMechanic(ctx);
      if (mechanic !== def.mechanic) {
        return {
          status: "pass",
          detail: "Bu promptun tespit edilen mekaniği '" + def.mechanic + "' değil — bu check'in kapsamı dışında (pass).",
        };
      }
      return summarizeSignals(def.label, def.evaluate(ctx));
    },
  };
});

var CHECKS = [
  {
    key: "valid-html",
    name: "Valid HTML",
    critical: true,
    run: function (ctx) {
      if (!ctx.html || ctx.html.trim().length === 0) {
        return { status: "fail", detail: "Üretilen içerik boş." };
      }
      var hasOpen = ctx.lowerHtml.indexOf("<html") !== -1;
      var hasClose = ctx.lowerHtml.indexOf("</html>") !== -1;
      if (hasOpen && hasClose) return { status: "pass" };
      return { status: "fail", detail: "<html>…</html> yapısı eksik." };
    },
  },
  {
    key: "has-js",
    name: "Has JavaScript",
    critical: true,
    run: function (ctx) {
      // ROUND M: type="application/json" (ör. gameplay-config self-report)
      // bir <script> bloğu, dolu olsa bile GERÇEK oyun kodu SAYILMAZ —
      // aksi halde ana oyun <script>'i tamamen boş/eksik olsa bile, ÖNÜNDEKİ
      // bir JSON config bloğu yüzünden yanlışlıkla "has-js: pass" dönebilirdi
      // (js-syntax-valid'deki KÖK SORUNLA aynı hata sınıfı — bkz. yukarıdaki
      // SCRIPT TYPE HELPERS notu). /g ile TÜM script etiketleri taranıyor
      // (eskiden SADECE ilki taranıyordu).
      var re = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
      var match;
      while ((match = re.exec(ctx.html)) !== null) {
        var type = getScriptTagType(match[1]);
        if (isNonJsScriptType(type)) continue;
        if (match[2] && match[2].trim().length > 10) return { status: "pass" };
      }
      return { status: "fail", detail: "<script> etiketi bulunamadı veya boş." };
    },
  },
  {
    key: "js-syntax-valid",
    name: "JS Syntax Valid",
    critical: true,
    run: function (ctx) {
      // has-js sadece <script> içeriğinin VAR olduğuna bakar, gerçekten
      // ÇALIŞABİLİR (syntax hatasız) olduğuna bakmaz. <script>...</script>
      // etiketleri TAM kapalı olsa bile içeride syntax hatası olabilir
      // (eşleşmeyen parantez, bozuk template literal, kesilmiş bir ifadenin
      // ortasında biten kod vb.) — bu durumda has-js/interactive SADECE
      // metin/pattern varlığına baktıkları için yanlışlıkla "pass" verip
      // kırık bir oyunu "başarılı" gibi gösterebiliyordu. new Function(code)
      // burada SADECE parse/derleme yapar, kodu ASLA çalıştırmaz (dönen
      // fonksiyon hiç çağrılmıyor) — bu yüzden güvenlidir, LLM çıktısını
      // sunucuda execute etmiyoruz; solver/oyun mantığına da dokunmuyor,
      // sadece mevcut kodun parse edilip edilemediğini okuyor.
      //
      // ROUND M: type="application/json"/"application/ld+json" (veri
      // blokları, ör. gameplay-config self-report) artık BU taramanın
      // DIŞINDA — bunlar GEÇERLİ bir JS PROGRAM GÖVDESİ olmak ZORUNDA
      // değildir (ve JSON object literal syntax'i zaten JS ifadesi olarak
      // parse EDİLEMEZ). Kendi JSON geçerliliği AYRI bir check'te
      // (gameplay-config-valid, aşağıda) doğrulanıyor — bu check SADECE
      // gerçek oyun kodunun (type yok / text/javascript / application/
      // javascript / module vb.) sözdizimsel olarak geçerli olduğuna bakar.
      var re = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
      var match;
      var found = false;
      var firstError = null;
      while ((match = re.exec(ctx.html)) !== null) {
        var type = getScriptTagType(match[1]);
        if (isNonJsScriptType(type)) continue;
        var code = match[2];
        if (!code || !code.trim()) continue;
        found = true;
        try {
          // eslint-disable-next-line no-new-func
          new Function(code);
        } catch (err) {
          if (!firstError) firstError = err.message;
        }
      }
      if (!found) {
        // İçerik yoksa bu check'in işi değil — has-js zaten bunu fail eder.
        return { status: "pass" };
      }
      if (firstError) {
        return {
          status: "fail",
          detail: "JavaScript syntax hatası (muhtemelen kesilmiş/eksik yanıt): " + firstError,
        };
      }
      return { status: "pass" };
    },
  },
  {
    key: "interactive",
    name: "Interactive",
    critical: true,
    run: function (ctx) {
      var hasHandler =
        /addeventlistener\s*\(\s*['"](click|touchstart|pointerdown|mousedown)/i.test(ctx.html) ||
        /\son(click|touchstart|pointerdown)\s*=/i.test(ctx.html);
      return hasHandler
        ? { status: "pass" }
        : { status: "fail", detail: "Tıklama/dokunma tabanlı bir etkileşim bulunamadı." };
    },
  },
  {
    key: "win-condition",
    name: "Win Condition",
    critical: false,
    run: function (ctx) {
      var re = /\b(win|success|congrat|you\s*win|başar[ıi])\b/i;
      return re.test(ctx.html)
        ? { status: "pass" }
        : { status: "warning", detail: "Belirgin bir 'kazanma' durumu tespit edilemedi." };
    },
  },
  {
    key: "lose-condition",
    name: "Lose / Game Over",
    critical: false,
    run: function (ctx) {
      var re = /\b(lose|game\s*over|fail|try\s*again|kaybet)\b/i;
      return re.test(ctx.html)
        ? { status: "pass" }
        : { status: "warning", detail: "Belirgin bir 'kaybetme / game over' durumu tespit edilemedi." };
    },
  },
  {
    key: "can-end",
    name: "Game Can End",
    critical: false,
    run: function (ctx) {
      var hasEndSignal = /\b(win|success|game\s*over|lose|fail|congrat)\b/i.test(ctx.html);
      if (hasEndSignal) return { status: "pass" };
      var hasLoop = /setinterval|requestanimationframe/i.test(ctx.html);
      if (hasLoop) {
        return { status: "warning", detail: "Sürekli çalışan bir döngü var ama net bir bitiş sinyali bulunamadı." };
      }
      return { status: "warning", detail: "Oyunun nasıl bittiği net değil." };
    },
  },
  {
    key: "prompt-alignment",
    name: "Prompt Alignment",
    critical: false,
    run: function (ctx) {
      var keywords = extractKeywords(ctx.userPrompt);
      if (keywords.length === 0) return { status: "pass" };
      var found = keywords.filter(function (k) {
        return ctx.lowerHtml.indexOf(k) !== -1;
      });
      var ratio = found.length / keywords.length;
      var pct = Math.round(ratio * 100);
      if (ratio >= 0.5) return { status: "pass", detail: pct + "% anahtar kelime eşleşti." };
      return { status: "warning", detail: pct + "% anahtar kelime eşleşti — prompttaki bazı öğeler eksik olabilir." };
    },
  },
  {
    key: "mobile-ready",
    name: "Mobile Ready",
    critical: false,
    run: function (ctx) {
      var hasViewport = /<meta[^>]*name=["']viewport["']/i.test(ctx.html);
      return hasViewport
        ? { status: "pass" }
        : { status: "warning", detail: "viewport meta etiketi bulunamadı." };
    },
  },
  {
    key: "no-infinite-loop",
    name: "No Infinite Loop Risk",
    critical: false,
    run: function (ctx) {
      var hasLoop = /setinterval|requestanimationframe/i.test(ctx.html);
      if (!hasLoop) return { status: "pass" };
      var hasClear = /clearinterval|cancelanimationframe/i.test(ctx.html);
      var hasEnd = /\b(win|game\s*over|lose|success)\b/i.test(ctx.html);
      if (hasClear || hasEnd) return { status: "pass" };
      return { status: "warning", detail: "Döngü temizleme veya net bir bitiş koşulu görünmüyor." };
    },
  },
  {
    key: "cta",
    name: "Call To Action",
    critical: false,
    run: function (ctx) {
      var re = /(play\s*again|try\s*again|install|download|tekrar\s*oyna)/i;
      return re.test(ctx.html)
        ? { status: "pass" }
        : { status: "warning", detail: "Belirgin bir CTA (Play Again / Install vb.) bulunamadı." };
    },
  },
  {
    key: "duration",
    name: "Playable Duration",
    critical: false,
    run: function (ctx) {
      var seconds = extractDurationSeconds(ctx.userPrompt);
      if (seconds == null) return { status: "pass" };
      var ms = seconds * 1000;
      var re = new RegExp("\\b" + ms + "\\b");
      if (re.test(ctx.html)) {
        return { status: "pass", detail: seconds + "s ile eşleşen bir zamanlayıcı bulundu." };
      }
      return {
        status: "warning",
        detail: "Promptta istenen " + seconds + "s süresiyle eşleşen bir zamanlayıcı bulunamadı (elle kontrol önerilir).",
      };
    },
  },
  {
    key: "no-storage",
    name: "No Browser Storage",
    critical: true,
    run: function (ctx) {
      var found = /localstorage|sessionstorage/i.test(ctx.html);
      return found
        ? { status: "fail", detail: "localStorage/sessionStorage kullanımı tespit edildi (yasak)." }
        : { status: "pass" };
    },
  },
  {
    key: "no-external-resources",
    name: "No External Resources",
    critical: true,
    run: function (ctx) {
      var re = /(src|href)\s*=\s*["']https?:\/\//i;
      return re.test(ctx.html)
        ? { status: "fail", detail: "Dış kaynaklara referans tespit edildi (görsel/script/CSS)." }
        : { status: "pass" };
    },
  },
  {
    key: "asset-paths-valid",
    name: "Asset Paths Valid",
    critical: true,
    run: function (ctx) {
      // Game Asset Pipeline MVP: LLM'e verilen "AVAILABLE GAME ASSETS"
      // listesi dışında bir /assets/... path'i UYDURMASINI engellemek
      // için — HTML metninde geçen her /assets/... referansını (img src,
      // CSS url(...), JS string literal fark etmeksizin, düz metin
      // taraması) manifestteki BİLİNEN path'lerle karşılaştırır.
      // Asset hiç kullanılmamışsa (oyun CSS/SVG/emoji fallback'e
      // dayanıyorsa) bu check'in işi yok — "pass" döner, asset kullanımı
      // ZORUNLU değil.
      var re = /\/assets\/[A-Za-z0-9_\-\/.]+\.(?:svg|png|jpg|jpeg|gif|webp)/g;
      var found = ctx.html.match(re) || [];
      if (found.length === 0) return { status: "pass" };

      var known = getKnownAssetPaths();
      var seen = {};
      var unknown = [];
      found.forEach(function (p) {
        if (seen[p]) return;
        seen[p] = true;
        if (!known[p]) unknown.push(p);
      });

      if (unknown.length === 0) return { status: "pass" };
      return {
        status: "fail",
        detail:
          "Manifestte olmayan/uydurulmuş asset path(ler)i kullanılmış: " +
          unknown.join(", "),
      };
    },
  },
  {
    key: "asset-integrity",
    name: "Asset Integrity",
    critical: false,
    run: function (ctx) {
      // Sadece asset-paths-valid'in "known" saydığı (manifestte var olan)
      // path'lere bakılır — manifestte hiç olmayan/uydurulmuş path'ler zaten
      // asset-paths-valid tarafından ayrı ve kritik olarak raporlanıyor,
      // burada TEKRAR edilmiyor (iki check farklı sorulara cevap veriyor).
      var re = /\/assets\/[A-Za-z0-9_\-\/.]+\.(?:svg|png|jpg|jpeg|gif|webp)/g;
      var found = ctx.html.match(re) || [];
      if (found.length === 0) return { status: "pass" };

      var known = getKnownAssetPaths();
      var seen = {};
      var problems = [];

      found.forEach(function (p) {
        if (seen[p]) return;
        seen[p] = true;
        if (!known[p]) return;

        var ext = (p.split(".").pop() || "").toLowerCase();
        if (SUPPORTED_ASSET_FORMATS.indexOf(ext) === -1) {
          problems.push(p + ": desteklenmeyen format (." + ext + ")");
          return;
        }

        var fullPath = path.join(PUBLIC_DIR, p.replace(/^\//, ""));
        var stat;
        try {
          stat = fs.statSync(fullPath);
        } catch (err) {
          problems.push(p + ": dosya bulunamadı/okunamadı");
          return;
        }
        if (stat.size === 0) {
          problems.push(p + ": dosya boş (0 byte)");
        } else if (stat.size > MAX_ASSET_BYTES) {
          problems.push(p + ": " + Math.round(stat.size / 1024) + "KB — beklenenden büyük (>500KB)");
        }
      });

      if (problems.length === 0) return { status: "pass" };
      return { status: "warning", detail: problems.join("; ") };
    },
  },
  {
    key: "resource-size",
    name: "Resource Size",
    critical: false,
    run: function (ctx) {
      var len = ctx.html.length;
      if (len <= 50000) return { status: "pass", detail: len + " karakter." };
      return { status: "warning", detail: len + " karakter — beklenenden büyük." };
    },
  },
  {
    key: "platformer-gameplay-consistency",
    name: "Platformer Gameplay Consistency",
    critical: false,
    run: function (ctx) {
      var extracted = extractGameplayConfigJson(ctx.html);

      if (!extracted.found) {
        // ROUND M: config yoksa artık körü körüne "pass" DENMİYOR — eğer bu
        // PROMPT açıkça platformer/zıplama mekaniği istiyorsa (görev md.4),
        // üretilen HTML'de GERÇEK metinsel/kod sinyallerine (hareket,
        // zıplama, platform referansı, istenen toplanabilir sayısı) bakılır.
        // Mekanik platformer DEĞİLSE (veya tespit edilemiyorsa) davranış
        // BİREBİR ÖNCEKİ GİBİ kalır: "pass, doğrulanamıyor" (opsiyonel
        // özellik, zorunlu değil) — mevcut testler bu yüzden korunuyor.
        if (getMechanic(ctx) === "platformer") {
          return summarizeSignals("Platformer", evaluatePlatformerTextSignals(ctx));
        }
        return {
          status: "pass",
          detail:
            "gameplay-config bloğu bulunamadı — self-reported bir config olmadan bu check doğrulama yapamıyor (opsiyonel, pass).",
        };
      }

      if (extracted.parseError) {
        return {
          status: "warning",
          detail:
            "gameplay-config bloğu bulundu ama geçerli JSON değil (" + extracted.parseError +
            ") — self-reported config üzerinden doğrulama yapılamadı.",
        };
      }

      var cfg = extracted.parsed;
      if (!isPlatformerConfig(cfg)) {
        // ROUND M: config VAR ama platformer reachability alanlarını
        // içermiyor — promptun mekaniği yine de platformer'sa metinsel
        // sinyallere bakılır (config eksik/yanlış şekilli olsa bile GERÇEK
        // oyun kodu doğru olabilir — ya da tam tersi, config yokken kod da
        // yoksa bu artık yakalanır).
        if (getMechanic(ctx) === "platformer") {
          return summarizeSignals("Platformer", evaluatePlatformerTextSignals(ctx));
        }
        return {
          status: "pass",
          detail:
            "gameplay-config bulundu ama platformer reachability alanlarını (gravity/jumpVelocity/moveSpeed/platforms) tam içermiyor — bu check sadece platformer tipi config'ler için anlamlı, uygulanamadı (pass).",
        };
      }

      var result = evaluatePlatformerReachability(cfg);
      // ROUND F (additive): platform-geçiş problemleri (mevcut, değişmedi)
      // + hazard/collectible/targetCount problemleri (yeni) TEK bir
      // "gameplay tutarlılığı" sonucunda birleştiriliyor — key/name/critical
      // hiçbiri değişmedi, sadece kapsam genişledi.
      var allProblems = result.problems
        .concat(result.hazardProblems || [])
        .concat(result.collectibleProblems || [])
        .concat(result.targetCountProblems || []);

      if (allProblems.length === 0) {
        return {
          status: "pass",
          detail:
            "Self-reported gameplay-config'e göre YAKLAŞIK kontrol: maxJumpHeight≈" +
            Math.round(result.maxJumpHeight) + ", maxJumpDistance≈" + Math.round(result.maxJumpDistance) +
            " — platform geçişleri, hazard/collectible yerleşimi ve target count tutarlılığı bu sınırlar içinde görünüyor (±%18 tolerans).",
        };
      }

      return {
        status: "warning",
        detail:
          "Self-reported gameplay-config üzerinden YAKLAŞIK kontrol (kesin bir physics simülasyonu değildir): " +
          allProblems.length + " gameplay tutarlılık sorunu bulundu -> " + allProblems.join(" | "),
      };
    },
  },
  {
    key: "gameplay-config-valid",
    name: "Gameplay Config Valid",
    critical: false,
    run: function (ctx) {
      // ROUND M — görev md.3: <script type="application/json" id=
      // "gameplay-config"> bloğu VARSA, onu (SADECE JSON.parse ile, ASLA
      // eval/new Function ile) güvenle ayrıştırıp temel yapısını doğrulayan,
      // mekanikten BAĞIMSIZ, genel bir check. Bloğun mevcudiyeti TEK BAŞINA
      // "gameplay çalışıyor" ANLAMINA GELMEZ (bkz. platformer-gameplay-
      // consistency ve mekanik-özel check'ler — GERÇEK oynanış sinyalini
      // onlar değerlendirir); bu check SADECE "bu self-report bloğu, VARSA,
      // en azından GEÇERLİ ve KULLANILABİLİR bir JSON mi?" sorusuna bakar.
      var extracted = extractGameplayConfigJson(ctx.html);
      if (!extracted.found) {
        return {
          status: "pass",
          detail: "gameplay-config bloğu yok — opsiyonel bir özellik, doğrulanacak bir şey yok (pass).",
        };
      }
      if (extracted.parseError) {
        return {
          status: "warning",
          detail:
            "gameplay-config bloğu bulundu ama geçerli JSON değil (" + extracted.parseError +
            ") — pipeline ÇÖKMEDİ, sadece bu self-report sinyali kullanılamadı.",
        };
      }
      if (!extracted.parsed || typeof extracted.parsed !== "object" || Array.isArray(extracted.parsed)) {
        return {
          status: "warning",
          detail: "gameplay-config geçerli JSON ama beklenen obje ({...}) yapısında değil.",
        };
      }
      return {
        status: "pass",
        detail: "gameplay-config geçerli JSON ve bir obje — mekanik-özel check'ler tarafından (varsa) ek, güçlü bir sinyal olarak kullanılabilir.",
      };
    },
  },
  {
    key: "level-length-consistency",
    name: "Level Length / Progression Consistency",
    critical: false,
    run: function (ctx) {
      // ROUND F — PROBLEM 2: prompt açıkça bir uzunluk/sayı/endless sinyali
      // veriyorsa, üretilen oyun bunu YOK SAYMAMALI (sabit "4 platform"
      // şablonuna düşmemeli). `duration` check'iyle AYNI felsefe: sinyal
      // yoksa pass; sinyal varsa ve doğrulanamıyorsa warning (ASLA fail) —
      // bu KESİN bir gameplay simülasyonu değil, en iyi çabayla bir
      // tutarlılık/hatırlatma kontrolüdür. Herhangi bir gameType'a göre
      // dallanma YOK — sadece prompttaki generic sayı/birim/endless
      // sinyalleri + (varsa) self-reported gameplay-config kullanılıyor.
      var signals = extractLevelLengthSignals(ctx.userPrompt);
      if (!signals.endless && signals.targetCount == null && signals.stageCount == null) {
        return { status: "pass" };
      }

      var extracted = extractGameplayConfigJson(ctx.html);
      var cfg = extracted.found && !extracted.parseError ? extracted.parsed : null;
      var problems = [];

      if (signals.endless && cfg && typeof cfg.mode === "string" && cfg.mode.toLowerCase() !== "endless") {
        problems.push(
          "Prompt sonsuz/hayatta-kal (endless/survival) modu istiyor ama gameplay-config.mode=\"" +
            cfg.mode + "\" olarak beyan edilmiş — sabit/kısa bir bitişle çelişebilir."
        );
      }

      if (signals.targetCount != null) {
        var declaredTargetCount = cfg && isFiniteNumber(cfg.targetCount) ? cfg.targetCount : null;
        var declaredCollectibles = cfg && Array.isArray(cfg.collectibles) ? cfg.collectibles.length : null;
        if (declaredTargetCount != null && declaredTargetCount !== signals.targetCount) {
          problems.push(
            "Prompt " + signals.targetCount + " hedef/collectible istiyor ama gameplay-config.targetCount=" +
              declaredTargetCount + " olarak beyan edilmiş."
          );
        } else if (declaredCollectibles != null && declaredCollectibles < signals.targetCount) {
          problems.push(
            "Prompt " + signals.targetCount + " hedef/collectible istiyor ama gameplay-config sadece " +
              declaredCollectibles + " collectible tanımlıyor."
          );
        } else if (declaredTargetCount == null && declaredCollectibles == null) {
          var reTarget = new RegExp("\\b" + signals.targetCount + "\\b");
          if (!reTarget.test(ctx.html)) {
            problems.push(
              "Promptta istenen " + signals.targetCount +
                " sayısıyla eşleşen bir referans HTML içinde bulunamadı (elle kontrol önerilir)."
            );
          }
        }
      }

      if (signals.stageCount != null) {
        var declaredStageCount = cfg && Array.isArray(cfg.platforms) ? cfg.platforms.length : null;
        if (declaredStageCount != null && declaredStageCount < signals.stageCount) {
          problems.push(
            "Prompt " + signals.stageCount + " platform/bölüm istiyor ama gameplay-config sadece " +
              declaredStageCount + " platform tanımlıyor."
          );
        } else if (declaredStageCount == null) {
          var reStage = new RegExp("\\b" + signals.stageCount + "\\b");
          if (!reStage.test(ctx.html)) {
            problems.push(
              "Promptta istenen " + signals.stageCount +
                " platform/bölüm sayısıyla eşleşen bir referans HTML içinde bulunamadı (elle kontrol önerilir)."
            );
          }
        }
      }

      if (problems.length === 0) return { status: "pass" };
      return { status: "warning", detail: problems.join(" | ") };
    },
  },
  {
    key: "movement-input-consistency",
    name: "Movement Input Consistency",
    critical: false,
    run: function (ctx) {
      // HORIZONTAL MOVEMENT FIX — `level-length-consistency` ile AYNI
      // felsefe: prompt sürekli/yönlü bir hareket istemiyorsa hiçbir şey
      // kontrol edilmez (pass). İstiyorsa ve kanıt bulunamıyorsa SADECE
      // "warning" döner (asla fail) — bu kesin bir runtime simülasyonu
      // değil, en iyi çabayla bir hatırlatma/tutarlılık kontrolüdür.
      // gameType'a göre dallanma YOK — sadece promptun kendi dili + (varsa)
      // LLM'in kendi beyan ettiği gameplay-config.controls kullanılıyor.
      var signal = extractMovementInputSignal(ctx.userPrompt);
      if (!signal.requiresHorizontalMovement) {
        return { status: "pass" };
      }

      // 1) Güçlü sinyal (self-reported): gameplay-config.controls.horizontalKeys
      var extracted = extractGameplayConfigJson(ctx.html);
      var cfg = extracted.found && !extracted.parseError ? extracted.parsed : null;
      if (cfg && cfg.controls && cfg.controls.horizontalKeys === true) {
        return { status: "pass" };
      }

      // 2) Metinsel fallback: gerçek bir keydown/keyup dinleyicisi VE en az
      // bir yatay tuş referansı (ArrowLeft/ArrowRight/KeyA/KeyD veya
      // key==='a'/'d' karşılaştırması) birlikte var mı? Tek başına
      // "keydown" veya tek başına "ArrowLeft" yeterli değil.
      var hasKeyListener = /addeventlistener\s*\(\s*['"](keydown|keyup)['"]/i.test(ctx.html);
      var hasHorizontalKeyRef =
        /arrowleft|arrowright|keya\b|keyd\b|["'`]a["'`]\s*\)|["'`]d["'`]\s*\)/i.test(ctx.html);

      if (hasKeyListener && hasHorizontalKeyRef) {
        return { status: "pass" };
      }

      return {
        status: "warning",
        detail:
          "Prompt sürekli/yönlü bir hareket istiyor (örn. sağa/sola, arrow keys, A/D) " +
          "ama üretilen oyunda klavye tabanlı (keydown/keyup + ArrowLeft/ArrowRight/A/D) " +
          "bir yatay hareket implementasyonu tespit edilemedi — sadece tıklama/dokunma " +
          "yeterli olmayabilir (elle kontrol önerilir).",
      };
    },
  },
].concat(MECHANIC_CHECKS); // ROUND M — 7 yeni mekanik-özel check, additive.

module.exports = {
  CHECKS: CHECKS,
  extractKeywords: extractKeywords,
  extractDurationSeconds: extractDurationSeconds,
  // Round 21 — test edilebilirlik için additive export'lar (mevcut hiçbir
  // export değişmedi/kaldırılmadı).
  extractGameplayConfigJson: extractGameplayConfigJson,
  isPlatformerConfig: isPlatformerConfig,
  evaluatePlatformerReachability: evaluatePlatformerReachability,
  // Round F — test edilebilirlik için additive export (mevcut hiçbir
  // export değişmedi/kaldırılmadı).
  extractLevelLengthSignals: extractLevelLengthSignals,
  // Horizontal Movement Fix — test edilebilirlik için additive export
  // (mevcut hiçbir export değişmedi/kaldırılmadı).
  extractMovementInputSignal: extractMovementInputSignal,
  // ROUND M — test edilebilirlik için additive export'lar (mevcut hiçbir
  // export değişmedi/kaldırılmadı).
  isNonJsScriptType: isNonJsScriptType,
  getScriptTagType: getScriptTagType,
  evaluatePlatformerTextSignals: evaluatePlatformerTextSignals,
  evaluateRacingSignals: evaluateRacingSignals,
  evaluateSpaceShooterSignals: evaluateSpaceShooterSignals,
  evaluateCollectionSignals: evaluateCollectionSignals,
  evaluateMemorySignals: evaluateMemorySignals,
  evaluateMathSignals: evaluateMathSignals,
  evaluateCookingSignals: evaluateCookingSignals,
  evaluateDungeonSignals: evaluateDungeonSignals,
  summarizeSignals: summarizeSignals,
};
