/**
 * TOP-DOWN PLAYABLE GAME RUNTIME — Particles
 *
 * Çok basit bir "burst" (patlama) partikül sistemi — isabet/yok etme
 * anlarında ekrana somut bir görsel geri bildirim (feedback) vermek için
 * (bkz. görevdeki "Basic visual effects/feedback" ve "boş bir canvas gibi
 * görünmesin" gereksinimleri). Belirli bir temaya/oyuna özel değil: renk
 * dışarıdan (renderer.js'in tema tablosundan) parametre olarak verilir.
 *
 * update()/spawnBurst() saf mantıktır (Node'da test edilebilir); sadece
 * render() gerçek bir CanvasRenderingContext2D ister (tarayıcıya özel).
 */
window.TopDownRuntime = window.TopDownRuntime || {};

(function (ns) {
  "use strict";

  function Particles() {
    this.list = [];
  }

  Particles.prototype.spawnBurst = function (x, y, color, count) {
    count = typeof count === "number" ? count : 10;
    for (var i = 0; i < count; i++) {
      var angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      var speed = 60 + Math.random() * 80;
      this.list.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        radius: 2 + Math.random() * 3,
        color: color || "#ffffff",
      });
    }
  };

  Particles.prototype.update = function (dt) {
    for (var i = this.list.length - 1; i >= 0; i--) {
      var p = this.list[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.list.splice(i, 1);
    }
  };

  Particles.prototype.render = function (ctx, camera) {
    for (var i = 0; i < this.list.length; i++) {
      var p = this.list[i];
      var alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x - camera.x, p.y - camera.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  ns.Particles = Particles;
})(window.TopDownRuntime);
