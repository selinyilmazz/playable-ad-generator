/**
 * Kontrol sonuçlarından tek bir kalite skoru (0-100) hesaplar.
 * Scoring mantığı check tanımlarından bilerek ayrı tutuldu (kural: validation,
 * scoring ve auto-fix birbirinden ayrı olmalı) — ağırlıklandırma stratejisi
 * ileride buradan tek yerden değiştirilebilir.
 *
 * pass   -> 1 puan
 * warning -> 0.5 puan
 * fail   -> 0 puan
 */
function computeScore(checks) {
  if (!checks || checks.length === 0) return 0;

  var total = 0;
  checks.forEach(function (c) {
    if (c.status === "pass") total += 1;
    else if (c.status === "warning") total += 0.5;
  });

  return Math.round((total / checks.length) * 100);
}

module.exports = { computeScore: computeScore };
