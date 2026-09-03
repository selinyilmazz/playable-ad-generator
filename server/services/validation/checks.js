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
];

module.exports = {
  CHECKS: CHECKS,
  extractKeywords: extractKeywords,
  extractDurationSeconds: extractDurationSeconds,
};
