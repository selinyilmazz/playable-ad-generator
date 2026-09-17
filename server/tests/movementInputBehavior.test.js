/**
 * HORIZONTAL MOVEMENT FIX — RUNNABLE BEHAVIOR regression tests.
 *
 * `movementInput.test.js` sadece STATİK analiz (regex/heuristik) tabanlı
 * `movement-input-consistency` check'ini ve `extractMovementInputSignal`
 * yardımcı fonksiyonunu test eder — bu dosya AYRICA gerçek RUNTIME
 * DAVRANIŞINI da doğrular: sürekli tuş-basılı-tutma tabanlı yatay hareketin
 * (keydown/keyup) mevcut zıplama/gravity/collision/collectible/hazard
 * mekanikleriyle GERÇEKTEN birlikte, doğru şekilde çalıştığını.
 *
 * ÖNEMLİ — BU DOSYA TEST-ONLY BİR REFERANS FIXTURE İÇERİR, MİMARİYE
 * HARDCODE DEĞİLDİR: aşağıdaki `REFERENCE_PLATFORMER_SCRIPT`, bu proje
 * (Playable Ad Generator) tarafından ÜRETİLMİŞ bir oyun DEĞİLDİR — sadece
 * "systemPrompt.js'in 24. bölümünde tarif edilen kontrol şemasına uyan bir
 * oyun GERÇEKTEN doğru çalışır mı?" sorusunu test etmek için elle yazılmış,
 * bağımsız bir örnek oyundur. Ne generate.js/checks.js/systemPrompt.js
 * içinde ne de bu testin dışında hiçbir yerde kullanılmaz; `if (gameType
 * === "platformer")` gibi bir dallanma İÇERMEZ ve gerçek mimariye hiçbir
 * şekilde geri bağlanmaz — sadece genel MEKANİZMANIN (keydown/keyup ile
 * sürekli hareket + click/tap ile zıplama + gravity + collision) doğru
 * çalıştığını kanıtlamak için vardır.
 *
 * Yeni bir bağımlılık (örn. jsdom) EKLEMİYORUZ — projenin mevcut minimal
 * bağımlılık felsefesiyle (package.json: sadece dotenv + express) tutarlı
 * kalmak için Node'un YERLEŞİK `vm` modülü + elle yazılmış minimal bir
 * document/window stub'ı kullanılıyor.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");

// ================== minimal document/window stub ==================
// Gerçek bir DOM değil — sadece addEventListener/dispatch semantiğini
// simüle eden, elle yazılmış, çok küçük bir stub. `window` ve `document`
// AYNI dispatcher'ı paylaşır ki referans script hangisine event bağlarsa
// bağlasın (document.addEventListener veya window.addEventListener) test
// çalışsın.
function createEventStub() {
  var listeners = {};
  return {
    addEventListener: function (type, handler) {
      listeners[type] = listeners[type] || [];
      listeners[type].push(handler);
    },
    dispatch: function (type, evt) {
      (listeners[type] || []).forEach(function (h) {
        h(evt);
      });
    },
  };
}

// ================== test-only reference fixture ==================
// Bkz. dosya başındaki açıklama: bu, systemPrompt.js Section 24'ün tarif
// ettiği genel kontrol şemasına (keydown/keyup ile sürekli yatay hareket +
// mevcut click/tap zıplamanın KORUNMASI + gravity/collision/collectible/
// hazard'ın bozulmaması) uyan, elle yazılmış, BAĞIMSIZ bir örnek oyundur.
var REFERENCE_PLATFORMER_SCRIPT =
  "(function () {" +
  "  var GRAVITY = 900, JUMP_VELOCITY = -420, MOVE_SPEED = 200;" +
  "  var WORLD_WIDTH = 800, GROUND_Y = 300;" +
  "  var player = { x: 100, y: GROUND_Y, vx: 0, vy: 0, onGround: true };" +
  "  var leftPressed = false, rightPressed = false;" +
  "  var lost = false, starsCollected = 0;" +
  "  var stars = [ { x: 150, y: GROUND_Y, collected: false }, { x: 500, y: GROUND_Y, collected: false } ];" +
  "  var hazards = [ { x: 700, y: GROUND_Y } ];" +
  "  function tryJump() {" +
  "    if (player.onGround) { player.vy = JUMP_VELOCITY; player.onGround = false; }" +
  "  }" +
  "  function onKeyDown(e) {" +
  "    if (e.key === 'ArrowLeft' || e.code === 'KeyA') leftPressed = true;" +
  "    if (e.key === 'ArrowRight' || e.code === 'KeyD') rightPressed = true;" +
  "    if (e.key === 'ArrowUp' || e.code === 'Space' || e.key === ' ') tryJump();" +
  "  }" +
  "  function onKeyUp(e) {" +
  "    if (e.key === 'ArrowLeft' || e.code === 'KeyA') leftPressed = false;" +
  "    if (e.key === 'ArrowRight' || e.code === 'KeyD') rightPressed = false;" +
  "  }" +
  "  document.addEventListener('keydown', onKeyDown);" +
  "  document.addEventListener('keyup', onKeyUp);" +
  "  document.addEventListener('click', tryJump);" +
  "  document.addEventListener('touchstart', tryJump);" +
  "  function update(dt) {" +
  "    if (lost) return;" +
  "    var vx = 0;" +
  "    if (leftPressed) vx = -MOVE_SPEED;" +
  "    if (rightPressed) vx = MOVE_SPEED;" +
  "    player.vx = vx;" +
  "    player.x += player.vx * dt;" +
  "    if (player.x < 0) player.x = 0;" +
  "    if (player.x > WORLD_WIDTH) player.x = WORLD_WIDTH;" +
  "    player.vy += GRAVITY * dt;" +
  "    player.y += player.vy * dt;" +
  "    if (player.y >= GROUND_Y) { player.y = GROUND_Y; player.vy = 0; player.onGround = true; }" +
  "    stars.forEach(function (s) {" +
  "      if (!s.collected && Math.abs(s.x - player.x) < 20 && Math.abs(s.y - player.y) < 20) {" +
  "        s.collected = true; starsCollected++;" +
  "      }" +
  "    });" +
  "    hazards.forEach(function (h) {" +
  "      if (Math.abs(h.x - player.x) < 20 && Math.abs(h.y - player.y) < 20) lost = true;" +
  "    });" +
  "  }" +
  "  window.__test = {" +
  "    keydown: function (key, code) { onKeyDown({ key: key, code: code }); }," +
  "    keyup: function (key, code) { onKeyUp({ key: key, code: code }); }," +
  "    click: function () { tryJump(); }," +
  "    tick: function (dt) { update(dt); }," +
  "    state: function () {" +
  "      return { x: player.x, y: player.y, vx: player.vx, vy: player.vy, onGround: player.onGround, lost: lost, starsCollected: starsCollected };" +
  "    }," +
  "  };" +
  "})();";

function createFixture() {
  var eventStub = createEventStub();
  var sandbox = {
    document: eventStub,
    window: eventStub,
    console: console,
    Math: Math,
  };
  vm.createContext(sandbox);
  vm.runInContext(REFERENCE_PLATFORMER_SCRIPT, sandbox);
  return sandbox.window.__test;
}

var DT = 1 / 60; // 60fps frame delta, saniye cinsinden

// ================== 1) left input -> horizontal movement ==================
test("[behavior] ArrowLeft basılı tutulunca oyuncu SOLA hareket eder", function () {
  var t = createFixture();
  var startX = t.state().x;
  t.keydown("ArrowLeft");
  for (var i = 0; i < 10; i++) t.tick(DT);
  var state = t.state();
  assert.ok(state.x < startX, "x azalmalı (sola hareket): " + state.x + " < " + startX);
  assert.equal(state.vx < 0, true);
});

// ================== 2) right input -> horizontal movement ==================
test("[behavior] ArrowRight basılı tutulunca oyuncu SAĞA hareket eder", function () {
  var t = createFixture();
  var startX = t.state().x;
  t.keydown("ArrowRight");
  for (var i = 0; i < 10; i++) t.tick(DT);
  var state = t.state();
  assert.ok(state.x > startX, "x artmalı (sağa hareket): " + state.x + " > " + startX);
  assert.equal(state.vx > 0, true);
});

// A/D tuşları da (code tabanlı) aynı şekilde çalışmalı.
test("[behavior] KeyD (D tuşu) basılı tutulunca oyuncu SAĞA hareket eder", function () {
  var t = createFixture();
  var startX = t.state().x;
  t.keydown(undefined, "KeyD");
  for (var i = 0; i < 10; i++) t.tick(DT);
  assert.ok(t.state().x > startX);
});

test("[behavior] KeyA (A tuşu) basılı tutulunca oyuncu SOLA hareket eder", function () {
  var t = createFixture();
  var startX = t.state().x;
  t.keydown(undefined, "KeyA");
  for (var i = 0; i < 10; i++) t.tick(DT);
  assert.ok(t.state().x < startX);
});

// ================== 3) releasing input -> movement stops ==================
test("[behavior] tuş bırakılınca (keyup) yatay hareket UYGUN ŞEKİLDE durur", function () {
  var t = createFixture();
  t.keydown("ArrowRight");
  for (var i = 0; i < 10; i++) t.tick(DT);
  var xBeforeRelease = t.state().x;
  t.keyup("ArrowRight");
  t.tick(DT); // bırakıldıktan sonraki ilk frame
  var afterRelease = t.state();
  assert.equal(afterRelease.vx, 0, "keyup sonrası vx sıfırlanmalı");
  assert.ok(
    Math.abs(afterRelease.x - xBeforeRelease) < 0.001,
    "keyup sonrası x artık değişmemeli (ivme/hız uygun şekilde durdu)"
  );
});

// ================== 4) jump input still works ==================
test("[behavior] Space/ArrowUp ile zıplama HÂLÂ çalışıyor", function () {
  var t = createFixture();
  assert.equal(t.state().onGround, true);
  t.keydown("ArrowUp");
  var afterJump = t.state();
  assert.ok(afterJump.vy < 0, "zıplama sonrası vy negatif (yukarı) olmalı");
  assert.equal(afterJump.onGround, false);
});

test("[behavior] Space tuşuyla da zıplama çalışıyor", function () {
  var t = createFixture();
  t.keydown(undefined, "Space");
  assert.ok(t.state().vy < 0);
});

// ================== 5) click/tap jump still works ==================
test("[behavior] MEVCUT click/tap ile zıplama KALDIRILMAMIŞ, hâlâ çalışıyor", function () {
  var t = createFixture();
  assert.equal(t.state().onGround, true);
  t.click();
  var afterClick = t.state();
  assert.ok(afterClick.vy < 0, "click sonrası zıplama tetiklenmeli");
  assert.equal(afterClick.onGround, false);
});

// ================== 6) horizontal movement does not break gravity ==================
test("[behavior] yatay hareket + zıplama birlikte kullanılırken gravity BOZULMUYOR (yay çizip yere geri iniyor)", function () {
  var t = createFixture();
  t.keydown("ArrowRight");
  t.keydown("ArrowUp"); // zıplarken aynı anda sağa hareket
  var sawAirborne = false;
  for (var i = 0; i < 120; i++) {
    t.tick(DT);
    if (!t.state().onGround) sawAirborne = true;
  }
  var finalState = t.state();
  assert.equal(sawAirborne, true, "zıplama sırasında havada olmalıydı");
  assert.equal(finalState.onGround, true, "gravity onu geri yere indirmeli");
  assert.ok(Math.abs(finalState.y - 300) < 0.001, "yere indiğinde y=GROUND_Y olmalı");
  assert.ok(finalState.x > 100, "aynı zamanda sağa doğru da ilerlemiş olmalı");
});

// ================== 7) horizontal movement does not break star collection ==================
test("[behavior] sağa hareket ederek yıldıza ulaşmak HÂLÂ topluyor (collectible bozulmadı)", function () {
  var t = createFixture();
  t.keydown("ArrowRight");
  // star @ x=150, start x=100 -> 50px, MOVE_SPEED=200 => ~0.25s => 15 frame yeterli
  for (var i = 0; i < 20; i++) t.tick(DT);
  assert.equal(t.state().starsCollected, 1);
});

// ================== 8) horizontal movement does not break hazards ==================
test("[behavior] sağa hareket ederek engele çarpmak HÂLÂ kaybettiriyor (hazard bozulmadı)", function () {
  var t = createFixture();
  t.keydown("ArrowRight");
  // hazard @ x=700, start x=100 -> 600px, 200px/s => 3s => 180 frame
  for (var i = 0; i < 190; i++) t.tick(DT);
  assert.equal(t.state().lost, true);
});

// ================== bound check (ekstra, "makul sınırlar içinde kalmalı") ==================
test("[behavior] oyuncu dünya sınırlarının dışına çıkmıyor (WORLD_WIDTH ile clamp)", function () {
  var t = createFixture();
  t.keydown("ArrowRight");
  for (var i = 0; i < 600; i++) t.tick(DT); // çok uzun süre sağa bas
  assert.ok(t.state().x <= 800);
});
