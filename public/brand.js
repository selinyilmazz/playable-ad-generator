// Merkezi marka tanımı — isim, tagline ve ORİJİNAL logo sembolü tek bir
// yerden yönetiliyor. Proje bir bundler/framework kullanmadığı için
// (bkz. package.json — sadece express + dotenv, build adımı yok) bu dosya
// düz bir <script> olarak app.js'den ÖNCE yükleniyor ve global bir
// PLAYABLE_BRAND objesi tanımlıyor. "src/lib/brand.js" değil "public/brand.js"
// olarak konumlandırıldı çünkü proje zaten public/ + server/ düz klasör
// yapısını kullanıyor; yeni bir src/ hiyerarşisi açmak mevcut mimariyle
// tutarsız ve gereksiz olurdu.
//
// ROUND 7: marka sembolü yenilendi — bir "meşale alevi" + iki "AI spark"
// noktası. Selin'in paylaştığı referans görselde bir meşale/kadeh amblemi
// vardı; O GÖRSELİN kendisi (ve içindeki orman/geyik illüstrasyonu)
// izlenmedi/kopyalanmadı — muhtemelen başka bir ürüne ait özgün bir marka
// ve sanat eseri olduğu için. Bunun yerine buradaki "alev" TAMAMEN yeni,
// basit, parametrik bir damla/alev silüeti (path elle, referans olmadan
// yazıldı) — sadece TEMADAN ("meşale/ateş" motifi) ilham alındı.
//
// ROUND 11: sidebar'ı yeni bir referans görsele göre uyarlarken sembol
// tekrar güncellendi — artık dört uçlu bir "sparkle/yıldız" glifi (elle
// çizilmiş basit bir path, referans görselden izlenmedi/kopyalanmadı;
// sadece "ışıltı/AI" temasından ilham alındı, kadeh/orman amblemi hiçbir
// zaman kopyalanmadı).
//
// ROUND G: markSvg, artık index.html <head>'teki favicon <link>'in AYNI
// SVG'si (octagon-rozet path'i + sparkle path'i, aynı koordinatlar/aynı
// renkler) — birebir kopya, yeniden tasarlanmadı. Amaç: browser tab'ındaki
// ikonla sidebar'daki marka ikonunun TEK, tutarlı bir kaynaktan gelmesi.
// Önceden bu iki path CSS tarafında (.brand-mark clip-path + border, artı
// ayrı renkli/tek path'lik bir sparkle SVG) İKİ FARKLI TEKNİKLE ayrı ayrı
// yeniden üretiliyordu — bu artık gereksiz bir "duplicate icon" idi, bu
// yüzden kaldırıldı (bkz. style.css .brand-mark). Favicon'un statik kopyası
// index.html'de KENDİ HALİNE dokunulmadan bırakıldı (ikisi kasıtlı olarak
// aynı SVG'yi paylaşıyor, biri favicon için gömülü/statik, diğeri bu
// dosyadan JS ile enjekte ediliyor).
(function () {
  window.PLAYABLE_BRAND = {
    name: "Playable AI",
    tagline: "Playable Ad Generator",
    markSvg:
      '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<path d="M9 2H23L30 9V23L23 30H9L2 23V9Z" fill="#0a0d18" fill-opacity="0.92" stroke="#e8b94d" stroke-width="1.5"/>' +
      '<path d="M16 2.93L18.87 13.13L29.07 16L18.87 18.87L16 29.07L13.13 18.87L2.93 16L13.13 13.13L16 2.93Z" fill="#f6d888"/>' +
      "</svg>",
  };
})();
