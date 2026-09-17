/**
 * TOP-DOWN PLAYABLE GAME RUNTIME — ObstacleField
 *
 * specSchema.js'in normalize ettiği `spec.obstacles` dizisinden (her öğe
 * { x, y, width, height } — SOL-ÜST köşe, bkz. specSchema.js'teki
 * sanitizeObstacles) çalışan, tek bir "engel alanı" yöneticisi.
 *
 * SORUMLULUK: player/enemy'nin bir obstacle'ın İÇİNDEN GEÇMESİNİ engelleyen
 * basit, eksen-ayrıştırmalı ("slide along walls") bir hareket çözümü —
 * Entity.move()'un dünya-sınırı kelepçelemesiyle AYNI ruhta ama ayrı bir
 * dosyada (Entity.js'in kendisi HİÇ değiştirilmedi — bu, runtime.js'in
 * `entity.move(...)` yerine ÇAĞIRABİLECEĞİ, geriye dönük UYUMLU bir
 * alternatif: obstacles listesi boşsa (varsayılan/mevcut oyunlar) davranış
 * entity.move() ile MATEMATİKSEL OLARAK BİREBİR AYNIDIR — bkz. server/tests/
 * topDownRuntimeCore.test.js'teki eşdeğerlik testi).
 *
 * Belirli bir temaya/oyuna özel hiçbir şey içermez — sadece geometri
 * (Collision.rectCircleIntersect, zaten var olan, önceki round'dan beri
 * kullanılmayı bekleyen bir yardımcı).
 */
window.TopDownRuntime = window.TopDownRuntime || {};

(function (ns) {
  "use strict";

  var Utils = ns.Utils;
  var Collision = ns.Collision;

  /**
   * specObstacles: normalizeSpec()'in ürettiği, ZATEN sanitize edilmiş
   * obstacles dizisi (bkz. specSchema.js) — { x, y, width, height }.
   */
  function ObstacleField(specObstacles) {
    this.list = Array.isArray(specObstacles) ? specObstacles : [];
  }

  ObstacleField.prototype.blocksCircle = function (circle) {
    for (var i = 0; i < this.list.length; i++) {
      if (Collision.rectCircleIntersect(this.list[i], circle)) return true;
    }
    return false;
  };

  /**
   * entity: {x, y, radius} — YERİNDE (in-place) mutate edilir (Entity.move()
   * İLE AYNI sözleşme). dx/dy eksen eksen ayrı ayrı denenir: bir eksende
   * hareket bir obstacle'a çarpıyorsa SADECE o eksen iptal edilir (diğeri
   * uygulanmaya devam eder) — bu, oyuncunun bir duvara paralel kayarak
   * ilerleyebilmesini ("slide along walls") sağlayan, basit ama doğru
   * hissettiren standart bir çözüm; kesin bir fizik motoru DEĞİL.
   */
  ObstacleField.prototype.resolveMovement = function (entity, dx, dy, worldWidth, worldHeight) {
    var maxX = Math.max(entity.radius, worldWidth - entity.radius);
    var maxY = Math.max(entity.radius, worldHeight - entity.radius);

    var nextX = Utils.clamp(entity.x + dx, entity.radius, maxX);
    if (!this.blocksCircle({ x: nextX, y: entity.y, radius: entity.radius })) {
      entity.x = nextX;
    }

    var nextY = Utils.clamp(entity.y + dy, entity.radius, maxY);
    if (!this.blocksCircle({ x: entity.x, y: nextY, radius: entity.radius })) {
      entity.y = nextY;
    }
  };

  ns.ObstacleField = ObstacleField;
})(window.TopDownRuntime);
