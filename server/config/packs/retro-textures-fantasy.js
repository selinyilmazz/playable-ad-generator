/**
 * ROUND 25 — Kenney Retro Textures Fantasy Pack (Selin'in kendi sağladığı,
 * CC0 lisanslı gerçek asset paketi; bkz.
 * public/assets/packs/retro-textures-fantasy/ATTRIBUTION.md). Kaynak:
 * Kenney (kenney.nl), CC0.
 *
 * Retro Fantasy Kit'in aksine bu düz 2D bir doku/PNG paketi (3D model
 * YOK). Retro Fantasy Kit ile AYNI kararla — ayrı bir kit AÇILMADI,
 * mevcut "dungeon-rpg" kitinin tile/gameObject rolleri zenginleştirildi
 * (bkz. retro-fantasy.js'teki aynı gerekçe ve assetKits.js).
 *
 * 3 asset seçildi: 2 tile (tuğla duvar, tahta zemin) + 1 gameObject (ahşap
 * kapı). Pakette onlarca duvar/kapı/zemin VARYANTI var (sand/stone renk,
 * hasarlı/sağlam, pencereli/pencersiz, "wide"/"depth" gölgeli sürümler) —
 * hepsi DEĞİL, sadece her kategoriden 1 temsilci "temiz" varyant seçildi
 * (bkz. ATTRIBUTION.md).
 */
var RETRO_TEXTURES_FANTASY_ASSETS = [
  {
    id: "retrotex_wall_brick",
    path: "/assets/packs/retro-textures-fantasy/tiles/wall-brick.png",
    category: "tile",
    name: "Brick Wall",
    tags: ["wall", "brick", "tile", "dungeon", "fantasy", "kenney"],
    gameplayRole: ["tile"],
    compatibleGameTypes: ["dungeon-rpg"],
    visualStyle: "kenney-retro-textures-fantasy-v1",
    theme: "dungeon",
    pack: "retro-textures-fantasy",
    animationType: "static",
  },
  {
    id: "retrotex_floor_wood",
    path: "/assets/packs/retro-textures-fantasy/tiles/floor-wood.png",
    category: "tile",
    name: "Wood Floor",
    tags: ["floor", "wood", "planks", "tile", "dungeon", "fantasy", "kenney"],
    gameplayRole: ["tile"],
    compatibleGameTypes: ["dungeon-rpg"],
    visualStyle: "kenney-retro-textures-fantasy-v1",
    theme: "dungeon",
    pack: "retro-textures-fantasy",
    animationType: "static",
  },
  {
    id: "retrotex_door_wood",
    path: "/assets/packs/retro-textures-fantasy/objects/door-wood.png",
    category: "game-object",
    name: "Wooden Door",
    tags: ["door", "wood", "interactive", "dungeon", "fantasy", "kenney"],
    gameplayRole: ["interactive", "door"],
    compatibleGameTypes: ["dungeon-rpg"],
    visualStyle: "kenney-retro-textures-fantasy-v1",
    theme: "dungeon",
    pack: "retro-textures-fantasy",
    animationType: "static",
  },
];

module.exports = { RETRO_TEXTURES_FANTASY_ASSETS: RETRO_TEXTURES_FANTASY_ASSETS };
