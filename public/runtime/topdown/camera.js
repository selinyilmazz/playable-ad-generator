/**
 * TOP-DOWN PLAYABLE GAME RUNTIME — Camera
 *
 * Dünya koordinatı ile ekran koordinatı arasındaki tek çeviri noktası:
 * camera.x/camera.y, dünyanın sol-üst köşesinin ekranın neresinde
 * göründüğünü belirler (renderer her şeyi `worldX - camera.x` ile çizer).
 * Player'ı YUMUŞAK (lerp) takip eder ve dünya sınırlarının DIŞINA asla
 * taşmaz — dünya, viewport'tan küçükse (nadir ama olası) 0'da sabitlenir.
 */
window.TopDownRuntime = window.TopDownRuntime || {};

(function (ns) {
  "use strict";

  var Utils = ns.Utils;

  function Camera(viewportWidth, viewportHeight) {
    this.x = 0;
    this.y = 0;
    this.viewportWidth = viewportWidth || 0;
    this.viewportHeight = viewportHeight || 0;
    // Ne kadar büyükse o kadar "sert"/hızlı takip eder; küçükse daha
    // yumuşak/gecikmeli. Belirli bir oyuna özel değil, sabit bir "hissiyat"
    // parametresi.
    this.smoothing = 6;
  }

  Camera.prototype.setViewportSize = function (width, height) {
    this.viewportWidth = width;
    this.viewportHeight = height;
  };

  Camera.prototype.snapTo = function (targetX, targetY, worldWidth, worldHeight) {
    this.x = this._clampX(targetX - this.viewportWidth / 2, worldWidth);
    this.y = this._clampY(targetY - this.viewportHeight / 2, worldHeight);
  };

  Camera.prototype._clampX = function (value, worldWidth) {
    var maxX = Math.max(0, worldWidth - this.viewportWidth);
    return Utils.clamp(value, 0, maxX);
  };

  Camera.prototype._clampY = function (value, worldHeight) {
    var maxY = Math.max(0, worldHeight - this.viewportHeight);
    return Utils.clamp(value, 0, maxY);
  };

  Camera.prototype.follow = function (target, worldWidth, worldHeight, dt) {
    var desiredX = this._clampX(target.x - this.viewportWidth / 2, worldWidth);
    var desiredY = this._clampY(target.y - this.viewportHeight / 2, worldHeight);
    var t = Math.min(1, this.smoothing * dt);
    this.x = Utils.lerp(this.x, desiredX, t);
    this.y = Utils.lerp(this.y, desiredY, t);
  };

  ns.Camera = Camera;
})(window.TopDownRuntime);
