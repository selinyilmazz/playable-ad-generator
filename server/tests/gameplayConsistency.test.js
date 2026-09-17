/**
 * ROUND 21 tests — "Platformer Gameplay Consistency" validation check.
 *
 * Bu check, systemPrompt.js'teki opsiyonel <script type="application/json"
 * id="gameplay-config"> bloğu üzerinden, self-reported physics değerleriyle
 * platform geçişlerinin YAKLAŞIK olarak ulaşılabilir olup olmadığını
 * kontrol eder. Her koşulda non-critical'dır (pass/warning, asla fail) ve
 * eval/new Function KULLANMAZ — sadece JSON.parse.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const { validatePlayable } = require("../services/validate");
const {
  extractGameplayConfigJson,
  isPlatformerConfig,
  evaluatePlatformerReachability,
  extractLevelLengthSignals,
} = require("../services/validation/checks");

function baseHtml(scriptBlock) {
  return (
    "<html><body>" +
    "<script>document.addEventListener('click', function(){});</script>" +
    (scriptBlock || "") +
    "</body></html>"
  );
}

function configBlock(obj) {
  return (
    '<script type="application/json" id="gameplay-config">' +
    JSON.stringify(obj) +
    "</script>"
  );
}

function getCheck(result) {
  return result.checks.filter(function (c) {
    return c.key === "platformer-gameplay-consistency";
  })[0];
}

test("gameplay-config yok -> pass (doğrulanamıyor, opsiyonel)", function () {
  var result = validatePlayable(baseHtml(), "");
  var check = getCheck(result);
  assert.ok(check);
  assert.equal(check.critical, false);
  assert.equal(check.status, "pass");
});

test("geçerli ve reachability açısından tutarlı platformer config -> pass", function () {
  // maxJumpHeight = 12^2/(2*0.6) = 120; maxJumpDistance = 3*(2*12/0.6) = 120.
  // Platformlar arası fark bunun çok altında -> pass beklenir.
  var cfg = {
    gravity: 0.6,
    jumpVelocity: 12,
    moveSpeed: 3,
    playerStart: { x: 20, y: 400 },
    platforms: [
      { x: 20, y: 400 },
      { x: 90, y: 370 },
      { x: 160, y: 340 },
    ],
    goal: { x: 220, y: 320 },
  };
  var result = validatePlayable(baseHtml(configBlock(cfg)), "");
  var check = getCheck(result);
  assert.equal(check.status, "pass");
  assert.match(check.detail, /maxJumpHeight/);
});

test("geçerli fakat ulaşılamaz platform geçişi -> warning (asla fail)", function () {
  // Aynı physics değerleriyle (maxJumpDistance=120) platformlar arasına
  // 500px'lik imkansız bir sıçrama koyuyoruz.
  var cfg = {
    gravity: 0.6,
    jumpVelocity: 12,
    moveSpeed: 3,
    playerStart: { x: 0, y: 400 },
    platforms: [
      { x: 0, y: 400 },
      { x: 900, y: 400 },
    ],
  };
  var result = validatePlayable(baseHtml(configBlock(cfg)), "");
  var check = getCheck(result);
  assert.equal(check.status, "warning");
  assert.equal(check.critical, false);
  assert.match(check.detail, /YAKLAŞIK/);
});

test("bozuk JSON -> warning (asla fail, asla pass — doğrulama yapılamadı)", function () {
  var html = baseHtml(
    '<script type="application/json" id="gameplay-config">{ gravity: 0.6, broken </script>'
  );
  var result = validatePlayable(html, "");
  var check = getCheck(result);
  assert.equal(check.status, "warning");
  assert.equal(check.critical, false);
});

test("platformer alanlarını içermeyen bir gameplay-config -> pass (bu check'in kapsamı dışında)", function () {
  var cfg = { mechanic: "tap", targetCount: 5 };
  var result = validatePlayable(baseHtml(configBlock(cfg)), "");
  var check = getCheck(result);
  assert.equal(check.status, "pass");
});

test("hiçbir durumda 'fail' status'u ÜRETMEZ (critical:false ile birlikte mimari garanti)", function () {
  var scenarios = [
    baseHtml(),
    baseHtml(configBlock({ gravity: 0.6, jumpVelocity: 12, moveSpeed: 3, platforms: [{ x: 0, y: 0 }, { x: 5000, y: 5000 }] })),
    baseHtml('<script type="application/json" id="gameplay-config">not json at all</script>'),
  ];
  scenarios.forEach(function (html) {
    var result = validatePlayable(html, "");
    var check = getCheck(result);
    assert.notEqual(check.status, "fail");
  });
});

test("mevcut check'lerin tamamı hâlâ çalışıyor, ROUND M mekanik-özel check'leri additive olarak ekleniyor", function () {
  // HORIZONTAL MOVEMENT FIX: yeni "movement-input-consistency" check'i
  // eklenmesiyle 19 -> 20 oldu. ROUND M: yeni "gameplay-config-valid" check'i
  // + 7 yeni mekanik-özel check (racing/space-shooter/collection/memory/
  // math/cooking/dungeon-gameplay-consistency) eklenmesiyle 20 -> 28 oldu —
  // bu testin amacı mevcut check'lerin hâlâ çalıştığını doğrulamak, mutlak
  // sayı değil; sayı buradan güncellendi ki gerçek CHECKS uzunluğuyla senkron
  // kalsın.
  var result = validatePlayable(baseHtml(), "5 second test game win game over play again");
  assert.equal(result.checks.length, 28);
  var keys = result.checks.map(function (c) {
    return c.key;
  });
  [
    "valid-html", "has-js", "js-syntax-valid", "interactive", "win-condition",
    "lose-condition", "can-end", "prompt-alignment", "mobile-ready",
    "no-infinite-loop", "cta", "duration", "no-storage", "no-external-resources",
    "asset-paths-valid", "asset-integrity", "resource-size",
    "platformer-gameplay-consistency", "gameplay-config-valid",
    "level-length-consistency", "movement-input-consistency",
    "racing-gameplay-consistency", "space-shooter-gameplay-consistency",
    "collection-gameplay-consistency", "memory-gameplay-consistency",
    "math-gameplay-consistency", "cooking-gameplay-consistency",
    "dungeon-gameplay-consistency",
  ].forEach(function (key) {
    assert.ok(keys.indexOf(key) !== -1, "eksik check: " + key);
  });
});

// ================== ROUND F — hazard / collectible / target count ==================
// PROBLEM 1: mevcut platformer-gameplay-consistency check'i, hazard/
// collectible/targetCount tutarlılığını da kapsayacak şekilde ADDITIVE
// olarak genişletildi. Aşağıdaki testler bu yeni davranışı kapsıyor.

test("ROUND F: hazard, zorunlu bir rota noktasıyla (platform) çakışıyor -> warning", function () {
  var cfg = {
    gravity: 0.6,
    jumpVelocity: 12,
    moveSpeed: 3,
    playerStart: { x: 20, y: 400 },
    platforms: [
      { x: 20, y: 400 },
      { x: 90, y: 370 },
    ],
    hazards: [{ x: 90, y: 370 }], // ikinci platformla tam çakışıyor -> tek rota bloklanmış
  };
  var result = validatePlayable(baseHtml(configBlock(cfg)), "");
  var check = getCheck(result);
  assert.equal(check.status, "warning");
  assert.equal(check.critical, false);
  assert.match(check.detail, /hazard/);
});

test("ROUND F: hazard bir rota noktasıyla çakışmıyorsa (alternatif hareket alanı var) -> pass", function () {
  var cfg = {
    gravity: 0.6,
    jumpVelocity: 12,
    moveSpeed: 3,
    playerStart: { x: 20, y: 400 },
    platforms: [
      { x: 20, y: 400 },
      { x: 90, y: 370 },
    ],
    hazards: [{ x: 500, y: 500 }], // rota noktalarından uzak
  };
  var result = validatePlayable(baseHtml(configBlock(cfg)), "");
  var check = getCheck(result);
  assert.equal(check.status, "pass");
});

test("ROUND F: gerekli (required) bir collectible ulaşılabilir konumda -> pass", function () {
  var cfg = {
    gravity: 0.6,
    jumpVelocity: 12,
    moveSpeed: 3,
    playerStart: { x: 20, y: 400 },
    platforms: [{ x: 20, y: 400 }, { x: 90, y: 370 }],
    collectibles: [{ x: 60, y: 390, required: true }], // playerStart'a yakın, ulaşılabilir sınırlar içinde
  };
  var result = validatePlayable(baseHtml(configBlock(cfg)), "");
  var check = getCheck(result);
  assert.equal(check.status, "pass");
});

test("ROUND F: gerekli (required) bir collectible hiçbir rota noktasından ulaşılamıyor -> warning", function () {
  var cfg = {
    gravity: 0.6,
    jumpVelocity: 12,
    moveSpeed: 3,
    playerStart: { x: 20, y: 400 },
    platforms: [{ x: 20, y: 400 }, { x: 90, y: 370 }],
    collectibles: [{ x: 900, y: 900, required: true }], // çok uzak, ulaşılamaz
  };
  var result = validatePlayable(baseHtml(configBlock(cfg)), "");
  var check = getCheck(result);
  assert.equal(check.status, "warning");
  assert.match(check.detail, /collectible/);
});

test("ROUND F: required:false collectible ulaşılamasa bile göz ardı edilir (opsiyonel obje)", function () {
  var cfg = {
    gravity: 0.6,
    jumpVelocity: 12,
    moveSpeed: 3,
    playerStart: { x: 20, y: 400 },
    platforms: [{ x: 20, y: 400 }, { x: 90, y: 370 }],
    collectibles: [{ x: 900, y: 900, required: false }],
  };
  var result = validatePlayable(baseHtml(configBlock(cfg)), "");
  var check = getCheck(result);
  assert.equal(check.status, "pass");
});

test("ROUND F: targetCount, config'teki gerçek required collectible sayısından fazla -> warning", function () {
  var cfg = {
    gravity: 0.6,
    jumpVelocity: 12,
    moveSpeed: 3,
    playerStart: { x: 20, y: 400 },
    platforms: [{ x: 20, y: 400 }, { x: 90, y: 370 }],
    collectibles: [
      { x: 40, y: 400, required: true },
      { x: 60, y: 400, required: true },
    ],
    targetCount: 10,
  };
  var result = validatePlayable(baseHtml(configBlock(cfg)), "");
  var check = getCheck(result);
  assert.equal(check.status, "warning");
  assert.match(check.detail, /targetCount/);
});

// ================== ROUND F — extractLevelLengthSignals (birim testler) ==================

test("extractLevelLengthSignals: 'ROUND F prompt' örnekleri doğru sinyal veriyor", function () {
  assert.equal(extractLevelLengthSignals("5 platformlu kısa bir oyun").stageCount, 5);
  assert.equal(extractLevelLengthSignals("10 yıldız topla").targetCount, 10);
  assert.equal(extractLevelLengthSignals("3 bölümlük oyun").stageCount, 3);
  assert.equal(extractLevelLengthSignals("sonsuz, olabildiğince uzun hayatta kal").endless, true);
  assert.equal(extractLevelLengthSignals("An endless runner, survive as long as possible").endless, true);
  assert.equal(extractLevelLengthSignals("Make a fun little game").endless, false);
  assert.equal(extractLevelLengthSignals("Make a fun little game").targetCount, null);
  assert.equal(extractLevelLengthSignals("Make a fun little game").stageCount, null);
  assert.equal(extractLevelLengthSignals("").endless, false);
});

// ================== ROUND F — level-length-consistency check ==================

test("ROUND F: prompt sayı/uzunluk/endless sinyali VERMİYORSA level-length-consistency -> pass", function () {
  var result = validatePlayable(baseHtml(), "Create a fun little game about colors.");
  var check = result.checks.filter(function (c) { return c.key === "level-length-consistency"; })[0];
  assert.ok(check);
  assert.equal(check.critical, false);
  assert.equal(check.status, "pass");
});

test("ROUND F: prompt '10 yıldız topla' diyor, config targetCount=10 ve 10 collectible tanımlıyor -> pass", function () {
  var cfg = {
    targetCount: 10,
    collectibles: (function () {
      var arr = [];
      for (var i = 0; i < 10; i++) arr.push({ x: i * 10, y: 0, required: true });
      return arr;
    })(),
  };
  var result = validatePlayable(baseHtml(configBlock(cfg)), "10 yıldız topla ve çıkışa ulaş");
  var check = result.checks.filter(function (c) { return c.key === "level-length-consistency"; })[0];
  assert.equal(check.status, "pass");
});

test("ROUND F: prompt '10 yıldız topla' diyor ama config'te sadece 4 collectible var -> warning (asla fail)", function () {
  var cfg = {
    targetCount: 4,
    collectibles: [
      { x: 0, y: 0, required: true }, { x: 10, y: 0, required: true },
      { x: 20, y: 0, required: true }, { x: 30, y: 0, required: true },
    ],
  };
  var result = validatePlayable(baseHtml(configBlock(cfg)), "10 yıldız topla ve çıkışa ulaş");
  var check = result.checks.filter(function (c) { return c.key === "level-length-consistency"; })[0];
  assert.equal(check.status, "warning");
  assert.equal(check.critical, false);
  assert.match(check.detail, /10/);
});

test("ROUND F: prompt uzun/açık bir seviye istiyor (örn. '3 bölümlük oyun') ve config bunu karşılıyorsa -> pass (uzun level KABUL EDİLİYOR)", function () {
  var cfg = { platforms: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }] };
  var result = validatePlayable(baseHtml(configBlock(cfg)), "3 bölümlük bir platform oyunu");
  var check = result.checks.filter(function (c) { return c.key === "level-length-consistency"; })[0];
  assert.equal(check.status, "pass");
});

test("ROUND F: endless/survival promptu + config.mode='fixed' (çelişki) -> warning", function () {
  var cfg = { mode: "fixed" };
  var result = validatePlayable(baseHtml(configBlock(cfg)), "An endless runner, survive as long as possible for a high score");
  var check = result.checks.filter(function (c) { return c.key === "level-length-consistency"; })[0];
  assert.equal(check.status, "warning");
  assert.match(check.detail, /endless|sonsuz/i);
});

test("ROUND F: endless/survival promptu + config.mode='endless' (tutarlı) -> pass", function () {
  var cfg = { mode: "endless" };
  var result = validatePlayable(baseHtml(configBlock(cfg)), "sonsuz, olabildiğince uzun hayatta kal, high score");
  var check = result.checks.filter(function (c) { return c.key === "level-length-consistency"; })[0];
  assert.equal(check.status, "pass");
});

test("ROUND F: gameplay-config hiç YOKSA (backward compatibility) — mevcut oyunlar/testler eskisi gibi çalışmaya devam eder", function () {
  // Config olmayan (Round 21 öncesi tarz) bir oyun, sayı sinyali olan bir
  // promptla bile SADECE weak textual fallback + warning üretir, asla fail
  // etmez ve platformer-gameplay-consistency check'i de pass döner (config
  // bulunamadığı için "doğrulanamıyor").
  var result = validatePlayable(baseHtml(), "10 yıldız topla ve çıkışa ulaş");
  var reachCheck = getCheck(result);
  assert.equal(reachCheck.status, "pass");
  var lengthCheck = result.checks.filter(function (c) { return c.key === "level-length-consistency"; })[0];
  assert.notEqual(lengthCheck.status, "fail");
});

// ---- Saf birim testleri (extractGameplayConfigJson / isPlatformerConfig /
// evaluatePlatformerReachability) — checks.js'in export ettiği yardımcılar ----

test("extractGameplayConfigJson: blok yoksa found:false döner", function () {
  var r = extractGameplayConfigJson("<html><body>no config</body></html>");
  assert.equal(r.found, false);
});

test("extractGameplayConfigJson: eval/new Function KULLANMADAN sadece JSON.parse ile çalışır (kod çalıştırma girişimi kanıtı)", function () {
  // Buraya bir "kod" değil, geçerli JSON verildiğinde doğru parse edilmeli;
  // JS ifadesi (fonksiyon çağrısı vb.) verildiğinde ise JSON.parse hata
  // vermeli (çalıştırılmamalı) -> parseError dönmeli.
  var withCode = extractGameplayConfigJson(
    '<script type="application/json" id="gameplay-config">(function(){ global.PWNED = true; })()</script>'
  );
  assert.ok(withCode.parseError, "JS ifadesi JSON.parse tarafından reddedilmeli, çalıştırılmamalı");
});

test("isPlatformerConfig: eksik/geçersiz alanlarda false döner", function () {
  assert.equal(isPlatformerConfig(null), false);
  assert.equal(isPlatformerConfig({}), false);
  assert.equal(isPlatformerConfig({ gravity: 0, jumpVelocity: 12, moveSpeed: 3, platforms: [{ x: 0, y: 0 }] }), false); // gravity>0 şart
  assert.equal(isPlatformerConfig({ gravity: 0.6, jumpVelocity: 12, moveSpeed: 3, platforms: [] }), false); // boş platform dizisi
});

test("evaluatePlatformerReachability: %18 tolerans sınırının hemen altı pass, hemen üstü warning üretir", function () {
  var cfg = {
    gravity: 1,
    jumpVelocity: 10,
    moveSpeed: 5,
    platforms: [{ x: 0, y: 0 }], // sadece 1 nokta + playerStart aşağıda eklenecek
  };
  // maxJumpDistance = 5 * (2*10/1) = 100; tolerans ile ~118.
  var okCfg = Object.assign({}, cfg, { playerStart: { x: -115, y: 0 } });
  var okResult = evaluatePlatformerReachability(okCfg);
  assert.equal(okResult.problems.length, 0);

  var failCfg = Object.assign({}, cfg, { playerStart: { x: -130, y: 0 } });
  var failResult = evaluatePlatformerReachability(failCfg);
  assert.equal(failResult.problems.length, 1);
});
