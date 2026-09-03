/**
 * ROUND 19 (Part C) test — server/services/openrouterClient.js
 *
 * "OpenRouter yanıtında beklenen içerik bulunamadı." hatasının debug'ı
 * sırasında eklenen extractRawContent() saf fonksiyonunu test eder:
 * OpenRouter/sağlayıcıya göre değişen message.content şeklini (düz string
 * VEYA content-part dizisi) doğru okuyor mu?
 *
 * Bilerek gerçek bir network çağrısı / callOpenRouterForHtml() ÇAĞRILMIYOR
 * (API key veya fetch mock'lama altyapısı gerektirmez) — sadece parser'ın
 * saf, network'süz kısmı test ediliyor.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const { extractRawContent } = require("../services/openrouterClient");

test("extractRawContent: content düz string ise AYNEN döner (mevcut/beklenen format)", function () {
  assert.equal(extractRawContent({ content: "<html>...</html>" }), "<html>...</html>");
});

test("extractRawContent: content parça (content-part) dizisi ise metin parçalarını birleştirir", function () {
  var message = {
    content: [
      { type: "text", text: "<html>" },
      { type: "text", text: "...</html>" },
    ],
  };
  assert.equal(extractRawContent(message), "<html>...</html>");
});

test("extractRawContent: content array içindeki text olmayan parçaları (örn. type:'image_url') sessizce atlar, hata FIRLATMAZ", function () {
  var message = {
    content: [
      { type: "text", text: "merhaba" },
      { type: "image_url", image_url: { url: "https://example.com/x.png" } },
    ],
  };
  assert.equal(extractRawContent(message), "merhaba");
});

test("extractRawContent: content boş dizi ise boş string döner (çağıran taraf bunu falsy kabul edip hatayı tetikler)", function () {
  assert.equal(extractRawContent({ content: [] }), "");
});

test("extractRawContent: message yoksa veya content null/undefined/obje ise null döner (uydurma bir değer YOK)", function () {
  assert.equal(extractRawContent(null), null);
  assert.equal(extractRawContent({}), null);
  assert.equal(extractRawContent({ content: null }), null);
  assert.equal(extractRawContent({ content: undefined }), null);
  assert.equal(extractRawContent({ content: { foo: "bar" } }), null);
});
