/**
 * ROUND M — VALIDATION & QUALITY SCORE ACCURACY.
 *
 * Bu dosya, görev md.13'ün istediği 20 numaralı regresyon testini içerir.
 * Hepsi mevcut validate.js/checks.js orkestrasyonunu (validatePlayable)
 * GERÇEK giriş olarak kullanır — ikinci/ayrı bir test altyapısı İCAT
 * EDİLMEDİ.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const { validatePlayable } = require("../services/validate");
const checksModule = require("../services/validation/checks");

function getCheck(result, key) {
  var c = result.checks.filter(function (c) { return c.key === key; })[0];
  assert.ok(c, "check bulunamadı: " + key);
  return c;
}

function shellHtml(bodyExtra, scriptExtra) {
  return (
    "<!DOCTYPE html><html><head>" +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" /></head><body>' +
    (bodyExtra || "") +
    "<script>" + (scriptExtra || "document.addEventListener('click', function(){});") + "</script>" +
    "</body></html>"
  );
}

function withGameplayConfigJson(json) {
  return '<script type="application/json" id="gameplay-config">' + json + "</script>";
}

// ================== 1. JS SYNTAX VALIDATION ==================

test("ROUND M #1: js-syntax-valid, application/json tipindeki gameplay-config bloğunu JS OLARAK PARSE ETMEZ (pass)", function () {
  var html = shellHtml(withGameplayConfigJson(JSON.stringify({ gravity: 1, jumpVelocity: 1, moveSpeed: 1, platforms: [{ x: 0, y: 0 }] })));
  var result = validatePlayable(html, "");
  assert.equal(getCheck(result, "js-syntax-valid").status, "pass");
  assert.equal(getCheck(result, "has-js").status, "pass");
});

test("ROUND M #2: js-syntax-valid, GERÇEK <script> içindeki geçersiz JS söz dizimini HÂLÂ yakalar (fail)", function () {
  var html = shellHtml("", "function broken( { this is not valid js ;;;");
  var result = validatePlayable(html, "");
  var check = getCheck(result, "js-syntax-valid");
  assert.equal(check.status, "fail");
  assert.equal(check.critical, true);
});

test("ROUND M #3: has-js, gameplay-config JSON bloğu GERÇEK script'ten ÖNCE gelse bile ilk (JSON) bloğu JS saymaz, gerçek script'i arar", function () {
  var html =
    "<!DOCTYPE html><html><head></head><body>" +
    withGameplayConfigJson(JSON.stringify({ a: 1 })) +
    "<script>document.addEventListener('click', function(){ console.log('real game logic'); });</script>" +
    "</body></html>";
  var result = validatePlayable(html, "");
  assert.equal(getCheck(result, "has-js").status, "pass");
});

test("ROUND M #4: has-js, SADECE bir application/json bloğu varsa (gerçek JS script'i YOKSA) fail döner (kritik, çökme yok)", function () {
  var html = "<!DOCTYPE html><html><head></head><body>" + withGameplayConfigJson(JSON.stringify({ a: 1 })) + "</body></html>";
  var result = validatePlayable(html, "");
  assert.equal(getCheck(result, "has-js").status, "fail");
});

// ================== 2. GAMEPLAY-CONFIG VALIDATION ==================

test("ROUND M #5: gameplay-config-valid, blok yoksa pass döner (opsiyonel özellik)", function () {
  var result = validatePlayable(shellHtml(), "");
  assert.equal(getCheck(result, "gameplay-config-valid").status, "pass");
});

test("ROUND M #6: gameplay-config-valid, bozuk JSON için ÇÖKMEDEN warning döner (asla fail/crash değil)", function () {
  var html = shellHtml('<script type="application/json" id="gameplay-config">{ not valid json :::</script>');
  var result = validatePlayable(html, "");
  var check = getCheck(result, "gameplay-config-valid");
  assert.equal(check.status, "warning");
});

test("ROUND M #7: gameplay-config-valid, geçerli JSON obje için pass döner", function () {
  var html = shellHtml(withGameplayConfigJson(JSON.stringify({ mode: "platformer" })));
  var result = validatePlayable(html, "");
  assert.equal(getCheck(result, "gameplay-config-valid").status, "pass");
});

// ================== 3. PLATFORMER / MOVEMENT VALIDATION ==================

test("ROUND M #8: platformer isteyen bir prompt + config YOK + gerçek zıplama/hareket kodu da YOK -> platformer-gameplay-consistency FAIL üretir", function () {
  var prompt = "Platform oyununda karakter zıplayarak ilerlesin.";
  var result = validatePlayable(shellHtml("<div>generic tap game</div>", "function tap(){}"), prompt);
  var check = getCheck(result, "platformer-gameplay-consistency");
  assert.equal(check.status, "fail");
  assert.equal(check.critical, false); // md.4/md.9: asla .valid'i false yapmaz
});

test("ROUND M #9: platformer isteyen bir prompt + config YOK ama GERÇEK keydown/keyup + jump kodu VAR -> pass", function () {
  var prompt = "Platform oyununda karakter zıplasın.";
  var script =
    "document.addEventListener('keydown', function(e){ if(e.key==='ArrowRight'){} });" +
    "document.addEventListener('keyup', function(e){});" +
    "function jump(){ /* platform */ }";
  var result = validatePlayable(shellHtml("", script), prompt);
  var check = getCheck(result, "platformer-gameplay-consistency");
  assert.equal(check.status, "pass");
});

test("ROUND M #10: movement validation, hareket İSTEMEYEN (tıklama tabanlı) bir prompt için klavye ZORUNLU tutulmaz", function () {
  var prompt = "Kartlara tıklayarak eşleştirdiğin bir hafıza oyunu.";
  var result = validatePlayable(shellHtml("<div class='card'></div>", "function flip(){}"), prompt);
  // memory mekaniği klavye/yön hareketi sinyali ARAMAZ (evaluateMemorySignals'ta
  // hareket sinyali yok) — bu yüzden movement-input-consistency veya
  // memory-gameplay-consistency check'i klavye eksikliğinden dolayı
  // FAIL ÜRETMEMELİ.
  var memCheck = result.checks.filter(function (c) { return c.key === "memory-gameplay-consistency"; })[0];
  assert.ok(memCheck);
  assert.notEqual(memCheck.status, "fail");
});

// ================== 4. RACING / SPACE SHOOTER / COLLECTION / MEMORY / MATH / COOKING / DUNGEON ==================

test("ROUND M #11: racing isteyen prompt + gerçek direksiyon/engel kodu YOK -> racing-gameplay-consistency fail", function () {
  var prompt = "Arabanın sağa sola sürülerek rakip araçlardan kaçtığı bir yarış oyunu.";
  var result = validatePlayable(shellHtml("<div>tap grid</div>", "function tap(){}"), prompt);
  assert.equal(getCheck(result, "racing-gameplay-consistency").status, "fail");
});

test("ROUND M #12: racing isteyen prompt + gerçek keydown/keyup + engel/skor kodu VAR -> pass", function () {
  var prompt = "Arabanın sağa sola sürülerek rakip araçlardan kaçtığı bir yarış oyunu.";
  var script =
    "document.addEventListener('keydown', function(e){});document.addEventListener('keyup', function(e){});" +
    "var obstacle = {}; var score = 0;";
  var result = validatePlayable(shellHtml("", script), prompt);
  assert.equal(getCheck(result, "racing-gameplay-consistency").status, "pass");
});

test("ROUND M #13: '10 düşman vur' isteyen ama ateş etme/düşman mantığı İÇERMEYEN bir oyun -> space-shooter-gameplay-consistency FAIL (sayısal yanlış pozitif de DAHİL değil)", function () {
  var prompt = "Uzay gemisiyle ateş ederek 10 düşman gemisini yok ettiğin bir uzay çatışma oyunu.";
  // İçinde ALAKASIZ bir "10" geçiyor (skor eşiği) — bu sayıyı "düşman
  // sayısı" sinyali olarak YANLIŞ POZİTİF saymamalı (bağlam yakınlığı yok).
  var script = "var score = 0; function tap(){ score++; if(score>=10){ } }";
  var result = validatePlayable(shellHtml("<div class='tile'></div>", script), prompt);
  var check = getCheck(result, "space-shooter-gameplay-consistency");
  assert.equal(check.status, "fail");
});

test("ROUND M #14: gerçek uzay çatışma şablonu (ateş+düşman+hareket+hedef sayısı BAĞLAMLI) -> space-shooter-gameplay-consistency pass", function () {
  var prompt = "Uzay gemisiyle ateş ederek 10 düşman gemisini yok ettiğin bir uzay çatışma oyunu.";
  var script =
    "document.addEventListener('keydown', function(e){});document.addEventListener('keyup', function(e){});" +
    "var TARGET = 10; function fire(){} var enemy = {};";
  var result = validatePlayable(shellHtml("", script), prompt);
  assert.equal(getCheck(result, "space-shooter-gameplay-consistency").status, "pass");
});

test("ROUND M #15: collection mekaniği için gerçek toplama/skor kodu VAR -> collection-gameplay-consistency pass", function () {
  var prompt = "Karakterin haritada dolaşarak 12 meyve topladığı bir oyun.";
  var script =
    "document.addEventListener('keydown', function(e){});document.addEventListener('keyup', function(e){});" +
    "var TARGET = 12; function collect(){} var score = 0;";
  var result = validatePlayable(shellHtml("", script), prompt);
  assert.equal(getCheck(result, "collection-gameplay-consistency").status, "pass");
});

test("ROUND M #16: memory mekaniği için kart/eşleştirme kodu YOK -> memory-gameplay-consistency fail", function () {
  var prompt = "Kartları çevirip eşleştirdiğin bir hafıza oyunu.";
  var result = validatePlayable(shellHtml("<div>tap grid</div>", "function tap(){}"), prompt);
  assert.equal(getCheck(result, "memory-gameplay-consistency").status, "fail");
});

test("ROUND M #17: math mekaniği için soru sayısı sadece BAĞLAMLI geçtiğinde sinyal sayılır", function () {
  var prompt = "Matematik sorularını cevaplayarak puan topladığın 10 sorulu bir matematik oyunu.";
  var scriptBad = "var unrelated = 10;"; // "10" var ama "question/soru" bağlamı yok
  var resultBad = validatePlayable(shellHtml("<div>tap</div>", scriptBad), prompt);
  assert.equal(getCheck(resultBad, "math-gameplay-consistency").status, "fail");

  var scriptGood = "var question = {}; var TOTAL_QUESTIONS = 10; function answer(){} var score = 0;";
  var resultGood = validatePlayable(shellHtml("", scriptGood), prompt);
  assert.notEqual(getCheck(resultGood, "math-gameplay-consistency").status, "fail");
});

test("ROUND M #18: cooking mekaniği için malzeme/tarif/doğru-yanlış kodu VAR -> cooking-gameplay-consistency pass", function () {
  var prompt = "Bir yemek tarifindeki malzemeleri doğru sırayla seçtiğin bir yemek yapma oyunu.";
  var script = "var ingredient = {}; var recipe = []; function checkCorrect(){}";
  var result = validatePlayable(shellHtml("", script), prompt);
  assert.equal(getCheck(result, "cooking-gameplay-consistency").status, "pass");
});

test("ROUND M #19: dungeon mekaniği için anahtar/kapı/çıkış kodu YOK -> dungeon-gameplay-consistency fail; VARSA pass", function () {
  var prompt = "Zindanda anahtarı bulup kapıyı açarak çıkışa ulaştığın bir oyun.";
  var resultBad = validatePlayable(shellHtml("<div>tap grid</div>", "function tap(){}"), prompt);
  assert.equal(getCheck(resultBad, "dungeon-gameplay-consistency").status, "fail");

  var scriptGood =
    "document.addEventListener('keydown', function(e){});document.addEventListener('keyup', function(e){});" +
    "var door = {}; var exit = {}; var hasKey = false;";
  var resultGood = validatePlayable(shellHtml("", scriptGood), prompt);
  assert.notEqual(getCheck(resultGood, "dungeon-gameplay-consistency").status, "fail");
});

// ================== 5. NUMERIC REQUIREMENT / SKOR / QUALITY SCORE DETAILS ==================

test("ROUND M #20: prompt bir sayı BELİRTMEMİŞSE numeric sinyal 'applicable:false' sayılır (cezalandırılmaz) ve her check listede tam olarak bir Quality Score Details kategorisine düşer", function () {
  var prompt = "Karakterin haritada dolaşarak meyve topladığı bir oyun."; // sayı YOK
  var sigs = checksModule.evaluateCollectionSignals({
    userPrompt: prompt,
    html: shellHtml(),
    lowerHtml: shellHtml().toLowerCase(),
  });
  var numericSig = sigs[sigs.length - 1];
  assert.equal(numericSig.applicable, false);

  // Quality Score Details invariant: public/app.js'teki QUALITY_CATEGORY_DEFS,
  // checks.js'in ürettiği TÜM check key'lerini TAM OLARAK BİR kategoriye
  // atamalı (çift sayım veya kayıp OLMAMALI) — bu test bunu programatik
  // olarak DOĞRULAR (elle inceleme yerine).
  var fs = require("fs");
  var path = require("path");
  var appJsPath = path.join(__dirname, "..", "..", "public", "app.js");
  var src = fs.readFileSync(appJsPath, "utf8");
  var start = src.indexOf("var QUALITY_CATEGORY_DEFS = [");
  var end = src.indexOf("var QUALITY_PASS_LABELS");
  assert.ok(start !== -1 && end !== -1 && end > start, "QUALITY_CATEGORY_DEFS bulunamadı");
  var defsSrc = src.slice(start, end);
  // eslint-disable-next-line no-new-func
  var QUALITY_CATEGORY_DEFS = new Function(defsSrc + "\nreturn QUALITY_CATEGORY_DEFS;")();

  var allKeys = checksModule.CHECKS.map(function (c) { return c.key; });
  var covered = {};
  QUALITY_CATEGORY_DEFS.forEach(function (def) {
    def.checkKeys.forEach(function (k) { covered[k] = (covered[k] || 0) + 1; });
  });
  var missing = allKeys.filter(function (k) { return !covered[k]; });
  var duplicated = Object.keys(covered).filter(function (k) { return covered[k] > 1; });
  assert.deepEqual(missing, [], "kategorisiz check'ler var: " + missing.join(", "));
  assert.deepEqual(duplicated, [], "birden fazla kategoriye düşen check'ler var: " + duplicated.join(", "));

  // Skor formülü (pass=1/warning=0.5/fail=0, ortalama * 100) hâlâ 0-100
  // aralığında ve YENİ bir formül İCAT EDİLMEDİ.
  var result = validatePlayable(shellHtml(), prompt);
  assert.ok(result.score >= 0 && result.score <= 100);
});
