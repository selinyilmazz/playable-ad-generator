/**
 * PHASE 5 tests — "Asset Integrity" validation check (REQUIREMENTS #8).
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const { validatePlayable } = require("../services/validate");

function htmlWithAsset(assetPath) {
  return (
    "<html><body><img src='" + assetPath + "' />" +
    "<script>document.addEventListener('click', function(){});</script></body></html>"
  );
}

test("asset-integrity: gerçek/mevcut bir manifest path'i için pass döner", function () {
  var result = validatePlayable(htmlWithAsset("/assets/objects/star.svg"), "");
  var check = result.checks.filter(function (c) { return c.key === "asset-integrity"; })[0];
  assert.ok(check);
  assert.equal(check.status, "pass");
});

test("asset-integrity: HTML'de hiç /assets/ referansı yoksa pass döner (asset kullanımı zorunlu değil)", function () {
  var result = validatePlayable("<html><body>no assets here</body></html>", "");
  var check = result.checks.filter(function (c) { return c.key === "asset-integrity"; })[0];
  assert.equal(check.status, "pass");
});

test("asset-integrity: manifestte olmayan bir path için hiçbir şey raporlamaz (bu asset-paths-valid'in işi, tekrar edilmiyor)", function () {
  var result = validatePlayable(htmlWithAsset("/assets/objects/does_not_exist.svg"), "");
  var integrity = result.checks.filter(function (c) { return c.key === "asset-integrity"; })[0];
  var pathsValid = result.checks.filter(function (c) { return c.key === "asset-paths-valid"; })[0];
  assert.equal(integrity.status, "pass"); // integrity kendi işine bakar, path'in "known" olmadığını görüp atlar
  assert.equal(pathsValid.status, "fail"); // ama asset-paths-valid bunu KRİTİK olarak yakalar
});

test("Quality Score: yeni asset-integrity check'i sayıma dahil oluyor (16 -> 17 kontrol)", function () {
  var result = validatePlayable(htmlWithAsset("/assets/objects/star.svg"), "");
  // ROUND 21: gameplay consistency check'i eklenmesiyle toplam 17 -> 18 oldu
  // (bkz. checks.js "platformer-gameplay-consistency"). ROUND F: yeni
  // "level-length-consistency" check'i eklenmesiyle 18 -> 19 oldu — bu
  // testin amacı asset-integrity'nin sayıma dahil olduğunu doğrulamak,
  // mutlak sayı değil; sayı buradan güncellendi ki gerçek CHECKS
  // uzunluğuyla senkron kalsın.
  assert.equal(result.checks.length, 19);
  assert.ok(result.checks.some(function (c) { return c.key === "asset-integrity"; }));
});
