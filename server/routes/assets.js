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
// CUSTOM ASSET LIBRARY round — additive: default 181 asset (yukarıdaki
// ASSET_MANIFEST_ENRICHED) HİÇ değişmedi/dokunulmadı. Yüklenmiş custom
// library'lerin assetleri AYNI `assets` dizisine, SADECE SONUNA eklenir —
// frontend'in mevcut kategori/grup render mantığı (public/app.js
// renderAssetLibrary) hiçbir değişiklik gerektirmeden bunları otomatik
// doğru kategori altında gösterir (her ikisi de aynı category/group şemasını
// paylaşıyor, bkz. customAssetLibrary.js).
const customAssetLibrary = require("../services/customAssetLibrary");

const router = express.Router();

router.get("/assets", function (req, res) {
  res.json({
    assets: ASSET_MANIFEST_ENRICHED.concat(customAssetLibrary.listAllCustomAssets()),
    groups: ASSET_GROUPS,
    // additive alan — frontend'in "Custom Libraries" özet satırını
    // (bkz. app.js) doldurmak için; assets dizisini PARSE ETMEYE gerek
    // kalmadan library adı/sayısı burada hazır.
    customLibraries: customAssetLibrary.listLibraries(),
  });
});

module.exports = router;
