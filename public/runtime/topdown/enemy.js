/**
 * TOP-DOWN PLAYABLE GAME RUNTIME — Enemy entity
 *
 * Entity'nin üzerine tek bir generic davranış ekler: "seek" — verilen bir
 * hedef noktaya (her zaman oyuncu ama Enemy bunu BİLMEZ, sadece bir x/y
 * alır) sabit hızla yönelme. Zombi/canavar/haydut gibi TEK bir temaya özel
 * hiçbir şey yok — düşman görünümü/teması Renderer'daki tema tablosundan
 * (renderer.js THEMES) geliyor, buradaki mantık tamamen tema-bağımsız.
 */
window.TopDownRuntime = window.TopDownRuntime || {};

(function (ns) {
  "use strict";

  var Entity = ns.Entity;
  var Utils = ns.Utils;

  function Enemy(opts) {
    Entity.call(this, opts);
    this.speed = typeof opts.speed === "number" ? opts.speed : 80;
  }

  Enemy.prototype = Object.create(Entity.prototype);
  Enemy.prototype.constructor = Enemy;

  /**
   * (targetX, targetY)'e doğru sabit hızla ilerler, dünya sınırlarına
   * kelepçeli. obstacleField OPSİYONEL (COLLECTIBLES+OBSTACLES round,
   * geriye dönük UYUMLU): verilmezse davranış ÖNCEKİ round'la birebir
   * aynıdır (bu.move() ile dünya sınırına kelepçeleme). Verilirse, enemy de
   * player gibi obstacle'ların İÇİNDEN GEÇEMEZ ("enemy collision davranışı
   * da mantıklı ele alınsın" — enemy'ler oyuncuyla aynı engelleri görür,
   * ayrı bir pathfinding/kaçınma sistemi İCAT EDİLMEDİ, kapsam dışı).
   */
  Enemy.prototype.seek = function (targetX, targetY, dt, worldWidth, worldHeight, obstacleField) {
    var dir = Utils.normalize(targetX - this.x, targetY - this.y);
    this.vx = dir.x * this.speed;
    this.vy = dir.y * this.speed;
    if (obstacleField && typeof obstacleField.resolveMovement === "function") {
      obstacleField.resolveMovement(this, this.vx * dt, this.vy * dt, worldWidth, worldHeight);
    } else {
      this.move(this.vx * dt, this.vy * dt, worldWidth, worldHeight);
    }
  };

  ns.Enemy = Enemy;
})(window.TopDownRuntime);
