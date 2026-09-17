/**
 * TOP-DOWN PLAYABLE GAME RUNTIME — GameLoop
 *
 * requestAnimationFrame tabanlı, DELTA-TIME hesaplayan tek bir döngü.
 * dt saniyeye çevrilir ve bir üst sınıra (MAX_DT) kelepçelenir — sekme
 * arka plana alınıp geri geldiğinde (veya cihaz kısa süre donduğunda) tek
 * bir dev "dt sıçraması" ile oyuncunun aniden büyük mesafe kat etmesi/aşırı
 * hasar alması gibi bir hata sınıfını baştan önler.
 */
window.TopDownRuntime = window.TopDownRuntime || {};

(function (ns) {
  "use strict";

  var MAX_DT = 0.05;

  function GameLoop(callbacks) {
    this.updateFn = callbacks.update;
    this.renderFn = callbacks.render;
    this.running = false;
    this._rafId = null;
    this._lastTime = null;

    var self = this;
    this._tick = function (now) {
      if (!self.running) return;
      if (self._lastTime == null) self._lastTime = now;
      var dt = (now - self._lastTime) / 1000;
      self._lastTime = now;
      if (dt > MAX_DT) dt = MAX_DT;
      if (dt < 0) dt = 0;

      self.updateFn(dt);
      self.renderFn();

      self._rafId = window.requestAnimationFrame(self._tick);
    };
  }

  GameLoop.prototype.start = function () {
    if (this.running) return;
    this.running = true;
    this._lastTime = null;
    this._rafId = window.requestAnimationFrame(this._tick);
  };

  GameLoop.prototype.stop = function () {
    this.running = false;
    if (this._rafId != null) window.cancelAnimationFrame(this._rafId);
    this._rafId = null;
  };

  ns.GameLoop = GameLoop;
})(window.TopDownRuntime);
