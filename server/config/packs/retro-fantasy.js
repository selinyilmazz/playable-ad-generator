/**
 * ROUND 25 — Kenney Retro Fantasy Kit (Selin'in kendi sağladığı, CC0
 * lisanslı gerçek asset paketi; bkz.
 * public/assets/packs/retro-fantasy/ATTRIBUTION.md). Kaynak: Kenney
 * (kenney.nl), CC0.
 *
 * 3D model paketi (bkz. car-kit.js'teki aynı not) — kullanılan kaynak
 * `Previews/` render'ları. Pakette hiçbir karakter/canavar/collectible
 * asseti YOK (sadece mimari/çevre objeleri) — bu yüzden BAĞIMSIZ bir
 * "castle" kiti kurulmadı (player/enemy/collectible olmadan bir kit
 * anlamsız olurdu); bunun yerine mevcut, zaten test edilmiş "dungeon-rpg"
 * kitinin SADECE mock tarafından tüketilmeyen (LLM-only) rolleri —
 * tile/decoration/gameObject — bu assetlerle ZENGİNLEŞTİRİLDİ (bkz.
 * assetKits.js). player/platform/obstacle/collectible/effect rolleri
 * TAMAMEN Tiny Dungeon pixel-art'ı olarak kaldı, hiç dokunulmadı.
 *
 * 6 asset seçildi: 2 tile (taş merdiven, tırmanma merdiveni) + 4 dekor
 * objesi (güçlendirilmiş duvar, kule, varil öbeği, sütun).
 */
var RETRO_FANTASY_ASSETS = [
  {
    id: "retrofantasy_stairs_stone",
    path: "/assets/packs/retro-fantasy/tiles/stairs-stone.png",
    category: "tile",
    name: "Stone Stairs",
    tags: ["stairs", "stone", "tile", "dungeon", "fantasy", "kenney"],
    gameplayRole: ["tile"],
    compatibleGameTypes: ["dungeon-rpg"],
    visualStyle: "kenney-retro-fantasy-v1",
    theme: "dungeon",
    pack: "retro-fantasy",
    animationType: "static",
  },
  {
    id: "retrofantasy_ladder",
    path: "/assets/packs/retro-fantasy/tiles/ladder.png",
    category: "tile",
    name: "Ladder",
    tags: ["ladder", "climb", "tile", "dungeon", "fantasy", "kenney"],
    gameplayRole: ["tile"],
    compatibleGameTypes: ["dungeon-rpg"],
    visualStyle: "kenney-retro-fantasy-v1",
    theme: "dungeon",
    pack: "retro-fantasy",
    animationType: "static",
  },
  {
    id: "retrofantasy_wall_fortified",
    path: "/assets/packs/retro-fantasy/objects/wall-fortified.png",
    category: "game-object",
    name: "Fortified Wall",
    tags: ["wall", "fortified", "scenery", "decoration", "dungeon", "fantasy", "kenney"],
    gameplayRole: ["decoration"],
    compatibleGameTypes: ["dungeon-rpg"],
    visualStyle: "kenney-retro-fantasy-v1",
    theme: "dungeon",
    pack: "retro-fantasy",
    animationType: "static",
  },
  {
    id: "retrofantasy_tower",
    path: "/assets/packs/retro-fantasy/objects/tower.png",
    category: "game-object",
    name: "Tower",
    tags: ["tower", "scenery", "decoration", "dungeon", "fantasy", "kenney"],
    gameplayRole: ["decoration"],
    compatibleGameTypes: ["dungeon-rpg"],
    visualStyle: "kenney-retro-fantasy-v1",
    theme: "dungeon",
    pack: "retro-fantasy",
    animationType: "static",
  },
  {
    id: "retrofantasy_barrels",
    path: "/assets/packs/retro-fantasy/objects/barrels.png",
    category: "game-object",
    name: "Barrels",
    tags: ["barrels", "scenery", "decoration", "dungeon", "fantasy", "kenney"],
    gameplayRole: ["decoration"],
    compatibleGameTypes: ["dungeon-rpg"],
    visualStyle: "kenney-retro-fantasy-v1",
    theme: "dungeon",
    pack: "retro-fantasy",
    animationType: "static",
  },
  {
    id: "retrofantasy_column",
    path: "/assets/packs/retro-fantasy/objects/column.png",
    category: "game-object",
    name: "Column",
    tags: ["column", "pillar", "scenery", "decoration", "dungeon", "fantasy", "kenney"],
    gameplayRole: ["decoration"],
    compatibleGameTypes: ["dungeon-rpg"],
    visualStyle: "kenney-retro-fantasy-v1",
    theme: "dungeon",
    pack: "retro-fantasy",
    animationType: "static",
  },
];

module.exports = { RETRO_FANTASY_ASSETS: RETRO_FANTASY_ASSETS };
