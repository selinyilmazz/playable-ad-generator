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
      var match = ctx.html.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
      if (match && match[1].trim().length > 10) return { status: "pass" };
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
      var re = /<script[^>]*>([\s\S]*?)<\/script>/gi;
      var match;
      var found = false;
      var firstError = null;
      while ((match = re.exec(ctx.html)) !== null) {
        var code = match[1];
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
];

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
};
