/**
 * ROUND N tests — Gameplay Control & Interaction Quality.
 *
 * Kapsam (görev md.18 — "Yeni regression testleri ekle"): dungeon movement
 * distance, dungeon wall collision, collection four-direction movement,
 * collection reachable collectibles, racing steering, cooking state
 * progression, memory interaction, math progression, shooter fire/movement
 * (off-screen-death düzeltmesi dahil), platformer regression, TopDown
 * regression, stuck-key (blur/visibilitychange) mimarisi.
 *
 * NOT: 390px responsive ve gerçek klavye-event/RAF davranışı (dt bağımlılığı,
 * gerçek win/lose akışı) bu dosyada DEĞİL — mevcut proje kuralı gereği (bkz.
 * modelCatalogByok.test.js'in üstündeki not) bunlar ayrı, canlı bir Playwright
 * smoke script'inde doğrulanıyor (bu turda: /tmp/qa/*.js, sonuçlar final
 * raporda özetleniyor). Burada, mevcut test dosyalarıyla (gameplayUpgrade.
 * test.js) AYNI YÖNTEMLE, üretilen HTML/script METNİ üzerinde YAPISAL
 * assertion'lar yapılıyor — bu, "hiçbir yeni dependency/browser gerekmeden"
 * npm test içinde %100 deterministik şekilde çalışabilmesini sağlıyor.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const { selectRolesForMock } = require("../services/mockAssetSelector");
const { buildMechanicGame } = require("../services/mockGameplayTemplates");
const { validatePlayable } = require("../services/validate");
const { detectGameType } = require("../services/gameTypeDetection");
const { detectTopDownEligibility } = require("../services/topdown/eligibility");

// Round N görev metninin KENDİ 9 test-matrisi promptu — birebir aynı metin.
var MATRIX = {
  platformer: "Ormanda ilerleyen bir karakter oluştur. Oyuncu platformlar arasında zıplayarak 10 yıldızı toplasın ve engellere çarpmadan sona ulaşsın. Oyuncu düşerse kaybetsin.",
  racing: "Bir yarış oyunu oluştur. Oyuncu arabayı sağa ve sola hareket ettirerek diğer araçlara çarpmadan ilerlesin. Engellerden kaçsın, puan kazansın ve 30 saniye hayatta kalmaya çalışsın.",
  spaceShooter: "Bir uzay gemisi oyunu oluştur. Oyuncu sağa ve sola hareket ederek düşman uzay gemilerine ateş etsin. 10 düşmanı yok edince kazansın. Düşmanlara çarparsa kaybetsin.",
  collection: "Bir karakter oluştur. Oyuncu haritada hareket ederek 12 meyveyi toplasın. Tüm meyveleri topladığında kazansın.",
  memory: "Türkçe bir hafıza oyunu oluştur. Kartları açarak eşleşen çiftleri bul. Tüm çiftleri doğru şekilde eşleştirince oyunu kazan.",
  math: "Türkçe bir matematik oyunu oluştur. Oyuncuya 10 tane toplama ve çıkarma sorusu sor. Her soruda cevap seçenekleri olsun. Doğru cevapları seçerek puan kazanılsın ve 10 soru sonunda sonuç gösterilsin.",
  cooking: "Bir yemek yapma oyunu oluştur. Oyuncu malzemeleri doğru sırayla seçerek 3 farklı tarifi tamamlasın. Yanlış malzeme seçerse hata göstersin. Tüm tarifleri tamamlayınca kazansın.",
  dungeon: "Bir zindan oyunu oluştur. Oyuncu karakteri WASD veya ok tuşlarıyla hareket ettirsin. Bir anahtar bulsun, kapıyı açsın ve çıkışa ulaşsın. Düşmanlara çarparsa kaybetsin.",
  survival: "Zombilerden kaçan bir karakter oluştur. Oyuncu WASD ile hareket etsin. 30 saniye hayatta kalırsa kazansın, zombiye yakalanırsa kaybetsin.",
};

function buildFor(mechanic, prompt) {
  var gameType = detectGameType(prompt).gameType;
  var sel = selectRolesForMock(gameType, prompt);
  return buildMechanicGame(mechanic, {
    prompt: prompt, kitName: sel.kitName || "Playable Game", roles: sel.roles, usedFallback: sel.usedFallback,
  });
}

function assertNoCriticalFail(html, prompt, label) {
  var v = validatePlayable(html, prompt);
  var criticalFails = v.checks.filter(function (c) { return c.critical && c.status === "fail"; });
  assert.deepEqual(criticalFails, [], label + ": kritik validation fail(ler)i var -> " + JSON.stringify(criticalFails));
  return v;
}

// ================== STUCK-KEY MİMARİSİ (görev md.11, tüm mekanikler ortak) ==================
test("RN-1) sharedRuntimeScript: blur/visibilitychange stuck-key temizleme TÜM mekaniklerde mevcut", function () {
  ["dungeon", "collection", "racing", "space-shooter", "cooking", "platformer", "memory", "math"].forEach(function (mech) {
    var key = mech === "space-shooter" ? "spaceShooter" : mech;
    var html = buildFor(mech, MATRIX[key]);
    assert.match(html, /function resetKeys\(\)/, mech + ": resetKeys() eksik");
    assert.match(html, /addEventListener\('blur', resetKeys\)/, mech + ": blur listener eksik");
    assert.match(html, /visibilitychange/, mech + ": visibilitychange listener eksik");
  });
});

// ================== DUNGEON — HASSAS HAREKET + DUVAR ÇARPIŞMASI ==================
test("RN-2) Dungeon: dt-bağımlı, keydown/keyup state-tabanlı, WASD+Arrow hareket (tek keypress sonsuz hareket ETTİRMEZ)", function () {
  var html = buildFor("dungeon", MATRIX.dungeon);
  assert.match(html, /keys\['ArrowRight'\] \|\| keys\['d'\] \|\| keys\['D'\]/);
  assert.match(html, /keys\['ArrowUp'\] \|\| keys\['w'\] \|\| keys\['W'\]/);
  assert.match(html, /var speed = 40;/);
  assert.match(html, /state\.x \+ dx \* speed \* dt/, "hareket dt ile ölçeklenmiyor (frame-rate bağımsız değil)");
  // keydown SADECE state='true' yapar, sürekli/recursive hareket üretmez —
  // setInterval veya keydown-içi doğrudan konum değişimi YOK.
  assert.doesNotMatch(html, /setInterval/);
  assert.doesNotMatch(html, /keydown['"],\s*function[^}]*state\.x\s*\+=/s);
});

test("RN-3) Dungeon: diagonal hareket normalize ediliyor (0.7071 çarpanı) — çapraz hareket tek yönlüden ~1.41x hızlı OLMAZ", function () {
  var html = buildFor("dungeon", MATRIX.dungeon);
  assert.match(html, /if \(dx !== 0 && dy !== 0\) \{ dx \*= 0\.7071; dy \*= 0\.7071; \}/);
});

test("RN-4) Dungeon: gerçek duvar/koridor çarpışması hareket çözümünün PARÇASI (WALLS + hitsWall + eksen-ayrık uygulama)", function () {
  var html = buildFor("dungeon", MATRIX.dungeon);
  assert.match(html, /var WALLS = \[/);
  assert.match(html, /function hitsWall\(x, y\)/);
  // Eksen-ayrık çözüm: x ve y AYRI AYRI duvar kontrolünden geçiyor.
  assert.match(html, /if \(!hitsWall\(nx, state\.y\)\) state\.x = nx;/);
  assert.match(html, /if \(!hitsWall\(state\.x, ny\)\) state\.y = ny;/);
  // Duvarlar gerçekten render ediliyor (görünür, sadece mantıksal değil).
  assert.match(html, /class="wall"/);
});

test("RN-5) Dungeon: key -> door -> exit state akışı deterministik ve gerçek konuma bağlı", function () {
  var html = buildFor("dungeon", MATRIX.dungeon);
  assert.match(html, /state\.hasKey = true/);
  assert.match(html, /doorEl\.classList\.add\('open'\)/);
  assert.match(html, /state\.hasKey && Math\.abs\(state\.x - EXIT_POS\.x\)/, "exit'e ulaşmak İÇİN anahtar şartı state üzerinden kontrol edilmiyor");
});

// ================== COLLECTION — GERÇEK 4 YÖN HAREKET ==================
test("RN-6) Collection: gerçek 4-yönlü hareket (Up/Down/Left/Right hepsi ayrı ayrı kontrol ediliyor), dt-bağımlı", function () {
  var html = buildFor("collection", MATRIX.collection);
  assert.match(html, /keys\['ArrowUp'\] \|\| keys\['w'\] \|\| keys\['W'\]/);
  assert.match(html, /keys\['ArrowDown'\] \|\| keys\['s'\] \|\| keys\['S'\]/);
  assert.match(html, /keys\['ArrowLeft'\] \|\| keys\['a'\] \|\| keys\['A'\]/);
  assert.match(html, /keys\['ArrowRight'\] \|\| keys\['d'\] \|\| keys\['D'\]/);
  assert.match(html, /state\.x = Math\.max\(3, Math\.min\(97, state\.x \+ dx \* 42 \* dt\)\)/);
  assert.match(html, /state\.y = Math\.max\(6, Math\.min\(94, state\.y \+ dy \* 42 \* dt\)\)/);
});

test("RN-7) Collection: diagonal hareket normalize ediliyor + collision GERÇEK world-position üzerinden (collectible/hazard)", function () {
  var html = buildFor("collection", MATRIX.collection);
  assert.match(html, /if \(dx !== 0 && dy !== 0\) \{ dx \*= 0\.7071; dy \*= 0\.7071; \}/);
  assert.match(html, /Math\.abs\(c\.x - state\.x\) < 7 && Math\.abs\(c\.y - state\.y\) < 7/, "collectible çarpışması state.x/state.y (gerçek konum) üzerinden değil");
  assert.match(html, /var TARGET = 12;/, "prompt'taki 12 meyve sayısı script'e yansımıyor");
});

test("RN-8) Collection: collectible'lar dünya sınırları İÇİNDE, erişilebilir pozisyonlarda üretiliyor", function () {
  var html = buildFor("collection", MATRIX.collection);
  var m = html.match(/var COLLECT = (\[.*?\]);/);
  assert.ok(m, "COLLECT dizisi script'te bulunamadı");
  var collect = JSON.parse(m[1]);
  assert.equal(collect.length, 12);
  collect.forEach(function (c, i) {
    assert.ok(c.x >= 8 && c.x <= 92, "collectible " + i + " x=" + c.x + " erişilemez bir konumda");
    assert.ok(c.y >= 14 && c.y <= 84, "collectible " + i + " y=" + c.y + " erişilemez bir konumda");
  });
});

// ================== RACING — RACING'E ÖZEL CONTROLLER ==================
test("RN-9) Racing: generic character movement DEĞİL — lane-based steering (LANES + debounced turning)", function () {
  var html = buildFor("racing", MATRIX.racing);
  assert.match(html, /var LANES = \[18,50,82\];/);
  // Tek keypress'in aracı sürekli/kontrolsüz kaydırmaması için 'turning'
  // debounce'u: tuş bırakılana kadar lane bir daha DEĞİŞMEZ.
  assert.match(html, /if \(\(left \|\| right\) && !state\.turning\)/);
  assert.match(html, /if \(!left && !right\) state\.turning = false;/);
  // Lane'e geçiş dt-bağımlı, ani bir "teleport" değil (lerp).
  assert.match(html, /state\.x \+= \(LANES\[state\.lane\] - state\.x\) \* Math\.min\(1, dt \* 8\)/);
});

test("RN-10) Racing: gerçek obstacle collision + score/distance/timer state'e bağlı + açık win/lose", function () {
  var html = buildFor("racing", MATRIX.racing);
  assert.match(html, /Math\.abs\(o\.x - state\.x\) < 10 && Math\.abs\(o\.y - 80\) < 8/, "collision gerçek x/y toleransı üzerinden değil");
  assert.match(html, /state\.elapsed \+= dt;/, "timer dt-tabanlı değil");
  assert.match(html, /state\.elapsed >= SURVIVE_SECONDS.*endGame\(true/, "win koşulu state.elapsed'e bağlı değil");
  assert.match(html, /endGame\(false, 'Survived ' \+ Math\.round\(state\.elapsed\)/, "lose koşulu açık feedback vermiyor");
});

test("RN-10b) [FINAL SMALL FIX] Racing: promptun kendi hedef süresi (\"30 saniye\") win threshold'a bağlanıyor; belirtilmeyen promptlarda mevcut varsayılan (45s) KORUNUYOR", function () {
  // MATRIX.racing "...30 saniye hayatta kalmaya çalışsın" diyor -> gerçek
  // WIN, 45 değil 30 saniyede tetiklenmeli (görevin talebi).
  var htmlTimed = buildFor("racing", MATRIX.racing);
  assert.match(htmlTimed, /var SURVIVE_SECONDS = 30;/, "prompt'taki '30 saniye' win threshold'a yansımıyor");
  assert.doesNotMatch(htmlTimed, /var SURVIVE_SECONDS = 45;/);

  // Süre belirtmeyen bir racing promptu -> hardcode 30 VARSAYILMIYOR,
  // mevcut orijinal varsayılan (45s) regresyon olmadan korunuyor.
  var untimedPrompt = "Bir araba yarış oyunu oluştur. Oyuncu arabayı sağa ve sola hareket ettirerek rakip araçlardan kaçsın ve mümkün olduğunca uzun süre yarışsın.";
  var htmlDefault = buildFor("racing", untimedPrompt);
  assert.match(htmlDefault, /var SURVIVE_SECONDS = 45;/, "süre belirtilmeyen prompt'ta varsayılan (45s) değişmiş");

  // Steering/collision/score mimarisi bu değişiklikten ETKİLENMEDİ.
  assert.match(htmlTimed, /if \(\(left \|\| right\) && !state\.turning\)/);
  assert.match(htmlTimed, /Math\.abs\(o\.x - state\.x\) < 10/);
});

// ================== COOKING — GÖREV NET ==================
test("RN-11) Cooking: WASD movement EKLENMEDİ (pointer/choice-based kaldı) + açık 'Step X / Y' görev göstergesi state'e bağlı", function () {
  var html = buildFor("cooking", MATRIX.cooking);
  // sharedRuntimeScript HER mekaniğe ortak keys{}/keydown listener'ı VE
  // genel keyDown() yardımcı fonksiyonunu ekliyor (kullanılmasa da zararsız,
  // görev md.11'in TEK PAYLAŞILAN mimarisi) — asıl kontrol edilmesi gereken,
  // cooking'in per-frame bir hareket DÖNGÜSÜ (startLoop/update) hiç
  // KURMAMASI: pointer/choice-based kaldığının gerçek kanıtı budur.
  assert.doesNotMatch(html, /startLoop\(update\)/, "cooking'e gereksiz per-frame hareket döngüsü eklenmiş");
  assert.match(html, /id="cook-task"/);
  assert.match(html, /function updateTaskLabel\(\)/);
  assert.match(html, /'Step ' \+ \(state\.step \+ 1\) \+ ' \/ ' \+ state\.recipe\.length/);
});

test("RN-12) Cooking: yanlış malzeme seçiminde ANINDA feedback + doğru sırayla ilerleme + tarif tamamlama akışı gerçek", function () {
  var html = buildFor("cooking", MATRIX.cooking);
  assert.match(html, /'Wrong ingredient — try again/);
  assert.match(html, /btn\.classList\.add\('wrong'\)/);
  assert.match(html, /if \(path === state\.recipe\[state\.step\]\)/, "doğru malzeme kontrolü state'ten değil");
  assert.match(html, /if \(state\.round >= RECIPE_COUNT\) \{ endGame\(true,/);
});

// ================== SPACE SHOOTER — HAKSIZ CAN KAYBI DÜZELTMESİ ==================
test("RN-13) Space Shooter: ekrandan ÇIKAN (kaçırılan) düşman can kaybettirmiyor — SADECE gerçek çarpışma can kaybettiriyor", function () {
  var html = buildFor("space-shooter", MATRIX.spaceShooter);
  // Ekrandan çıkma bloğu can azaltmadan ÖNCE ve AYRI kontrol ediliyor.
  var offscreenBlock = html.match(/if \(e\.y > 100\) \{[\s\S]*?return false;\s*\}/);
  assert.ok(offscreenBlock, "off-screen temizleme bloğu bulunamadı");
  assert.doesNotMatch(offscreenBlock[0], /state\.lives/, "ekrandan çıkan düşman hâlâ can kaybettiriyor (Round N düzeltmesi yok)");
  assert.match(html, /Math\.abs\(e\.x - state\.px\) < 9 && e\.y > 78\) \{[\s\S]*?state\.lives -= 1/);
});

test("RN-14) Space Shooter: hareket + ateş input state ayrı, fire spam cooldown ile kontrollü, 10/10 düşman gerçekten win koşulu", function () {
  var html = buildFor("space-shooter", MATRIX.spaceShooter);
  assert.match(html, /var TARGET = 10;/);
  assert.match(html, /state\.fireTimer -= dt;/);
  assert.match(html, /state\.fireTimer <= 0.*fire\(\); state\.fireTimer = 0\.35;/);
  assert.match(html, /if \(state\.destroyed >= TARGET\) endGame\(true,/);
});

// ================== PLATFORMER — REGRESYON ==================
test("RN-15) Platformer regression: jump SADECE grounded iken tetikleniyor (basılı tuşta tekrar tetiklenme YOK)", function () {
  var html = buildFor("platformer", MATRIX.platformer);
  assert.match(html, /if \(wantJump && state\.grounded\) \{ state\.vy = -JUMP_V; state\.grounded = false; \}/);
  assert.match(html, /ArrowLeft/);
  assert.match(html, /You Win!/);
  assert.match(html, /Game Over/);
});

// ================== MEMORY / MATH — REGRESYON (pointer/choice-based korunuyor) ==================
test("RN-16) Memory regression: pointer-based kaldı (WASD yok), eşleşme/yanlış-eşleşme/kilitlenme/win state'e bağlı", function () {
  var html = buildFor("memory", MATRIX.memory);
  assert.doesNotMatch(html, /startLoop\(update\)/, "memory'ye gereksiz per-frame hareket döngüsü eklenmiş");
  assert.match(html, /onCardClick/);
  assert.match(html, /Moves:/);
  assert.match(html, /You Win!/);
});

test("RN-17) Math regression: pointer/choice-based kaldı, gerçek soru/cevap/skor/progress + final skor", function () {
  var html = buildFor("math", MATRIX.math);
  assert.doesNotMatch(html, /startLoop\(update\)/, "math'a gereksiz per-frame hareket döngüsü eklenmiş");
  assert.match(html, /var TOTAL = 10;/);
  assert.match(html, /function makeQuestion/);
  assert.match(html, /function onAnswer/);
  assert.match(html, /You Win!/);
});

// ================== TOPDOWN SURVIVAL — ELİGİBİLİTY REGRESYONU ==================
test("RN-18) TopDown eligibility: survival test-matris promptu hâlâ eligible:true (TopDown Runtime regresyonu yok)", function () {
  var r = detectTopDownEligibility(MATRIX.survival);
  assert.equal(r.eligible, true);
});

test("RN-19) TopDown eligibility DÜZELTMESİ: Round N'in kendi racing promptu artık YANLIŞLIKLA eligible OLMUYOR (kök neden: kelime çift-sayımı)", function () {
  var r = detectTopDownEligibility(MATRIX.racing);
  assert.equal(r.eligible, false, "racing promptu hâlâ TopDown Runtime'a yanlış yönlendiriliyor -> " + JSON.stringify(r));
  assert.equal(r.score, 2, "beklenmeyen skor - 'hayatta kal' çift sayılıyor olabilir");
});

test("RN-19b) TopDown eligibility: bu turda BULUNAN spesifik çift-sayım çiftleri listeden kaldırıldı (ör. 'hayatta kalma' 'hayatta kal'ı artık tekrar etmiyor)", function () {
  // NOT: TOPDOWN_KEYWORDS'te başka, anlamca farklı ama teknik olarak
  // ön-ek ilişkili çiftler de var (ör. "avoid"/"avoiding", "survive"/
  // "survival") — bunlar BİLEREK dokunulmadan bırakıldı (görev md. "minimum
  // ama sağlam değişiklik" ilkesi + bu round'da bu çiftlerin GERÇEK bir
  // test-matrisi promptunda double-count'a yol açtığı KANITLANMADI). Bu
  // test SADECE bu round'da somut olarak bulunup kaldırılan çiftlerin bir
  // daha geri gelmediğini doğruluyor.
  var { TOPDOWN_KEYWORDS } = require("../services/topdown/eligibility");
  ["hayatta kalma", "fleeing", "wandering", "zombies", "kovalama", "düşmanlardan kaçsın"].forEach(function (removed) {
    assert.equal(TOPDOWN_KEYWORDS.indexOf(removed), -1, "'" + removed + "' listeye geri eklenmiş (Round N düzeltmesi regresyona uğramış)");
  });
});

// ================== HİÇBİRİ VALİDATION'I BOZMADI (görev md.15) ==================
test("RN-20) Round N değişiklikleri Round M validation'ını KIRMADI: 9 test-matrisi promptunun HİÇBİRİNDE kritik fail yok", function () {
  var mechForKey = {
    platformer: "platformer", racing: "racing", spaceShooter: "space-shooter", collection: "collection",
    memory: "memory", math: "math", cooking: "cooking", dungeon: "dungeon",
  };
  Object.keys(mechForKey).forEach(function (key) {
    var html = buildFor(mechForKey[key], MATRIX[key]);
    assertNoCriticalFail(html, MATRIX[key], key);
  });
});
