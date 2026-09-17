/**
 * HORIZONTAL MOVEMENT FIX tests — "Movement Input Consistency" validation
 * check + `extractMovementInputSignal` helper.
 *
 * Bu check, `level-length-consistency` ile TAMAMEN AYNI felsefeyi izler:
 * promptun kendi dili sürekli/yönlü bir hareket (örn. "sağa sola hareket
 * etsin", "move left and right", "arrow keys", "A/D") istiyorsa, üretilen
 * oyunda GERÇEK bir klavye tabanlı yatay hareket implementasyonu (veya
 * self-reported gameplay-config.controls.horizontalKeys=true) aranır.
 * Sinyal yoksa her koşulda "pass" döner; sinyal varsa ve kanıt yoksa SADECE
 * "warning" döner — asla "fail" (non-critical, Play'i asla engellemez).
 * eval/new Function KULLANMAZ, gameType'a göre DALLANMAZ.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const { validatePlayable } = require("../services/validate");
const { extractMovementInputSignal } = require("../services/validation/checks");

function getCheck(result) {
  return result.checks.filter(function (c) {
    return c.key === "movement-input-consistency";
  })[0];
}

function configBlock(obj) {
  return (
    '<script type="application/json" id="gameplay-config">' +
    JSON.stringify(obj) +
    "</script>"
  );
}

function htmlWithScript(jsBody, extra) {
  return (
    "<html><body>" +
    "<script>" + jsBody + "</script>" +
    (extra || "") +
    "</body></html>"
  );
}

// ================== extractMovementInputSignal — unit ==================

test("extractMovementInputSignal: 'Karakter sağa ve sola hareket etsin.' -> sinyal TRUE", function () {
  var signal = extractMovementInputSignal("Karakter sağa ve sola hareket etsin.");
  assert.equal(signal.requiresHorizontalMovement, true);
});

test("extractMovementInputSignal: 'Use arrow keys to move left and right and space to jump.' -> sinyal TRUE", function () {
  var signal = extractMovementInputSignal(
    "Use arrow keys to move left and right and space to jump."
  );
  assert.equal(signal.requiresHorizontalMovement, true);
});

test("extractMovementInputSignal: 'Move the character with A/D and jump with W.' -> sinyal TRUE", function () {
  var signal = extractMovementInputSignal("Move the character with A/D and jump with W.");
  assert.equal(signal.requiresHorizontalMovement, true);
});

test("extractMovementInputSignal: 'Player can move horizontally and jump.' -> sinyal TRUE", function () {
  var signal = extractMovementInputSignal("Player can move horizontally and jump.");
  assert.equal(signal.requiresHorizontalMovement, true);
});

test("extractMovementInputSignal: kullanıcının verdiği tam Türkçe prompt -> sinyal TRUE", function () {
  var signal = extractMovementInputSignal(
    "Ormanda ilerleyen bir karakter oluştur. Oyuncu sağa ve sola hareket ederek " +
      "platformlarda ilerlesin, zıplayarak yıldızları toplasın ve engellere " +
      "çarpmadan sona ulaşsın. En az 8 platform olsun ve tüm yıldızlar " +
      "ulaşılabilir yerlere yerleştirilsin. Oyuncu düşerse veya engele çarparsa " +
      "kaybetsin."
  );
  assert.equal(signal.requiresHorizontalMovement, true);
});

test("extractMovementInputSignal: yönlü hareket istemeyen bir prompt (sadece tap/click) -> sinyal FALSE", function () {
  var signal = extractMovementInputSignal(
    "Balonları patlatmak için ekrana dokun, 10 saniyede en yüksek skoru yap."
  );
  assert.equal(signal.requiresHorizontalMovement, false);
});

test("extractMovementInputSignal: prompt boş/yok -> sinyal FALSE", function () {
  assert.equal(extractMovementInputSignal("").requiresHorizontalMovement, false);
  assert.equal(extractMovementInputSignal(null).requiresHorizontalMovement, false);
});

// ================== movement-input-consistency check ==================

test("movement-input-consistency: sinyal yoksa (hareket istenmeyen prompt) HTML ne olursa olsun pass döner", function () {
  var result = validatePlayable(
    htmlWithScript("document.addEventListener('click', function(){});"),
    "Balonları patlatmak için ekrana dokun."
  );
  var check = getCheck(result);
  assert.ok(check);
  assert.equal(check.status, "pass");
  assert.equal(check.critical, false);
});

test("movement-input-consistency: sinyal var + gerçek keydown/keyup + ArrowLeft/ArrowRight kanıtı -> pass", function () {
  var js =
    "document.addEventListener('click', function(){});" +
    "document.addEventListener('keydown', function(e){ if (e.key === 'ArrowLeft') vx = -1; if (e.key === 'ArrowRight') vx = 1; });" +
    "document.addEventListener('keyup', function(e){ vx = 0; });";
  var result = validatePlayable(htmlWithScript(js), "Karakter sağa ve sola hareket etsin.");
  var check = getCheck(result);
  assert.equal(check.status, "pass");
});

test("movement-input-consistency: sinyal var + A/D (KeyA/KeyD) kanıtı -> pass", function () {
  var js =
    "document.addEventListener('click', function(){});" +
    "document.addEventListener('keydown', function(e){ if (e.code === 'KeyA') vx = -1; if (e.code === 'KeyD') vx = 1; });" +
    "document.addEventListener('keyup', function(e){ vx = 0; });";
  var result = validatePlayable(
    htmlWithScript(js),
    "Move the character with A/D and jump with W."
  );
  var check = getCheck(result);
  assert.equal(check.status, "pass");
});

test("movement-input-consistency: sinyal var + gameplay-config.controls.horizontalKeys=true (self-reported) -> pass", function () {
  var html = htmlWithScript(
    "document.addEventListener('click', function(){});",
    configBlock({ controls: { horizontalKeys: true, jumpKeys: ["Space", "ArrowUp", "tap"] } })
  );
  var result = validatePlayable(html, "Player can move horizontally and jump.");
  var check = getCheck(result);
  assert.equal(check.status, "pass");
});

test("movement-input-consistency: sinyal var ama SADECE click/tap (klavye yok) -> warning (asla fail)", function () {
  // Bu, kullanıcının bildirdiği GERÇEK bug senaryosu: prompt yatay hareket
  // istiyor ama üretilen oyun sadece tıklama/dokunmayla zıplıyor.
  var result = validatePlayable(
    htmlWithScript("document.addEventListener('click', function(){ jump(); });"),
    "Karakter sağa ve sola hareket etsin."
  );
  var check = getCheck(result);
  assert.equal(check.status, "warning");
  assert.notEqual(check.status, "fail");
  assert.ok(check.detail);
});

test("movement-input-consistency: sinyal var + keydown var ama yatay tuş referansı yok (örn. sadece Space) -> warning", function () {
  var js =
    "document.addEventListener('click', function(){});" +
    "document.addEventListener('keydown', function(e){ if (e.code === 'Space') jump(); });";
  var result = validatePlayable(htmlWithScript(js), "Use arrow keys to move left and right and space to jump.");
  var check = getCheck(result);
  assert.equal(check.status, "warning");
});

test("movement-input-consistency: her koşulda non-critical -> validity'yi (valid=false) ASLA etkilemez", function () {
  var result = validatePlayable(
    htmlWithScript("document.addEventListener('click', function(){ jump(); });"),
    "Karakter sağa ve sola hareket etsin."
  );
  var check = getCheck(result);
  assert.equal(check.status, "warning");
  assert.equal(check.critical, false);
  // valid, başka kritik bir check fail olmadığı sürece true kalmalı.
  var hasCriticalFail = result.checks.some(function (c) {
    return c.critical && c.status === "fail";
  });
  assert.equal(hasCriticalFail, false);
});
