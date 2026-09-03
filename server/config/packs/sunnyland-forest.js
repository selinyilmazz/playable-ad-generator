/**
 * ROUND 14 — SunnyLand Forest pack (Selin'in kendi sağladığı, CC0 lisanslı
 * gerçek asset paketi; bkz. public/assets/packs/sunnyland-forest/
 * ATTRIBUTION.md). Kaynak: Luis Zuno "Ansimuz" (ansimuz.com), CC0 — ticari
 * kullanım VE yeniden dağıtım (compiled/generated oyun içinde embed dahil)
 * açıkça izinli, attribution şart değil (yine de ATTRIBUTION.md'de verildi).
 *
 * ROUND 18 NOTU: bu blok, o zaman assetManifest.js dosyasının İÇİNDE tek bir
 * büyük dizinin parçasıydı — çok-paketli mimariye geçişte (bkz.
 * assetManifest.js dosya başı) HİÇBİR id/path/category/... değeri
 * DEĞİŞMEDEN kendi dosyasına taşındı. Bu, "her pack kendi dosyasında"
 * ölçeklenebilir yapının somut örneği: gelecekte 10. pack eklendiğinde bu
 * dosyaya AYNI şekilde bir eş (`packs/<yeni-pack>.js`) eklenecek, mevcut
 * paketlerin hiçbiri etkilenmeyecek.
 *
 * pack alanı — bu asset'in ait olduğu isimlendirilmiş, kendi kendine yeten
 *   asset kiti klasörü (public/assets/packs/sunnyland-forest/).
 * theme alanı — gerçek bir sanat-yönü/tema etiketi.
 *
 * Sadece TEK bir temsilci kare/dosya seçildi (animationType hâlâ dürüstçe
 * "static" — spritesheet/frame verisi VAR ama şu an render şablonu
 * (mockGameTemplate.js) tek kare <img> kullanıyor). Orijinal paketin TÜM
 * frame'leri ve spritesheet'leri public/assets/packs/sunnyland-forest/
 * source/ altında BOZULMADAN/eksiksiz duruyor — ileride animasyon eklenirse
 * oradan çekilecek, hiçbir şey kaybolmadı.
 */
var SUNNYLAND_FOREST_ASSETS = [
  {
    id: "sunnyland_player",
    path: "/assets/packs/sunnyland-forest/characters/player.png",
    category: "character",
    name: "Forest Explorer (Player)",
    tags: ["player", "hero", "character", "forest", "sunnyland", "adventurer"],
    compatibleGameTypes: ["forest-platformer"],
    visualStyle: "sunnyland-forest-v1",
    theme: "forest",
    pack: "sunnyland-forest",
    animationType: "static",
  },
  {
    id: "sunnyland_bee",
    path: "/assets/packs/sunnyland-forest/enemies/bee.png",
    category: "enemy",
    name: "Forest Bee",
    tags: ["bee", "enemy", "insect", "flying", "forest", "sunnyland"],
    compatibleGameTypes: ["forest-platformer"],
    visualStyle: "sunnyland-forest-v1",
    theme: "forest",
    pack: "sunnyland-forest",
    animationType: "static",
  },
  {
    id: "sunnyland_piranha_plant",
    path: "/assets/packs/sunnyland-forest/enemies/piranha-plant.png",
    category: "enemy",
    name: "Piranha Plant",
    tags: ["piranha-plant", "enemy", "plant", "forest", "sunnyland"],
    compatibleGameTypes: ["forest-platformer"],
    visualStyle: "sunnyland-forest-v1",
    theme: "forest",
    pack: "sunnyland-forest",
    animationType: "static",
  },
  {
    id: "sunnyland_slug",
    path: "/assets/packs/sunnyland-forest/enemies/slug.png",
    category: "enemy",
    name: "Forest Slug",
    tags: ["slug", "enemy", "creature", "forest", "sunnyland"],
    compatibleGameTypes: ["forest-platformer"],
    visualStyle: "sunnyland-forest-v1",
    theme: "forest",
    pack: "sunnyland-forest",
    animationType: "static",
  },
  {
    id: "sunnyland_tree",
    path: "/assets/packs/sunnyland-forest/objects/tree.png",
    category: "obstacle",
    name: "Forest Tree",
    tags: ["tree", "forest", "nature", "environment", "sunnyland"],
    gameplayRole: ["obstacle", "decoration"],
    compatibleGameTypes: ["forest-platformer"],
    visualStyle: "sunnyland-forest-v1",
    theme: "forest",
    pack: "sunnyland-forest",
    animationType: "static",
  },
  {
    id: "sunnyland_rock",
    path: "/assets/packs/sunnyland-forest/objects/rock.png",
    category: "obstacle",
    name: "Forest Rock",
    tags: ["rock", "forest", "obstacle", "stone", "sunnyland"],
    gameplayRole: ["obstacle", "decoration"],
    compatibleGameTypes: ["forest-platformer"],
    visualStyle: "sunnyland-forest-v1",
    theme: "forest",
    pack: "sunnyland-forest",
    animationType: "static",
  },
  {
    id: "sunnyland_house",
    path: "/assets/packs/sunnyland-forest/objects/house.png",
    category: "game-object",
    name: "Forest House",
    tags: ["house", "forest", "building", "decoration", "sunnyland"],
    gameplayRole: ["decoration"],
    compatibleGameTypes: ["forest-platformer"],
    visualStyle: "sunnyland-forest-v1",
    theme: "forest",
    pack: "sunnyland-forest",
    animationType: "static",
  },
  {
    id: "sunnyland_mushroom_red",
    path: "/assets/packs/sunnyland-forest/objects/mushroom-red.png",
    category: "game-object",
    name: "Red Mushroom",
    tags: ["mushroom", "red", "forest", "decoration", "sunnyland"],
    gameplayRole: ["decoration"],
    compatibleGameTypes: ["forest-platformer"],
    visualStyle: "sunnyland-forest-v1",
    theme: "forest",
    pack: "sunnyland-forest",
    animationType: "static",
  },
  {
    id: "sunnyland_mushroom_brown",
    path: "/assets/packs/sunnyland-forest/objects/mushroom-brown.png",
    category: "game-object",
    name: "Brown Mushroom",
    tags: ["mushroom", "brown", "forest", "decoration", "sunnyland"],
    gameplayRole: ["decoration"],
    compatibleGameTypes: ["forest-platformer"],
    visualStyle: "sunnyland-forest-v1",
    theme: "forest",
    pack: "sunnyland-forest",
    animationType: "static",
  },
  {
    id: "sunnyland_plant",
    path: "/assets/packs/sunnyland-forest/objects/plant.png",
    category: "game-object",
    name: "Forest Plant",
    tags: ["plant", "forest", "nature", "decoration", "sunnyland"],
    gameplayRole: ["decoration"],
    compatibleGameTypes: ["forest-platformer"],
    visualStyle: "sunnyland-forest-v1",
    theme: "forest",
    pack: "sunnyland-forest",
    animationType: "static",
  },
  {
    id: "sunnyland_vine",
    path: "/assets/packs/sunnyland-forest/objects/vine.png",
    category: "game-object",
    name: "Hanging Vine",
    tags: ["vine", "forest", "nature", "decoration", "sunnyland"],
    gameplayRole: ["decoration"],
    compatibleGameTypes: ["forest-platformer"],
    visualStyle: "sunnyland-forest-v1",
    theme: "forest",
    pack: "sunnyland-forest",
    animationType: "static",
  },
  {
    id: "sunnyland_carrot",
    path: "/assets/packs/sunnyland-forest/objects/carrot.png",
    category: "collectible",
    name: "Carrot",
    tags: ["carrot", "collectible", "forest", "food", "sunnyland"],
    compatibleGameTypes: ["forest-platformer"],
    visualStyle: "sunnyland-forest-v1",
    theme: "forest",
    pack: "sunnyland-forest",
    animationType: "static",
  },
  {
    id: "sunnyland_star",
    path: "/assets/packs/sunnyland-forest/objects/star.png",
    category: "collectible",
    name: "Star",
    tags: ["star", "collectible", "bonus", "forest", "sunnyland"],
    compatibleGameTypes: ["forest-platformer"],
    visualStyle: "sunnyland-forest-v1",
    theme: "forest",
    pack: "sunnyland-forest",
    animationType: "static",
  },
  {
    id: "sunnyland_chest",
    path: "/assets/packs/sunnyland-forest/objects/chest.png",
    category: "collectible",
    name: "Treasure Chest",
    tags: ["chest", "treasure", "collectible", "forest", "sunnyland"],
    compatibleGameTypes: ["forest-platformer"],
    visualStyle: "sunnyland-forest-v1",
    theme: "forest",
    pack: "sunnyland-forest",
    animationType: "static",
  },
  {
    id: "sunnyland_enemy_death",
    path: "/assets/packs/sunnyland-forest/effects/enemy-death.png",
    category: "effect",
    name: "Defeat Burst",
    tags: ["effect", "defeat", "poof", "forest", "sunnyland"],
    compatibleGameTypes: ["forest-platformer"],
    visualStyle: "sunnyland-forest-v1",
    theme: "forest",
    pack: "sunnyland-forest",
    animationType: "static",
  },
  {
    id: "sunnyland_background_forest",
    path: "/assets/packs/sunnyland-forest/backgrounds/forest.png",
    category: "background",
    name: "Background — SunnyLand Forest",
    tags: ["forest", "background", "environment", "nature", "sunnyland"],
    compatibleGameTypes: ["forest-platformer"],
    visualStyle: "sunnyland-forest-v1",
    theme: "forest",
    pack: "sunnyland-forest",
    animationType: "static",
  },
  {
    id: "sunnyland_background_sky",
    path: "/assets/packs/sunnyland-forest/backgrounds/sky.png",
    category: "background",
    name: "Background — Forest Sky",
    tags: ["forest", "sky", "background", "environment", "sunnyland"],
    compatibleGameTypes: ["forest-platformer"],
    visualStyle: "sunnyland-forest-v1",
    theme: "forest",
    pack: "sunnyland-forest",
    animationType: "static",
  },

  // ============ ROUND 20 (Part B) — Asset Library genişletmesi ============
  // Selin'in onayladığı analiz raporundaki (Round 20 Part A) 18 önerilen
  // assetten 4'ü bu pakete ait. HİÇBİR mevcut id/path/category DEĞİŞMEDİ,
  // sadece EK yapıldı. Hepsi source/ altındaki GERÇEK dosyaların birebir
  // (byte-identical) kopyası — üstteki assetlerle AYNI kürasyon yöntemi
  // (bkz. bee.png/player.png'nin source/sprites/.../*-1.png ile md5 eşleşmesi).
  //
  // NOT — önerilen 5. asset (bir "platform" tile'ı, tileset.png'den kırpılacaktı)
  // BİLEREK EKLENMEDİ: uygulama sırasında tileset.png görsel olarak incelendi
  // ve gerçekte çit/mağara-girişi/kapı gibi DEKORATİF duvar parçalarından
  // oluştuğu, düz bir "yürünebilir platform" karesi İÇERMEDİĞİ görüldü. Yanlış
  // bir parçayı "platform" diye uydurmak yerine (assetKits.js'in kendi
  // "dürüstçe null bırak" ilkesiyle tutarlı olarak) bu adım atlandı — forest-
  // platformer.roles.platform hâlâ null, missingRoles hâlâ bunu not ediyor.
  // Bu yüzden bu round'da 18 değil 17 asset eklendi (78 -> 95).
  {
    id: "sunnyland_background_middleground",
    path: "/assets/packs/sunnyland-forest/backgrounds/middleground.png",
    category: "background",
    name: "Background — Forest Middleground",
    tags: ["forest", "background", "middleground", "parallax", "environment", "sunnyland"],
    compatibleGameTypes: ["forest-platformer"],
    visualStyle: "sunnyland-forest-v1",
    theme: "forest",
    pack: "sunnyland-forest",
    animationType: "static",
  },
  {
    id: "sunnyland_piranha_plant_attack",
    path: "/assets/packs/sunnyland-forest/enemies/piranha-plant-attack.png",
    category: "enemy",
    name: "Piranha Plant (Attacking)",
    tags: ["piranha-plant", "enemy", "plant", "attack", "forest", "sunnyland"],
    compatibleGameTypes: ["forest-platformer"],
    visualStyle: "sunnyland-forest-v1",
    theme: "forest",
    pack: "sunnyland-forest",
    animationType: "static",
  },
  {
    id: "sunnyland_player_hurt",
    path: "/assets/packs/sunnyland-forest/effects/player-hurt.png",
    category: "effect",
    name: "Player Hurt Reaction",
    tags: ["player", "hurt", "hit", "reaction", "effect", "forest", "sunnyland"],
    compatibleGameTypes: ["forest-platformer"],
    visualStyle: "sunnyland-forest-v1",
    theme: "forest",
    pack: "sunnyland-forest",
    animationType: "static",
  },
  {
    id: "sunnyland_hud_life_bar",
    path: "/assets/packs/sunnyland-forest/ui/hud-life-bar.png",
    category: "ui",
    name: "HUD Life Bar",
    tags: ["hud", "ui", "life", "health", "hearts", "forest", "sunnyland"],
    // ROUND 20: compatibleGameTypes BİLEREK boş — bu asset sadece Asset
    // Library'de (bkz. /api/assets, ASSET_MANIFEST_ENRICHED üzerinden
    // otomatik listelenir) GÖRÜNÜR olması için eklendi; assetKits.js'te
    // henüz hiçbir kitin "ui" diye bir role anahtarı yok (category şeması
    // Round 18'de hazırlandı ama hiçbir kit onu KULLANMIYOR, bkz.
    // assetManifest.js dosya başı notu). Bu assete sahte bir game-type
    // bağlamak (assetKits.js testindeki "compatibleGameTypes o kitin
    // roles'ünde gerçekten kullanılıyor mu" çapraz kontrolünü kırmadan)
    // mümkün olmazdı — dürüstçe boş bırakıldı.
    compatibleGameTypes: [],
    visualStyle: "sunnyland-forest-v1",
    theme: "forest",
    pack: "sunnyland-forest",
    animationType: "static",
  },
];

module.exports = { SUNNYLAND_FOREST_ASSETS: SUNNYLAND_FOREST_ASSETS };
