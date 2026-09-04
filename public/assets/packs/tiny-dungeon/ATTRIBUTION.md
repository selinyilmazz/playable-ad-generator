# Tiny Dungeon — Attribution & License

**Author:** Kenney (Kenney Vleugels) — https://kenney.nl
**License:** CC0 (Creative Commons Zero / Public Domain)

Per the license file shipped with this pack (`LICENSE.txt`, copied here
unmodified from the original download):

> License: (Creative Commons Zero, CC0) —
> http://creativecommons.org/publicdomain/zero/1.0/
> This content is free to use in personal, educational and commercial
> projects. Support us by crediting Kenney or www.kenney.nl (this is not
> mandatory)

Same terms as the SunnyLand Forest, Kenney Space Shooter and Racing packs:
no restriction on use, modification, or redistribution, so embedding these
PNGs inside AI-generated, end-user-facing playable games (compiled output)
is safe. Attribution isn't required, but is included here as a courtesy.

## Curation — 21 of 132 tiles used

The original pack is a single 16x16 tilesheet (132 individual tile PNGs
under `Tiles/`, `Tilemap/` composite sheets, and a `Tiled/` sample map —
no folder structure, no descriptive filenames, everything numbered
`tile_0000.png`…`tile_0131.png`). Every one of the 132 tiles was visually
inspected (contact sheets, per-tile zoom) before selecting the 21 used
here — nothing was picked from the filename/index alone, since the pack
ships no legend mapping numbers to content.

Only a small, curated subset was selected for the `dungeon-rpg` game kit
(see `server/config/assetKits.js` and `server/config/packs/tiny-dungeon.js`),
following the same "small, coherent, hand-picked set" approach as the other
three active packs — not a bulk import of all 132 tiles.

Selection logic per role:

- **player (3):** `knight` (tile_0097), `wizard` (tile_0084), `adventurer`
  (tile_0099) — three visually distinct hero archetypes (armored warrior /
  robed spellcaster / unarmored adventurer). The pack actually contains
  ~10 character-style portraits (multiple knight helmet variants, several
  villager palette variants, an elder, a shirtless barbarian); only the 3
  most visually distinct were kept, per "1-3 karakter" — the near-duplicate
  villager/knight variants were deliberately left unused.
- **enemy (7, merged into the kit's `obstacle` role — see note below):**
  `slime`, `crab`, `orc`, `bat`, `ghost`, `spider`, `mimic` — seven
  genuinely different creature designs (blob / crustacean / tusked
  humanoid / flyer / undead floater / arachnid / trap-chest). Two clear
  color-only recolors that add no new silhouette (`tile_0112`, a
  green-bandana recolor of the orc; `tile_0124`, a grey recolor of a
  mushroom-creature) were deliberately excluded, per "sadece renk
  varyasyonlarını doldurmak için ekleme yapma." A shirtless "ogre" portrait
  (tile_0109) was also left out as visually redundant with `orc`.
- **obstacle/hazard:** the pack has **no standalone spike/pit/fire-trap/
  projectile sprite** — everything hazardous in this tileset is a
  creature. Rather than inventing a fake trap asset, the 7 enemies above
  were placed directly in the kit's `obstacle` role — the same
  "merge enemy+hazard into one obstacle pool" solution already used by
  the `forest-platformer` and `space-shooter` kits (worked around
  `mockGameTemplate.js`'s single `obstaclePool`, see that kit's own
  comment). `mimic` (a chest with teeth, tile_0092) doubles as the
  pack's one genuine "hazard disguised as reward" — a real dungeon-crawler
  trope, not a fabricated category.
- **collectible (2):** `potion-red` (tile_0115) and `potion-blue`
  (tile_0116) — kept to the two color-coded RPG conventions with actual
  gameplay meaning (health / mana), out of 8 available potion/vial sprites
  (4 round potions × colors, 4 corked vials × colors — same two shapes,
  color-only variants). The other 6 were left unused as pure color filler.
- **gameObject (2 — new kit role, see note below):** `chest` (tile_0089)
  and `door` (tile_0046) — real interactive dungeon props. The pack has
  no switch/altar/sign sprite; those were not invented.
- **platform (1) / tile (2):** `floor` (tile_0000) feeds the mock
  template's existing repeating ground-strip (`#platform-row`), exactly
  like Racing's `road-straight` did — zero code change needed. `wall`
  (tile_0014) and `door-threshold` (tile_0009) are LLM-only extras (same
  pattern as Racing's curve/finish-line tiles) so a real (API-key)
  generation can lay out an actual dungeon room, not just a floor strip.
  The other ~125 tiles (dozens of wall/floor blend and auto-tile edge
  pieces meant for a tilemap editor, not this project's flat single-image
  rendering) were left in `source/` untouched.
- **decoration (4):** `torch` (tile_0029, a wall-mounted flame), `barrel`
  (tile_0082), `crate` (tile_0063), `tombstone` (tile_0064) — same
  `category: "game-object"` + `gameplayRole: ["decoration"]` pattern as
  SunnyLand's house/mushroom/plant/vine and Racing's tree/tribune/tent.
- **effect / background / ui: left `null` (see `missingRoles` on the
  kit) — genuinely absent from the pack, not invented:**
  - No hit/explosion/smoke/magic-burst sprite exists anywhere in the 132
    tiles (this pack is architecture + character/item icons, not FX).
  - No full-scene background image exists — every asset is a 16x16 tile;
    there is nothing resembling SunnyLand's `background-forest.png` or
    Racing's tree/tribune scenery scale.
  - Three plain white icons (`tile_0060`–`tile_0062`: a target reticle, a
    "forbidden" slash sign, diagonal hazard stripes) were found and
    considered for `ui`, but they read as generic Tiled-editor placeholder
    markers (thematically disconnected from the rest of the dungeon
    palette) rather than an actual in-game HUD icon — excluded rather than
    guessed at.

## A note on the `gameObject` kit role

The existing kits (`forest-platformer`, `space-shooter`, `racing`) don't
have an interactive-prop role, because none of their packs needed one.
This task's own brief explicitly asked for a "GAME OBJECT" category
(chest/door/switch/altar/sign) distinct from decoration and collectible,
so the `dungeon-rpg` kit adds a new `gameObject` role key — this is
data-only (a new key in one kit's `roles` object), not an architecture
change: `mockGameTemplate.js`'s `normalizeRoles()` simply doesn't read
this key (same as it already ignores `decoration`/`tile`/`vehicle`/
`weapon`/`powerup`/`ui` on the other kits) — so mock rendering is
unaffected, and `buildAssetContextMessageForKit()` exposes it to the LLM
exactly like every other role, no code change required there either.

## What's in this folder

- `characters/` — 3 curated player sprites.
- `enemies/` — 7 curated creature sprites (used as the kit's merged
  `obstacle` role).
- `objects/` — 2 potions (collectible), 2 interactive props
  (chest/door), 4 decorations (torch/barrel/crate/tombstone).
- `tiles/` — 3 tile pieces (floor/wall/door-threshold).
- `source/` — the complete, unmodified original pack (all 132 numbered
  tiles, the `Tilemap/` composite sheets, the `Tiled/` sample map +
  tileset, `Tilesheet.txt`) preserved in full for future expansion of
  this kit — nothing beyond what's listed above was cropped or altered,
  this is a straight copy. The two `.url` shortcut files (Kenney/Patreon
  links) were not copied — same exclusion Racing already applied to its
  own `.url` files, they aren't game assets.
- `LICENSE.txt` — the original license document, unmodified.

## Category / role mapping used

| Curated asset | Source tile | category | kit role |
|---|---|---|---|
| knight | tile_0097 | character | player |
| wizard | tile_0084 | character | player |
| adventurer | tile_0099 | character | player |
| slime | tile_0108 | enemy | obstacle |
| crab | tile_0110 | enemy | obstacle |
| orc | tile_0111 | enemy | obstacle |
| bat | tile_0120 | enemy | obstacle |
| ghost | tile_0121 | enemy | obstacle |
| spider | tile_0122 | enemy | obstacle |
| mimic | tile_0092 | enemy | obstacle |
| potion-red | tile_0115 | collectible | collectible |
| potion-blue | tile_0116 | collectible | collectible |
| chest | tile_0089 | game-object | gameObject |
| door | tile_0046 | game-object | gameObject |
| floor | tile_0000 | tile | platform |
| wall | tile_0014 | tile | tile |
| door-threshold | tile_0009 | tile | tile |
| torch | tile_0029 | game-object | decoration |
| barrel | tile_0082 | game-object | decoration |
| crate | tile_0063 | game-object | decoration |
| tombstone | tile_0064 | game-object | decoration |

This follows the same scaling pattern as `packs/sunnyland-forest/`,
`packs/kenney-space-shooter/` and `packs/racing/`: curated category
folders for pipeline-ready files, `source/` for full original fidelity,
plus its own `LICENSE.txt` / `ATTRIBUTION.md`.
