/**
 * CUSTOM ASSET LIBRARY round — POST /api/assets/libraries (upload) ve
 * GET /api/assets/libraries (listing).
 *
 * Neden multipart/form-data DEĞİL, ham binary body: proje bugüne kadar
 * hiçbir multipart-parsing dependency'si (multer vb.) kullanmıyor. Modern
 * `fetch(url, { body: file })` bir File/Blob'u DOĞRUDAN body olarak
 * gönderebiliyor — bu yüzden `express.raw()` ile ZIP'in ham byte'larını
 * okumak, yeni bir dependency eklemeden en basit/güvenli yol (bkz.
 * zipReader.js dosya başı notu — aynı "yeni dependency ekleme" gerekçesi).
 *
 * API key/secret bu route'un HİÇBİR yerinde okunmuyor/kullanılmıyor —
 * upload tamamen yerel dosya sistemi işlemi.
 */
const express = require("express");
const customAssetLibrary = require("../services/customAssetLibrary");

const router = express.Router();

var MAX_ZIP_BYTES = 20 * 1024 * 1024; // 20MB — ZIP'in KENDİSİ için üst sınır (sıkıştırılmamış toplam ayrıca customAssetLibrary.js'te ayrıca sınırlanıyor)

router.post(
  "/assets/libraries",
  express.raw({ type: ["application/zip", "application/octet-stream"], limit: MAX_ZIP_BYTES }),
  function (req, res) {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ error: "Yüklenen ZIP dosyası boş veya okunamadı." });
    }

    try {
      var summary = customAssetLibrary.registerLibrary(req.body);
      return res.status(201).json({ library: summary });
    } catch (err) {
      if (err instanceof customAssetLibrary.ValidationError) {
        return res.status(400).json({ error: err.message, details: err.details });
      }
      console.error("[assetLibraries] beklenmeyen hata:", err.message);
      return res.status(500).json({ error: "Beklenmeyen bir hata oluştu." });
    }
  }
);

// Bu router'a ÖZEL hata yakalayıcı — SADECE express.raw()'ın boyut limiti
// aşıldığında (err.type === "entity.too.large") fırlattığı hatayı temiz bir
// JSON'a çevirir. server/index.js'e genel bir error-handling middleware
// EKLENMEDİ (diğer route'ların davranışını hiç etkilememek için) — bu
// sadece BU router'ın kendi zincirinde çalışır.
router.use(function (err, req, res, next) {
  if (err && err.type === "entity.too.large") {
    return res.status(413).json({ error: "Yüklenen ZIP çok büyük (limit: " + MAX_ZIP_BYTES + " bayt)." });
  }
  if (err) {
    console.error("[assetLibraries] beklenmeyen hata:", err.message);
    return res.status(500).json({ error: "Beklenmeyen bir hata oluştu." });
  }
  return next();
});

router.get("/assets/libraries", function (req, res) {
  res.json({ libraries: customAssetLibrary.listLibraries() });
});

module.exports = router;
