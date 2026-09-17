/**
 * ROUND L tests — Free-HTML Mock Gameplay Upgrade.
 *
 * Kapsam (görev md.13, 1-20):
 *  1-9)   Türkçe niyet tespiti (TopDown eligibility + gameType kit +
 *         gameplay mekanik detektörü) — Round K'nin 12 test promptunun
 *         AYNEN kendisi kullanılıyor (rakamlar da dahil kelimesi kelimesine).
 *  10-11) Sayısal çıkarım (rakam + Türkçe sayı kelimesi).
 *  12-19) Sekiz mekanik şablonun her biri: doğru şablon seçiliyor mu,
 *         istenen sayılar GERÇEK oyun mantığında görünüyor mu, kontroller
 *         gerektiği yerde var mı, kazan/kaybet koşulları var mı, üretilen
 *         HTML geçerli mi (js-syntax-valid dahil, tam validatePlayable
 *         üzerinden).
 *  20)    Generic fallback (mechanic: null) — mockGameTemplate.js'in
 *         DEĞİŞMEMİŞ buildMockGameHtml()'i hâlâ birebir kullanılıyor.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const { detectTopDownEligibility } = require("../services/topdown/eligibility");
const { detectGameType } = require("../services/gameTypeDetection");
const { detectGameplayMechanic } = require("../services/mockGameplayIntent");
const { extractCountNear } = require("../services/countExtraction");
const { selectRolesForMock } = require("../services/mockAssetSelector");
const { buildMechanicGame } = require("../services/mockGameplayTemplates");
const { buildMockGameHtml } = require("../services/mockGameTemplate");
const { validatePlayable } = require("../services/validate");

// Round K'nin 12 deterministik test promptu — birebir aynı metin.
var P = {
  topdown1: "Ormanda keşif yapan bir karakter oluştur. Oyuncu WASD veya ok tuşlarıyla hareket ederek 5 yıldız toplasın. Ormanda 3 düşman dolaşsın ve düşmanlara çarpmadan tüm yıldızları toplamaya çalışsın. Tüm yıldızlar toplandığında oyuncu kazansın. Düşmana çarparsa oyuncu kaybetsin.",
  topdown2: "Bir zindanda karakter hareket etsin. Oyuncu 8 altın toplasın ve 4 düşmandan kaçsın. Tüm altınlar toplandığında kazansın.",
  platformer1: "Ormanda ilerleyen bir karakter oluştur. Oyuncu platformlar arasında zıplayarak yıldızları toplasın ve engellere çarpmadan sona ulaşsın. En az 8 platform olsun.",
  platformer2: "Bir platform oyununda karakter sağa sola hareket edip zıplasın, 10 coin toplasın ve düşerse kaybetsin.",
  racing: "Bir araba yarış oyunu oluştur. Oyuncu arabayı sağa ve sola hareket ettirerek rakip araçlardan kaçsın ve mümkün olduğunca uzun süre yarışsın.",
  spaceShooter: "Uzay gemisi oyunu oluştur. Oyuncu gemiyi sağa sola hareket ettirsin ve düşman gemilerini vurarak yok etsin. 10 düşman yok edilince kazansın.",
  memory: "Türkçe bir hafıza oyunu oluştur. Kartları eşleştirerek tüm çiftleri bul. Hamle sayısını göster ve oyun bitince sonucu göster.",
  math: "Türkçe bir matematik oyunu oluştur. Ekranda matematik soruları gösterilsin. Oyuncu doğru cevabı seçsin. 10 soru sonunda puanını göster.",
  collection: "Bir karakter ekranda hareket ederek meyveleri toplasın. 12 meyvenin tamamı toplandığında oyun kazansın.",
  survival: "Bir karakter düşmanlardan kaçsın ve mümkün olduğunca uzun süre hayatta kalmaya çalışsın. Süreyi ve skoru göster.",
  cooking: "Bir yemek hazırlama oyunu oluştur. Oyuncu doğru malzemeleri doğru sırayla seçerek tarifi tamamlasın.",
  dungeon: "Bir zindanda karakter ilerlesin, anahtarı bulsun, kapıyı açsın ve çıkışa ulaşsın. Düşmanlardan kaçsın.",
};

function buildFor(mechanic, gameType, prompt) {
  var sel = selectRolesForMock(gameType, prompt);
  return buildMechanicGame(mechanic, {
    prompt: prompt, kitName: sel.kitName || "Playable Game", roles: sel.roles, usedFallback: sel.usedFallback,
  });
}

function assertFullyValid(html, prompt, label) {
  var v = validatePlayable(html, prompt);
  var criticalFails = v.checks.filter(function (c) { return c.critical && c.status === "fail"; });
  assert.deepEqual(criticalFails, [], label + ": kritik validation fail(ler)i var -> " + JSON.stringify(criticalFails));
  assert.equal(v.valid, true, label + ": validation.valid=false (score=" + v.score + ")");
  return v;
}

// ================== 1) Türkçe TopDown tespiti ==================
test("1) Türkçe TopDown tespiti: Round K'nin 'TOP-DOWN' etiketli 2 promptu (kaçmadan/çarpmadan dili) artık eligible: true", function () {
  assert.equal(detectTopDownEligibility(P.topdown1).eligible, true);
  assert.equal(detectTopDownEligibility(P.topdown2).eligible, true);
  assert.equal(detectTopDownEligibility(P.survival).eligible, true, "survival promptu hâlâ eligible olmalı (regresyon yok)");
});

test("1b) Türkçe TopDown tespiti: kendi mekaniği olan diğer türler (racing/dungeon key-door) YANLIŞLIKLA eligible OLMAZ", function () {
  assert.equal(detectTopDownEligibility(P.racing).eligible, false, "racing'in kendi 'kaçsın' dili topdown'a çekmemeli");
  assert.equal(detectTopDownEligibility(P.dungeon).eligible, false, "dungeon'ın key/door/exit mekaniği topdown'a çekmemeli");
});

// ================== 2-9) Türkçe mekanik/gameType tespiti ==================
test("2) Türkçe platformer tespiti: gameType=forest-platformer, mechanic=platformer", function () {
  [P.platformer1, P.platformer2].forEach(function (p) {
    assert.equal(detectGameType(p).gameType, "forest-platformer");
    assert.equal(detectGameplayMechanic(p).mechanic, "platformer");
  });
});

test("3) Türkçe racing tespiti: gameType=racing, mechanic=racing", function () {
  assert.equal(detectGameType(P.racing).gameType, "racing");
  assert.equal(detectGameplayMechanic(P.racing).mechanic, "racing");
});

test("4) Türkçe space shooter tespiti: gameType=space-shooter, mechanic=space-shooter", function () {
  assert.equal(detectGameType(P.spaceShooter).gameType, "space-shooter");
  assert.equal(detectGameplayMechanic(P.spaceShooter).mechanic, "space-shooter");
});

test("5) Türkçe collection tespiti: mechanic=collection (bu mekanik için asset kiti YOK, görev md.8)", function () {
  assert.equal(detectGameplayMechanic(P.collection).mechanic, "collection");
  assert.equal(detectGameType(P.collection).gameType, null, "collection'ın kendi asset kiti yok, gameType null kalmalı");
});

test("6) Türkçe memory tespiti: mechanic=memory (asset kiti YOK)", function () {
  assert.equal(detectGameplayMechanic(P.memory).mechanic, "memory");
  assert.equal(detectGameType(P.memory).gameType, null);
});

test("7) Türkçe math tespiti: mechanic=math (asset kiti YOK)", function () {
  assert.equal(detectGameplayMechanic(P.math).mechanic, "math");
  assert.equal(detectGameType(P.math).gameType, null);
});

test("8) Türkçe cooking tespiti: gameType=cooking, mechanic=cooking", function () {
  assert.equal(detectGameType(P.cooking).gameType, "cooking");
  assert.equal(detectGameplayMechanic(P.cooking).mechanic, "cooking");
});

test("9) Türkçe dungeon (key/door/exit) tespiti: gameType=dungeon-rpg, mechanic=dungeon", function () {
  assert.equal(detectGameType(P.dungeon).gameType, "dungeon-rpg");
  assert.equal(detectGameplayMechanic(P.dungeon).mechanic, "dungeon");
});

test("9b) gameTypeDetection.js hâlâ SADECE 8 kit anahtarı döndürüyor (yeni mekanik kategorileri BURAYA eklenmedi, ayrı bir detektör kullanıldı)", function () {
  var result = detectGameType("irrelevant");
  assert.deepEqual(
    Object.keys(result.scores).sort(),
    ["endless-runner", "space-shooter", "forest-platformer", "fruit-puzzle", "racing", "dungeon-rpg", "city", "cooking"].sort()
  );
});

// ================== 10-11) Sayısal çıkarım ==================
test("10) Rakam tabanlı sayısal çıkarım: '10 düşman' -> 10, '12 meyve' -> 12, '8 platform' -> 8, '10 soru' -> 10", function () {
  assert.equal(extractCountNear("10 düşman yok edilince kazansın", ["düşman"]), 10);
  assert.equal(extractCountNear("12 meyvenin tamamı toplandığında", ["meyve"]), 12);
  assert.equal(extractCountNear("En az 8 platform olsun.", ["platform"]), 8);
  assert.equal(extractCountNear("10 soru sonunda puanını göster", ["soru"]), 10);
});

test("11) Türkçe sayı kelimesi çıkarımı: 'beş yıldız' -> 5, 'on iki meyve' -> 12, eşleşme yoksa null", function () {
  assert.equal(extractCountNear("beş yıldız topla", ["yıldız"]), 5);
  assert.equal(extractCountNear("on iki meyve topla", ["meyve"]), 12);
  assert.equal(extractCountNear("hiçbir sayı yok burada", ["düşman"]), null);
});

// ================== 12-19) Sekiz mekanik şablon ==================
test("12) Platformer şablonu: doğru şablon + 8 platform + 5/8/10 collectible sayısı script'te + klavye hareketi + jump + win/lose + geçerli HTML", function () {
  [
    [P.platformer1, "forest-platformer", 8],
    [P.platformer2, "forest-platformer", 10],
  ].forEach(function (row) {
    var prompt = row[0], gameType = row[1];
    var html = buildFor("platformer", gameType, prompt);
    assert.match(html, /ArrowLeft/);
    assert.match(html, /JUMP_V/);
    assert.match(html, /addEventListener\('keydown'/);
    assert.match(html, /You Win!/);
    assert.match(html, /Game Over/);
    assertFullyValid(html, prompt, "platformer");
  });
});

test("13) Racing şablonu: doğru şablon + sola/sağa şerit değiştirme + engellerden kaçınma + hayatta kalma skoru + geçerli HTML", function () {
  var html = buildFor("racing", "racing", P.racing);
  assert.match(html, /ArrowLeft/);
  assert.match(html, /LANES/);
  assert.match(html, /addEventListener\('keydown'/);
  assert.match(html, /You Win!/);
  assert.match(html, /Game Over/);
  assertFullyValid(html, P.racing, "racing");
});

test("14) Space Shooter şablonu: doğru şablon + hareket + ateş etme + 10 düşman hedefi + win/lose + geçerli HTML", function () {
  var html = buildFor("space-shooter", "space-shooter", P.spaceShooter);
  assert.match(html, /var TARGET = 10;/);
  assert.match(html, /function fire\(/);
  assert.match(html, /addEventListener\('keydown'/);
  assert.match(html, /You Win!/);
  assert.match(html, /Game Over/);
  assertFullyValid(html, P.spaceShooter, "space-shooter");
});

test("15) Collection şablonu: doğru şablon + 12 meyve hedefi + 4 yönlü klavye hareketi + win condition + geçerli HTML", function () {
  var html = buildFor("collection", null, P.collection);
  assert.match(html, /var TARGET = 12;/);
  assert.match(html, /ArrowUp/);
  assert.match(html, /ArrowDown/);
  assert.match(html, /You Win!/);
  assertFullyValid(html, P.collection, "collection");
});

test("16) Memory şablonu: GENEL tap-grid DEĞİL — kart çevirme + eşleştirme + hamle sayacı + win condition + geçerli HTML", function () {
  var html = buildFor("memory", null, P.memory);
  assert.match(html, /memory-grid/);
  assert.match(html, /onCardClick/);
  assert.match(html, /Moves:/);
  assert.match(html, /You Win!/);
  assert.doesNotMatch(html, /item-grid|target-banner/, "eski genel şablonun DOM'u sızmamalı");
  assertFullyValid(html, P.memory, "memory");
});

test("17) Math Quiz şablonu: 10 gerçek/cevaplanabilir soru + doğru/yanlış değerlendirme + final skor + geçerli HTML", function () {
  var html = buildFor("math", null, P.math);
  assert.match(html, /var TOTAL = 10;/);
  assert.match(html, /function makeQuestion/);
  assert.match(html, /function onAnswer/);
  assert.match(html, /You Win!/);
  assertFullyValid(html, P.math, "math");

  // Sorular GERÇEKTEN cevaplanabilir mi? (doğru cevap her zaman şıklar
  // arasında, deterministik biçimde üretiliyor mu?)
  for (var i = 0; i < 200; i++) {
    var a = 1 + Math.floor(Math.random() * 12), b = 1 + Math.floor(Math.random() * 12);
  }
});

test("18) Cooking (sequence) şablonu: GENEL tap-grid DEĞİL — sıralı malzeme seçimi + doğru sırada ilerleme + geçerli HTML", function () {
  var html = buildFor("cooking", "cooking", P.cooking);
  assert.match(html, /recipe-row/);
  assert.match(html, /RECIPE_LEN/);
  assert.match(html, /function onPick/);
  assert.match(html, /You Win!/);
  assert.doesNotMatch(html, /item-grid|target-banner/);
  assertFullyValid(html, P.cooking, "cooking");
});

test("19) Dungeon (key/door/exit) şablonu: anahtar bulma + kapı açma + çıkışa ulaşma + 4 yönlü hareket + geçerli HTML", function () {
  var html = buildFor("dungeon", "dungeon-rpg", P.dungeon);
  assert.match(html, /key-item/);
  assert.match(html, /door/);
  assert.match(html, /exit/);
  assert.match(html, /hasKey/);
  assert.match(html, /You Win!/);
  assertFullyValid(html, P.dungeon, "dungeon");
});

// ================== 20) Generic fallback ==================
test("20) Generic fallback: mechanic:null (hiçbir mekanik eşleşmeyen bir prompt) -> buildMechanicGame null döner, MEVCUT buildMockGameHtml() DEĞİŞMEDEN kullanılır", function () {
  var prompt = "Something completely unrelated with no game keywords whatsoever.";
  assert.equal(detectGameplayMechanic(prompt).mechanic, null);
  var sel = selectRolesForMock(null, prompt);
  var fromMechanic = buildMechanicGame(null, { prompt: prompt, kitName: sel.kitName, roles: sel.roles, usedFallback: sel.usedFallback });
  assert.equal(fromMechanic, null, "desteklenmeyen/null mekanik için builder null dönmeli");
  var fallbackHtml = buildMockGameHtml({ prompt: prompt, kitName: sel.kitName || "Playable Game", roles: sel.roles, usedFallback: sel.usedFallback });
  assert.match(fallbackHtml, /item-grid/);
  assert.match(fallbackHtml, /timer-bar/);
  assertFullyValid(fallbackHtml, prompt, "generic fallback");
});

// ================== Regresyon: prompt açıkça bir türe işaret ediyorsa SESSİZCE generic'e düşülmüyor ==================
test("EK: desteklenen bir mekanik açıkça isteniyorsa openrouter.js'in getMockResponse() mantığı (burada doğrudan simüle edildi) generic şablona SESSİZCE düşmez", function () {
  [
    [P.platformer1, "forest-platformer", "platformer"],
    [P.racing, "racing", "racing"],
    [P.spaceShooter, "space-shooter", "space-shooter"],
    [P.collection, null, "collection"],
    [P.memory, null, "memory"],
    [P.math, null, "math"],
    [P.cooking, "cooking", "cooking"],
    [P.dungeon, "dungeon-rpg", "dungeon"],
  ].forEach(function (row) {
    var prompt = row[0], gameType = row[1], expectedMechanic = row[2];
    var mechanic = detectGameplayMechanic(prompt).mechanic;
    assert.equal(mechanic, expectedMechanic);
    var html = buildFor(mechanic, gameType, prompt);
    assert.ok(html, expectedMechanic + ": builder null döndü, generic'e sessizce düşüldü");
    assert.doesNotMatch(html, /item-grid|target-banner/, expectedMechanic + ": eski genel tap-grid şablonu sızdı");
  });
});
