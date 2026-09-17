/**
 * TOP-DOWN PLAYABLE GAME RUNTIME — AssetLoader (ASSET LIBRARY round)
 *
 * `spec.assets` (specSchema.js'in sanitizeAssets()'i tarafından ZATEN
 * güvenli hale getirilmiş: her rol için ya geçerli bir string URL ya da
 * `null`) alır ve her rol için bir `Image` nesnesi yüklemeye BAŞLAR.
 * Yükleme ASENKRON'dur — bu yüzden `.get(role)` her zaman "şu an güvenle
 * çizilebilir mi?" sorusuna cevap verir (yüklenene kadar / hata olursa
 * `null` döner) — renderer.js bunu HER FRAME kontrol edip, `null` dönerse
 * MEVCUT primitive (daire/dikdörtgen) çizimine düşer. Böylece:
 *   - Asset henüz yüklenmemişse: oyun ÇÖKMEZ, primitive fallback görünür
 *     (yükleme bitince o frame'den itibaren gerçek görsele geçer).
 *   - Asset URL'i geçersiz/404/ağ hatası ise: `onerror` kalıcı olarak
 *     "failed" işaretler, primitive fallback SONSUZA KADAR (o oturum için)
 *     güvenle kullanılmaya devam eder.
 *   - Rol için hiç asset verilmemişse (`null`): hiçbir Image nesnesi
 *     OLUŞTURULMAZ bile (gereksiz ağ isteği yok), `.get()` hep `null` döner.
 *
 * DOM'a bağımlı (window.Image) — inputManager.js/camera.js/renderer.js/
 * hud.js/gameLoop.js/runtime.js İLE AYNI sebeple (bkz. o dosyaların başı)
 * server/tests/topDownRuntimeCore.test.js'in Node `vm` sandbox'ında test
 * EDİLMİYOR; gerçek doğrulama canlı tarayıcıda (Playwright) yapılıyor.
 */
window.TopDownRuntime = window.TopDownRuntime || {};

(function (ns) {
  "use strict";

  // WORLD RENDERING round — "ground" EKLENDİ (bkz. specSchema.js aynı
  // isimdeki notu): "background" İLE AYNI yükleme mekanizması, sadece
  // renderer.js'in artık zemin döşemesi için kullandığı FARKLI bir rol.
  var ROLES = ["player", "enemy", "collectible", "obstacle", "background", "ground"];

  /**
   * url: yüklenecek asset URL'i. Dönüş: onload/onerror ile işaretlenen,
   * henüz "hazır" OLMAYAN bir Image nesnesi — `.get()`/`getByPath()` bunu
   * her çağrıda kontrol eder, burada BEKLEMEZ (asenkron).
   */
  function createTrackedImage(url) {
    var img = new Image();
    img.__ready = false;
    img.__failed = false;
    img.onload = function () {
      img.__ready = true;
    };
    img.onerror = function () {
      img.__failed = true;
    };
    img.src = url;
    return img;
  }

  function AssetLoader(specAssets) {
    var raw = specAssets && typeof specAssets === "object" ? specAssets : {};
    this._images = {};
    // WORLD RENDERING round — dekorasyonlar (bkz. specSchema.js decorations)
    // TEK bir sabit role BAĞLI DEĞİL: her öğe kendi asset yolunu taşıyor
    // (ör. bir forest dünyasında hem mantar HEM çalı aynı anda görünebilir).
    // Bu yüzden ROLES'ten AYRI, path'e göre anahtarlanan, TEMBEL (ilk
    // istekte oluşturulan) bir önbellek — constructor'da HERHANGİ bir path
    // önceden BİLİNMİYOR/yüklenmiyor.
    this._byPath = {};

    ROLES.forEach(function (role) {
      var url = raw[role];
      this._images[role] = (typeof url === "string" && url) ? createTrackedImage(url) : null;
    }, this);
  }

  /**
   * role: "player" | "enemy" | "collectible" | "obstacle" | "background" |
   * "ground". Dönüş: yüklenmiş, kullanıma HAZIR bir Image nesnesi, veya
   * `null` (rol için asset yok / henüz yükleniyor / yükleme başarısız oldu
   * — HER ÜÇÜ DE çağıran taraf için AYNI şey ifade eder: "primitive
   * fallback kullan").
   */
  AssetLoader.prototype.get = function (role) {
    var img = this._images[role];
    if (img && img.__ready && !img.__failed) return img;
    return null;
  };

  /**
   * WORLD RENDERING round — path: dekorasyon öğesinin kendi asset URL'i
   * (bkz. specSchema.js decorations[].path). `get(role)`'un AKSİNE, burada
   * sabit bir rol listesi yok — herhangi bir GEÇERLİ string path ilk
   * istekte tembel olarak yüklenmeye başlanır ve önbelleğe alınır (AYNI
   * path için tekrar tekrar yeni bir Image OLUŞTURULMAZ/istenmez). Dönüş
   * sözleşmesi `.get()` İLE AYNI: hazır değilse/başarısızsa `null`
   * (çağıran — renderer.js — o dekorasyonu SESSİZCE atlar, SADECE görsel
   * bir bonus olduğu için kritik değil).
   */
  AssetLoader.prototype.getByPath = function (path) {
    if (typeof path !== "string" || !path) return null;
    var img = this._byPath[path];
    if (!img) {
      img = createTrackedImage(path);
      this._byPath[path] = img;
    }
    if (img.__ready && !img.__failed) return img;
    return null;
  };

  ns.AssetLoader = AssetLoader;
})(window.TopDownRuntime);
