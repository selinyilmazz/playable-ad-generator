/**
 * ROUND 25 — Kenney Car Kit (Selin'in kendi sağladığı, CC0 lisanslı gerçek
 * asset paketi; bkz. public/assets/packs/car-kit/ATTRIBUTION.md).
 * Kaynak: Kenney (kenney.nl), CC0 — ticari kullanım VE yeniden dağıtım
 * (compiled/generated oyun içinde embed dahil) açıkça izinli, attribution
 * şart değil.
 *
 * ÖNEMLİ — bu 3D bir model paketi (Models/{FBX,GLB,OBJ}/ + Textures/,
 * proje sadece düz <img> 2D sprite render ediyor, 3D model dosyaları
 * KULLANILAMAZ). Gerçek kullanılabilir kaynak, paketin `Previews/` klasörü
 * — her modelin isimlendirilmiş, düz, 128x128 render'ı (bkz.
 * ATTRIBUTION.md, "3D model vs 2D sprite" notu).
 *
 * 6 araç seçildi (50 preview dosyasından): 1 sedan (player) + 5 farklı
 * gövde tipi (taxi/police/ambulance/van/garbage-truck, obstacle/trafik).
 * BİLEREK mevcut Racing kitine EKLENMEDİ — Car Kit'in "Kenney low-poly 3D
 * toy" render stili, Racing'in 2D top-down sprite stiliyle görsel olarak
 * çakışıyor (bkz. ATTRIBUTION.md gerekçesi). Bunun yerine bu pack, yeni ve
 * internally-tutarlı bir "city" kitinin parçası.
 */
var CAR_KIT_ASSETS = [
  {
    id: "carkit_vehicle_sedan",
    path: "/assets/packs/car-kit/characters/sedan.png",
    category: "vehicle",
    name: "Player Car (Sedan)",
    tags: ["car", "vehicle", "sedan", "player", "city", "kenney"],
    gameplayRole: ["player"],
    compatibleGameTypes: ["city"],
    visualStyle: "kenney-car-kit-v1",
    theme: "city",
    pack: "car-kit",
    animationType: "static",
  },
  {
    id: "carkit_vehicle_taxi",
    path: "/assets/packs/car-kit/characters/taxi.png",
    category: "vehicle",
    name: "Traffic Car (Taxi)",
    tags: ["car", "vehicle", "taxi", "traffic", "obstacle", "city", "kenney"],
    gameplayRole: ["obstacle", "traffic"],
    compatibleGameTypes: ["city"],
    visualStyle: "kenney-car-kit-v1",
    theme: "city",
    pack: "car-kit",
    animationType: "static",
  },
  {
    id: "carkit_vehicle_police",
    path: "/assets/packs/car-kit/characters/police.png",
    category: "vehicle",
    name: "Traffic Car (Police)",
    tags: ["car", "vehicle", "police", "traffic", "obstacle", "city", "kenney"],
    gameplayRole: ["obstacle", "traffic"],
    compatibleGameTypes: ["city"],
    visualStyle: "kenney-car-kit-v1",
    theme: "city",
    pack: "car-kit",
    animationType: "static",
  },
  {
    id: "carkit_vehicle_ambulance",
    path: "/assets/packs/car-kit/characters/ambulance.png",
    category: "vehicle",
    name: "Traffic Vehicle (Ambulance)",
    tags: ["car", "vehicle", "ambulance", "traffic", "obstacle", "city", "kenney"],
    gameplayRole: ["obstacle", "traffic"],
    compatibleGameTypes: ["city"],
    visualStyle: "kenney-car-kit-v1",
    theme: "city",
    pack: "car-kit",
    animationType: "static",
  },
  {
    id: "carkit_vehicle_van",
    path: "/assets/packs/car-kit/characters/van.png",
    category: "vehicle",
    name: "Traffic Vehicle (Van)",
    tags: ["car", "vehicle", "van", "traffic", "obstacle", "city", "kenney"],
    gameplayRole: ["obstacle", "traffic"],
    compatibleGameTypes: ["city"],
    visualStyle: "kenney-car-kit-v1",
    theme: "city",
    pack: "car-kit",
    animationType: "static",
  },
  {
    id: "carkit_vehicle_garbage_truck",
    path: "/assets/packs/car-kit/characters/garbage-truck.png",
    category: "vehicle",
    name: "Traffic Vehicle (Garbage Truck)",
    tags: ["car", "vehicle", "truck", "garbage", "traffic", "obstacle", "city", "kenney"],
    gameplayRole: ["obstacle", "traffic"],
    compatibleGameTypes: ["city"],
    visualStyle: "kenney-car-kit-v1",
    theme: "city",
    pack: "car-kit",
    animationType: "static",
  },
];

module.exports = { CAR_KIT_ASSETS: CAR_KIT_ASSETS };
