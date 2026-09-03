/**
 * ROUND 18 — "legacy-core" pack modülü.
 *
 * Bu dosya, server/config/assetManifest.js'in ROUND 18 öncesindeki TEK
 * dosyalık halinde en üstte duran orijinal 39 kaydın BİREBİR aynısıdır —
 * hiçbir id/path/category/name/tags/compatibleGameTypes/visualStyle/
 * animationType/gameplayRole değeri değiştirilmedi, sadece bu ayrı dosyaya
 * TAŞINDI (bkz. assetManifest.js dosya başındaki "ROUND 18" notu — çok
 * paketli, ölçeklenebilir mimariye geçiş SADECE dosya organizasyonu, veri
 * DEĞİL).
 *
 * Bu blok `pack` alanı TAŞIMAZ (gerçek bir public/assets/packs/<pack>/
 * klasörüne ait değil — dosyalar public/assets/characters|objects|effects|
 * backgrounds/ altında, düz/paketsiz duruyor) — bu yüzden "legacy-core" bir
 * fiziksel pack DEĞİL, sadece bu modülün adı/organizasyon birimi.
 */
var LEGACY_CORE_ASSETS = [
  // ---- characters (player) ----
  {
    id: "masked_knight_front",
    path: "/assets/characters/masked_knight_front.svg",
    category: "character",
    name: "Masked Knight (Front)",
    tags: ["knight", "masked", "character", "front", "hero", "player"],
    // ROUND 14: forest-platformer kiti artık sunnyland_player kullanıyor —
    // bu asset o kitten çıkarıldı, dürüstçe boş.
    compatibleGameTypes: [],
    visualStyle: "flat-primitive-v1",
    animationType: "static",
  },
  {
    id: "masked_knight_back",
    path: "/assets/characters/masked_knight_back.svg",
    category: "character",
    name: "Masked Knight (Back)",
    tags: ["knight", "masked", "character", "back", "hero", "player"],
    // masked_knight_front'un arkadan-görünüm eşi — Forest Platformer
    // kitinin player rolüne BAĞIMSIZ bir seçenek olarak eklenmedi (kit
    // sadece ön-cepheden görünen bir player sprite'ı seçiyor, bkz.
    // assetKits.js roles.player). Bu yüzden şu an hiçbir kitin roles
    // listesinde yer almıyor — compatibleGameTypes dürüstçe boş.
    compatibleGameTypes: [],
    visualStyle: "flat-primitive-v1",
    animationType: "static",
  },
  {
    id: "hero_generic",
    path: "/assets/characters/hero_generic.svg",
    category: "character",
    name: "Hero (Generic)",
    tags: ["hero", "player", "generic", "default", "character"],
    // Space Shooter kitinde BİLEREK yok: o kit bir uzay gemisi gerektiriyor,
    // insansı bir karakter değil (bkz. assetKits.js roles.player: null).
    // ROUND 14: forest-platformer artık sunnyland_player kullanıyor, bu
    // asset o kitten çıkarıldı (endless-runner'da hâlâ aktif).
    compatibleGameTypes: ["endless-runner"],
    visualStyle: "flat-primitive-v1",
    animationType: "static",
  },

  // ---- characters (enemy) ----
  {
    id: "red_enemy",
    path: "/assets/characters/red_enemy.svg",
    category: "enemy",
    name: "Red Enemy",
    tags: ["enemy", "red", "monster", "villain"],
    // Space Shooter kitinde "enemy" rolü için en yakın MEVCUT asset —
    // görsel olarak "canavar yüzü", gemi/asteroid silueti DEĞİL; bu zayıf
    // uyum raporda ve assetKits.js'te açıkça not edildi.
    // ROUND 16: space-shooter artık gerçek Kenney Space Shooter (Remastered)
    // gemi/düşman assetlerini kullanıyor, bu asset o kitten çıkarıldı.
    compatibleGameTypes: [],
    visualStyle: "flat-primitive-v1",
    animationType: "static",
  },
  {
    id: "blue_enemy",
    path: "/assets/characters/blue_enemy.svg",
    category: "enemy",
    name: "Blue Enemy",
    tags: ["enemy", "blue", "monster", "villain"],
    // ROUND 16: space-shooter artık spaceshooter_enemy_* kullanıyor.
    compatibleGameTypes: [],
    visualStyle: "flat-primitive-v1",
    animationType: "static",
  },
  {
    id: "green_enemy",
    path: "/assets/characters/green_enemy.svg",
    category: "enemy",
    name: "Green Enemy",
    tags: ["enemy", "green", "monster", "villain"],
    // ROUND 16: space-shooter artık spaceshooter_enemy_* kullanıyor.
    compatibleGameTypes: [],
    visualStyle: "flat-primitive-v1",
    animationType: "static",
  },
  {
    id: "boss_enemy",
    path: "/assets/characters/boss_enemy.svg",
    category: "enemy",
    name: "Boss Enemy",
    tags: ["enemy", "boss", "large", "monster", "final"],
    gameplayRole: ["enemy", "boss"],
    // ROUND 16: space-shooter artık spaceshooter_enemy_heavy/enemy_ufo kullanıyor.
    compatibleGameTypes: [],
    visualStyle: "flat-primitive-v1",
    animationType: "static",
  },

  // ---- objects: equipment (collectible, but not consumed like a coin) ----
  {
    id: "knight_sword",
    path: "/assets/objects/knight_sword.svg",
    category: "collectible",
    name: "Knight Sword",
    tags: ["sword", "weapon", "knight", "melee", "item"],
    gameplayRole: ["equipment"],
    // 4 kitten hiçbiri melee silah kullanmıyor — dürüstçe boş bırakıldı,
    // uydurma bir eşleşme YAPILMADI.
    compatibleGameTypes: [],
    visualStyle: "flat-primitive-v1",
    animationType: "static",
  },
  {
    id: "knight_shield",
    path: "/assets/objects/knight_shield.svg",
    category: "collectible",
    name: "Knight Shield",
    tags: ["shield", "knight", "defense", "item"],
    gameplayRole: ["equipment"],
    compatibleGameTypes: [],
    visualStyle: "flat-primitive-v1",
    animationType: "static",
  },

  // ---- objects: collectibles ----
  {
    id: "coin_gold",
    path: "/assets/objects/coin_gold.svg",
    category: "collectible",
    name: "Coin (Gold)",
    tags: ["coin", "gold", "collectible", "currency", "reward"],
    compatibleGameTypes: ["endless-runner"],
    visualStyle: "flat-primitive-v1",
    animationType: "static",
  },
  {
    id: "gem_blue",
    path: "/assets/objects/gem_blue.svg",
    category: "collectible",
    name: "Gem (Blue)",
    tags: ["gem", "blue", "collectible", "treasure"],
    // Space Shooter'da "power-up" rolü için en yakın mevcut asset (zayıf
    // sci-fi uyumu, raporda not edildi); Forest Platformer'da doğrudan
    // toplanabilir hazine olarak iyi oturuyordu.
    // ROUND 14: forest-platformer artık sunnyland_star/sunnyland_chest
    // kullanıyor, bu asset o kitten çıkarıldı.
    // ROUND 16: space-shooter artık spaceshooter_powerup_* kullanıyor.
    compatibleGameTypes: [],
    visualStyle: "flat-primitive-v1",
    animationType: "static",
  },
  {
    id: "heart",
    path: "/assets/objects/heart.svg",
    category: "collectible",
    name: "Heart",
    tags: ["heart", "health", "life", "collectible"],
    gameplayRole: ["collectible", "health"],
    // 4 kitin hiçbirinin tanımında can/heart mekaniği yok — boş bırakıldı.
    compatibleGameTypes: [],
    visualStyle: "flat-primitive-v1",
    animationType: "static",
  },
  {
    id: "chest",
    path: "/assets/objects/chest.svg",
    category: "collectible",
    name: "Treasure Chest",
    tags: ["chest", "treasure", "container", "reward"],
    compatibleGameTypes: [],
    visualStyle: "flat-primitive-v1",
    animationType: "static",
  },
  {
    id: "star",
    path: "/assets/objects/star.svg",
    category: "collectible",
    name: "Star",
    tags: ["star", "collectible", "bonus", "reward"],
    // ROUND 14: forest-platformer artık sunnyland_star kullanıyor.
    // ROUND 16: space-shooter artık spaceshooter_powerup_star kullanıyor.
    compatibleGameTypes: [],
    visualStyle: "flat-primitive-v1",
    animationType: "static",
  },
  {
    id: "key",
    path: "/assets/objects/key.svg",
    category: "collectible",
    name: "Key",
    tags: ["key", "unlock", "item", "collectible"],
    compatibleGameTypes: [],
    visualStyle: "flat-primitive-v1",
    animationType: "static",
  },
  {
    id: "flag",
    path: "/assets/objects/flag.svg",
    category: "collectible",
    name: "Flag",
    tags: ["flag", "goal", "finish", "checkpoint"],
    // "Toplanabilir" değil ama dokununca tetiklenen bir hedef/bitiş
    // noktası — mekanik olarak bir collectible'a en yakın davranışı
    // taşıyor. gameplayRole ile bu nüans ayrıca not edildi.
    gameplayRole: ["goal"],
    compatibleGameTypes: [],
    visualStyle: "flat-primitive-v1",
    animationType: "static",
  },

  // ---- objects: obstacles / platform ----
  {
    id: "rock",
    path: "/assets/objects/rock.svg",
    category: "obstacle",
    name: "Rock",
    tags: ["rock", "obstacle", "environment", "stone"],
    // Hem gerçek bir engel hem de saf dekor olarak kullanılabilir —
    // category tek başına bunu ifade edemediği için gameplayRole eklendi.
    gameplayRole: ["obstacle", "decoration"],
    // ROUND 14: forest-platformer artık sunnyland_rock kullanıyor.
    compatibleGameTypes: ["endless-runner"],
    visualStyle: "flat-primitive-v1",
    animationType: "static",
  },
  {
    id: "tree",
    path: "/assets/objects/tree.svg",
    category: "obstacle",
    name: "Tree",
    tags: ["tree", "environment", "nature", "obstacle"],
    gameplayRole: ["obstacle", "decoration"],
    // ROUND 14: forest-platformer artık sunnyland_tree kullanıyor, bu asset
    // hiçbir kitte aktif değil — dürüstçe boş.
    compatibleGameTypes: [],
    visualStyle: "flat-primitive-v1",
    animationType: "static",
  },
  {
    id: "platform",
    path: "/assets/objects/platform.svg",
    category: "platform",
    name: "Platform",
    tags: ["platform", "ground", "level", "floor"],
    // ROUND 14: forest-platformer kiti artık SunnyLand pack'inde hazır bir
    // tek-parça platform tile'ı OLMADIĞI için roles.platform: null (bkz.
    // assetKits.js missingRoles) — bu eski asset o kitten çıkarıldı.
    compatibleGameTypes: ["endless-runner"],
    visualStyle: "flat-primitive-v1",
    animationType: "static",
  },

  // ---- objects: sorting (fruit / vegetable / basket) ----
  {
    id: "apple",
    path: "/assets/objects/apple.svg",
    category: "collectible",
    name: "Apple",
    tags: ["apple", "fruit", "food", "sorting", "red"],
    compatibleGameTypes: ["fruit-puzzle"],
    visualStyle: "flat-primitive-v1",
    animationType: "static",
  },
  {
    id: "banana",
    path: "/assets/objects/banana.svg",
    category: "collectible",
    name: "Banana",
    tags: ["banana", "fruit", "food", "sorting", "yellow"],
    compatibleGameTypes: ["fruit-puzzle"],
    visualStyle: "flat-primitive-v1",
    animationType: "static",
  },
  {
    id: "orange",
    path: "/assets/objects/orange.svg",
    category: "collectible",
    name: "Orange",
    tags: ["orange", "fruit", "food", "sorting", "citrus"],
    compatibleGameTypes: ["fruit-puzzle"],
    visualStyle: "flat-primitive-v1",
    animationType: "static",
  },
  {
    id: "strawberry",
    path: "/assets/objects/strawberry.svg",
    category: "collectible",
    name: "Strawberry",
    tags: ["strawberry", "fruit", "food", "sorting", "red", "berry"],
    compatibleGameTypes: ["fruit-puzzle"],
    visualStyle: "flat-primitive-v1",
    animationType: "static",
  },
  {
    id: "carrot",
    path: "/assets/objects/carrot.svg",
    category: "collectible",
    name: "Carrot",
    tags: ["carrot", "vegetable", "food", "sorting", "orange"],
    compatibleGameTypes: ["fruit-puzzle"],
    visualStyle: "flat-primitive-v1",
    animationType: "static",
  },
  {
    id: "broccoli",
    path: "/assets/objects/broccoli.svg",
    category: "collectible",
    name: "Broccoli",
    tags: ["broccoli", "vegetable", "food", "sorting", "green"],
    compatibleGameTypes: ["fruit-puzzle"],
    visualStyle: "flat-primitive-v1",
    animationType: "static",
  },
  {
    id: "tomato",
    path: "/assets/objects/tomato.svg",
    category: "collectible",
    name: "Tomato",
    tags: ["tomato", "vegetable", "food", "sorting", "red"],
    compatibleGameTypes: ["fruit-puzzle"],
    visualStyle: "flat-primitive-v1",
    animationType: "static",
  },
  {
    id: "corn",
    path: "/assets/objects/corn.svg",
    category: "collectible",
    name: "Corn",
    tags: ["corn", "vegetable", "food", "sorting", "yellow"],
    compatibleGameTypes: ["fruit-puzzle"],
    visualStyle: "flat-primitive-v1",
    animationType: "static",
  },
  {
    id: "grapes",
    path: "/assets/objects/grapes.svg",
    category: "collectible",
    name: "Grapes",
    tags: ["grapes", "fruit", "food", "sorting", "purple"],
    compatibleGameTypes: ["fruit-puzzle"],
    visualStyle: "flat-primitive-v1",
    animationType: "static",
  },
  {
    id: "potato",
    path: "/assets/objects/potato.svg",
    category: "collectible",
    name: "Potato",
    tags: ["potato", "vegetable", "food", "sorting", "brown"],
    compatibleGameTypes: ["fruit-puzzle"],
    visualStyle: "flat-primitive-v1",
    animationType: "static",
  },
  {
    id: "basket_red",
    path: "/assets/objects/basket_red.svg",
    category: "game-object",
    name: "Basket (Red)",
    tags: ["basket", "container", "sorting", "red"],
    // Ne "toplanabilir" ne "engel" — meyveleri bırakılan/hedeflenen bir
    // kap/hedef bölgesi. category=collectible veya obstacle demek yanlış
    // olurdu, bu yüzden ayrı "game-object" kategorisi kullanıldı.
    gameplayRole: ["target", "container"],
    compatibleGameTypes: ["fruit-puzzle"],
    visualStyle: "flat-primitive-v1",
    animationType: "static",
  },
  {
    id: "basket_green",
    path: "/assets/objects/basket_green.svg",
    category: "game-object",
    name: "Basket (Green)",
    tags: ["basket", "container", "sorting", "green"],
    gameplayRole: ["target", "container"],
    compatibleGameTypes: ["fruit-puzzle"],
    visualStyle: "flat-primitive-v1",
    animationType: "static",
  },

  // ---- effects ----
  {
    id: "fireball",
    path: "/assets/effects/fireball.svg",
    // Klasör/orijinal category "effects" altında olsa da gerçek gameplay
    // işlevi bir projectile (fırlatılan/hareket eden saldırı objesi) —
    // Phase 2'de Space Shooter preset kartında da zaten bu şekilde
    // (fireball.svg = "atılan mermi" ikonu) kullanılmıştı. Bu, "dosya
    // adına/klasörüne değil gerçek role bakarak sınıflandır" talimatının
    // somut bir örneği.
    category: "projectile",
    name: "Fireball",
    tags: ["fire", "projectile", "attack", "magic"],
    // ROUND 16: space-shooter artık spaceshooter_laser_* kullanıyor.
    compatibleGameTypes: [],
    visualStyle: "flat-primitive-v1",
    animationType: "static",
  },
  {
    id: "explosion",
    path: "/assets/effects/explosion.svg",
    category: "effect",
    name: "Explosion",
    tags: ["explosion", "boom", "destruction", "impact"],
    // ROUND 16: space-shooter artık spaceshooter_explosion kullanıyor.
    compatibleGameTypes: [],
    visualStyle: "flat-primitive-v1",
    animationType: "static",
  },
  {
    id: "sparkle",
    path: "/assets/effects/sparkle.svg",
    category: "effect",
    name: "Sparkle",
    tags: ["sparkle", "shine", "collect", "magic"],
    // ROUND 14: forest-platformer artık sunnyland_enemy_death kullanıyor.
    compatibleGameTypes: ["endless-runner", "fruit-puzzle"],
    visualStyle: "flat-primitive-v1",
    animationType: "static",
  },
  {
    id: "smoke",
    path: "/assets/effects/smoke.svg",
    category: "effect",
    name: "Smoke",
    tags: ["smoke", "poof", "dust"],
    compatibleGameTypes: [],
    visualStyle: "flat-primitive-v1",
    animationType: "static",
  },

  // ---- backgrounds ----
  {
    id: "background_forest",
    path: "/assets/backgrounds/background_forest.svg",
    category: "background",
    name: "Background — Forest",
    tags: ["forest", "nature", "environment", "green"],
    // ROUND 14: forest-platformer artık sunnyland_background_forest/
    // sunnyland_background_sky kullanıyor, bu asset hiçbir kitte aktif
    // değil — dürüstçe boş.
    compatibleGameTypes: [],
    visualStyle: "flat-primitive-v1",
    animationType: "static",
  },
  {
    id: "background_space",
    path: "/assets/backgrounds/background_space.svg",
    category: "background",
    name: "Background — Space",
    tags: ["space", "stars", "environment", "night"],
    // ROUND 16: space-shooter artık spaceshooter_background_* kullanıyor.
    compatibleGameTypes: [],
    visualStyle: "flat-primitive-v1",
    animationType: "static",
  },
  {
    id: "background_desert",
    path: "/assets/backgrounds/background_desert.svg",
    category: "background",
    name: "Background — Desert",
    tags: ["desert", "sand", "environment", "warm"],
    // 4 kitten hiçbirinin tanımında yok — dürüstçe boş.
    compatibleGameTypes: [],
    visualStyle: "flat-primitive-v1",
    animationType: "static",
  },
  {
    id: "background_dungeon",
    path: "/assets/backgrounds/background_dungeon.svg",
    category: "background",
    name: "Background — Dungeon",
    tags: ["dungeon", "dark", "environment", "cave"],
    // NOT: Phase 2'nin "City Runner" preset kartında bu görsel şehir
    // arka planı YERİNE geçici bir stand-in olarak kullanılmıştı (o zaman
    // da açıkça "en yakın mevcut asset" diye belirtilmişti). Phase 3A'nın
    // Game Kit sistemi bunu GERÇEK bir "endless-runner uyumlu" asset
    // olarak KABUL ETMİYOR — City Runner kitinin environment rolü bilerek
    // null bırakıldı (bkz. assetKits.js). Yani Phase 2'nin UI'daki görsel
    // stand-in'i ile Phase 3A'nın "gerçekten bu kite ait" tanımı BİLEREK
    // farklı — ikincisi daha katı/dürüst.
    compatibleGameTypes: [],
    visualStyle: "flat-primitive-v1",
    animationType: "static",
  },
];

module.exports = { LEGACY_CORE_ASSETS: LEGACY_CORE_ASSETS };
