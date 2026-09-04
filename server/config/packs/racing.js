/**
 * ROUND 23 — Kenney Racing Pack (Selin'in kendi sağladığı, CC0 lisanslı
 * gerçek asset paketi; bkz. public/assets/packs/racing/ATTRIBUTION.md).
 * Kaynak: Kenney Vleugels (kenney.nl), CC0 — ticari kullanım VE yeniden
 * dağıtım (compiled/generated oyun içinde embed dahil) açıkça izinli,
 * attribution şart değil (yine de ATTRIBUTION.md'de verildi).
 *
 * Ham pakette 423 PNG var (Cars 50, Characters 17, Motorcycles 5,
 * Objects 39, Tiles 6×14-90). Bunlardan SADECE 15'i, "az ama tutarlı
 * kürasyon" prensibiyle (sunnyland-forest/kenney-space-shooter ile aynı
 * ölçek) seçildi — tam gerekçe ve seçilmeyen kategorilerin (Characters/*
 * top-down yaya kafaları, 90 parçalık tam tilemap'in geri kalanı,
 * Dirt/Sand road varyantları) neden dışarıda bırakıldığı
 * ATTRIBUTION.md'de detaylandırıldı.
 *
 * "vehicle" ve "tile" category değerleri — assetManifest.js'te Round 18'de
 * ("racing gibi türler için" notuyla) ÖNCEDEN tanımlanmış ama bugüne kadar
 * hiçbir assette kullanılmamıştı. Bu pack bu iki kategorinin İLK gerçek
 * kullanıcısı — şema değişikliği GEREKMEDİ.
 *
 * Pakette klasik coin/gem/star tarzı bir collectible, nitro/kalkan gibi bir
 * power-up ikonu, tek-kare kapsayan bir "background" sahnesi, ya da bir
 * hız-göstergesi/UI ikonu YOK (assetPacks.js'teki eski PLANNED_PACKS_RAW
 * tahmini bunları varsaymıştı — gerçek pakette dosya dosya kontrol edildi,
 * yok; bkz. assetKits.js racing kitinin missingRoles'ü, uydurulmadı).
 */
var RACING_ASSETS = [
  // ---------------- player (2) ----------------
  {
    id: "racing_car_player_red",
    path: "/assets/packs/racing/characters/car-player-red.png",
    category: "vehicle",
    name: "Player Car (Red)",
    tags: ["car", "vehicle", "player", "racing", "red", "kenney"],
    gameplayRole: ["player"],
    compatibleGameTypes: ["racing"],
    visualStyle: "kenney-racing-v1",
    theme: "racing",
    pack: "racing",
    animationType: "static",
  },
  {
    id: "racing_car_player_blue",
    path: "/assets/packs/racing/characters/car-player-blue.png",
    category: "vehicle",
    name: "Player Car (Blue)",
    tags: ["car", "vehicle", "player", "racing", "blue", "kenney"],
    gameplayRole: ["player"],
    compatibleGameTypes: ["racing"],
    visualStyle: "kenney-racing-v1",
    theme: "racing",
    pack: "racing",
    animationType: "static",
  },

  // ---------------- obstacle (6) ----------------
  // 2 farklı gövde şekilli trafik aracı + 1 motosiklet: BİLEREK player
  // aracından farklı gövde/renk (palet-swap değil) — oyuncunun kendi
  // aracını trafikten görsel olarak ayırt edebilmesi için (bkz.
  // ATTRIBUTION.md, Round 22'nin hazard/interaction legibility ilkesiyle
  // doğrudan uyumlu).
  {
    id: "racing_traffic_car_yellow",
    path: "/assets/packs/racing/characters/car-traffic-yellow.png",
    category: "vehicle",
    name: "Traffic Car (Yellow)",
    tags: ["car", "vehicle", "traffic", "obstacle", "racing", "yellow", "kenney"],
    gameplayRole: ["obstacle", "traffic"],
    compatibleGameTypes: ["racing"],
    visualStyle: "kenney-racing-v1",
    theme: "racing",
    pack: "racing",
    animationType: "static",
  },
  {
    id: "racing_traffic_car_green",
    path: "/assets/packs/racing/characters/car-traffic-green.png",
    category: "vehicle",
    name: "Traffic Car (Green)",
    tags: ["car", "vehicle", "traffic", "obstacle", "racing", "green", "kenney"],
    gameplayRole: ["obstacle", "traffic"],
    compatibleGameTypes: ["racing"],
    visualStyle: "kenney-racing-v1",
    theme: "racing",
    pack: "racing",
    animationType: "static",
  },
  {
    id: "racing_motorcycle_black",
    path: "/assets/packs/racing/characters/motorcycle-black.png",
    category: "vehicle",
    name: "Traffic Motorcycle (Black)",
    tags: ["motorcycle", "vehicle", "traffic", "obstacle", "racing", "kenney"],
    gameplayRole: ["obstacle", "traffic"],
    compatibleGameTypes: ["racing"],
    visualStyle: "kenney-racing-v1",
    theme: "racing",
    pack: "racing",
    animationType: "static",
  },
  {
    id: "racing_cone",
    path: "/assets/packs/racing/objects/cone.png",
    category: "obstacle",
    name: "Traffic Cone",
    tags: ["cone", "obstacle", "hazard", "racing", "kenney"],
    gameplayRole: ["obstacle"],
    compatibleGameTypes: ["racing"],
    visualStyle: "kenney-racing-v1",
    theme: "racing",
    pack: "racing",
    animationType: "static",
  },
  {
    id: "racing_oil_slick",
    path: "/assets/packs/racing/objects/oil-slick.png",
    category: "obstacle",
    name: "Oil Slick",
    tags: ["oil", "slick", "obstacle", "hazard", "slippery", "racing", "kenney"],
    gameplayRole: ["obstacle"],
    compatibleGameTypes: ["racing"],
    visualStyle: "kenney-racing-v1",
    theme: "racing",
    pack: "racing",
    animationType: "static",
  },
  {
    id: "racing_barrier",
    path: "/assets/packs/racing/objects/barrier.png",
    category: "obstacle",
    name: "Track Barrier",
    tags: ["barrier", "obstacle", "hazard", "track", "racing", "kenney"],
    gameplayRole: ["obstacle"],
    compatibleGameTypes: ["racing"],
    visualStyle: "kenney-racing-v1",
    theme: "racing",
    pack: "racing",
    animationType: "static",
  },

  // ---------------- platform (1) — mock'un mevcut #platform-row (4x
  // tekrarlanan zemin şeridi) render mantığına AYNEN oturuyor, kod
  // değişikliği gerekmedi. ----------------
  {
    id: "racing_tile_road_straight",
    path: "/assets/packs/racing/tiles/road-straight.png",
    category: "tile",
    name: "Road Tile — Straight",
    tags: ["road", "track", "tile", "straight", "asphalt", "racing", "kenney"],
    gameplayRole: ["track"],
    compatibleGameTypes: ["racing"],
    visualStyle: "kenney-racing-v1",
    theme: "racing",
    pack: "racing",
    animationType: "static",
  },

  // ---------------- tile (2) — SADECE gerçek (LLM) üretimde görünür
  // (mock şablonu bu rolü tüketmiyor, forest-platformer'ın "decoration"
  // rolüyle aynı desen). ----------------
  {
    id: "racing_tile_road_curve",
    path: "/assets/packs/racing/tiles/road-curve.png",
    category: "tile",
    name: "Road Tile — Curve",
    tags: ["road", "track", "tile", "curve", "corner", "asphalt", "racing", "kenney"],
    gameplayRole: ["track"],
    compatibleGameTypes: ["racing"],
    visualStyle: "kenney-racing-v1",
    theme: "racing",
    pack: "racing",
    animationType: "static",
  },
  {
    id: "racing_tile_finish_line",
    path: "/assets/packs/racing/tiles/road-finish-line.png",
    category: "tile",
    name: "Road Tile — Finish Line",
    tags: ["road", "track", "tile", "finish", "checkered", "goal", "asphalt", "racing", "kenney"],
    gameplayRole: ["track", "goal"],
    compatibleGameTypes: ["racing"],
    visualStyle: "kenney-racing-v1",
    theme: "racing",
    pack: "racing",
    animationType: "static",
  },

  // ---------------- effect (1) ----------------
  {
    id: "racing_skidmark",
    path: "/assets/packs/racing/effects/skidmark.png",
    category: "effect",
    name: "Skidmark (Drift Effect)",
    tags: ["skidmark", "drift", "effect", "tire", "racing", "kenney"],
    compatibleGameTypes: ["racing"],
    visualStyle: "kenney-racing-v1",
    theme: "racing",
    pack: "racing",
    animationType: "static",
  },

  // ---------------- decoration (3) — SADECE gerçek (LLM) üretimde
  // görünür (mock tüketmiyor) — sunnyland_house/mushroom/plant/vine ile
  // BİREBİR aynı desen: category "game-object" + gameplayRole
  // ["decoration"]. ----------------
  {
    id: "racing_tree_large",
    path: "/assets/packs/racing/objects/tree-large.png",
    category: "game-object",
    name: "Trackside Tree (Large)",
    tags: ["tree", "scenery", "decoration", "racing", "kenney"],
    gameplayRole: ["decoration"],
    compatibleGameTypes: ["racing"],
    visualStyle: "kenney-racing-v1",
    theme: "racing",
    pack: "racing",
    animationType: "static",
  },
  {
    id: "racing_tribune",
    path: "/assets/packs/racing/objects/tribune.png",
    category: "game-object",
    name: "Spectator Tribune",
    tags: ["tribune", "grandstand", "crowd", "scenery", "decoration", "racing", "kenney"],
    gameplayRole: ["decoration"],
    compatibleGameTypes: ["racing"],
    visualStyle: "kenney-racing-v1",
    theme: "racing",
    pack: "racing",
    animationType: "static",
  },
  {
    id: "racing_tent",
    path: "/assets/packs/racing/objects/tent.png",
    category: "game-object",
    name: "Paddock Tent",
    tags: ["tent", "paddock", "pit", "scenery", "decoration", "racing", "kenney"],
    gameplayRole: ["decoration"],
    compatibleGameTypes: ["racing"],
    visualStyle: "kenney-racing-v1",
    theme: "racing",
    pack: "racing",
    animationType: "static",
  },
];

module.exports = { RACING_ASSETS: RACING_ASSETS };
