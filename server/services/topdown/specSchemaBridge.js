/**
 * PROMPT -> SPEC -> RUNTIME entegrasyonu — SPEC NORMALIZATION KÖPRÜSÜ.
 *
 * public/runtime/topdown/specSchema.js ZATEN tam, test edilmiş (bkz.
 * server/tests/topDownRuntimeCore.test.js) bir `normalizeSpec()` fonksiyonu
 * içeriyor — eksik/geçersiz/mantıksız alanları güvenli varsayılanlara
 * düşüren, girdiyi asla mutate etmeyen, asla çökmeyen TEK doğrulama mantığı.
 *
 * Bu köprü, o AYNI dosyayı (mantığı KOPYALAMADAN/TEKRARLAMADAN) sunucu
 * tarafında da kullanılabilir kılmak için server/tests/
 * topDownRuntimeCore.test.js'teki AYNI teknik ile (Node'un yerleşik `vm`
 * modülü, `window` global'i sahte bir sandbox'a bağlanarak) dosyayı okuyup
 * çalıştırır. specSchema.js hiçbir DOM/tarayıcı API'sine dokunmadığı için
 * (saf mantık) bu, tamamen güvenli ve tek satırlık bir "gerçek dosyayı
 * kullan" köprüsüdür — runtime'ın kendisi (public/runtime/topdown/*)
 * HİÇ DEĞİŞTİRİLMEDİ, sadece Node'dan okunabilir hale getirildi.
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

var SPEC_SCHEMA_PATH = path.join(
  __dirname, "..", "..", "..", "public", "runtime", "topdown", "specSchema.js"
);

var cachedNormalizeSpec = null;

function loadNormalizeSpec() {
  var code = fs.readFileSync(SPEC_SCHEMA_PATH, "utf8");
  var sandbox = { Math: Math, console: console };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: "specSchema.js" });
  return sandbox.window.TopDownRuntime.normalizeSpec;
}

/**
 * rawSpec: dışarıdan (LLM veya mock spec generator) gelen ham obje.
 * Dönüş: public/runtime/topdown/specSchema.js'in ÜRETTİĞİ, tüm alanları
 * doldurulmuş, güvenli bir Game Specification kopyası. Girdiyi ASLA
 * mutate etmez, ASLA throw etmez (specSchema.js'in kendi garantisi).
 */
function normalizeSpec(rawSpec) {
  if (!cachedNormalizeSpec) {
    cachedNormalizeSpec = loadNormalizeSpec();
  }
  return cachedNormalizeSpec(rawSpec);
}

module.exports = { normalizeSpec: normalizeSpec };
