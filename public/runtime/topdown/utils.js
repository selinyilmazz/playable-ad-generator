/**
 * TOP-DOWN PLAYABLE GAME RUNTIME — Utils
 *
 * Bağımsız, prompt'tan/LLM'den tamamen kopuk, tekrar kullanılabilir bir 2D
 * Top-Down oyun runtime'ının en alt (bağımsız değişkeni olmayan) katmanı.
 * Bu dosya SADECE saf matematik yardımcı fonksiyonları içerir — hiçbir DOM/
 * canvas/window API'sine dokunmaz, bu yüzden hem tarayıcıda hem Node'da
 * (bkz. server/tests/topDownRuntimeCore.test.js, node:vm ile) sorunsuz
 * çalışır/test edilebilir.
 *
 * Mevcut Generator/free-HTML pipeline'ına (systemPrompt.js, checks.js,
 * openrouter.js, app.js'in generate/preview/download akışı) HİÇBİR
 * BAĞIMLILIĞI YOK ve onlardan hiçbiri bu dosyayı import etmiyor — bu round
 * kapsamında AI generation entegrasyonu YOK, sadece bağımsız runtime.
 *
 * Yükleme sırası: bu dosya, aynı `window.TopDownRuntime` namespace'ini
 * kullanan diğer runtime dosyalarından (collision.js, specSchema.js, ...)
 * ÖNCE yüklenmelidir (bkz. topdown-test.html'deki <script> sırası).
 */
window.TopDownRuntime = window.TopDownRuntime || {};

(function (ns) {
  "use strict";

  function clamp(value, min, max) {
    if (value < min) return min;
    if (value > max) return max;
    return value;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function randRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function distance(x1, y1, x2, y2) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Verilen (x, y) vektörünü birim uzunluğa (length = 1) normalize eder.
   * Sıfır vektör verilirse (hareket yok) {x:0, y:0} döner — 0'a bölme
   * hatası OLUŞMAZ. WASD/ok tuşu köşegen hareketinin (örn. yukarı+sağa aynı
   * anda) kartezyen harekete göre daha HIZLI olmasını önlemek için
   * InputManager.getMovementVector() tarafından kullanılır.
   */
  function normalize(x, y) {
    var len = Math.sqrt(x * x + y * y);
    if (len === 0) return { x: 0, y: 0 };
    return { x: x / len, y: y / len };
  }

  /**
   * WORLD RENDERING round — (x, y, salt) tam sayı üçlüsünün DETERMİNİSTİK
   * (Math.random YOK) bir hash'i, [0, 1) aralığında bir sayıya indirgenir.
   * AYNI (x, y, salt) HER ZAMAN AYNI sonucu üretir — renderer.js'in dünya
   * koordinatına bağlı, kamera hareketinde "yüzmeyen" (aynı world hücresi
   * her frame'de aynı deseni üretir) hafif zemin dokusu/varyasyon için
   * kullanılır (bkz. renderer.js _drawGroundTexture). `salt`, AYNI (x, y)
   * çiftinden birden fazla BAĞIMSIZ (birbiriyle ilişkisiz) rastgele-benzeri
   * değer üretebilmek için (ör. "bu hücrede dekorasyon var mı" ve "hangi
   * asset" iki AYRI soru, aynı hash'i kullanırlarsa hep aynı sonuca kilitli
   * kalırlardı) — basit, bağımlılıksız bir tam sayı karıştırma fonksiyonu
   * (bilinen "hash without libraries" tekniklerinin küçük bir varyasyonu).
   */
  function deterministicHash01(x, y, salt) {
    var h = (x | 0) * 374761393 + (y | 0) * 668265263 + (salt | 0) * 2246822519;
    h = (h ^ (h >>> 13)) * 1274126177;
    h = h ^ (h >>> 16);
    return (h >>> 0) / 4294967296;
  }

  ns.Utils = {
    clamp: clamp,
    lerp: lerp,
    randRange: randRange,
    distance: distance,
    normalize: normalize,
    deterministicHash01: deterministicHash01,
  };
})(window.TopDownRuntime);
