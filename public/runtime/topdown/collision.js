/**
 * TOP-DOWN PLAYABLE GAME RUNTIME — Collision
 *
 * Basit, GENERIC dikdörtgen/daire çarpışma testleri. Belirli bir oyuna
 * (örn. "zombi", "orman") özel hiçbir mantık İÇERMEZ — sadece geometri.
 * Player/Enemy gibi tüm entity'ler {x, y, radius} (daire) olarak modellendiği
 * için runtime şu an SADECE circleIntersect'i kullanıyor; rectIntersect ve
 * rectCircleIntersect, ileride platformer/shooter gibi türlere (veya
 * dikdörtgen hitbox'lı engellere) genişlerken hazır olsun diye eklendi
 * (bkz. Bölüm 10'un raporundaki "modüler ve genişletilebilir" gereksinimi).
 *
 * Bağımsız — hiçbir başka runtime dosyasına bağımlı değil.
 */
window.TopDownRuntime = window.TopDownRuntime || {};

(function (ns) {
  "use strict";

  function clampValue(v, min, max) {
    if (v < min) return min;
    if (v > max) return max;
    return v;
  }

  /** a, b: {x, y, radius} — merkez koordinatı + yarıçap. */
  function circleIntersect(a, b) {
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    var radiusSum = a.radius + b.radius;
    return dx * dx + dy * dy <= radiusSum * radiusSum;
  }

  /** a, b: {x, y, width, height} — x/y SOL-ÜST köşe. */
  function rectIntersect(a, b) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  /** rect: {x, y, width, height} (sol-üst köşe), circle: {x, y, radius} (merkez). */
  function rectCircleIntersect(rect, circle) {
    var closestX = clampValue(circle.x, rect.x, rect.x + rect.width);
    var closestY = clampValue(circle.y, rect.y, rect.y + rect.height);
    var dx = circle.x - closestX;
    var dy = circle.y - closestY;
    return dx * dx + dy * dy <= circle.radius * circle.radius;
  }

  ns.Collision = {
    circleIntersect: circleIntersect,
    rectIntersect: rectIntersect,
    rectCircleIntersect: rectCircleIntersect,
  };
})(window.TopDownRuntime);
