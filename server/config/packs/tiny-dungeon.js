/**
 * ROUND 24 — Kenney Tiny Dungeon (Selin'in kendi sağladığı, CC0 lisanslı
 * gerçek asset paketi; bkz. public/assets/packs/tiny-dungeon/ATTRIBUTION.md).
 * Kaynak: Kenney (kenney.nl), CC0 — ticari kullanım VE yeniden dağıtım
 * (compiled/generated oyun içinde embed dahil) açıkça izinli, attribution
 * şart değil (yine de ATTRIBUTION.md'de verildi).
 *
 * Ham pakette 132 tile var (12x11 tek tilesheet, hepsi tile_0000..tile_0131
 * olarak numaralı — tanımlayıcı dosya adı YOK, legend YOK). Her biri
 * GÖRSEL olarak (contact sheet + tek tek zoom) incelendi, hiçbiri
 * index/isimden varsayılmadı. Bunlardan SADECE 21'i seçildi — tam gerekçe
 * ve seçilmeyen kategorilerin (10 civarı karakter portresinden kullanılmayan
 * ~7'si, düz renk varyantı canavarlar, 8 iksirden kullanılmayan 6'sı, 125
 * civarı duvar/zemin auto-tile parçası) neden dışarıda bırakıldığı
 * ATTRIBUTION.md'de detaylandırıldı.
 *
 * Bu pakette gerçek bir hazard/trap/projectile sprite'ı YOK — bu yüzden
 * (forest-platformer ve space-shooter kitlerindeki AYNI çözümle) enemy'ler
 * doğrudan kitin "obstacle" rolüne kondu (bkz. assetKits.js). Gerçek bir
 * effect/background/ui asseti de YOK — uydurulmadı, dürüstçe null
 * bırakıldı (bkz. assetKits.js dungeon-rpg kitinin missingRoles'ü).
 */
var TINY_DUNGEON_ASSETS = [
  // ---------------- player (3) ----------------
  {
    id: "tinydungeon_player_knight",
    path: "/assets/packs/tiny-dungeon/characters/knight.png",
    category: "character",
    name: "Knight",
    tags: ["knight", "warrior", "player", "dungeon", "rpg", "kenney"],
    gameplayRole: ["player"],
    compatibleGameTypes: ["dungeon-rpg"],
    visualStyle: "kenney-tiny-dungeon-v1",
    theme: "dungeon",
    pack: "tiny-dungeon",
    animationType: "static",
  },
  {
    id: "tinydungeon_player_wizard",
    path: "/assets/packs/tiny-dungeon/characters/wizard.png",
    category: "character",
    name: "Wizard",
    tags: ["wizard", "mage", "player", "dungeon", "rpg", "kenney"],
    gameplayRole: ["player"],
    compatibleGameTypes: ["dungeon-rpg"],
    visualStyle: "kenney-tiny-dungeon-v1",
    theme: "dungeon",
    pack: "tiny-dungeon",
    animationType: "static",
  },
  {
    id: "tinydungeon_player_adventurer",
    path: "/assets/packs/tiny-dungeon/characters/adventurer.png",
    category: "character",
    name: "Adventurer",
    tags: ["adventurer", "hero", "player", "dungeon", "rpg", "kenney"],
    gameplayRole: ["player"],
    compatibleGameTypes: ["dungeon-rpg"],
    visualStyle: "kenney-tiny-dungeon-v1",
    theme: "dungeon",
    pack: "tiny-dungeon",
    animationType: "static",
  },

  // ---------------- enemy (7) — kit'in "obstacle" rolüne bkz. assetKits.js
  // (pakette ayrı bir hazard/trap sprite'ı olmadığı için, forest-platformer/
  // space-shooter'daki AYNI birleştirme çözümü). ----------------
  {
    id: "tinydungeon_enemy_slime",
    path: "/assets/packs/tiny-dungeon/enemies/slime.png",
    category: "enemy",
    name: "Slime",
    tags: ["slime", "blob", "enemy", "dungeon", "rpg", "kenney"],
    gameplayRole: ["obstacle", "enemy"],
    compatibleGameTypes: ["dungeon-rpg"],
    visualStyle: "kenney-tiny-dungeon-v1",
    theme: "dungeon",
    pack: "tiny-dungeon",
    animationType: "static",
  },
  {
    id: "tinydungeon_enemy_crab",
    path: "/assets/packs/tiny-dungeon/enemies/crab.png",
    category: "enemy",
    name: "Crab",
    tags: ["crab", "enemy", "dungeon", "cave", "rpg", "kenney"],
    gameplayRole: ["obstacle", "enemy"],
    compatibleGameTypes: ["dungeon-rpg"],
    visualStyle: "kenney-tiny-dungeon-v1",
    theme: "dungeon",
    pack: "tiny-dungeon",
    animationType: "static",
  },
  {
    id: "tinydungeon_enemy_orc",
    path: "/assets/packs/tiny-dungeon/enemies/orc.png",
    category: "enemy",
    name: "Orc",
    tags: ["orc", "goblin", "enemy", "dungeon", "rpg", "kenney"],
    gameplayRole: ["obstacle", "enemy"],
    compatibleGameTypes: ["dungeon-rpg"],
    visualStyle: "kenney-tiny-dungeon-v1",
    theme: "dungeon",
    pack: "tiny-dungeon",
    animationType: "static",
  },
  {
    id: "tinydungeon_enemy_bat",
    path: "/assets/packs/tiny-dungeon/enemies/bat.png",
    category: "enemy",
    name: "Bat",
    tags: ["bat", "flying", "enemy", "dungeon", "rpg", "kenney"],
    gameplayRole: ["obstacle", "enemy"],
    compatibleGameTypes: ["dungeon-rpg"],
    visualStyle: "kenney-tiny-dungeon-v1",
    theme: "dungeon",
    pack: "tiny-dungeon",
    animationType: "static",
  },
  {
    id: "tinydungeon_enemy_ghost",
    path: "/assets/packs/tiny-dungeon/enemies/ghost.png",
    category: "enemy",
    name: "Ghost",
    tags: ["ghost", "undead", "spirit", "enemy", "dungeon", "rpg", "kenney"],
    gameplayRole: ["obstacle", "enemy"],
    compatibleGameTypes: ["dungeon-rpg"],
    visualStyle: "kenney-tiny-dungeon-v1",
    theme: "dungeon",
    pack: "tiny-dungeon",
    animationType: "static",
  },
  {
    id: "tinydungeon_enemy_spider",
    path: "/assets/packs/tiny-dungeon/enemies/spider.png",
    category: "enemy",
    name: "Spider",
    tags: ["spider", "insect", "enemy", "dungeon", "rpg", "kenney"],
    gameplayRole: ["obstacle", "enemy"],
    compatibleGameTypes: ["dungeon-rpg"],
    visualStyle: "kenney-tiny-dungeon-v1",
    theme: "dungeon",
    pack: "tiny-dungeon",
    animationType: "static",
  },
  {
    id: "tinydungeon_enemy_mimic",
    path: "/assets/packs/tiny-dungeon/enemies/mimic.png",
    category: "enemy",
    name: "Mimic",
    tags: ["mimic", "chest", "trap", "enemy", "dungeon", "rpg", "kenney"],
    gameplayRole: ["obstacle", "enemy", "trap"],
    compatibleGameTypes: ["dungeon-rpg"],
    visualStyle: "kenney-tiny-dungeon-v1",
    theme: "dungeon",
    pack: "tiny-dungeon",
    animationType: "static",
  },

  // ---------------- collectible (2) — 8 mevcut iksirden sadece anlam
  // taşıyan 2 renk (kırmızı=can, mavi=mana), gerisi renk doldurma. ----------------
  {
    id: "tinydungeon_potion_red",
    path: "/assets/packs/tiny-dungeon/objects/potion-red.png",
    category: "collectible",
    name: "Health Potion (Red)",
    tags: ["potion", "health", "collectible", "dungeon", "rpg", "kenney"],
    gameplayRole: ["collectible", "health"],
    compatibleGameTypes: ["dungeon-rpg"],
    visualStyle: "kenney-tiny-dungeon-v1",
    theme: "dungeon",
    pack: "tiny-dungeon",
    animationType: "static",
  },
  {
    id: "tinydungeon_potion_blue",
    path: "/assets/packs/tiny-dungeon/objects/potion-blue.png",
    category: "collectible",
    name: "Mana Potion (Blue)",
    tags: ["potion", "mana", "collectible", "dungeon", "rpg", "kenney"],
    gameplayRole: ["collectible", "mana"],
    compatibleGameTypes: ["dungeon-rpg"],
    visualStyle: "kenney-tiny-dungeon-v1",
    theme: "dungeon",
    pack: "tiny-dungeon",
    animationType: "static",
  },

  // ---------------- gameObject (2) — YENİ kit rol anahtarı, sadece bu
  // kitte var (bkz. assetKits.js ve ATTRIBUTION.md notu — normalizeRoles()
  // bu anahtarı OKUMUYOR, decoration/tile gibi sadece LLM'e aktarılıyor).
  // ----------------
  {
    id: "tinydungeon_chest",
    path: "/assets/packs/tiny-dungeon/objects/chest.png",
    category: "game-object",
    name: "Treasure Chest",
    tags: ["chest", "treasure", "interactive", "dungeon", "rpg", "kenney"],
    gameplayRole: ["interactive", "chest"],
    compatibleGameTypes: ["dungeon-rpg"],
    visualStyle: "kenney-tiny-dungeon-v1",
    theme: "dungeon",
    pack: "tiny-dungeon",
    animationType: "static",
  },
  {
    id: "tinydungeon_door",
    path: "/assets/packs/tiny-dungeon/objects/door.png",
    category: "game-object",
    name: "Wooden Door",
    tags: ["door", "interactive", "dungeon", "rpg", "kenney"],
    gameplayRole: ["interactive", "door"],
    compatibleGameTypes: ["dungeon-rpg"],
    visualStyle: "kenney-tiny-dungeon-v1",
    theme: "dungeon",
    pack: "tiny-dungeon",
    animationType: "static",
  },

  // ---------------- platform (1) — mock'un mevcut #platform-row (4x
  // tekrarlanan zemin şeridi) render mantığına AYNEN oturuyor, kod
  // değişikliği gerekmedi (Racing'in road-straight'iyle aynı desen).
  // ----------------
  {
    id: "tinydungeon_tile_floor",
    path: "/assets/packs/tiny-dungeon/tiles/floor.png",
    category: "tile",
    name: "Dungeon Floor",
    tags: ["floor", "tile", "dungeon", "rpg", "kenney"],
    gameplayRole: ["floor"],
    compatibleGameTypes: ["dungeon-rpg"],
    visualStyle: "kenney-tiny-dungeon-v1",
    theme: "dungeon",
    pack: "tiny-dungeon",
    animationType: "static",
  },

  // ---------------- tile (2) — SADECE gerçek (LLM) üretimde görünür
  // (mock şablonu bu rolü tüketmiyor, Racing'in curve/finish-line
  // tile'larıyla aynı desen). ----------------
  {
    id: "tinydungeon_tile_wall",
    path: "/assets/packs/tiny-dungeon/tiles/wall.png",
    category: "tile",
    name: "Dungeon Wall",
    tags: ["wall", "tile", "stone", "dungeon", "rpg", "kenney"],
    gameplayRole: ["wall"],
    compatibleGameTypes: ["dungeon-rpg"],
    visualStyle: "kenney-tiny-dungeon-v1",
    theme: "dungeon",
    pack: "tiny-dungeon",
    animationType: "static",
  },
  {
    id: "tinydungeon_tile_door_threshold",
    path: "/assets/packs/tiny-dungeon/tiles/door-threshold.png",
    category: "tile",
    name: "Door Threshold Tile",
    tags: ["door", "threshold", "tile", "dungeon", "rpg", "kenney"],
    gameplayRole: ["threshold"],
    compatibleGameTypes: ["dungeon-rpg"],
    visualStyle: "kenney-tiny-dungeon-v1",
    theme: "dungeon",
    pack: "tiny-dungeon",
    animationType: "static",
  },

  // ---------------- decoration (4) — SADECE gerçek (LLM) üretimde
  // görünür (mock tüketmiyor) — sunnyland_house/mushroom/plant/vine ve
  // racing_tree/tribune/tent ile BİREBİR aynı desen: category
  // "game-object" + gameplayRole ["decoration"]. ----------------
  {
    id: "tinydungeon_decoration_torch",
    path: "/assets/packs/tiny-dungeon/objects/torch.png",
    category: "game-object",
    name: "Wall Torch",
    tags: ["torch", "fire", "light", "scenery", "decoration", "dungeon", "rpg", "kenney"],
    gameplayRole: ["decoration"],
    compatibleGameTypes: ["dungeon-rpg"],
    visualStyle: "kenney-tiny-dungeon-v1",
    theme: "dungeon",
    pack: "tiny-dungeon",
    animationType: "static",
  },
  {
    id: "tinydungeon_decoration_barrel",
    path: "/assets/packs/tiny-dungeon/objects/barrel.png",
    category: "game-object",
    name: "Barrel",
    tags: ["barrel", "scenery", "decoration", "dungeon", "rpg", "kenney"],
    gameplayRole: ["decoration"],
    compatibleGameTypes: ["dungeon-rpg"],
    visualStyle: "kenney-tiny-dungeon-v1",
    theme: "dungeon",
    pack: "tiny-dungeon",
    animationType: "static",
  },
  {
    id: "tinydungeon_decoration_crate",
    path: "/assets/packs/tiny-dungeon/objects/crate.png",
    category: "game-object",
    name: "Crate",
    tags: ["crate", "box", "scenery", "decoration", "dungeon", "rpg", "kenney"],
    gameplayRole: ["decoration"],
    compatibleGameTypes: ["dungeon-rpg"],
    visualStyle: "kenney-tiny-dungeon-v1",
    theme: "dungeon",
    pack: "tiny-dungeon",
    animationType: "static",
  },
  {
    id: "tinydungeon_decoration_tombstone",
    path: "/assets/packs/tiny-dungeon/objects/tombstone.png",
    category: "game-object",
    name: "Tombstone",
    tags: ["tombstone", "grave", "scenery", "decoration", "dungeon", "rpg", "kenney"],
    gameplayRole: ["decoration"],
    compatibleGameTypes: ["dungeon-rpg"],
    visualStyle: "kenney-tiny-dungeon-v1",
    theme: "dungeon",
    pack: "tiny-dungeon",
    animationType: "static",
  },
];

module.exports = { TINY_DUNGEON_ASSETS: TINY_DUNGEON_ASSETS };
