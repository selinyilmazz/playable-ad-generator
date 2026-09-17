/**
 * TOP-DOWN PLAYABLE GAME RUNTIME — InputManager
 *
 * WASD + Ok tuşlarını "tuş basılı tutuldukça sürekli hareket" (delta-time
 * dostu, poll-based) olarak okur — bir keydown event'i bir kez tetiklenip
 * bırakılmaz, `getMovementVector()` HER FRAME o an basılı olan tuşlara göre
 * yeniden hesaplanır (bu session'ın "yatay hareket" turunda kurulan/
 * doğrulanan AYNI ilke: tek seferlik değil, sürekli/tutma-tabanlı hareket).
 *
 * MOBİL/DOKUNMATİK GENİŞLETME NOKTASI (görev maddesi: "genişletilebilir
 * temiz input yapısı"): klavye BURADA TEK input kaynağı değil — herhangi
 * bir dış kaynak (ileride bir sanal joystick/touch katmanı) `setAxis(name,
 * x, y)` çağırarak kendi normalize vektörünü klavyeyle AYNI hareket
 * sistemine ekleyebilir; yeni bir hareket sistemi/klavyeye özel kod yazmaya
 * GEREK YOK. Bu round'da sadece klavye kaynağı gerçekten kullanılıyor
 * (görev: "İlk aşamada AI generation entegrasyonu yapma" ile aynı ruhla,
 * touch şimdi implement edilmiyor — ama mimari buna hazır).
 */
window.TopDownRuntime = window.TopDownRuntime || {};

(function (ns) {
  "use strict";

  var Utils = ns.Utils;

  var KEY_BINDINGS = {
    up: ["KeyW", "ArrowUp"],
    down: ["KeyS", "ArrowDown"],
    left: ["KeyA", "ArrowLeft"],
    right: ["KeyD", "ArrowRight"],
  };

  function InputManager(target) {
    this.target = target || window;
    this.pressedCodes = {};
    // Klavye dışı kaynaklar (örn. gelecekteki touch joystick) için isimli
    // eksen havuzu — bkz. dosya başı açıklaması.
    this.axes = {};

    var self = this;
    this._boundKeyDown = function (e) {
      self.pressedCodes[e.code] = true;
    };
    this._boundKeyUp = function (e) {
      self.pressedCodes[e.code] = false;
    };

    this.target.addEventListener("keydown", this._boundKeyDown);
    this.target.addEventListener("keyup", this._boundKeyUp);
  }

  InputManager.prototype._isAnyPressed = function (codes) {
    for (var i = 0; i < codes.length; i++) {
      if (this.pressedCodes[codes[i]]) return true;
    }
    return false;
  };

  InputManager.prototype.setAxis = function (name, x, y) {
    this.axes[name] = { x: x, y: y };
  };

  InputManager.prototype.clearAxis = function (name) {
    delete this.axes[name];
  };

  /**
   * O anki toplam hareket vektörünü döner — klavye (WASD/ok tuşları) +
   * kayıtlı tüm dış eksenlerin TOPLAMI, sonra normalize edilir (köşegen
   * hareket kartezyen harekete göre daha hızlı OLMASIN diye).
   */
  InputManager.prototype.getMovementVector = function () {
    var x = 0;
    var y = 0;

    if (this._isAnyPressed(KEY_BINDINGS.left)) x -= 1;
    if (this._isAnyPressed(KEY_BINDINGS.right)) x += 1;
    if (this._isAnyPressed(KEY_BINDINGS.up)) y -= 1;
    if (this._isAnyPressed(KEY_BINDINGS.down)) y += 1;

    var axisNames = Object.keys(this.axes);
    for (var i = 0; i < axisNames.length; i++) {
      var axis = this.axes[axisNames[i]];
      x += axis.x;
      y += axis.y;
    }

    return Utils.normalize(x, y);
  };

  InputManager.prototype.destroy = function () {
    this.target.removeEventListener("keydown", this._boundKeyDown);
    this.target.removeEventListener("keyup", this._boundKeyUp);
  };

  ns.InputManager = InputManager;
  ns.INPUT_KEY_BINDINGS = KEY_BINDINGS;
})(window.TopDownRuntime);
