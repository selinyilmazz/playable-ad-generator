/**
 * ROUND 25 — Kenney City Kit Roads (Selin'in kendi sağladığı, CC0 lisanslı
 * gerçek asset paketi; bkz. public/assets/packs/city-kit-roads/ATTRIBUTION.md).
 * Kaynak: Kenney (kenney.nl), CC0 — ticari kullanım VE yeniden dağıtım
 * açıkça izinli, attribution şart değil.
 *
 * Bu da bir 3D model paketi (bkz. car-kit.js'teki aynı not) — gerçek
 * kullanılan kaynak `Previews/` klasöründeki düz render'lar.
 *
 * Ham pakette 487 dosya var (~95 preview + onlarca yol/kavşak/bariyer
 * varyantı olan devasa bir modüler yol tilemap sistemi). Sadece 9 temsilci
 * parça seçildi: 3 yol karosu (düz/viraj/kavşak) + 6 sahne objesi
 * (koni/bariyer/trafik ışığı/dur tabelası/çöp konteyneri/elektrik direği)
 * — yüzlerce varyantın tamamı DEĞİL, sadece pipeline'ın gerçekten
 * kullanabileceği temsilci alt küme (bkz. ATTRIBUTION.md).
 */
var CITY_KIT_ROADS_ASSETS = [
  // ---------------- tile (3: 1 platform + 2 tile) ----------------
  {
    id: "cityroads_tile_road_straight",
    path: "/assets/packs/city-kit-roads/tiles/road-straight.png",
    category: "tile",
    name: "Road Tile — Straight",
    tags: ["road", "street", "tile", "straight", "asphalt", "city", "kenney"],
    gameplayRole: ["track"],
    compatibleGameTypes: ["city"],
    visualStyle: "kenney-city-kit-roads-v1",
    theme: "city",
    pack: "city-kit-roads",
    animationType: "static",
  },
  {
    id: "cityroads_tile_road_curve",
    path: "/assets/packs/city-kit-roads/tiles/road-curve.png",
    category: "tile",
    name: "Road Tile — Curve",
    tags: ["road", "street", "tile", "curve", "corner", "asphalt", "city", "kenney"],
    gameplayRole: ["track"],
    compatibleGameTypes: ["city"],
    visualStyle: "kenney-city-kit-roads-v1",
    theme: "city",
    pack: "city-kit-roads",
    animationType: "static",
  },
  {
    id: "cityroads_tile_road_intersection",
    path: "/assets/packs/city-kit-roads/tiles/road-intersection.png",
    category: "tile",
    name: "Road Tile — Intersection",
    tags: ["road", "street", "tile", "intersection", "crossroad", "asphalt", "city", "kenney"],
    gameplayRole: ["track"],
    compatibleGameTypes: ["city"],
    visualStyle: "kenney-city-kit-roads-v1",
    theme: "city",
    pack: "city-kit-roads",
    animationType: "static",
  },

  // ---------------- obstacle (2) ----------------
  {
    id: "cityroads_cone",
    path: "/assets/packs/city-kit-roads/objects/construction-cone.png",
    category: "obstacle",
    name: "Construction Cone",
    tags: ["cone", "construction", "obstacle", "hazard", "city", "kenney"],
    gameplayRole: ["obstacle"],
    compatibleGameTypes: ["city"],
    visualStyle: "kenney-city-kit-roads-v1",
    theme: "city",
    pack: "city-kit-roads",
    animationType: "static",
  },
  {
    id: "cityroads_barrier",
    path: "/assets/packs/city-kit-roads/objects/construction-barrier.png",
    category: "obstacle",
    name: "Construction Barrier",
    tags: ["barrier", "construction", "obstacle", "hazard", "city", "kenney"],
    gameplayRole: ["obstacle"],
    compatibleGameTypes: ["city"],
    visualStyle: "kenney-city-kit-roads-v1",
    theme: "city",
    pack: "city-kit-roads",
    animationType: "static",
  },

  // ---------------- gameObject (2) ----------------
  {
    id: "cityroads_traffic_light",
    path: "/assets/packs/city-kit-roads/objects/traffic-light.png",
    category: "game-object",
    name: "Traffic Light",
    tags: ["traffic-light", "street", "signal", "city", "kenney"],
    gameplayRole: ["gameObject"],
    compatibleGameTypes: ["city"],
    visualStyle: "kenney-city-kit-roads-v1",
    theme: "city",
    pack: "city-kit-roads",
    animationType: "static",
  },
  {
    id: "cityroads_sign_stop",
    path: "/assets/packs/city-kit-roads/objects/road-sign-stop.png",
    category: "game-object",
    name: "Stop Sign",
    tags: ["sign", "stop", "street", "city", "kenney"],
    gameplayRole: ["gameObject"],
    compatibleGameTypes: ["city"],
    visualStyle: "kenney-city-kit-roads-v1",
    theme: "city",
    pack: "city-kit-roads",
    animationType: "static",
  },

  // ---------------- decoration (2) ----------------
  {
    id: "cityroads_dumpster",
    path: "/assets/packs/city-kit-roads/objects/dumpster.png",
    category: "game-object",
    name: "Dumpster",
    tags: ["dumpster", "trash", "scenery", "decoration", "city", "kenney"],
    gameplayRole: ["decoration"],
    compatibleGameTypes: ["city"],
    visualStyle: "kenney-city-kit-roads-v1",
    theme: "city",
    pack: "city-kit-roads",
    animationType: "static",
  },
  {
    id: "cityroads_electricity_pole",
    path: "/assets/packs/city-kit-roads/objects/electricity-pole.png",
    category: "game-object",
    name: "Electricity Pole",
    tags: ["pole", "electricity", "street", "scenery", "decoration", "city", "kenney"],
    gameplayRole: ["decoration"],
    compatibleGameTypes: ["city"],
    visualStyle: "kenney-city-kit-roads-v1",
    theme: "city",
    pack: "city-kit-roads",
    animationType: "static",
  },
];

module.exports = { CITY_KIT_ROADS_ASSETS: CITY_KIT_ROADS_ASSETS };
