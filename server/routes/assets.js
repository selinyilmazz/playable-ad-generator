/**
 * PHASE 5 — GET /api/assets.
 *
 * Salt-okunur, yan etkisiz bir endpoint: server/config/assetManifest.js'in
 * zenginleştirilmiş (type/preview/animation/group alanlı) halini frontend'e
 * servis eder. Bunun tek amacı REQUIREMENTS #1'in istediği "gerçek dosya
 * tabanlı asset sistemi"ni frontend'e de taşımak — public/app.js'teki
 * ASSET_LIBRARY artık elle senkronize edilen, gittikçe büyüyen bir kopya
 * olmak yerine bu endpoint'ten gerçek veriyi çekebiliyor (bkz. app.js'teki
 * fetch, offline/hata durumunda mevcut sabit diziye fallback yapar).
 *
 * /api/generate, /api/autofix, /api/improve akışlarının HİÇBİRİNE
 * dokunulmuyor — bu tamamen ayrı, yeni ve GET'ten ibaret bir route.
 */
const express = require("express");
const { ASSET_MANIFEST_ENRICHED, ASSET_GROUPS } = require("../config/assetManifest");

const router = express.Router();

router.get("/assets", function (req, res) {
  res.json({
    assets: ASSET_MANIFEST_ENRICHED,
    groups: ASSET_GROUPS,
  });
});

module.exports = router;
