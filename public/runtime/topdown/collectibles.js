/**
 * TOP-DOWN PLAYABLE GAME RUNTIME — CollectibleField
 *
 * specSchema.js'in normalize ettiği `spec.collectibles` dizisinden (her
 * öğe { x, y, radius, type, value }) çalışan, tek bir "collectible alanı"
 * yöneticisi. Player/Enemy gibi BELİRLİ bir oyuna özel hiçbir şey içermez —
 * spec'ten NE gelirse onu spawn eder, "type" alanı sadece görsel/gelecekte
 * farklı bir asset/rendering sistemi seçebilmek için opak bir string olarak
 * taşınır (renderer.js şu an tek bir jenerik görünüm kullanıyor — bkz. o
 * dosyanın notu).
 *
 * Sadece Collision.circleIntersect'e bağımlı; DOM/canvas'a dokunmaz (saf
 * mantık — Node'da test edilebilir, bkz. server/tests/
 * topDownRuntimeCore.test.js).
 */
window.TopDownRuntime = window.TopDownRuntime || {};

(function (ns) {
  "use strict";

  var Collision = ns.Collision;

  /**
   * specCollectibles: normalizeSpec()'in ürettiği, ZATEN sanitize edilmiş
   * collectibles dizisi (bkz. specSchema.js) — burada TEKRAR doğrulama
   * yapılmıyor, sadece her öğeye bir "collected" state ekleniyor.
   */
  function CollectibleField(specCollectibles) {
    var list = Array.isArray(specCollectibles) ? specCollectibles : [];
    this.list = list.map(function (item) {
      return {
        x: item.x,
        y: item.y,
        radius: item.radius,
        type: item.type,
        value: item.value,
        // Basit bir idle "shimmer/bob" animasyonu için faz — her collectible
        // farklı bir fazda başlasın diye rastgele (Entity.bobPhase İLE AYNI
        // fikir, ama collectible hareket etmediği için Entity'yi miras
        // almaya gerek yok).
        bobPhase: Math.random() * Math.PI * 2,
      };
    });
  }

  CollectibleField.prototype.update = function (dt) {
    for (var i = 0; i < this.list.length; i++) {
      this.list[i].bobPhase += dt * 4;
    }
  };

  /**
   * player: {x, y, radius}. Çarpışan İLK collectible'ı listeden çıkarıp
   * döner (aynı frame'de en fazla bir tane toplanmış sayılır — birden
   * fazla üst üste binen collectible olağan değil, ama olsa bile bir
   * sonraki frame'de diğerini de toplar, ASLA çökmez). Çarpışma yoksa null.
   */
  CollectibleField.prototype.collectAt = function (player) {
    for (var i = 0; i < this.list.length; i++) {
      if (Collision.circleIntersect(player, this.list[i])) {
        return this.list.splice(i, 1)[0];
      }
    }
    return null;
  };

  ns.CollectibleField = CollectibleField;
})(window.TopDownRuntime);
