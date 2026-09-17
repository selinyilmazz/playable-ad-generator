/**
 * TOP-DOWN PLAYABLE GAME RUNTIME — Entity (temel sınıf)
 *
 * Player ve Enemy'nin ortak temeli: dünya koordinatında konum (x, y),
 * hız (vx, vy), daire hitbox'ı (radius), basit bir görsel state makinesi
 * (idle/moving/hit) ve bir "hit flash" zamanlayıcısı. Belirli bir oyuna
 * özel hiçbir alan/mantık İÇERMEZ — tamamen generic.
 *
 * Sadece Utils.clamp'e bağımlı; DOM/canvas'a dokunmaz (saf mantık, Node'da
 * da test edilebilir — bkz. server/tests/topDownRuntimeCore.test.js).
 */
window.TopDownRuntime = window.TopDownRuntime || {};

(function (ns) {
  "use strict";

  var Utils = ns.Utils;

  // VISUAL QUALITY round — yatay hareket olmadan (sadece dikey hareket veya
  // idle iken) "facing" ASLA değişmez; küçük bir eşik (0.5 hıza kıyasla
  // biraz daha büyük) sadece "gürültü" (ör. çapraz hareketin çok küçük bir
  // x bileşeni) yüzünden sprite'ın anlamsızca titreyip durmasını önler. Bu
  // SADECE sağ/sol yön belirlemek için — "moving" durumu HÂLÂ 0.5 eşiğini
  // kullanıyor (değişmedi).
  var FACING_VELOCITY_EPSILON = 6;

  function Entity(opts) {
    opts = opts || {};
    this.x = typeof opts.x === "number" ? opts.x : 0;
    this.y = typeof opts.y === "number" ? opts.y : 0;
    this.vx = 0;
    this.vy = 0;
    this.radius = typeof opts.radius === "number" ? opts.radius : 16;
    // "idle" | "moving" | "hit" — Renderer bunu okuyup basit görsel
    // farklılaştırma (flash/bob) uyguluyor; yeni bir state eklemek Renderer'a
    // bir dal eklemek kadar basit, başka hiçbir yeri etkilemiyor.
    this.state = "idle";
    this.hitFlashTimer = 0;
    // Basit "bob" (yukarı-aşağı sallanma) animasyonu için faz — her entity
    // farklı bir fazda başlasın diye rastgele.
    this.bobPhase = Math.random() * Math.PI * 2;
    this.alive = true;
    // VISUAL QUALITY round — "1" = sağa bakıyor (normal/flip yok), "-1" =
    // sola bakıyor (yatay flip, bkz. renderer.js). Entity durunca veya SADECE
    // dikey hareket edince (yukarı/aşağı) DEĞİŞMEZ — son yatay yönü doğal
    // şekilde korur (bkz. update()), asla 90 derece döndürülmez.
    this.facing = 1;
  }

  /**
   * (dx, dy) kadar hareket ettirir ve konumu [radius, worldSize - radius]
   * aralığına kelepçeler — entity dünya sınırlarının dışına ASLA çıkamaz.
   */
  Entity.prototype.move = function (dx, dy, worldWidth, worldHeight) {
    this.x = Utils.clamp(this.x + dx, this.radius, Math.max(this.radius, worldWidth - this.radius));
    this.y = Utils.clamp(this.y + dy, this.radius, Math.max(this.radius, worldHeight - this.radius));
  };

  Entity.prototype.triggerHitFlash = function (duration) {
    this.hitFlashTimer = typeof duration === "number" ? duration : 0.35;
  };

  Entity.prototype.update = function (dt) {
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
    }
    var moving = Math.abs(this.vx) > 0.5 || Math.abs(this.vy) > 0.5;
    this.state = this.hitFlashTimer > 0 ? "hit" : moving ? "moving" : "idle";
    if (moving) this.bobPhase += dt * 10;

    // VISUAL QUALITY round — sadece BELİRGİN bir yatay hız bileşeni varken
    // yön güncellenir; sıfır/çok küçük vx (dururken veya salt yukarı/aşağı
    // hareket ederken) facing'i OLDUĞU GİBİ bırakır — "yönünü doğal tut"
    // gereksinimi (rastgele/titrek flip yok, hiçbir zaman rotasyon yok).
    if (this.vx > FACING_VELOCITY_EPSILON) {
      this.facing = 1;
    } else if (this.vx < -FACING_VELOCITY_EPSILON) {
      this.facing = -1;
    }
  };

  ns.Entity = Entity;
})(window.TopDownRuntime);
