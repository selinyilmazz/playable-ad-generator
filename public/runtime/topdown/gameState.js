/**
 * TOP-DOWN PLAYABLE GAME RUNTIME — GameState
 *
 * Health/score/süre/win-lose durumunu tutan tek yer. Win/Lose koşulları
 * BİLEREK küçük, isim-anahtarlı (string key) STRATEJİ TABLOLARI olarak
 * tanımlandı (WIN_CONDITIONS / LOSE_CONDITIONS) — "tek bir oyuna özel
 * hardcode yazma" kısıtını burada somutlaştıran yer burası: yeni bir hedef
 * türü eklemek (örn. "collectAllItems") sadece bu tabloya bir girdi eklemek
 * demektir, gameState.js'in veya runtime.js'in başka hiçbir yerine
 * dokunmadan. specSchema.js zaten goal.type/lose.type'ı bilinen bir
 * değere düşürdüğü için buradaki tablo lookup'ları her zaman güvenli.
 *
 * Sadece specSchema.js'in ürettiği normalize edilmiş bir spec objesine
 * bağımlı; DOM/canvas'a dokunmaz.
 */
window.TopDownRuntime = window.TopDownRuntime || {};

(function (ns) {
  "use strict";

  var WIN_CONDITIONS = {
    survive: function (state, spec) {
      return state.elapsed >= spec.goal.duration;
    },
    score: function (state, spec) {
      return state.score >= spec.goal.targetScore;
    },
    eliminate: function (state, spec) {
      return spec.enemies.count > 0 && state.enemiesRemaining <= 0;
    },
    // COLLECTIBLES+OBSTACLES round — "eliminate"in BİREBİR aynı deseni,
    // sadece enemiesRemaining/enemies.count yerine collectiblesRemaining/
    // spec.collectibles (dizi, bu yüzden .length). spec.collectibles hiç
    // yoksa (eski bir spec/çağıran) collect goal'u hiç "won" tetiklemez —
    // çökmez, sadece anlamsızca hiç bitmez (spec yazarının sorumluluğu:
    // "collect" seçtiyse collectibles de tanımlamalı).
    collect: function (state, spec) {
      var total = spec.collectibles ? spec.collectibles.length : 0;
      return total > 0 && state.collectiblesRemaining <= 0;
    },
  };

  var LOSE_CONDITIONS = {
    healthZero: function (state) {
      return state.health <= 0;
    },
  };

  function GameState(spec) {
    this.spec = spec;
    this.reset();
  }

  GameState.prototype.reset = function () {
    this.elapsed = 0;
    this.score = 0;
    this.maxHealth = this.spec.player.health;
    this.health = this.spec.player.health;
    this.enemiesRemaining = this.spec.enemies.count;
    // COLLECTIBLES+OBSTACLES round — spec.collectibles hep bir dizi
    // (specSchema.js normalizeSpec()'in garantisi, bkz. o dosya), ama
    // GameState doğrudan elle de çağrılabildiği (örn. testler) için
    // savunmacı bir fallback bırakıldı.
    this.collectiblesRemaining = this.spec.collectibles ? this.spec.collectibles.length : 0;
    // "playing" | "won" | "lost"
    this.status = "playing";
  };

  GameState.prototype.update = function (dt) {
    if (this.status !== "playing") return;

    this.elapsed += dt;
    this.score += dt * this.spec.score.pointsPerSecond;

    var loseFn = LOSE_CONDITIONS[this.spec.lose.type] || LOSE_CONDITIONS.healthZero;
    if (loseFn(this, this.spec)) {
      this.status = "lost";
      return;
    }

    var winFn = WIN_CONDITIONS[this.spec.goal.type] || WIN_CONDITIONS.survive;
    if (winFn(this, this.spec)) {
      this.status = "won";
    }
  };

  GameState.prototype.applyDamage = function (amount) {
    this.health = Math.max(0, this.health - amount);
  };

  GameState.prototype.addScore = function (amount) {
    this.score += amount;
  };

  GameState.prototype.enemyDefeated = function () {
    this.enemiesRemaining = Math.max(0, this.enemiesRemaining - 1);
    this.addScore(this.spec.score.pointsPerEnemyDefeated);
  };

  // COLLECTIBLES+OBSTACLES round — enemyDefeated() İLE BİREBİR AYNI desen.
  // "score veya ilgili objective/progress güncellensin": goal.type "collect"
  // OLMASA BİLE (survive/score/eliminate), toplanan her item skoru artırır —
  // collectible'lar sadece "collect" hedefine özel değil, evrensel bir
  // ödül/feedback mekanizması.
  GameState.prototype.collectItem = function () {
    this.collectiblesRemaining = Math.max(0, this.collectiblesRemaining - 1);
    this.addScore(this.spec.score.pointsPerCollectible);
  };

  ns.GameState = GameState;
  // Test edilebilirlik + gelecekte yeni bir goal/lose türü eklerken referans
  // alınabilmesi için dışa açık (additive, runtime.js'in normal akışını
  // etkilemez).
  ns.WIN_CONDITIONS = WIN_CONDITIONS;
  ns.LOSE_CONDITIONS = LOSE_CONDITIONS;
})(window.TopDownRuntime);
