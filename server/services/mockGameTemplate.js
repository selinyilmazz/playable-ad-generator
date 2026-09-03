/**
 * PHASE 5 — Mock Game Template.
 *
 * Mock modun artık "emoji + gradient + Start button" yerine GERÇEK asset
 * dosyalarını (server/services/mockAssetSelector.js'in çözdüğü roller)
 * kullanan, küçük ama tam bir playable ürettiği yer. Şablon TEK ve GENEL:
 * player/environment/platform varsa sahne dekoru olarak gösterilir,
 * collectible havuzundan rastgele bir "hedef" seçilip bir grid içinde
 * (gerçek sprite'larla) gösterilir, doğru dokunuşta effect asseti (varsa)
 * kısa bir parçacık/patlama olarak oynar, skor + geri sayım süresi + kazan/
 * kaybet ekranları + "Play Again" var. Hiçbir emoji/uydurma path YOK —
 * sadece selectRolesForMock()'un döndürdüğü GERÇEK asset objeleri.
 *
 * Bu dosya SAF bir string üretici — hiçbir I/O, hiçbir HTTP çağrısı yok,
 * bu yüzden testlerde kolayca doğrudan çağrılabilir.
 */

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function first(value) {
  var arr = toArray(value);
  return arr.length > 0 ? arr[0] : null;
}

// "5 second" / "5-second" / "5 saniye" gibi ifadelerden toplam oyun süresini
// (saniye) çıkarır. server/services/validation/checks.js'teki
// extractDurationSeconds ile AYNI regex mantığı (bilerek küçük, bağımsız bir
// kopya — o dosyaya yeni bir cross-import bağımlılığı eklemeden) ama burada
// amaç validate etmek değil, gerçekten o süreyi timer'a UYGULAMAK.
function extractDurationSeconds(prompt) {
  if (!prompt) return null;
  var match = String(prompt).match(/(\d+)\s*(?:-|to)?\s*(?:second|saniye)/i);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * roles: selectRolesForMock().roles — kit-kaynaklıysa anahtarlar
 * player/environment veya background/platform/collectible/obstacle veya
 * enemy veya asteroid/effect/target olabilir (bkz. assetKits.js, kitler
 * arası anahtar isimleri tutarlı değil) — burada TEK bir normalize edilmiş
 * şekle indirgeniyor.
 *
 * ROUND 18 — Multi-Genre Asset Library mimarisiyle birlikte genişletilen rol
 * sözlüğü (tile/weapon/vehicle/powerup/ui, bkz. server/config/assetPacks.js
 * planlanan paket rolleri) burada da TANINIYOR — tilePool/weaponPool/
 * vehicle/powerupPool/uiPool alanları eklendi. Bugün HİÇBİR aktif kit
 * (assetKits.js'teki 4 kit) bu anahtarları KULLANMIYOR, bu yüzden mevcut 4
 * oyun türü için buildMockGameHtml() çıktısı BİREBİR aynı kalıyor (bu
 * fonksiyon sadece roller/kaynak nesneler üzerinde toArray/first çağırıyor
 * — hiçbir görsel render mantığı burada değişmedi). Bu SADECE, gelecekte
 * gerçek bir "racing" veya "dungeon" kiti roles.vehicle / roles.tile
 * tanımladığında, mock şablonunun bu veriyi SESSİZCE YOK SAYMAK yerine en
 * azından normalize edilmiş bir alanda TAŞIYABİLMESİ için önceden hazırlanan
 * bir zemin — bu rollerin sahnede GÖRSEL OLARAK nasıl render edileceği
 * (örn. bir "vehicle" sprite'ının nereye konacağı) her yeni tür kendi
 * gerçek assetleriyle entegre edilirken ayrıca tasarlanacak.
 */
function normalizeRoles(roles) {
  roles = roles || {};
  return {
    player: first(roles.player),
    environment: first(roles.environment || roles.background),
    platform: first(roles.platform),
    collectiblePool: toArray(roles.collectible),
    obstaclePool: toArray(roles.obstacle || roles.enemy || roles.asteroid),
    effect: first(roles.effect),
    // "target" (bkz. assetKits.js -> fruit-puzzle.roles.target: basket_red/
    // basket_green) — player/environment/platform hiçbirinin olmadığı
    // kitlerde (fruit-puzzle gibi) sahnede GERÇEK bir "toplama kabı" görseli
    // olsun diye (Selin'in isteği: "basket/container gerçek asset").
    target: first(roles.target),
    // ---- ROUND 18: genişletilmiş rol sözlüğü (bugün hiçbir aktif kit
    // doldurmuyor — hepsi boş dizi/null döner, HTML çıktısını etkilemez) ----
    tilePool: toArray(roles.tile),
    weaponPool: toArray(roles.weapon),
    vehicle: first(roles.vehicle),
    powerupPool: toArray(roles.powerup),
    uiPool: toArray(roles.ui),
  };
}

/**
 * prompt: kullanıcının ham prompt'u (başlık/alt-metin için, kısaltılarak).
 * gameType/kitName: server/routes/generate.js'in zaten hesapladığı
 *   deterministik sonuç — REQUIREMENTS #11'i (meta ile içerik arasında
 *   tutarsızlık olmasın) kökten çözer: mock artık gerçekten o kite ait bir
 *   oyun üretiyor, "Forest Platformer" etiketiyle "Fruit Tap Puzzle" içeriği
 *   göstermek gibi bir çelişki artık YOK.
 */
function buildMockGameHtml(options) {
  var prompt = options.prompt || "";
  var kitName = options.kitName || "Playable Game";
  var rolesRaw = options.roles || {};
  var usedFallback = !!options.usedFallback;

  var roles = normalizeRoles(rolesRaw);

  // Son çare güvenlik ağı: collectiblePool hâlâ boşsa (teorik olarak
  // olmamalı, bkz. mockAssetSelector.js) oyun yine de KIRILMASIN diye tek
  // bir nötr CSS-şekilli "hedef" objesi kullanılır — gerçek bir /assets/
  // path'i UYDURULMAZ, sadece asset=null bırakılıp şablon CSS fallback'e
  // düşer (bkz. renderItemVisual).
  var seconds = extractDurationSeconds(prompt) || 5;
  var TOTAL_DURATION_MS = seconds * 1000;
  var ROUNDS = Math.min(3, Math.max(2, roles.collectiblePool.length));
  var ROUND_TIME_MS = Math.max(1200, Math.round(TOTAL_DURATION_MS / ROUNDS));

  var titleText = kitName;
  var subtitleText = "Tap the highlighted item before time runs out!";

  function renderItemVisual(asset, extraClass) {
    if (asset) {
      return '<img src="' + esc(asset.path) + '" alt="" draggable="false" />';
    }
    return '<span class="fallback-shape ' + (extraClass || "") + '"></span>';
  }

  // ---- Sahne dekoru: environment + platform + player (statik, tıklanamaz;
  // sadece "oyun gerçekten bu temaya ait sprite'ları kullanıyor" görünümü
  // için — REQUIREMENTS #12: karakter + environment + platform). ----
  var sceneStyleParts = [];
  if (roles.environment) {
    sceneStyleParts.push(
      "#scene { background-image: url('" + roles.environment.path + "'); " +
        "background-size: cover; background-position: center; }"
    );
  }
  var sceneHtml =
    '<div id="scene">' +
    (roles.platform
      ? '<div id="platform-row">' +
        [0, 1, 2, 3].map(function () { return '<img src="' + esc(roles.platform.path) + '" alt="" />'; }).join("") +
        "</div>"
      : "") +
    (roles.player
      ? '<img id="player-sprite" src="' + esc(roles.player.path) + '" alt="" />'
      : "") +
    // roles.target (basket/container) — sadece player YOKSA gösteriliyor
    // (fruit-puzzle gibi karaktersiz kitlerde): sahnede gerçek bir "toplama
    // kabı" görseli olsun diye, statik/dekoratif.
    (roles.target && !roles.player
      ? '<img id="target-container-sprite" src="' + esc(roles.target.path) + '" alt="" />'
      : "") +
    "</div>";

  var html = [
    "<!DOCTYPE html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="UTF-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    "<title>" + esc(titleText) + "</title>",
    "<style>",
    "  * { box-sizing: border-box; }",
    "  html, body {",
    "    margin: 0; padding: 0; height: 100%;",
    '    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;',
    "    background: linear-gradient(160deg, #2a2440, #3d2f5c 55%, #1c1730);",
    "    overflow: hidden;",
    "  }",
    "  #game { position: relative; width: 100%; height: 100vh; overflow: hidden; }",
    "  #scene { position: absolute; inset: 0; background: linear-gradient(160deg, #2a2440, #3d2f5c 55%, #1c1730); }",
    sceneStyleParts.join("\n  "),
    "  #scene::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.05), rgba(10,8,20,0.55) 85%); }",
    "  #platform-row { position: absolute; left: 0; right: 0; bottom: 0; display: flex; }",
    "  #platform-row img { width: 25%; height: 46px; object-fit: cover; image-rendering: pixelated; }",
    "  #player-sprite {",
    "    position: absolute; left: 14%; bottom: 40px; width: 64px; height: 64px;",
    "    object-fit: contain; filter: drop-shadow(0 8px 10px rgba(0,0,0,0.35));",
    "    animation: playerIdle 1.1s ease-in-out infinite; image-rendering: pixelated;",
    "  }",
    "  @keyframes playerIdle { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }",
    "  #target-container-sprite {",
    "    position: absolute; left: 50%; bottom: 18px; width: 72px; height: 72px;",
    "    transform: translateX(-50%); object-fit: contain; image-rendering: pixelated;",
    "    filter: drop-shadow(0 8px 10px rgba(0,0,0,0.3)); opacity: 0.9;",
    "  }",
    "  .screen {",
    "    position: absolute; inset: 0; z-index: 3;",
    "    display: flex; flex-direction: column; align-items: center; justify-content: center;",
    "    padding: 24px; text-align: center; color: #fff;",
    "    opacity: 0; pointer-events: none; transition: opacity 0.25s ease;",
    "  }",
    "  .screen.active { opacity: 1; pointer-events: auto; }",
    "  .screen-scrim { position: absolute; inset: 0; background: rgba(15, 11, 26, 0.42); z-index: 2; }",
    "  h1 { font-size: clamp(20px, 5.5vw, 30px); margin: 0 0 8px; text-shadow: 0 2px 10px rgba(0,0,0,0.4); }",
    "  p.sub { font-size: clamp(13px, 3.2vw, 16px); margin: 0 0 20px; opacity: 0.92; max-width: 320px; }",
    "  .btn {",
    "    background: #fff; color: #4b3a8a; border: none; border-radius: 999px;",
    "    padding: 13px 30px; font-size: 15px; font-weight: 700; cursor: pointer;",
    "    box-shadow: 0 8px 20px rgba(0,0,0,0.35); transition: transform 0.12s ease;",
    "    touch-action: manipulation;",
    "  }",
    "  .btn:active { transform: scale(0.94); }",
    "  #hud {",
    "    position: absolute; top: 14px; left: 0; right: 0; z-index: 4;",
    "    display: flex; justify-content: space-between; align-items: center;",
    "    padding: 0 16px; font-weight: 700; font-size: 13px; color: #fff;",
    "    text-shadow: 0 1px 4px rgba(0,0,0,0.5);",
    "  }",
    "  #timer-bar { position: absolute; top: 0; left: 0; height: 4px; background: #fff; width: 100%; z-index: 5; transform-origin: left; }",
    "  #target-banner {",
    "    position: relative; z-index: 4; background: rgba(255,255,255,0.14); border-radius: 16px;",
    "    padding: 10px 18px; margin-bottom: 18px; backdrop-filter: blur(6px);",
    "    display: flex; align-items: center; gap: 10px; font-size: 14px;",
    "  }",
    "  #target-banner img, #target-banner .fallback-shape { width: 30px; height: 30px; object-fit: contain; image-rendering: pixelated; }",
    "  #item-grid { position: relative; z-index: 4; display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; max-width: 320px; width: 100%; }",
    "  .item-cell {",
    "    position: relative; background: rgba(255,255,255,0.12); border-radius: 16px; padding: 12px 0;",
    "    cursor: pointer; user-select: none; transition: transform 0.12s ease, background 0.2s ease;",
    "    display: flex; align-items: center; justify-content: center;",
    // Mobil dokunuşta ~300ms tıklama gecikmesini önler (mouse + touch
    // ikisinde de aynı davranış: click event zaten her iki girişte de
    // ateşleniyor, bu sadece gecikmeyi kaldırıyor).
    "    touch-action: manipulation;",
    "  }",
    "  .item-cell img, .item-cell .fallback-shape { width: 40px; height: 40px; object-fit: contain; pointer-events: none; image-rendering: pixelated; }",
    "  .item-cell:active { transform: scale(0.92); }",
    "  .item-cell.correct { background: #33d17a; }",
    "  .item-cell.wrong { background: #ff4d4d; }",
    "  .fallback-shape { display: inline-block; border-radius: 8px; background: rgba(255,255,255,0.85); }",
    "  .particle-burst {",
    "    position: absolute; width: 46px; height: 46px; pointer-events: none; z-index: 6;",
    "    animation: burst 0.5s ease forwards;",
    "  }",
    "  .particle-burst img { width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated; }",
    "  @keyframes burst { 0% { transform: scale(0.4); opacity: 0; } 40% { opacity: 1; } 100% { transform: scale(1.6); opacity: 0; } }",
    "  .result-icon { width: 56px; height: 56px; margin-bottom: 10px; object-fit: contain; image-rendering: pixelated; }",
    "</style>",
    "</head>",
    "<body>",
    '<div id="game">',
    sceneHtml,
    '<div class="screen-scrim" id="scrim" style="display:none;"></div>',
    '<div id="timer-bar"></div>',
    '<div id="hud" style="display:none;"><span id="score-label">Score: 0</span><span id="round-label"></span></div>',

    '<div class="screen active" id="screen-start">',
    "<h1>" + esc(titleText) + "</h1>",
    '<p class="sub">' + esc(subtitleText) + "</p>",
    '<button class="btn" id="btn-start">Start</button>',
    "</div>",

    '<div class="screen" id="screen-play">',
    '<div id="target-banner">Tap: <span id="target-visual"></span></div>',
    '<div id="item-grid"></div>',
    "</div>",

    '<div class="screen" id="screen-success">',
    renderItemVisual(roles.effect).replace("<img ", '<img class="result-icon" '),
    "<h1>You Win!</h1>",
    '<p class="sub" id="success-score">Score: 0</p>',
    '<button class="btn" id="btn-again-success">Play Again</button>',
    "</div>",

    '<div class="screen" id="screen-fail">',
    '<div class="result-icon" style="font-size:40px;">✕</div>',
    "<h1>Game Over</h1>",
    '<p class="sub" id="fail-score">Try again!</p>',
    '<button class="btn" id="btn-again-fail">Play Again</button>',
    "</div>",

    "</div>",
    "<script>",
    "(function () {",
    "  var POOL = " + JSON.stringify(roles.collectiblePool.map(function (a) { return { id: a.id, path: a.path }; })) + ";",
    "  var WRONG_POOL = " + JSON.stringify(roles.obstaclePool.map(function (a) { return { id: a.id, path: a.path }; })) + ";",
    "  var EFFECT = " + JSON.stringify(roles.effect ? { id: roles.effect.id, path: roles.effect.path } : null) + ";",
    "  var ROUNDS = " + ROUNDS + ";",
    "  var TOTAL_DURATION_MS = " + TOTAL_DURATION_MS + "; // requested playable duration, from the prompt",
    "  var ROUND_TIME_MS = " + ROUND_TIME_MS + ";",
    "",
    "  var els = {",
    '    hud: document.getElementById("hud"),',
    '    scoreLabel: document.getElementById("score-label"),',
    '    roundLabel: document.getElementById("round-label"),',
    '    timerBar: document.getElementById("timer-bar"),',
    '    scrim: document.getElementById("scrim"),',
    "    screens: {",
    '      start: document.getElementById("screen-start"),',
    '      play: document.getElementById("screen-play"),',
    '      success: document.getElementById("screen-success"),',
    '      fail: document.getElementById("screen-fail"),',
    "    },",
    '    targetVisual: document.getElementById("target-visual"),',
    '    grid: document.getElementById("item-grid"),',
    '    successScore: document.getElementById("success-score"),',
    '    failScore: document.getElementById("fail-score"),',
    '    game: document.getElementById("game"),',
    "  };",
    "",
    "  var state = { round: 0, score: 0, timerRAF: null };",
    "",
    "  function showScreen(name) {",
    "    Object.keys(els.screens).forEach(function (key) {",
    '      els.screens[key].classList.toggle("active", key === name);',
    "    });",
    '    els.scrim.style.display = name === "play" ? "block" : "none";',
    "  }",
    "",
    "  function shuffle(arr) {",
    "    var a = arr.slice();",
    "    for (var i = a.length - 1; i > 0; i--) {",
    "      var j = Math.floor(Math.random() * (i + 1));",
    "      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;",
    "    }",
    "    return a;",
    "  }",
    "",
    "  function visualHtml(item) {",
    '    if (item && item.path) return \'<img src="\' + item.path + \'" alt="" draggable="false" />\';',
    '    return \'<span class="fallback-shape" style="width:36px;height:36px;"></span>\';',
    "  }",
    "",
    "  function pickRound() {",
    "    var target = POOL[Math.floor(Math.random() * POOL.length)];",
    "    var decoys = shuffle(POOL.filter(function (p) { return p.id !== target.id; })).slice(0, 2);",
    "    var wrongDecoys = shuffle(WRONG_POOL).slice(0, Math.max(0, 5 - decoys.length - 1));",
    "    var cells = shuffle([target].concat(decoys, wrongDecoys).map(function (item, idx) {",
    "      return { item: item, isTarget: item.id === target.id, isHazard: wrongDecoys.indexOf(item) !== -1 };",
    "    }));",
    "    return { target: target, cells: cells };",
    "  }",
    "",
    "  function spawnParticle(cellEl) {",
    "    if (!EFFECT) return;",
    '    var p = document.createElement("div");',
    '    p.className = "particle-burst";',
    "    var rect = cellEl.getBoundingClientRect();",
    "    var gameRect = els.game.getBoundingClientRect();",
    '    p.style.left = (rect.left - gameRect.left + rect.width / 2 - 23) + "px";',
    '    p.style.top = (rect.top - gameRect.top + rect.height / 2 - 23) + "px";',
    '    p.innerHTML = \'<img src="\' + EFFECT.path + \'" alt="" />\';',
    "    els.game.appendChild(p);",
    '    setTimeout(function () { p.remove(); }, 520);',
    "  }",
    "",
    "  function clearTimerAnim() { if (state.timerRAF) cancelAnimationFrame(state.timerRAF); }",
    "",
    "  function runRoundTimer(onTimeout) {",
    "    clearTimerAnim();",
    "    var start = performance.now();",
    '    els.timerBar.style.width = "100%";',
    "    function tick(now) {",
    "      var elapsed = now - start;",
    "      var pct = Math.max(0, 1 - elapsed / ROUND_TIME_MS);",
    '      els.timerBar.style.width = (pct * 100) + "%";',
    "      if (elapsed >= ROUND_TIME_MS) { onTimeout(); } else { state.timerRAF = requestAnimationFrame(tick); }",
    "    }",
    "    state.timerRAF = requestAnimationFrame(tick);",
    "  }",
    "",
    "  function startGame() {",
    "    state.round = 0; state.score = 0;",
    '    els.hud.style.display = "flex";',
    '    els.scoreLabel.textContent = "Score: 0";',
    '    showScreen("play");',
    "    nextRound();",
    "  }",
    "",
    "  function nextRound() {",
    "    state.round += 1;",
    "    if (state.round > ROUNDS) { endGame(true); return; }",
    '    els.roundLabel.textContent = "Round " + state.round + "/" + ROUNDS;',
    "    var roundData = pickRound();",
    "    els.targetVisual.innerHTML = visualHtml(roundData.target);",
    '    els.grid.innerHTML = "";',
    "    roundData.cells.forEach(function (c) {",
    '      var cell = document.createElement("div");',
    '      cell.className = "item-cell";',
    "      cell.innerHTML = visualHtml(c.item);",
    '      cell.addEventListener("click", function () { handleTap(c.isTarget, cell); });',
    "      els.grid.appendChild(cell);",
    "    });",
    "    runRoundTimer(function () { handleTap(false, null); });",
    "  }",
    "",
    "  function handleTap(isCorrect, cellEl) {",
    "    clearTimerAnim();",
    "    Array.prototype.forEach.call(els.grid.children, function (c) { c.style.pointerEvents = 'none'; });",
    "    if (isCorrect) {",
    '      if (cellEl) { cellEl.classList.add("correct"); spawnParticle(cellEl); }',
    "      state.score += 1;",
    '      els.scoreLabel.textContent = "Score: " + state.score;',
    "      setTimeout(nextRound, 340);",
    "    } else {",
    '      if (cellEl) cellEl.classList.add("wrong");',
    "      setTimeout(function () { endGame(false); }, 340);",
    "    }",
    "  }",
    "",
    "  function endGame(won) {",
    "    clearTimerAnim();",
    '    els.hud.style.display = "none";',
    "    if (won) {",
    '      els.successScore.textContent = "Score: " + state.score + " / " + ROUNDS;',
    '      showScreen("success");',
    "    } else {",
    '      els.failScore.textContent = "Score: " + state.score + " / " + ROUNDS;',
    '      showScreen("fail");',
    "    }",
    "  }",
    "",
    '  document.getElementById("btn-start").addEventListener("click", startGame);',
    '  document.getElementById("btn-again-success").addEventListener("click", startGame);',
    '  document.getElementById("btn-again-fail").addEventListener("click", startGame);',
    "})();",
    "</script>",
    "</body>",
    "</html>",
    "",
  ].join("\n");

  return html;
}

module.exports = {
  buildMockGameHtml: buildMockGameHtml,
  normalizeRoles: normalizeRoles,
  extractDurationSeconds: extractDurationSeconds,
};
