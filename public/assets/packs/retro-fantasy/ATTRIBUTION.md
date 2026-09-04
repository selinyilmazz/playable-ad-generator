# Retro Fantasy Kit — Attribution & License

**Author:** Kenney — https://kenney.nl
**License:** CC0 (Creative Commons Zero / Public Domain)

Per the license file shipped with this pack (`LICENSE.txt`, copied here
unmodified): same CC0 terms as every other pack in this project.

## Important — this is a 3D model pack

Same situation as the other Kenney "kit" packs this round: `Models/` is
unusable; the `Previews/` folder's flat PNG renders are the actual source
used.

## Curation — 6 of ~30 preview files used

The pack ships purely architectural/environment pieces — walls, towers,
columns, stairs, ladders, barrels — and **zero character, creature, or
collectible assets**. Because of that, a standalone "castle"/"medieval"
kit was deliberately **not** created from this pack alone: a kit with no
`player`/`enemy`/`collectible` role at all would be unusable as its own
game type. Instead — matching the instruction's own suggested grouping
("Dungeon/RPG… environment, decoration, tiles/textures gibi uygun
gruplarda değerlendir") — 6 assets were selected and folded into the
already-active, already-tested `dungeon-rpg` kit's `tile` and
`decoration` roles, which are LLM-only roles the deterministic mock demo
never renders (see `server/config/assetKits.js` and
`server/services/assetContext.js` — `mockGameTemplate.js`'s
`normalizeRoles()` only consumes `player`/`background`/`platform`/
`collectiblePool`/`obstaclePool`/`effect`/`target`; `tile` beyond the
first `platform` element and `decoration` are never rendered by the mock
HTML). This means the enrichment carries **zero visual-clash risk** for
the mock demo — `dungeon-rpg`'s `player`/`platform`/`obstacle`/
`collectible`/`effect` stayed 100% Tiny Dungeon pixel art, untouched —
while real (LLM) generation gets a genuinely richer set of environment
options.

Of ~30 preview files, only 6 were kept: 2 tiles (`stairs-stone`,
`ladder` — chosen over `floor-stairs`/`stairs-corner`/`stairs-wood`
variants as the clearest single representative of each concept) and 4
decoration props (`wall-fortified`, `tower`, `barrels`, `column` — chosen
over their `-paint`/`-damaged`/`-half`/`-gate`/`-door`/`-window` variant
siblings, one representative per concept). The remaining ~24 door/gate/
window/paint/damaged wall variants, tower-top/base/edge pieces, and
column-wood/paint/damaged variants were **not** used — kept intact in
`source/Previews/`.

## What's in this folder

- `tiles/` — 2 curated PNGs (stone stairs, ladder).
- `objects/` — 4 curated PNGs (fortified wall, tower, barrels, column).
- `source/Previews/` — the complete, unmodified set of all ~30 original
  preview PNGs. `Models/` was deliberately **not** copied (unusable 3D
  source, no future use case here).
- `LICENSE.txt` — the original license document, unmodified.

## Category / role mapping used

| Curated asset | Source file (Previews/) | category | kit role (in `dungeon-rpg`) |
|---|---|---|---|
| stairs-stone | stairs-stone.png | tile | tile |
| ladder | ladder.png | tile | tile |
| wall-fortified | wall-fortified.png | game-object | decoration |
| tower | tower.png | game-object | decoration |
| barrels | barrels.png | game-object | decoration |
| column | column.png | game-object | decoration |
