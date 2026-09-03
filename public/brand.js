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
// zaman kopyalanmadı). Rozetin kendisi artık dolu bir kare değil, CSS
// tarafında (.brand-mark, style.css) clip-path ile sekizgen/octagon
// çerçeveli, içi koyu/yarı saydam altın kenarlıklı bir rozet — glif bu
// çerçevenin içine oturuyor.
// Favicon'daki (index.html <head>) statik SVG, JS çalışmadan önce
// tarayıcı tarafından okunduğu için bu glifin ayrı, gömülü bir kopyasını
// taşımak zorunda — ikisi kasıtlı olarak aynı tasarımı paylaşıyor.
(function () {
  window.PLAYABLE_BRAND = {
    name: "Playable AI",
    tagline: "Playable Ad Generator",
    markSvg:
      '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<path d="M12 2.2L14.15 9.85L21.8 12L14.15 14.15L12 21.8L9.85 14.15L2.2 12L9.85 9.85L12 2.2Z" fill="#fff"/>' +
      "</svg>",
  };
})();
