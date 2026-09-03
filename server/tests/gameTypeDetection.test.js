/**
 * PHASE 3A tests — gameTypeDetection.js (deterministik, LLM-siz sınıflandırma).
 * Örnek promptlar, Phase 2'deki gerçek preset kartı promptlarından
 * (public/index.html) alınmıştır.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const { detectGameType } = require("../services/gameTypeDetection");

test("City Runner preset promptu -> endless-runner", function () {
  var prompt =
    "Create a 5-second endless runner game set in a city-like environment. A hero runs " +
    "automatically and the player taps to jump over barriers in the way. Collecting coins " +
    "increases the score.";
  var result = detectGameType(prompt);
  assert.equal(result.gameType, "endless-runner");
  assert.ok(result.confidence > 0);
});

test("Space Shooter preset promptu -> space-shooter", function () {
  var prompt =
    "Create a 5-second space shooter game. A small spaceship sits at the bottom of the screen " +
    "and asteroids drift down from the top. Tapping an asteroid destroys it.";
  var result = detectGameType(prompt);
  assert.equal(result.gameType, "space-shooter");
});

test("Forest Jump preset promptu -> forest-platformer", function () {
  var prompt =
    "Create a 5-second platform jumping game set in a forest. A character jumps across a " +
    "series of platforms. Tapping makes the character jump to the next platform.";
  var result = detectGameType(prompt);
  assert.equal(result.gameType, "forest-platformer");
});

test("Fruit Puzzle preset promptu -> fruit-puzzle", function () {
  var prompt =
    "Create a 5-second fruit matching game. Show several colorful fruits on screen and " +
    "briefly highlight the target fruit. Tapping the correct fruit increases the score.";
  var result = detectGameType(prompt);
  assert.equal(result.gameType, "fruit-puzzle");
});

test("İlgisiz/genel bir prompt -> gameType null (tahmin yapılmıyor)", function () {
  var prompt = "Make a fun little game about numbers and colors.";
  var result = detectGameType(prompt);
  assert.equal(result.gameType, null);
  assert.equal(result.confidence, 0);
});

test("boş prompt -> gameType null, hata fırlatmıyor", function () {
  var result = detectGameType("");
  assert.equal(result.gameType, null);
});

test("büyük/küçük harf duyarsız çalışıyor", function () {
  var result = detectGameType("SPACE SHOOTER WITH ASTEROIDS");
  assert.equal(result.gameType, "space-shooter");
});

test("scores nesnesi 4 kitin tamamı için sayı döndürüyor", function () {
  var result = detectGameType("forest jump platform game");
  assert.deepEqual(
    Object.keys(result.scores).sort(),
    ["endless-runner", "space-shooter", "forest-platformer", "fruit-puzzle"].sort()
  );
});
