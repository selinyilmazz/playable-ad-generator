/**
 * TOP-DOWN PLAYABLE GAME RUNTIME — Player entity
 *
 * Entity'nin üzerine SADECE oyuncuya özgü, ama yine de tamamen generic
 * (belirli bir temaya/oyuna hardcode edilmemiş) iki şey ekler: hareket hızı
 * ve "isabet sonrası kısa süreli dokunulmazlık" (invulnerability) — bu
 * olmadan bir düşmana değen oyuncu her frame'de hasar alır ve health anında
 * sıfırlanırdı.
 */
window.TopDownRuntime = window.TopDownRuntime || {};

(function (ns) {
  "use strict";

  var Entity = ns.Entity;

  function Player(opts) {
    Entity.call(this, opts);
    this.speed = typeof opts.speed === "number" ? opts.speed : 200;
    this.invulnerableTimer = 0;
  }

  Player.prototype = Object.create(Entity.prototype);
  Player.prototype.constructor = Player;

  Player.prototype.update = function (dt) {
    Entity.prototype.update.call(this, dt);
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer = Math.max(0, this.invulnerableTimer - dt);
    }
  };

  Player.prototype.isInvulnerable = function () {
    return this.invulnerableTimer > 0;
  };

  /** Bir düşmandan isabet aldığında çağrılır: kısa dokunulmazlık + görsel flash. */
  Player.prototype.takeHit = function (invulnerabilityDuration) {
    this.invulnerableTimer = typeof invulnerabilityDuration === "number" ? invulnerabilityDuration : 1.0;
    this.triggerHitFlash(0.35);
  };

  ns.Player = Player;
})(window.TopDownRuntime);
