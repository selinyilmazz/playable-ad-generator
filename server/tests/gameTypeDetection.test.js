/**
 * PHASE 3A tests — gameTypeDetection.js (deterministik, LLM-siz sınıflandırma).
 * Örnek promptlar, Phase 2'deki gerçek preset kartı promptlarından
 * (public/index.html) alınmıştır.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const { detectGameType, GAME_TYPE_KEYWORDS } = require("../services/gameTypeDetection");

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

test("scores nesnesi 8 kitin tamamı için sayı döndürüyor (ROUND 23: racing, ROUND 24: dungeon-rpg, ROUND 25: city+cooking eklendi)", function () {
  var result = detectGameType("forest jump platform game");
  assert.deepEqual(
    Object.keys(result.scores).sort(),
    [
      "endless-runner", "space-shooter", "forest-platformer", "fruit-puzzle",
      "racing", "dungeon-rpg", "city", "cooking",
    ].sort()
  );
});

test("ROUND 23: Racing preset-tarzı promptu -> racing", function () {
  var prompt =
    "Create a 5-second racing game. A player car speeds down a track, dodging traffic cars, " +
    "cones and oil slicks. Reaching the finish line wins.";
  var result = detectGameType(prompt);
  assert.equal(result.gameType, "racing");
  assert.ok(result.confidence > 0);
});

test("ROUND 24: Dungeon/RPG preset-tarzı promptu -> dungeon-rpg", function () {
  var prompt =
    "Create a 5-second dungeon crawler game. A knight explores a dark dungeon, avoiding monsters " +
    "and traps, collecting potions along the way.";
  var result = detectGameType(prompt);
  assert.equal(result.gameType, "dungeon-rpg");
  assert.ok(result.confidence > 0);
});

test("ROUND 24: 'RPG warrior knight mage' gibi görevin kendi örnek kelimeleri de dungeon-rpg'ye eşleşiyor", function () {
  var result = detectGameType("An RPG game with a warrior, a knight and a mage fighting monsters");
  assert.equal(result.gameType, "dungeon-rpg");
});

test("ROUND 25: City preset-tarzı promptu -> city", function () {
  var prompt =
    "Create a 5-second city driving game. A car moves through busy urban streets, dodging " +
    "traffic and construction barriers between buildings.";
  var result = detectGameType(prompt);
  assert.equal(result.gameType, "city");
  assert.ok(result.confidence > 0);
});

test("ROUND 25: Cooking preset-tarzı promptu -> cooking", function () {
  var prompt =
    "Create a 5-second cooking game. A chef in the kitchen collects the right ingredients " +
    "for a recipe and places them on a plate before time runs out.";
  var result = detectGameType(prompt);
  assert.equal(result.gameType, "cooking");
  assert.ok(result.confidence > 0);
});

test("ROUND 25: 'city' kitinin keyword listesi BİLEREK 'car'/'cars'/'araba' İÇERMİYOR — racing'in kendi keyword'leriyle çakışıp tie/null'a düşmesin diye", function () {
  assert.equal(GAME_TYPE_KEYWORDS.city.indexOf("car"), -1);
  assert.equal(GAME_TYPE_KEYWORDS.city.indexOf("cars"), -1);
  assert.equal(GAME_TYPE_KEYWORDS.city.indexOf("araba"), -1);
});

test("ROUND 25: sade 'a car racing game' promptu hâlâ net biçimde racing'e düşüyor (city ile tie OLMUYOR)", function () {
  var result = detectGameType("A car racing game with a finish line");
  assert.equal(result.gameType, "racing");
});
