/**
 * TOP-DOWN PLAYABLE GAME RUNTIME — HUD (DOM overlay)
 *
 * Health/score/objective + kazanma-kaybetme ekranı + Restart butonu, canvas
 * ÜZERİNE gelen bağımsız bir DOM katmanı olarak (canvas'ın içine metin
 * çizmek yerine — okunabilirlik/CSS ile stil verebilme kolaylığı için).
 * `public/runtime/topdown/style.css`'teki `.td-*` sınıflarını kullanır;
 * mevcut projenin `public/style.css`'ine HİÇBİR bağımlılığı/etkisi yoktur
 * (ayrı, kendi kendine yeten bir stil dosyası — bkz. o dosyanın notu).
 */
window.TopDownRuntime = window.TopDownRuntime || {};

(function (ns) {
  "use strict";

  function Hud(container, spec, callbacks) {
    this.container = container;
    this.spec = spec;
    this.callbacks = callbacks || {};

    this.root = document.createElement("div");
    this.root.className = "td-hud";
    this.root.innerHTML =
      '<div class="td-hud-top">' +
        '<div class="td-health" aria-label="Health"></div>' +
        '<div class="td-objective"></div>' +
        '<div class="td-score">Score: 0</div>' +
      "</div>" +
      '<div class="td-flash"></div>' +
      '<div class="td-endscreen td-hidden">' +
        '<div class="td-endscreen-title"></div>' +
        '<div class="td-endscreen-detail"></div>' +
        '<button type="button" class="td-restart-btn">Restart</button>' +
      "</div>";
    this.container.appendChild(this.root);

    this.healthEl = this.root.querySelector(".td-health");
    this.objectiveEl = this.root.querySelector(".td-objective");
    this.scoreEl = this.root.querySelector(".td-score");
    this.flashEl = this.root.querySelector(".td-flash");
    this.endscreenEl = this.root.querySelector(".td-endscreen");
    this.endscreenTitleEl = this.root.querySelector(".td-endscreen-title");
    this.endscreenDetailEl = this.root.querySelector(".td-endscreen-detail");
    this.restartBtn = this.root.querySelector(".td-restart-btn");

    var self = this;
    this._onRestartClick = function () {
      if (self.callbacks.onRestart) self.callbacks.onRestart();
    };
    this.restartBtn.addEventListener("click", this._onRestartClick);
  }

  Hud.prototype.update = function (state) {
    var hearts = "";
    for (var i = 0; i < state.maxHealth; i++) {
      hearts += i < state.health ? "♥" : "♡";
    }
    this.healthEl.textContent = hearts;
    this.scoreEl.textContent = "Score: " + Math.floor(state.score);
    this.objectiveEl.textContent = this._objectiveText(state);
  };

  Hud.prototype._objectiveText = function (state) {
    var goal = this.spec.goal;
    if (goal.type === "survive") {
      var remaining = Math.max(0, goal.duration - state.elapsed);
      return "Survive: " + remaining.toFixed(1) + "s";
    }
    if (goal.type === "score") {
      return "Score target: " + Math.floor(state.score) + " / " + goal.targetScore;
    }
    if (goal.type === "eliminate") {
      return "Enemies left: " + state.enemiesRemaining;
    }
    // COLLECTIBLES+OBSTACLES round — "eliminate" İLE AYNI desen.
    if (goal.type === "collect") {
      var total = this.spec.collectibles ? this.spec.collectibles.length : 0;
      var collected = Math.max(0, total - state.collectiblesRemaining);
      return "Collected: " + collected + " / " + total;
    }
    return "";
  };

  Hud.prototype.flashDamage = function () {
    var el = this.flashEl;
    el.classList.remove("td-flash-active");
    // Reflow'u zorla — animasyonun her hasar alışta YENİDEN tetiklenmesi için
    // (aksi halde class zaten "active" ise ikinci ekleme hiçbir şey yapmaz).
    void el.offsetWidth;
    el.classList.add("td-flash-active");
  };

  // COLLECTIBLES+OBSTACLES round — flashDamage() İLE BİREBİR AYNI desen
  // (class kaldır -> reflow zorla -> class ekle), sadece hedef element ve
  // class adı farklı. Score'un üstünde kısa bir "pop" — "kötü" tam ekran
  // kırmızı vignette'ten (flashDamage) bilinçli olarak AYRIŞTIRILMIŞ, küçük
  // ve "iyi" hissettiren bir HUD-seviyesi geri bildirim.
  Hud.prototype.flashCollect = function () {
    var el = this.scoreEl;
    el.classList.remove("td-score-pop");
    void el.offsetWidth;
    el.classList.add("td-score-pop");
  };

  Hud.prototype.showEndScreen = function (status) {
    this.endscreenEl.classList.remove("td-hidden");
    this.endscreenTitleEl.textContent = status === "won" ? "You Win!" : "You Lose";
    this.endscreenDetailEl.textContent = status === "won" ? "Objective complete." : "Try again.";
  };

  Hud.prototype.hideEndScreen = function () {
    this.endscreenEl.classList.add("td-hidden");
  };

  Hud.prototype.destroy = function () {
    this.restartBtn.removeEventListener("click", this._onRestartClick);
    if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
  };

  ns.Hud = Hud;
})(window.TopDownRuntime);
