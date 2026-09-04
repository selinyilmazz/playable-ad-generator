/**
 * ROUND 25 — Kenney City Kit Industrial 2.0 (Selin'in kendi sağladığı, CC0
 * lisanslı gerçek asset paketi; bkz.
 * public/assets/packs/city-kit-industrial/ATTRIBUTION.md). Kaynak: Kenney
 * (kenney.nl), CC0.
 *
 * 3D model paketi (bkz. car-kit.js'teki aynı not) — kullanılan kaynak
 * `Previews/` render'ları. Ham pakette 20 farklı bina (a-t) + 3 shipping
 * container varyantı + 1 su kulesi var; kontrol edilen contact sheet'e
 * göre bunların çoğu birbirine çok benzer boy/kütle varyasyonları —
 * SADECE görsel olarak en belirgin biçimde FARKLI 4 obje seçildi (2 farklı
 * bina siluetı + su kulesi + konteyner), 20 binanın tamamı DEĞİL (bkz.
 * ATTRIBUTION.md).
 */
var CITY_KIT_INDUSTRIAL_ASSETS = [
  {
    id: "cityindustrial_building_office",
    path: "/assets/packs/city-kit-industrial/objects/building-office.png",
    category: "game-object",
    name: "Office Building",
    tags: ["building", "office", "skyline", "scenery", "decoration", "city", "kenney"],
    gameplayRole: ["decoration"],
    compatibleGameTypes: ["city"],
    visualStyle: "kenney-city-kit-industrial-v1",
    theme: "city",
    pack: "city-kit-industrial",
    animationType: "static",
  },
  {
    id: "cityindustrial_building_factory",
    path: "/assets/packs/city-kit-industrial/objects/building-factory.png",
    category: "game-object",
    name: "Factory Building",
    tags: ["building", "factory", "industrial", "scenery", "decoration", "city", "kenney"],
    gameplayRole: ["decoration"],
    compatibleGameTypes: ["city"],
    visualStyle: "kenney-city-kit-industrial-v1",
    theme: "city",
    pack: "city-kit-industrial",
    animationType: "static",
  },
  {
    id: "cityindustrial_water_tower",
    path: "/assets/packs/city-kit-industrial/objects/water-tower.png",
    category: "game-object",
    name: "Water Tower",
    tags: ["water-tower", "industrial", "scenery", "decoration", "city", "kenney"],
    gameplayRole: ["decoration"],
    compatibleGameTypes: ["city"],
    visualStyle: "kenney-city-kit-industrial-v1",
    theme: "city",
    pack: "city-kit-industrial",
    animationType: "static",
  },
  {
    id: "cityindustrial_shipping_container",
    path: "/assets/packs/city-kit-industrial/objects/shipping-container.png",
    category: "game-object",
    name: "Shipping Container",
    tags: ["container", "shipping", "industrial", "scenery", "decoration", "city", "kenney"],
    gameplayRole: ["decoration"],
    compatibleGameTypes: ["city"],
    visualStyle: "kenney-city-kit-industrial-v1",
    theme: "city",
    pack: "city-kit-industrial",
    animationType: "static",
  },
];

module.exports = { CITY_KIT_INDUSTRIAL_ASSETS: CITY_KIT_INDUSTRIAL_ASSETS };
