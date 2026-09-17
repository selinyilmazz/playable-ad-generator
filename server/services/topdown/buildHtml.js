/**
 * PROMPT -> SPEC -> RUNTIME entegrasyonu — TEK DOSYA HTML derleyicisi.
 *
 * Normalize edilmiş bir Game Specification'ı alıp, public/runtime/topdown/
 * altındaki GERÇEK runtime dosyalarını (DEĞİŞTİRMEDEN, olduğu gibi) OKUYUP
 * inline ederek, mevcut Free-HTML pipeline'ının ürettiğiyle AYNI şekle
 * sahip (bkz. server/prompts/systemPrompt.js "TEK DOSYA KURALI":
 * <!DOCTYPE html> ile başlar, </html> ile biter, tamamı tek dosyada, dış
 * kaynak/script YOK) TAM, bağımsız bir HTML dokümanı üretir.
 *
 * NEDEN BÖYLE: bu sayede üretilen çıktı, host uygulamasının (public/app.js)
 * MEVCUT preview (iframe.srcdoc), Download ve Copy Code mekanizmalarından
 * SIFIR değişiklikle geçer — onlar zaten "html: string" bekliyor, LLM'den
 * mi yoksa (bizim durumumuzda) deterministik olarak mı derlendiği hiç
 * fark etmiyor. Script sırası, public/runtime/topdown-test.html'deki
 * (elle test edilmiş, çalıştığı doğrulanmış) sıranın AYNISI.
 */
const fs = require("fs");
const path = require("path");

var RUNTIME_DIR = path.join(__dirname, "..", "..", "..", "public", "runtime", "topdown");

// public/runtime/topdown-test.html'deki <script> sırasıyla BİREBİR AYNI —
// bağımlılık sırası (Utils -> Collision/InputManager/Camera/... -> Entity ->
// Player/Enemy -> ... -> Runtime EN SON) burada da korunuyor.
var RUNTIME_SCRIPT_FILES = [
  "utils.js",
  "collision.js",
  "specSchema.js",
  "inputManager.js",
  "camera.js",
  "entity.js",
  "player.js",
  "enemy.js",
  // VISUAL QUALITY round — Entity'nin state/facing alanlarını okuyup
  // renderer.js'in kullandığı küçük bir "visual descriptor"a indirger; DOM'a
  // bağımlı değil ama renderer.js'ten (ns.Animation'ı kullanan) HEMEN önce
  // yüklenmesi yeterli/doğal (entity/player/enemy'nin hemen ardından).
  "animation.js",
  "particles.js",
  "gameState.js",
  "renderer.js",
  "hud.js",
  "gameLoop.js",
  // COLLECTIBLES+OBSTACLES round — ikisi de sadece Utils/Collision'a bağımlı
  // (yukarıda zaten yüklendi), runtime.js'ten HEMEN ÖNCE (runtime.js
  // ns.CollectibleField/ns.ObstacleField'i create() içinde kullanıyor).
  "collectibles.js",
  "obstacles.js",
  // ASSET LIBRARY round — sadece Image/window'a bağımlı (Utils/Collision'a
  // bile ihtiyacı yok), runtime.js'ten HEMEN ÖNCE (runtime.js create()
  // içinde ns.AssetLoader'ı kullanıyor).
  "assets.js",
  "runtime.js",
];

function readRuntimeScripts() {
  return RUNTIME_SCRIPT_FILES.map(function (fileName) {
    return fs.readFileSync(path.join(RUNTIME_DIR, fileName), "utf8");
  }).join("\n");
}

function readRuntimeStyle() {
  return fs.readFileSync(path.join(RUNTIME_DIR, "style.css"), "utf8");
}

function escapeHtmlText(text) {
  return String(text || "").replace(/[<>&]/g, function (ch) {
    return ch === "<" ? "&lt;" : ch === ">" ? "&gt;" : "&amp;";
  });
}

// JSON.stringify çıktısı normal bir Game Specification için asla
// "</script" içermez (sadece sayı/string/dizi/obje alanları var), ama
// savunmacı olarak yine de kaçırılıyor — <script> içine gömülen HERHANGİ
// bir veri için standart, ucuz bir önlem.
function escapeForScriptTag(jsonString) {
  return jsonString.replace(/<\/script/gi, "<\\/script");
}

/**
 * normalizedSpec: specSchemaBridge.normalizeSpec()'in ürettiği, tüm
 * alanları doldurulmuş, güvenli spec (collectibles/obstacles varsa dahil).
 * Dönüş: tam, tek-dosyalık bir HTML string'i (server/routes/generate.js
 * bunu doğrudan {html: ...} olarak döner — mevcut Free-HTML çıktısıyla
 * BİREBİR aynı sözleşme).
 */
function buildTopDownHtml(normalizedSpec) {
  var runtimeScripts = readRuntimeScripts();
  var runtimeStyle = readRuntimeStyle();
  var specJson = escapeForScriptTag(JSON.stringify(normalizedSpec));
  var title = escapeHtmlText("Playable Ad — Top-Down");

  return (
    "<!DOCTYPE html>\n" +
    '<html lang="en">\n' +
    "<head>\n" +
    '<meta charset="UTF-8" />\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n' +
    "<title>" + title + "</title>\n" +
    "<style>\n" +
    "html, body { margin: 0; height: 100%; background: #05060a; overflow: hidden; }\n" +
    "#td-stage { width: 100%; height: 100%; }\n" +
    runtimeStyle + "\n" +
    "</style>\n" +
    "</head>\n" +
    "<body>\n" +
    '<div id="td-stage" class="td-game-container"><canvas id="td-game-canvas"></canvas></div>\n' +
    "<script>\n" + runtimeScripts + "\n</script>\n" +
    "<script>\n" +
    "(function () {\n" +
    "  var GAME_SPEC = " + specJson + ";\n" +
    "  var canvas = document.getElementById('td-game-canvas');\n" +
    "  var game = window.TopDownRuntime.create(canvas, GAME_SPEC);\n" +
    "  game.start();\n" +
    "  window.__topDownGame = game;\n" +
    "})();\n" +
    "</script>\n" +
    "</body>\n" +
    "</html>\n"
  );
}

module.exports = {
  buildTopDownHtml: buildTopDownHtml,
  RUNTIME_SCRIPT_FILES: RUNTIME_SCRIPT_FILES,
};
