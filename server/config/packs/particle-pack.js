/**
 * ROUND 25 — Kenney Particle Pack (Selin'in kendi sağladığı, CC0 lisanslı
 * gerçek asset paketi; bkz. public/assets/packs/particle-pack/ATTRIBUTION.md).
 * Kaynak: Kenney Vleugels (kenney.nl), CC0.
 *
 * Düz 2D PNG paketi (3D model YOK). Ham pakette 195 dosya var (~80 farklı
 * partikül türü × transparent/black-background × açılı rotasyon
 * varyantları). Sadece 5 genel-amaçlı, kitler-arası GERÇEKTEN kullanılabilir
 * efekt seçildi — paketin TAMAMI tek bir kite rastgele "dump" edilmedi
 * (Selin'in isteği #5F).
 *
 * Mimari: yeni bir kavram İCAT EDİLMEDİ — legacy-core.js'teki mevcut
 * "sparkle" assetinin ["endless-runner","fruit-puzzle"] gibi ÇOK-kitli
 * compatibleGameTypes deseni AYNEN tekrar kullanıldı: her partikül, id'si
 * hangi kit(ler)in roles.effect dizisinde GEÇERSE o kit(ler)in
 * compatibleGameTypes listesine sahip. assetKits.test.js'teki genel
 * cross-consistency testi bunu otomatik doğruluyor.
 *
 *   - hit-impact  -> dungeon-rpg (vuruş efekti) + city (çarpışma efekti)
 *   - magic-glow  -> dungeon-rpg (büyü/iksir parıltısı)
 *   - smoke-puff  -> city (araç/inşaat dumanı) + cooking (pişirme dumanı)
 *   - spark-burst -> city (elektrik/çarpışma kıvılcımı)
 *   - star-sparkle -> cooking (tarif/başarı parıltısı)
 */
var PARTICLE_PACK_ASSETS = [
  {
    id: "particle_hit_impact",
    path: "/assets/packs/particle-pack/effects/hit-impact.png",
    category: "effect",
    name: "Hit Impact",
    tags: ["particle", "impact", "hit", "scorch", "effect", "kenney"],
    compatibleGameTypes: ["dungeon-rpg", "city"],
    visualStyle: "kenney-particle-pack-v1",
    pack: "particle-pack",
    animationType: "static",
  },
  {
    id: "particle_magic_glow",
    path: "/assets/packs/particle-pack/effects/magic-glow.png",
    category: "effect",
    name: "Magic Glow",
    tags: ["particle", "magic", "glow", "effect", "kenney"],
    compatibleGameTypes: ["dungeon-rpg"],
    visualStyle: "kenney-particle-pack-v1",
    pack: "particle-pack",
    animationType: "static",
  },
  {
    id: "particle_smoke_puff",
    path: "/assets/packs/particle-pack/effects/smoke-puff.png",
    category: "effect",
    name: "Smoke Puff",
    tags: ["particle", "smoke", "puff", "effect", "kenney"],
    compatibleGameTypes: ["city", "cooking"],
    visualStyle: "kenney-particle-pack-v1",
    pack: "particle-pack",
    animationType: "static",
  },
  {
    id: "particle_spark_burst",
    path: "/assets/packs/particle-pack/effects/spark-burst.png",
    category: "effect",
    name: "Spark Burst",
    tags: ["particle", "spark", "burst", "effect", "kenney"],
    compatibleGameTypes: ["city"],
    visualStyle: "kenney-particle-pack-v1",
    pack: "particle-pack",
    animationType: "static",
  },
  {
    id: "particle_star_sparkle",
    path: "/assets/packs/particle-pack/effects/star-sparkle.png",
    category: "effect",
    name: "Star Sparkle",
    tags: ["particle", "star", "sparkle", "effect", "kenney"],
    compatibleGameTypes: ["cooking"],
    visualStyle: "kenney-particle-pack-v1",
    pack: "particle-pack",
    animationType: "static",
  },
];

module.exports = { PARTICLE_PACK_ASSETS: PARTICLE_PACK_ASSETS };
